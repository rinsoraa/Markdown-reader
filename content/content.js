/* =====================================================
   Markdown Reader · 内容脚本
   职责：
   1. document_start 阶段预判 .md 纯文本页并暂时隐藏，避免原文闪烁；
   2. DOMContentLoaded 后校验 Content-Type，提取原文并解析渲染；
   3. 注入默认主题（<link>）与自定义 CSS（<style>，后加载可覆盖）；
   4. 监听 storage.onChanged —— 弹窗保存后所有已打开的 md 页面实时生效。
   ===================================================== */
(function () {
    'use strict';

    var api = globalThis.chrome || globalThis.browser;
    var MD_EXT_RE = /\.(md|markdown|mdown|mkd)$/i;
    var MD_TYPES_RE = /^(?:text|application)\/(?:x-)?markdown\b/i;

    /* ---------- 基础结构样式（不参与自定义，保持中性） ---------- */

    var BASE_CSS = [
        'html.mdr-pending body { display: none !important; }',
        '.md-reader { min-height: 100vh; }',
        '.markdown-body, .markdown-body *, .markdown-body *::before, .markdown-body *::after { box-sizing: border-box; }',
        '.markdown-body details { margin: 22px 0; padding: 14px 20px; background: rgba(60,50,40,0.03); border: 1px solid #e8e3dc; border-radius: 14px; }',
        '.markdown-body summary { cursor: pointer; font-weight: 600; color: #242424; }',
        '.markdown-body kbd { display: inline-block; padding: 2px 7px; font-size: 0.85em; font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace; color: #343434; background: #f1eee8; border: 1px solid #d8d2c9; border-bottom-width: 2px; border-radius: 6px; }',
        '.markdown-body mark { background: rgba(203, 189, 167, 0.35); color: #343434; padding: 1px 5px; border-radius: 4px; }',
        '.markdown-body figure { margin: 26px 0; }',
        '.markdown-body figcaption { font-size: 0.85em; color: #999; text-align: center; margin-top: 8px; }',
        '@media (prefers-color-scheme: dark) {',
        '  .markdown-body details { background: #252321; border-color: #38342f; }',
        '  .markdown-body summary { color: #f1eee8; }',
        '  .markdown-body kbd { color: #dedbd5; background: #292723; border-color: #4a4640; }',
        '  .markdown-body mark { background: rgba(118, 107, 91, 0.35); color: #dedbd5; }',
        '}'
    ].join('\n');

    var state = {
        raw: null,
        originalBody: null,
        originalTitle: null,
        pendingTimer: null,
        themeLink: null,
        customStyle: null,
        customCss: '',
        enabled: true,
        listening: false
    };

    /* ---------- 工具 ---------- */

    function storageGet(defaults) {
        return new Promise(function (resolve) {
            try {
                api.storage.local.get(defaults, function (res) {
                    var merged = {};
                    for (var k in defaults) merged[k] = defaults[k];
                    if (res) for (var k2 in res) merged[k2] = res[k2];
                    resolve(merged);
                });
            } catch (e) {
                resolve(Object.assign({}, defaults));
            }
        });
    }

    function extMatches() {
        try { return MD_EXT_RE.test(location.pathname); } catch (e) { return false; }
    }

    function isMdCandidate() {
        try {
            var ct = document.contentType || '';
            if (MD_TYPES_RE.test(ct)) return true;
            return extMatches() && /^text\/plain\b/i.test(ct);
        } catch (e) {
            return false;
        }
    }

    function injectBaseCss() {
        var st = document.createElement('style');
        st.id = 'mdr-base-css';
        st.textContent = BASE_CSS;
        (document.head || document.documentElement).appendChild(st);
    }

    function reveal() {
        if (state.pendingTimer !== null) {
            clearTimeout(state.pendingTimer);
            state.pendingTimer = null;
        }
        document.documentElement.classList.remove('mdr-pending');
    }

    /* document_start 阶段：URL 看起来是 .md 且响应是文本 → 先隐藏正文 */
    function maybeHideEarly() {
        if (!extMatches()) return false;
        var ct = '';
        try { ct = document.contentType || ''; } catch (e) { /* ignore */ }
        if (ct && !/^text\//i.test(ct)) return false;
        if (!ct && location.protocol !== 'file:') return false;
        document.documentElement.classList.add('mdr-pending');
        state.pendingTimer = setTimeout(reveal, 5000); /* 兜底，避免意外白屏 */
        return true;
    }

    function extractRawText() {
        var body = document.body;
        if (!body) return null;
        var pres = body.querySelectorAll(':scope > pre');
        if (pres.length === 1) return pres[0].textContent;
        return body.textContent != null ? body.textContent : null;
    }

    /* ---------- 渲染 ---------- */

    function renderDocument(raw) {
        if (state.originalBody === null) {
            state.originalBody = document.body.innerHTML;
            state.originalTitle = document.title;
        }
        var res = globalThis.MRMarkdown.parse(raw);

        var title = (res.title || '').trim();
        if (!title) {
            try {
                title = decodeURIComponent((location.pathname.split('/').pop() || ''))
                    .replace(MD_EXT_RE, '') || 'Markdown';
            } catch (e) {
                title = 'Markdown';
            }
        }
        document.title = title;

        var wrap = document.createElement('div');
        wrap.className = 'md-reader';
        var article = document.createElement('article');
        article.className = 'markdown-body';
        article.innerHTML = res.html;
        wrap.appendChild(article);
        document.body.replaceChildren(wrap);
    }

    function applyTheme() {
        if (state.themeLink) return Promise.resolve();
        return new Promise(function (resolve) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.id = 'mdr-theme';
            link.href = api.runtime.getURL('content/theme.css');
            var settled = false;
            function done() {
                if (settled) return;
                settled = true;
                resolve();
            }
            link.addEventListener('load', done, { once: true });
            link.addEventListener('error', done, { once: true });
            (document.head || document.documentElement).appendChild(link);
            state.themeLink = link;
            setTimeout(done, 1500); /* 加载失败也要继续 */
        });
    }

    function applyCustomCss() {
        if (state.customStyle && state.customStyle.parentNode) {
            state.customStyle.parentNode.removeChild(state.customStyle);
        }
        state.customStyle = null;
        var css = (state.customCss || '').trim();
        if (css === '') return;
        var st = document.createElement('style');
        st.id = 'mdr-custom-css';
        st.textContent = css;
        (document.head || document.documentElement).appendChild(st);
        state.customStyle = st;
    }

    function restoreOriginal() {
        if (state.originalBody !== null) {
            document.body.innerHTML = state.originalBody;
            document.title = state.originalTitle || document.title;
        }
        if (state.customStyle && state.customStyle.parentNode) {
            state.customStyle.parentNode.removeChild(state.customStyle);
        }
        state.customStyle = null;
        state.raw = null;
    }

    /* ---------- 主流程 ---------- */

    function run() {
        storageGet({ enabled: true, customCss: '' }).then(function (s) {
            try {
                state.enabled = s.enabled !== false;
                state.customCss = s.customCss || '';

                if (!state.enabled || !isMdCandidate()) { reveal(); return; }

                var raw = extractRawText();
                if (raw === null || raw.trim() === '') { reveal(); return; }

                state.raw = raw;
                renderDocument(raw);

                applyTheme().then(function () {
                    applyCustomCss();
                    reveal();
                });

                if (!state.listening) {
                    state.listening = true;
                    try {
                        api.storage.onChanged.addListener(onStorageChanged);
                    } catch (e) { /* 扩展上下文失效时静默 */ }
                }
            } catch (e) {
                console.error('[Markdown Reader] 渲染失败：', e);
                reveal();
            }
        });
    }

    /* ---------- 弹窗设置变化 → 所有 md 页面实时更新 ---------- */

    function onStorageChanged(changes, area) {
        if (area !== 'local') return;
        try {
            if (changes.enabled) state.enabled = changes.enabled.newValue !== false;
            if (changes.customCss) state.customCss = changes.customCss.newValue || '';

            if (!state.enabled) { restoreOriginal(); return; }

            if (state.raw === null) {
                /* 渲染器刚被启用 */
                if (isMdCandidate()) {
                    var raw = extractRawText();
                    if (raw !== null && raw.trim() !== '') {
                        state.raw = raw;
                        renderDocument(raw);
                        applyTheme().then(function () {
                            applyCustomCss();
                            reveal();
                        });
                    }
                }
                return;
            }

            applyCustomCss(); /* 保持渲染，仅切换样式 */
        } catch (e) {
            console.error('[Markdown Reader] 更新样式失败：', e);
        }
    }

    /* ---------- 弹窗状态查询 ---------- */

    try {
        api.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
            if (msg && msg.type === 'mdr-ping') {
                sendResponse({ rendered: state.raw !== null, enabled: state.enabled });
            }
        });
    } catch (e) { /* ignore */ }

    /* ---------- 启动 ---------- */

    injectBaseCss();
    var hidden = maybeHideEarly();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { run(); }, { once: true });
    } else {
        run();
    }
    void hidden;
})();
