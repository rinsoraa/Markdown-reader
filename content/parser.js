/* =====================================================
   Markdown Reader · Markdown → HTML 解析器
   支持：ATX/Setext 标题、段落与硬换行、围栏与缩进代码块、
   引用块（可嵌套）、无序/有序/嵌套/任务列表、GFM 表格（对齐）、
   分割线、行内代码、强调/斜体/删除线、链接（内联/引用/简写）、
   图片、自动链接、反斜杠转义、内联 HTML（白名单净化）。
   纯函数实现，浏览器与 Node 皆可运行。零依赖。
   ===================================================== */
(function (global) {
    'use strict';

    /* ---------------- 基础转义 ---------------- */

    function escapeHtml(s) {
        return String(s)
            .replace(/&(?![a-zA-Z][a-zA-Z0-9]{1,31};|#[0-9]{1,7};|#[xX][0-9a-fA-F]{1,6};)/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escapeCode(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escapeAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ---------------- 占位符系统 ----------------
       所有生成的 HTML 与需要原样保留的字符先存入 stash，
       正文只保留 \u0000索引\u0000；最后统一转义再还原，
       保证用户的原始文本永远不会被误当作标签。 */

    var stashArr = [];

    function stash(html) {
        stashArr.push(html);
        return '\u0000' + (stashArr.length - 1) + '\u0000';
    }

    function restoreAll(s) {
        for (var k = 0; k < 12 && s.indexOf('\u0000') >= 0; k++) {
            s = s.replace(/\u0000(\d+)\u0000/g, function (m, i) {
                var v = stashArr[+i];
                return v === undefined ? '' : v;
            });
        }
        return s;
    }

    /* ---------------- HTML 净化（白名单） ---------------- */

    var ALLOWED_TAGS = {
        a: 1, abbr: 1, b: 1, bdi: 1, bdo: 1, br: 1, caption: 1, cite: 1, code: 1, dd: 1,
        del: 1, details: 1, dfn: 1, div: 1, dl: 1, dt: 1, em: 1, figcaption: 1, figure: 1,
        h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, hr: 1, i: 1, img: 1, ins: 1, kbd: 1,
        li: 1, mark: 1, ol: 1, p: 1, picture: 1, pre: 1, q: 1, rp: 1, rt: 1, ruby: 1,
        s: 1, samp: 1, small: 1, span: 1, strike: 1, strong: 1, sub: 1, summary: 1,
        sup: 1, table: 1, tbody: 1, td: 1, tfoot: 1, th: 1, thead: 1, time: 1, tr: 1,
        u: 1, ul: 1, var: 1, wbr: 1, video: 1, audio: 1, source: 1, center: 1, font: 1,
        tt: 1, section: 1, article: 1, aside: 1, header: 1, footer: 1, nav: 1, main: 1
    };

    var VOID_TAGS = { br: 1, hr: 1, img: 1, wbr: 1, source: 1 };

    var DROP_TAGS = {
        script: 1, style: 1, iframe: 1, object: 1, embed: 1, form: 1, input: 1,
        button: 1, select: 1, textarea: 1, link: 1, meta: 1, base: 1, applet: 1,
        frame: 1, frameset: 1, noscript: 1, template: 1, dialog: 1, title: 1
    };

    var ALLOWED_ATTRS = {
        href: 1, src: 1, srcset: 1, alt: 1, title: 1, width: 1, height: 1, align: 1,
        colspan: 1, rowspan: 1, start: 1, reversed: 1, open: 1, datetime: 1, lang: 1,
        dir: 1, abbr: 1, headers: 1, scope: 1, loading: 1, controls: 1, loop: 1,
        muted: 1, poster: 1, preload: 1, class: 1, id: 1
    };

    function safeUrl(u) {
        u = String(u || '').trim();
        if (u === '') return '';
        if (/^(https?:|mailto:|ftp:|tel:|#|\/)/i.test(u)) return u;
        if (/^data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml);/i.test(u)) return u;
        if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return u; /* 相对路径 */
        return null; /* javascript: 等一律拒绝 */
    }

    var URL_ATTRS = { href: 1, src: 1, poster: 1, srcset: 1 };

    function sanitizeHtmlToken(raw) {
        var m = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^<>]*)?)(\/?)>$/.exec(raw);
        if (!m) return escapeHtml(raw);
        var close = m[1];
        var lower = m[2].toLowerCase();
        var attrs = m[3] || '';
        var selfClose = m[4];

        if (DROP_TAGS[lower]) return '';
        if (!ALLOWED_TAGS[lower]) return escapeHtml(raw);
        if (close) return '</' + lower + '>';

        var out = '<' + lower;
        var seen = {};
        var attrRe = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|[^\s"'=<>`]+))?/g;
        var am;
        while ((am = attrRe.exec(attrs)) !== null) {
            var name = am[1].toLowerCase();
            if (!ALLOWED_ATTRS[name] || seen[name]) continue;
            var val = am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : (am[4] || ''));
            if (URL_ATTRS[name]) {
                var su = safeUrl(val);
                if (su === null) continue;
                val = su;
            }
            seen[name] = 1;
            out += ' ' + name + '="' + escapeAttr(val) + '"';
        }
        if (lower === 'a') out += ' rel="noopener noreferrer"';
        out += (selfClose && !VOID_TAGS[lower]) ? '/>' : '>';
        return out;
    }

    function sanitizeHtmlChunk(html) {
        html = String(html)
            .replace(/<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '');
        var toks = [];
        html = html.replace(/<\/?[a-zA-Z][^<>]*>/g, function (t) {
            toks.push(sanitizeHtmlToken(t));
            return '\u0001' + (toks.length - 1) + '\u0001';
        });
        html = escapeHtml(html);
        html = html.replace(/\u0001(\d+)\u0001/g, function (m, i) {
            return toks[+i] !== undefined ? toks[+i] : '';
        });
        return html;
    }

    /* ---------------- 行内解析 ---------------- */

    var HARD_BR = '\u0001BR\u0001';

    function renderLink(text, url, title, refs) {
        var su = safeUrl(url);
        var inner = parseInline(text, refs);
        if (su === null) return inner;
        var t = title ? ' title="' + escapeAttr(title) + '"' : '';
        return '<a href="' + escapeAttr(su) + '"' + t + '>' + inner + '</a>';
    }

    function renderImg(alt, url, title) {
        var su = safeUrl(url);
        if (su === null) return escapeHtml(alt);
        var t = title ? ' title="' + escapeAttr(title) + '"' : '';
        return '<img src="' + escapeAttr(su) + '" alt="' + escapeAttr(alt) + '"' + t + ' loading="lazy">';
    }

    function trimUrlTail(u) {
        var tail = '';
        while (u.length > 0) {
            var c = u.charAt(u.length - 1);
            if (".,;:!?'\u201c\u201d\u2026\"".indexOf(c) >= 0) {
                tail = c + tail;
                u = u.slice(0, -1);
                continue;
            }
            if (c === ')') {
                var opens = (u.match(/\(/g) || []).length;
                var closes = (u.match(/\)/g) || []).length;
                if (closes > opens) {
                    tail = ')' + tail;
                    u = u.slice(0, -1);
                    continue;
                }
            }
            break;
        }
        return { url: u, tail: tail };
    }

    function parseInline(text, refs) {
        /* 1. 行内代码（最高优先级） */
        text = String(text).replace(/(`+)([\s\S]*?)\1/g, function (m, ticks, content) {
            var c = content;
            if (c.length > 2 && c.charAt(0) === ' ' && c.charAt(c.length - 1) === ' ' && c.trim() !== '') {
                c = c.slice(1, -1);
            }
            if (c.trim() === '') c = ' ';
            return stash('<code>' + escapeCode(c) + '</code>');
        });

        /* 2. 反斜杠转义 */
        text = text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, function (m, ch) {
            return stash(ch);
        });

        /* 3. 尖括号自动链接 */
        text = text.replace(/<(https?:\/\/[^\s<>]+|mailto:[^\s<>]+)>/gi, function (m, u) {
            return stash('<a href="' + escapeAttr(u) + '">' + escapeHtml(u) + '</a>');
        });
        text = text.replace(/<([A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>/g, function (m, u) {
            return stash('<a href="mailto:' + escapeAttr(u) + '">' + escapeHtml(u) + '</a>');
        });

        /* 4. HTML 注释与内联标签（净化） */
        text = text.replace(/<!--[\s\S]*?-->/g, function () { return stash(''); });
        text = text.replace(/<\/?[a-zA-Z][^<>]*>/g, function (t) {
            return stash(sanitizeHtmlToken(t));
        });

        /* 5. 图片（引用式 → 内联） */
        text = text.replace(/!\[([^\]]*)\][ \t]*\[([^\]]*)\]/g, function (m, alt, label) {
            var def = refs[(label || alt).toLowerCase()];
            if (!def) return m;
            return stash(renderImg(alt, def.href, def.title));
        });
        text = text.replace(/!\[([^\]]*)\]\([ \t]*(<[^<>]*>|(?:[^\s()]|\([^()]*\))+)[ \t]*(?:"([^"]*)"|'([^']*)'|\(([^()]*)\))?[ \t]*\)/g,
            function (m, alt, url, t1, t2, t3) {
                var u = url;
                if (u.charAt(0) === '<' && u.charAt(u.length - 1) === '>') u = u.slice(1, -1);
                return stash(renderImg(alt, u, t1 || t2 || t3 || ''));
            });

        /* 6. 链接（内联 → 引用式 → 简写） */
        text = text.replace(/\[([^\]]*)\]\([ \t]*(<[^<>]*>|(?:[^\s()]|\([^()]*\))+)[ \t]*(?:"([^"]*)"|'([^']*)'|\(([^()]*)\))?[ \t]*\)/g,
            function (m, inner, url, t1, t2, t3) {
                var u = url;
                if (u.charAt(0) === '<' && u.charAt(u.length - 1) === '>') u = u.slice(1, -1);
                return stash(renderLink(inner, u, t1 || t2 || t3 || '', refs));
            });
        text = text.replace(/\[([^\]]*)\][ \t]*\[([^\]]*)\]/g, function (m, inner, label) {
            var def = refs[(label || inner).toLowerCase()];
            if (!def) return m;
            return stash(renderLink(inner, def.href, def.title || '', refs));
        });
        text = text.replace(/\[([^\]\s][^\]]*)\](?![ \t]*\(|[ \t]*\[)/g, function (m, label) {
            var def = refs[label.toLowerCase()];
            if (!def) return m;
            return stash(renderLink(label, def.href, def.title || '', refs));
        });

        /* 7. 裸链接与邮箱 */
        text = text.replace(/(?<![\w"'=<>\\(\u0000])(https?:\/\/[^\s<>\u0000]+)/g, function (m, u0) {
            var p = trimUrlTail(u0);
            return stash('<a href="' + escapeAttr(p.url) + '">' + escapeHtml(p.url) + '</a>') + p.tail;
        });
        text = text.replace(/(?<![\w"'=<>\\(\u0000@.])(www\.[^\s<>\u0000]+)/g, function (m, u0) {
            var p = trimUrlTail(u0);
            return stash('<a href="https://' + escapeAttr(p.url) + '">' + escapeHtml(p.url) + '</a>') + p.tail;
        });
        text = text.replace(/(?<![\w.%+'-])([A-Za-z0-9._%+'-]+)@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,})/g,
            function (m, user, host) {
                var addr = user + '@' + host;
                return stash('<a href="mailto:' + escapeAttr(addr) + '">' + escapeHtml(addr) + '</a>');
            });

        /* 8. 强调（递归处理嵌套） */
        for (var pass = 0; pass < 2; pass++) {
            text = text.replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, function (m, inner) {
                return stash('<strong><em>' + parseInline(inner, refs) + '</em></strong>');
            });
            text = text.replace(/(?<![\w\\])___(?=\S)([\s\S]*?\S)___(?!\w)/g, function (m, inner) {
                return stash('<strong><em>' + parseInline(inner, refs) + '</em></strong>');
            });
            text = text.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, function (m, inner) {
                return stash('<strong>' + parseInline(inner, refs) + '</strong>');
            });
            text = text.replace(/(?<![\w\\])__(?=\S)([\s\S]*?\S)__(?!\w)/g, function (m, inner) {
                return stash('<strong>' + parseInline(inner, refs) + '</strong>');
            });
            text = text.replace(/~~(?=\S)([\s\S]*?\S)~~/g, function (m, inner) {
                return stash('<del>' + parseInline(inner, refs) + '</del>');
            });
            text = text.replace(/(?<!\*)\*(?=\S)([^*]+?\S|\S)\*(?!\*)/g, function (m, inner) {
                return stash('<em>' + parseInline(inner, refs) + '</em>');
            });
            text = text.replace(/(?<![\w\\])_(?=\S)([^_]+?\S|\S)_(?!\w)/g, function (m, inner) {
                return stash('<em>' + parseInline(inner, refs) + '</em>');
            });
        }

        /* 9. 硬换行标记 */
        if (text.indexOf(HARD_BR) >= 0) {
            text = text.split(HARD_BR).join(stash('<br>'));
        }

        /* 10. 转义剩余原文 → 还原占位符 */
        text = escapeHtml(text);
        return restoreAll(text);
    }

    /* ---------------- 块级渲染辅助 ---------------- */

    var slugCounts = {};
    var firstTitle = '';

    function slugId(text) {
        var base = String(text).toLowerCase()
            .replace(/[`*_~[\]()#!]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af-]/g, '');
        if (base === '') base = 'section';
        if (slugCounts[base] === undefined) {
            slugCounts[base] = 0;
            return base;
        }
        slugCounts[base] += 1;
        return base + '-' + slugCounts[base];
    }

    function renderHeading(level, rawText, refs) {
        if (level === 1 && firstTitle === '') {
            firstTitle = String(rawText).replace(/[*_`~]/g, '').trim();
        }
        return '<h' + level + ' id="' + escapeAttr(slugId(rawText)) + '">' + parseInline(rawText, refs) + '</h' + level + '>';
    }

    function renderParagraph(lines, refs, tight) {
        var text = '';
        for (var k = 0; k < lines.length; k++) {
            var t = lines[k];
            var br = false;
            if (/(^|[^\\])\\$/.test(t)) {
                t = t.slice(0, -1);
                br = true;
            } else if (/ {2,}$/.test(t)) {
                t = t.replace(/ +$/, '');
                br = true;
            }
            if (k > 0) text += '\n';
            text += t + (br ? HARD_BR : '');
        }
        text = text.replace(HARD_BR + '$', '');
        var html = parseInline(text, refs);
        return tight ? html + '\n' : '<p>' + html + '</p>';
    }

    function renderCodeBlock(code, lang) {
        var inner = null;
        var hl = global.MRHighlight;
        if (hl && lang) {
            try { inner = hl.highlight(code, lang); } catch (e) { inner = null; }
        }
        if (inner === null || inner === undefined) inner = escapeCode(code);
        var cls = lang ? ' class="language-' + escapeAttr(lang) + '" data-lang="' + escapeAttr(lang) + '"' : '';
        return '<pre><code' + cls + '>' + inner + '\n</code></pre>';
    }

    function splitRow(line) {
        var s = String(line).trim();
        if (s.charAt(0) === '|') s = s.slice(1);
        if (s.slice(-1) === '|' && !s.endsWith('\\|')) s = s.slice(0, -1);
        return s.split(/(?<!\\)\|/).map(function (c) {
            return c.replace(/\\\|/g, '|').trim();
        });
    }

    function isSeparatorRow(line) {
        if (line.indexOf('|') < 0 || line.indexOf('-') < 0) return false;
        var cells = splitRow(line);
        if (cells.length === 0) return false;
        return cells.every(function (c) { return /^:?-+:?$/.test(c); });
    }

    function parseAligns(cells) {
        return cells.map(function (c) {
            if (/^:-+:$/.test(c)) return 'center';
            if (/^:-+$/.test(c)) return 'left';
            if (/^-+:$/.test(c)) return 'right';
            return '';
        });
    }

    function alignStyle(a) {
        return a ? ' style="text-align:' + a + '"' : '';
    }

    function renderTable(headerCells, aligns, rows, refs) {
        var html = '<table><thead><tr>';
        headerCells.forEach(function (c, k) {
            html += '<th' + alignStyle(aligns[k] || '') + '>' + parseInline(c, refs) + '</th>';
        });
        html += '</tr></thead><tbody>';
        rows.forEach(function (r) {
            html += '<tr>';
            for (var k = 0; k < headerCells.length; k++) {
                html += '<td' + alignStyle(aligns[k] || '') + '>' + parseInline(r[k] || '', refs) + '</td>';
            }
            html += '</tr>';
        });
        html += '</tbody></table>';
        return html;
    }

    function isBlockStart(l) {
        if (/^ {0,3}(?:#{1,6}[ \t]|```|~~~|>)/.test(l)) return true;
        if (/^ {0,3}(?:[-*+][ \t]|\d{1,9}[.)][ \t])/.test(l)) return true;
        if (/^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(l)) return true;
        if (/^ {0,3}<[a-zA-Z\/!]/.test(l)) return true;
        if (/^ {4,}\S/.test(l)) return true;
        return false;
    }

    function leadingSpaces(l) {
        var m = /^ */.exec(l);
        return m[0].length;
    }

    var LIST_RE = /^ {0,3}([-*+]|\d{1,9}[.)])([ \t]*)(.*)$/;
    var ITEM_START_RE = /^ {0,3}(?:[-*+]|\d{1,9}[.)])(?:[ \t]+|$)/;

    function renderList(ordered, start, items, loose, refs) {
        var hasTask = items.some(function (it) { return it.task !== null; });
        var cls = hasTask && !ordered ? ' class="contains-task-list"' : '';
        var html = ordered
            ? '<ol' + (start > 1 ? ' start="' + start + '"' : '') + '>'
            : '<ul' + cls + '>';
        items.forEach(function (it) {
            var lines = it.lines.slice();
            var task = it.task;
            if (task !== null) lines[0] = it.restAfterTask;
            var inner = parseBlocks(lines, refs, { tight: !loose });
            html += '<li' + (task !== null ? ' class="task-list-item"' : '') + '>';
            if (task !== null) {
                html += '<input type="checkbox" disabled' + (task.toLowerCase() === 'x' ? ' checked' : '') + '> ';
            }
            html += inner + '</li>';
        });
        html += ordered ? '</ol>' : '</ul>';
        return html;
    }

    /* ---------------- 块级解析主循环 ---------------- */

    var REFDEF_RE = /^ {0,3}\[([^\]]+)\]:[ \t]*(?:<([^<>]*)>|([^ \t]+))[ \t]*(?:"([^"]*)"|'([^']*)'|\(([^()]*)\))?[ \t]*$/;

    /* 预处理：先于正文提取引用式链接定义（CommonMark 中定义全文有效，
       且需跳过围栏代码块内的同名行） */
    function extractRefDefs(lines, refs) {
        var out = [];
        var fence = null;
        for (var k = 0; k < lines.length; k++) {
            var l = lines[k];
            var fm = /^ {0,3}(`{3,}|~{3,})/.exec(l);
            if (fm) {
                if (fence === null) {
                    fence = fm[1];
                } else if (fm[1].charAt(0) === fence.charAt(0) && fm[1].length >= fence.length) {
                    fence = null;
                }
                out.push(l);
                continue;
            }
            if (fence !== null) {
                out.push(l);
                continue;
            }
            var m = REFDEF_RE.exec(l);
            if (m) {
                refs[m[1].trim().toLowerCase()] = {
                    href: m[2] !== undefined ? m[2] : m[3],
                    title: m[4] || m[5] || m[6] || ''
                };
                continue;
            }
            out.push(l);
        }
        return out;
    }

    function parseBlocks(lines, refs, state) {
        var out = [];
        var i = 0;
        var n = lines.length;
        var para = [];
        var tight = state && state.tight;

        function flushPara() {
            if (para.length === 0) return;
            out.push(renderParagraph(para, refs, tight));
            para = [];
        }

        while (i < n) {
            var line = lines[i];
            var trimmed = line.trim();
            var m;

            /* 空行 */
            if (trimmed === '') {
                flushPara();
                i += 1;
                continue;
            }

            var indent = leadingSpaces(line);

            /* 围栏代码块 */
            if ((m = /^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/.exec(line))) {
                flushPara();
                var fence = m[1];
                var info = m[2].trim();
                var lang = (info.split(/\s+/)[0] || '').toLowerCase().replace(/[^\w+#.-]/g, '');
                i += 1;
                var buf = [];
                var closeRe = new RegExp('^ {0,3}' + fence.charAt(0) + '{' + fence.length + ',}[ \\t]*$');
                while (i < n && !closeRe.test(lines[i])) {
                    buf.push(lines[i]);
                    i += 1;
                }
                if (i < n) i += 1; /* 跳过闭合围栏 */
                out.push(renderCodeBlock(buf.join('\n'), lang));
                continue;
            }

            /* Setext 标题（仅当段落悬挂时） */
            if (para.length > 0 && /^ {0,3}=+[ \t]*$/.test(line)) {
                var t1 = para.join('\n');
                para = [];
                out.push(renderHeading(1, t1, refs));
                i += 1;
                continue;
            }
            if (para.length > 0 && /^ {0,3}-+[ \t]*$/.test(line)) {
                var t2 = para.join('\n');
                para = [];
                out.push(renderHeading(2, t2, refs));
                i += 1;
                continue;
            }

            /* 分割线 */
            if (/^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(line)) {
                flushPara();
                out.push('<hr>');
                i += 1;
                continue;
            }

            /* ATX 标题 */
            if ((m = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*#*[ \t]*$/.exec(line))) {
                flushPara();
                out.push(renderHeading(m[1].length, m[2] || '', refs));
                i += 1;
                continue;
            }

            /* 引用块 */
            if (/^ {0,3}>/.test(line)) {
                flushPara();
                var qbuf = [];
                while (i < n) {
                    var ql = lines[i];
                    if (/^ {0,3}>/.test(ql)) {
                        qbuf.push(ql.replace(/^ {0,3}> ?/, ''));
                        i += 1;
                    } else if (ql.trim() !== '' && para.length === 0 && !isBlockStart(ql)) {
                        /* 懒惰延续行 */
                        qbuf.push(ql);
                        i += 1;
                    } else {
                        break;
                    }
                }
                out.push('<blockquote>' + parseBlocks(qbuf, refs, { tight: false }) + '</blockquote>');
                continue;
            }

            /* 列表 */
            if ((m = LIST_RE.exec(line)) && !(m[2] === '' && m[3] !== '')) {
                flushPara();
                var ordered = /\d/.test(m[1].charAt(0));
                var start = ordered ? parseInt(m[1], 10) : 1;
                var items = [];
                var loose = false;
                var pendingBlanks = 0;
                var contentCol = indent + m[1].length + (m[2].length > 4 ? 1 : (m[2].length || 1));
                var cur = { lines: [m[3]], task: null, restAfterTask: '' };
                items.push(cur);
                i += 1;

                /* 任务列表标记 */
                var tm = /^\[([ xX])\][ \t]+(.*)$/.exec(cur.lines[0]);
                if (tm) {
                    cur.task = tm[1];
                    cur.restAfterTask = tm[2];
                }

                while (i < n) {
                    var l = lines[i];
                    if (l.trim() === '') {
                        pendingBlanks += 1;
                        i += 1;
                        continue;
                    }
                    var ind = leadingSpaces(l);
                    if (ind >= contentCol) {
                        if (pendingBlanks > 0) {
                            for (var b = 0; b < pendingBlanks; b++) cur.lines.push('');
                            loose = true;
                            pendingBlanks = 0;
                        }
                        cur.lines.push(l.slice(contentCol));
                        i += 1;
                        continue;
                    }
                    if (ITEM_START_RE.test(l) && ind <= indent + 3) {
                        if (pendingBlanks > 0) { loose = true; pendingBlanks = 0; }
                        var nm = LIST_RE.exec(l);
                        var afterLen = nm[2].length;
                        contentCol = ind + nm[1].length + (afterLen > 4 ? 1 : (afterLen || 1));
                        indent = ind;
                        cur = { lines: [nm[3]], task: null, restAfterTask: '' };
                        items.push(cur);
                        var tm2 = /^\[([ xX])\][ \t]+(.*)$/.exec(cur.lines[0]);
                        if (tm2) {
                            cur.task = tm2[1];
                            cur.restAfterTask = tm2[2];
                        }
                        i += 1;
                        continue;
                    }
                    if (pendingBlanks > 0) break; /* 空行后接无关内容 → 列表结束 */
                    if (cur.lines.length > 0 && cur.lines[cur.lines.length - 1].trim() !== '' && !isBlockStart(l)) {
                        cur.lines.push(l); /* 懒惰延续 */
                        i += 1;
                        continue;
                    }
                    break;
                }
                out.push(renderList(ordered, start, items, loose, refs));
                continue;
            }

            /* 表格 */
            if (line.indexOf('|') >= 0 && i + 1 < n && isSeparatorRow(lines[i + 1])) {
                flushPara();
                var headerCells = splitRow(line);
                var aligns = parseAligns(splitRow(lines[i + 1]));
                i += 2;
                var rows = [];
                while (i < n && lines[i].trim() !== '' && lines[i].indexOf('|') >= 0 && !isBlockStart(lines[i])) {
                    rows.push(splitRow(lines[i]));
                    i += 1;
                }
                out.push(renderTable(headerCells, aligns, rows, refs));
                continue;
            }

            /* 引用式链接定义 */
            if (para.length === 0 && (m = REFDEF_RE.exec(line))) {
                refs[m[1].trim().toLowerCase()] = {
                    href: m[2] !== undefined ? m[2] : m[3],
                    title: m[4] || m[5] || m[6] || ''
                };
                i += 1;
                continue;
            }

            /* 原生 HTML 块 */
            if (para.length === 0 && /^ {0,3}<(?:[a-zA-Z][a-zA-Z0-9-]*|\/[a-zA-Z][a-zA-Z0-9-]*|!--|!DOCTYPE|\?)/.test(line)) {
                flushPara();
                var hbuf = [line];
                var tagm = /^ {0,3}<([a-zA-Z][a-zA-Z0-9-]*)/.exec(line);
                var lower = tagm ? tagm[1].toLowerCase() : '';
                i += 1;
                if (lower === 'script' || lower === 'style' || lower === 'pre' || lower === 'textarea') {
                    var closeRe2 = new RegExp('</' + lower + '\\s*>', 'i');
                    if (!closeRe2.test(line)) {
                        while (i < n) {
                            hbuf.push(lines[i]);
                            if (closeRe2.test(lines[i])) { i += 1; break; }
                            i += 1;
                        }
                    }
                } else if (/^ {0,3}<!--/.test(line)) {
                    while (i < n) {
                        hbuf.push(lines[i]);
                        if (lines[i].indexOf('-->') >= 0) { i += 1; break; }
                        i += 1;
                    }
                } else {
                    while (i < n && lines[i].trim() !== '') {
                        hbuf.push(lines[i]);
                        i += 1;
                    }
                }
                out.push(sanitizeHtmlChunk(hbuf.join('\n')));
                continue;
            }

            /* 缩进代码块（不可打断段落） */
            if (indent >= 4 && para.length === 0) {
                var cbuf = [];
                while (i < n && (lines[i].trim() === '' || leadingSpaces(lines[i]) >= 4)) {
                    cbuf.push(lines[i].replace(/^ {1,4}/, ''));
                    i += 1;
                }
                while (cbuf.length > 0 && cbuf[cbuf.length - 1].trim() === '') cbuf.pop();
                out.push(renderCodeBlock(cbuf.join('\n'), ''));
                continue;
            }

            /* 普通段落 */
            para.push(line);
            i += 1;
        }

        flushPara();
        return out.join('\n');
    }

    /* ---------------- 入口 ---------------- */

    function parse(src) {
        stashArr = [];
        slugCounts = {};
        firstTitle = '';
        var refs = {};

        src = String(src === undefined || src === null ? '' : src)
            .replace(/^\uFEFF/, '')
            .replace(/\r\n?/g, '\n');

        var lines = src.split('\n').map(function (l) {
            return l.replace(/^([\t ]+)/, function (mm) { return mm.replace(/\t/g, '    '); });
        });

        lines = extractRefDefs(lines, refs);

        var html = parseBlocks(lines, refs, { tight: false });
        html = restoreAll(html);
        return { html: html, title: firstTitle };
    }

    var api = { parse: parse };
    global.MRMarkdown = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : self);
