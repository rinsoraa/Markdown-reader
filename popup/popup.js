/* =====================================================
   Markdown Reader · 弹窗逻辑
   - 读取/保存 storage.local（enabled、customCss）
   - 保存后通过 storage.onChanged 通知所有已打开的 md 页面
   - 显示当前标签页的渲染状态
   ===================================================== */
(function () {
    'use strict';

    var api = globalThis.chrome || globalThis.browser;

    var $enabled = document.getElementById('enabled');
    var $css = document.getElementById('css');
    var $status = document.getElementById('status');
    var $pageStatus = document.getElementById('page-status');

    var defaultTheme = '';
    var statusTimer = null;

    function flash(text, isError) {
        $status.textContent = text;
        $status.classList.toggle('error', !!isError);
        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = setTimeout(function () {
            $status.textContent = '';
        }, 2200);
    }

    function fetchDefaultTheme() {
        return fetch('../content/theme.css')
            .then(function (r) { return r.text(); })
            .catch(function () { return ''; });
    }

    function save() {
        var value = $css.value;
        var enabled = $enabled.checked;
        try {
            api.storage.local.set({ customCss: value, enabled: enabled }, function () {
                if (api.runtime.lastError) {
                    flash('保存失败：' + api.runtime.lastError.message, true);
                    return;
                }
                flash('已保存，正在应用到所有 md 页面 ✓');
            });
        } catch (e) {
            flash('保存失败：' + e.message, true);
        }
    }

    /* ---------- 初始化 ---------- */

    fetchDefaultTheme().then(function (text) {
        defaultTheme = text;
        try {
            api.storage.local.get({ enabled: true, customCss: '' }, function (s) {
                if (api.runtime.lastError) return;
                $enabled.checked = s.enabled !== false;
                $css.value = s.customCss || defaultTheme;
            });
        } catch (e) {
            $css.value = defaultTheme;
        }
    });

    document.getElementById('save').addEventListener('click', save);

    document.getElementById('reset').addEventListener('click', function () {
        $css.value = defaultTheme;
        flash('已载入默认主题，点击「保存」生效');
    });

    document.getElementById('clear').addEventListener('click', function () {
        $css.value = '';
        save();
    });

    $enabled.addEventListener('change', save);

    /* Ctrl/Cmd + S 直接保存 */
    $css.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            save();
        }
    });

    /* ---------- 当前标签页渲染状态 ---------- */

    try {
        api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var tab = tabs && tabs[0];
            if (!tab || !tab.id) return;
            try {
                api.tabs.sendMessage(tab.id, { type: 'mdr-ping' }, function (res) {
                    if (api.runtime.lastError) {
                        $pageStatus.textContent = '当前标签页：未运行渲染器（非 md 页面或未授予站点权限）';
                        void api.runtime.lastError;
                        return;
                    }
                    if (res && res.rendered) {
                        $pageStatus.textContent = '当前标签页：Markdown 已渲染 ✓';
                    } else if (res && res.enabled === false) {
                        $pageStatus.textContent = '当前标签页：渲染已被关闭';
                    } else {
                        $pageStatus.textContent = '当前标签页：未检测到 Markdown 内容';
                    }
                });
            } catch (e) {
                $pageStatus.textContent = '当前标签页：无法连接渲染器';
            }
        });
    } catch (e) { /* ignore */ }
})();
