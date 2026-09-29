/* =====================================================
   Markdown Reader · 轻量语法高亮
   输出 hljs 兼容的 class：
   hljs-comment / hljs-keyword / hljs-string / hljs-attr /
   hljs-number / hljs-title / hljs-variable
   与默认主题的代码配色规则一一对应。零依赖。
   ===================================================== */
(function (global) {
    'use strict';

    function escapeCode(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function span(cls, text) {
        return '<span class="hljs-' + cls + '">' + escapeCode(text) + '</span>';
    }

    /* ---------------- 关键词表 ---------------- */

    var KEYWORDS = {
        js: 'async await break case catch class const continue debugger default delete do else enum export extends false finally for from function get if implements import in instanceof interface let new null of package private protected public readonly return satisfies set static super switch this throw true try type typeof var void while with yield as is keyof infer declare namespace abstract override',
        python: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield match case self cls',
        c: 'alignas alignof auto bool break case catch char class const consteval constexpr continue decltype default delete do double else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept nullptr operator private protected public register return short signed sizeof static static_assert struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile while include define ifdef ifndef endif pragma error warning',
        java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public record return sealed short static strictfp super switch synchronized this throw throws transient try var void volatile while true false null permits yield',
        csharp: 'abstract as async await base bool break byte case catch char checked class const continue decimal default delegate do double dynamic else enum event explicit extern false finally fixed float for foreach get goto if implicit in int interface internal is lock long namespace new null object operator out override params partial private protected public readonly ref return sbyte sealed set short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while record init required global',
        go: 'append bool break byte cap chan close complex complex128 complex64 const continue copy default defer delete else error false fallthrough float32 float64 for func go goto if imag import int int16 int32 int64 int8 interface iota len make map new nil package panic print println range real recover return select string struct switch true type uint uint16 uint32 uint64 uint8 uintptr var',
        rust: 'as async await box break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 str String Vec Option Some None Ok Err Result Box',
        php: 'abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield true false null',
        ruby: 'alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield attr_accessor attr_reader attr_writer require require_relative include extend puts print lambda proc raise new loop each map select reject',
        swift: 'associatedtype class deinit enum extension fileprivate func import init inout internal let open operator private protocol public rethrows static struct subscript typealias var break case continue default defer do else fallthrough for guard if in repeat return switch where while as Any catch false is nil super self throw throws true try',
        kotlin: 'abstract actual annotation as break by catch class companion const constructor continue crossinline data do dynamic else enum expect external false final finally for fun get if import in infix init inline interface internal is lateinit noinline null object open operator out override package private protected public reified return sealed set suspend tailrec this throw true try typealias val var vararg when where while',
        bash: 'alias bg bind break builtin case cd command compgen complete continue declare dirs do done echo elif else enable esac eval exec exit export fc fg fi for function getopts hash help history if in jobs kill let local logout popd printf pushd pwd read readonly return select set shift shopt source suspend test then time times trap type typeset ulimit umask unalias unset until wait while sudo apt git npm npx yarn pip python python3 node curl wget mkdir rm cp mv ls cat grep sed awk chmod chown tar zip unzip docker',
        sql: 'SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP ALTER ADD PRIMARY KEY FOREIGN REFERENCES JOIN LEFT RIGHT FULL INNER OUTER CROSS ON GROUP BY ORDER HAVING LIMIT OFFSET AS AND OR NOT NULL DISTINCT COUNT SUM AVG MIN MAX UNION ALL EXISTS CASE WHEN THEN ELSE END LIKE ILIKE IN BETWEEN IS ASC DESC DEFAULT UNIQUE INDEX VIEW TRIGGER PROCEDURE FUNCTION BEGIN COMMIT ROLLBACK TRANSACTION IF',
        json: 'true false null',
        yaml: 'true false null yes no on off True False Null Null YES NO On Off',
        toml: 'true false'
    };

    var ALIAS = {
        javascript: 'js', js: 'js', jsx: 'js', mjs: 'js', cjs: 'js', node: 'js',
        typescript: 'js', ts: 'js', tsx: 'js',
        json: 'json', json5: 'json', jsonc: 'json',
        python: 'python', py: 'python', py3: 'python', python3: 'python',
        c: 'c', h: 'c', cpp: 'c', 'c++': 'c', cc: 'c', cxx: 'c', hpp: 'c', hh: 'c', hxx: 'c', objc: 'c',
        java: 'java', csharp: 'csharp', cs: 'csharp', 'c#': 'csharp',
        go: 'go', golang: 'go',
        rust: 'rust', rs: 'rust',
        php: 'php', ruby: 'ruby', rb: 'ruby',
        swift: 'swift', kotlin: 'kotlin', kt: 'kotlin', kts: 'kotlin',
        bash: 'bash', sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash', 'shell-session': 'bash',
        dockerfile: 'bash', makefile: 'bash',
        sql: 'sql', mysql: 'sql', postgres: 'sql', postgresql: 'sql', sqlite: 'sql',
        yaml: 'yaml', yml: 'yaml',
        toml: 'toml', ini: 'toml', conf: 'toml', cfg: 'toml', properties: 'toml',
        html: 'xml', xml: 'xml', svg: 'xml', vue: 'xml', svelte: 'xml', xhtml: 'xml', xsl: 'xml',
        css: 'css', scss: 'css', sass: 'css', less: 'css',
        diff: 'diff', patch: 'diff',
        markdown: 'md', md: 'md', mdx: 'md'
    };

    var CLIKE = {
        js:     { kw: KEYWORDS.js,     line: '//',           block: ['/*', '*/'], template: true, types: true },
        python: { kw: KEYWORDS.python, line: '#',            triple: true },
        c:      { kw: KEYWORDS.c,      line: '//',           block: ['/*', '*/'], types: true },
        java:   { kw: KEYWORDS.java,   line: '//',           block: ['/*', '*/'], types: true },
        csharp: { kw: KEYWORDS.csharp, line: '//',           block: ['/*', '*/'], types: true },
        go:     { kw: KEYWORDS.go,     line: '//',           block: ['/*', '*/'], types: true },
        rust:   { kw: KEYWORDS.rust,   line: '//',           block: ['/*', '*/'], types: true },
        php:    { kw: KEYWORDS.php,    line: '(?:\\/\\/|#)', block: ['/*', '*/'], types: true, var: true },
        ruby:   { kw: KEYWORDS.ruby,   line: '#',            var: true },
        swift:  { kw: KEYWORDS.swift,  line: '//',           block: ['/*', '*/'], types: true },
        kotlin: { kw: KEYWORDS.kotlin, line: '//',           block: ['/*', '*/'], types: true },
        bash:   { kw: KEYWORDS.bash,   line: '#',            var: true },
        sql:    { kw: KEYWORDS.sql,    line: '(?:--|#)',     block: ['/*', '*/'], flag: 'i' },
        toml:   { kw: KEYWORDS.toml,   line: '#' }
    };

    /* ---------------- 工具 ---------------- */

    function escRe(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* 通用：按命名组映射运行正则，把捕获片段包上 span */
    function runRegex(code, re, map) {
        var out = '';
        var last = 0;
        var m;
        re.lastIndex = 0;
        while ((m = re.exec(code)) !== null) {
            if (m[0].length === 0) { re.lastIndex++; continue; }
            out += escapeCode(code.slice(last, m.index));
            var cls = null;
            if (m.groups) {
                for (var g in map) {
                    if (Object.prototype.hasOwnProperty.call(map, g) && m.groups[g] !== undefined) { cls = map[g]; break; }
                }
            }
            out += cls ? span(cls, m[0]) : escapeCode(m[0]);
            last = m.index + m[0].length;
        }
        out += escapeCode(code.slice(last));
        return out;
    }

    /* ---------------- C 系语言（含 js/py 等） ---------------- */

    var clikeCache = {};

    function buildClike(mode) {
        if (clikeCache[mode]) return clikeCache[mode];
        var cfg = CLIKE[mode];
        var parts = [];

        if (cfg.block) {
            parts.push('(?<blockc>' + escRe(cfg.block[0]) + '[\\s\\S]*?' + escRe(cfg.block[1]) + ')');
        }
        if (cfg.line) {
            parts.push('(?<linec>' + cfg.line + '[^\\n]*)');
        }

        var strs = [];
        if (cfg.triple) strs.push('"""[\\s\\S]*?"""', "'''[\\s\\S]*?'''");
        strs.push('"(?:[^"\\\\\\n]|\\\\.)*"', "'(?:[^'\\\\\\n]|\\\\.)*'");
        if (cfg.template) strs.push('`(?:[^`\\\\]|\\\\.)*`');
        if (mode === 'bash') strs.push('\\$"(?:[^"\\\\\\n]|\\\\.)*"', "\\$'(?:[^'\\\\\\n]|\\\\.)*'");
        parts.push('(?<str>' + strs.join('|') + ')');

        if (cfg.var) parts.push('(?<varr>\\$\\{[^}]*\\}|\\$[\\w@#?*!-]+)');

        parts.push('(?<num>(?<![\\w])0[xX][0-9a-fA-F_]+|(?<![\\w])0[bB][01_]+|(?<![\\w])[0-9][0-9_]*(?:\\.[0-9_]*)?(?:[eE][+-]?[0-9]+)?)[a-zA-Z]?');

        parts.push('(?<kw>\\b(?:' + cfg.kw.trim().split(/\s+/).map(escRe).join('|') + ')\\b)');

        parts.push('(?<fn>[A-Za-z_$][\\w$]*(?=\\s*\\())');

        if (cfg.types) parts.push('(?<typ>\\b[A-Z][A-Za-z0-9_]*\\b)');

        var re = new RegExp(parts.join('|'), cfg.flag === 'i' ? 'gmi' : 'gm');
        clikeCache[mode] = re;
        return re;
    }

    var CLIKE_MAP = { blockc: 'comment', linec: 'comment', varr: 'variable', str: 'string', num: 'number', kw: 'keyword', fn: 'title', typ: 'title' };

    function highlightClike(code, mode) {
        return runRegex(code, buildClike(mode), CLIKE_MAP);
    }

    /* ---------------- HTML / XML ---------------- */

    function xmlAttrs(s) {
        var out = '';
        var re = /([^\s=\/>"']+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)?|\s+|./g;
        var m;
        while ((m = re.exec(s)) !== null) {
            if (m[1] !== undefined) {
                out += span('attr', m[1]);
                if (m[2]) {
                    out += escapeCode(m[2]);
                    if (m[3] !== undefined) out += span('string', m[3]);
                }
            } else {
                out += escapeCode(m[0]);
            }
        }
        return out;
    }

    function highlightXml(code) {
        var out = '';
        var i = 0;
        var n = code.length;
        var tagRe = /<(\/?)([a-zA-Z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/y;
        while (i < n) {
            var lt = code.indexOf('<', i);
            if (lt < 0) { out += escapeCode(code.slice(i)); break; }
            out += escapeCode(code.slice(i, lt));
            if (code.startsWith('<!--', lt)) {
                var e = code.indexOf('-->', lt + 4);
                var end = e < 0 ? n : e + 3;
                out += span('comment', code.slice(lt, end));
                i = end;
                continue;
            }
            if (code.startsWith('<!', lt) || code.startsWith('<?', lt)) {
                var e2 = code.indexOf('>', lt);
                var end2 = e2 < 0 ? n : e2 + 1;
                out += span('keyword', code.slice(lt, end2));
                i = end2;
                continue;
            }
            tagRe.lastIndex = lt;
            var m = tagRe.exec(code);
            if (!m) { out += escapeCode('<'); i = lt + 1; continue; }
            out += '<' + m[1] + span('keyword', m[2]) + xmlAttrs(m[3]) + m[4] + '>';
            i = lt + m[0].length;
        }
        return out;
    }

    /* ---------------- CSS ---------------- */

    var CSS_KINDS = ['comment', 'string', 'keyword', 'attr', 'number'];
    var cssRe = /(\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(@[\w-]+)|([-a-zA-Z]{2,}(?=\s*:))|((?<![\w-])#[0-9a-fA-F]{3,8}\b|(?<![\w-])-?[0-9][0-9.]*(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|ex|pt|pc|cm|mm|in)?\b)/g;

    function highlightCss(code) {
        var out = '';
        var last = 0;
        var m;
        cssRe.lastIndex = 0;
        while ((m = cssRe.exec(code)) !== null) {
            if (m[0].length === 0) { cssRe.lastIndex++; continue; }
            out += escapeCode(code.slice(last, m.index));
            var cls = null;
            for (var k = 1; k < m.length; k++) {
                if (m[k] !== undefined) { cls = CSS_KINDS[k - 1]; break; }
            }
            out += cls ? span(cls, m[0]) : escapeCode(m[0]);
            last = m.index + m[0].length;
        }
        out += escapeCode(code.slice(last));
        return out;
    }

    /* ---------------- JSON / YAML / DIFF / Markdown ---------------- */

    var jsonRe = /(?<attr>"(?:[^"\\]|\\.)*")(?=\s*:)|(?<str>"(?:[^"\\]|\\.)*")|(?<num>(?<![\w])-?[0-9][0-9]*(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)|(?<kw>\b(?:true|false|null)\b)/g;
    var JSON_MAP = { attr: 'attr', str: 'string', num: 'number', kw: 'keyword' };

    var yamlRe = /(?<linec>#[^\n]*)|(?<attr>^[ \t]*-?[ \t]*[\w.$\/-]+(?=\s*:(?:\s|$)))|(?<str>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(?<num>(?<![\w])-?[0-9][0-9.]*)|(?<kw>\b(?:true|false|null|yes|no|on|off|True|False|Null|YES|NO|On|Off)\b)/gm;
    var YAML_MAP = { linec: 'comment', attr: 'attr', str: 'string', num: 'number', kw: 'keyword' };

    function highlightDiff(code) {
        return code.split('\n').map(function (line) {
            if (line.startsWith('@@')) return span('number', line);
            if (/^(diff |index |--- |\+\+\+ )/.test(line)) return span('comment', line);
            if (line.startsWith('+')) return span('string', line);
            if (line.startsWith('-')) return span('variable', line);
            return escapeCode(line);
        }).join('\n');
    }

    function highlightMd(code) {
        return code.split('\n').map(function (line) {
            var m;
            if (/^#{1,6}[ \t]/.test(line)) return span('keyword', line);
            if ((m = /^(\s*(?:[-*+]|\d+[.)])[ \t]+)(.*)$/.exec(line))) {
                return span('keyword', m[1]) + escapeCode(m[2]);
            }
            if (/^\s*```/.test(line)) return span('comment', line);
            if (/^>/.test(line)) return span('comment', line);
            if (/^\s*(?:[-*_][ \t]*){3,}$/.test(line)) return span('comment', line);
            return escapeCode(line);
        }).join('\n');
    }

    /* ---------------- 入口 ---------------- */

    function highlight(code, lang) {
        var mode = ALIAS[String(lang || '').toLowerCase()];
        if (!mode) return escapeCode(code);
        try {
            switch (mode) {
                case 'xml': return highlightXml(code);
                case 'css': return highlightCss(code);
                case 'json': return runRegex(code, jsonRe, JSON_MAP);
                case 'yaml': return runRegex(code, yamlRe, YAML_MAP);
                case 'diff': return highlightDiff(code);
                case 'md': return highlightMd(code);
                default: return highlightClike(code, mode);
            }
        } catch (e) {
            return escapeCode(code);
        }
    }

    var api = { highlight: highlight };
    global.MRHighlight = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : self);
