/* Markdown Reader · Node 测试
 * 运行：node test/test.js
 * 校验解析器/高亮器的输出，并生成 test/preview.html 供浏览器预览。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

require('../content/highlight.js');
require('../content/parser.js');

const MRMarkdown = globalThis.MRMarkdown;
const MRHighlight = globalThis.MRHighlight;

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
    try {
        fn();
        passed += 1;
    } catch (e) {
        failed += 1;
        failures.push(`✗ ${name}\n    ${e.message.split('\n').join('\n    ')}`);
    }
}

/* ---------------- 主样例 ---------------- */

const src = fs.readFileSync(path.join(__dirname, 'sample.md'), 'utf8');
const res = MRMarkdown.parse(src);
const html = res.html;

check('h1 渲染 + slug id', () => {
    assert.ok(html.includes('<h1 id="markdown-reader-演示文档">'), 'missing h1 slug');
});
check('h6 渲染', () => {
    assert.ok(html.includes('<h6'), 'missing h6');
});
check('Setext 标题', () => {
    assert.ok(html.includes('<h1 id="setext-一级标题">'), 'setext h1');
    assert.ok(html.includes('<h2 id="setext-二级标题">'), 'setext h2');
});
check('粗斜体嵌套', () => {
    assert.ok(html.includes('<strong><em>粗斜体</em></strong>'), 'bold+italic');
});
check('删除线', () => {
    assert.ok(html.includes('<del>删除线</del>'), 'del');
});
check('行内代码', () => {
    assert.ok(html.includes('<code>行内代码</code>'), 'inline code');
});
check('内联链接带标题', () => {
    assert.ok(html.includes('href="https://example.com" title="示例站点"'), 'link with title');
});
check('裸链接自动识别', () => {
    assert.ok(html.includes('href="https://github.com"'), 'bare url');
});
check('尖括号邮箱自动链接', () => {
    assert.ok(html.includes('href="mailto:dev@example.com"'), 'mailto');
});
check('转义星号不产生斜体', () => {
    assert.ok(!html.includes('<em>不是斜体</em>'), 'escaped star became em');
    assert.ok(html.includes('*不是斜体*'), 'escaped star missing');
});
check('HTML 实体保留', () => {
    assert.ok(html.includes('&copy; 2026'), 'entity');
    assert.ok(html.includes('&amp; Friends'), 'amp entity');
});
check('硬换行', () => {
    assert.ok((html.match(/<br>/g) || []).length >= 2, 'hard breaks');
});
check('kbd / mark / details 净化保留', () => {
    assert.ok(html.includes('<kbd>Ctrl</kbd>'), 'kbd');
    assert.ok(html.includes('<mark>高亮文本</mark>'), 'mark');
    assert.ok(html.includes('<summary>点开详情</summary>'), 'summary');
});
check('嵌套引用块', () => {
    assert.ok(
        html.includes('<p>这是一段引用文字。\n第二行延续。</p>\n<blockquote><p>嵌套引用。</p></blockquote>'),
        'nested blockquote'
    );
});
check('嵌套列表', () => {
    assert.ok(/<li>第二项包含 <code>代码<\/code>\n+<ul>/.test(html), 'nested ul');
});
check('有序列表合并与松散渲染', () => {
    /* CommonMark：同类标记的有序列表合并为一个 <ol>；
       项与项之间存在空行 → 整个列表为松散模式，项内出现 <p> */
    const ol = html.slice(html.indexOf('<ol>'));
    assert.ok(/<li><p>步骤一<\/p><\/li>/.test(ol), 'item 1 loose');
    assert.ok(/<li><p>从 98 开始的有序列表<\/p><\/li>/.test(ol), 'item 98 merged');
});
check('任务列表', () => {
    assert.ok(html.includes('class="contains-task-list"'), 'task list ul');
    assert.ok(html.includes('<input type="checkbox" disabled checked>'), 'checked box');
    assert.ok(html.includes('<input type="checkbox" disabled>'), 'unchecked box');
});
check('表格与对齐', () => {
    assert.ok(html.includes('<table>'), 'table');
    assert.ok(html.includes('style="text-align:center"'), 'center align');
    assert.ok(html.includes('style="text-align:right"'), 'right align');
});
check('代码块 language-js + 高亮', () => {
    assert.ok(html.includes('language-js'), 'lang class');
    assert.ok(html.includes('hljs-comment'), 'hljs comment');
    assert.ok(html.includes('hljs-keyword'), 'hljs keyword');
    assert.ok(html.includes('hljs-string'), 'hljs string');
    assert.ok(html.includes('hljs-title'), 'hljs title');
});
check('python 代码高亮', () => {
    assert.ok(html.includes('language-python'), 'python class');
    assert.ok(html.includes('hljs-number') || html.includes('hljs-string'), 'python tokens');
});
check('json 键值高亮为 attr', () => {
    assert.ok(html.includes('hljs-attr'), 'json attr');
});
check('html 代码块标签上色', () => {
    assert.ok(html.includes('data-lang="html"'), 'html lang');
});
check('css 代码块', () => {
    assert.ok(html.includes('data-lang="css"'), 'css lang');
});
check('diff 高亮', () => {
    assert.ok(html.includes('data-lang="diff"'), 'diff lang');
    assert.ok(html.includes('hljs-variable'), 'diff deletion');
});
check('未知语言回退纯文本', () => {
    assert.ok(html.includes('&lt;b&gt;不会被解释&lt;/b&gt;'), 'unknown lang escaped');
});
check('缩进代码块', () => {
    assert.ok(html.includes('<pre><code>缩进代码块'), 'indented code');
});
check('分割线', () => {
    assert.ok(html.includes('<hr>'), 'hr');
});
check('原生 HTML 块净化保留', () => {
    assert.ok(html.includes('<div class="raw-block">'), 'raw block kept');
});
check('引用式链接 + 简写', () => {
    assert.ok(html.includes('href="https://zen-browser.app" title="Zen 官网"'), 'ref link');
    assert.ok(html.includes('href="https://developer.mozilla.org"'), 'shorthand ref');
    assert.ok((html.match(/developer\.mozilla\.org/g) || []).length >= 2, 'shorthand count');
});
check('script 块整段移除', () => {
    assert.ok(!html.includes('<script'), 'script tag present');
    assert.ok(!html.includes('alert('), 'alert present');
});
check('javascript: 链接剥除', () => {
    assert.ok(!html.includes('javascript:'), 'js scheme present');
    assert.ok(html.includes('[点击我]') === false, 'raw brackets kept');
});
check('onerror 属性剥除', () => {
    assert.ok(!html.includes('onerror'), 'onerror present');
    assert.ok(html.includes('src="https://example.com/pic.png"'), 'img src kept');
});
check('无残留占位符', () => {
    assert.ok(!html.includes('\u0000'), 'placeholder leak');
    assert.ok(!html.includes('\u0001'), 'marker leak');
});
check('标题提取', () => {
    assert.strictEqual(res.title, 'Markdown Reader 演示文档');
});
check('长标题渲染', () => {
    assert.ok(html.includes('<h2 id="长标题测试'), 'long heading slug');
});

/* ---------------- 片段用例 ---------------- */

const t = (s) => MRMarkdown.parse(s).html;

check('片段: 紧凑列表无 p 标签', () => {
    assert.ok(t('- a\n- b').includes('<li>a\n</li>'), 'tight li');
    assert.ok(!t('- a\n- b').includes('<p>'), 'no p in tight list');
});
check('片段: 有序列表 start 属性', () => {
    assert.ok(t('98. 单独一节').includes('<ol start="98">'), 'standalone start');
});
check('片段: 松散列表有 p 标签', () => {
    assert.ok(t('- a\n\n- b').includes('<p>a</p>'), 'loose li');
});
check('片段: 表格', () => {
    assert.ok(t('| a | b |\n| --- | --- |\n| 1 | 2 |').includes('<td>1</td>'), 'table cell');
});
check('片段: 文本+--- 识别为 Setext 而非表格', () => {
    const h = t('a | b\n---');
    assert.ok(h.includes('<h2'), 'setext wins');
    assert.ok(!h.includes('<table>'), 'no table');
});
check('片段: 未闭合围栏到结尾', () => {
    assert.ok(t('```\nunclosed').includes('<pre><code>unclosed'), 'unclosed fence');
});
check('片段: 嵌套引用中的列表', () => {
    assert.ok(t('> - a\n> - b').includes('<ul>'), 'list in quote');
});
check('片段: 图片', () => {
    const h = t('![alt 文本](https://example.com/a.png "标题")');
    assert.ok(h.includes('<img src="https://example.com/a.png"'), 'img');
    assert.ok(h.includes('alt="alt 文本"'), 'alt');
});
check('片段: 危险图片地址剥除', () => {
    const h = t('![x](javascript:alert(1))');
    assert.ok(!h.includes('javascript:'), 'js img');
});
check('片段: 转义反引号外字符', () => {
    assert.ok(t('a\\*b\\*c').includes('a*b*c'), 'escape star');
});
check('片段: html 块中 script 清除', () => {
    assert.ok(t('<div>x</div>\n\n<script>bad()</script>').includes('<div>x</div>'), 'div kept');
});
check('片段: 表格内竖线转义', () => {
    const h = t('| a | b |\n| --- | --- |\n| x\\|y | 2 |');
    assert.ok(h.includes('<td>x|y</td>'), 'escaped pipe');
});
check('片段: 中文与 emoji 原样保留', () => {
    assert.ok(t('你好 🌏 世界').includes('你好 🌏 世界'), 'cjk+emoji');
});
check('片段: 空输入', () => {
    assert.strictEqual(MRMarkdown.parse('').html, '');
});
check('片段: 引用定义大小写不敏感', () => {
    assert.ok(t('[GitHub][GH]\n\n[gh]: https://github.com').includes('href="https://github.com"'), 'case-insensitive ref');
});
check('片段: 高亮器别名 jsonc/toml', () => {
    assert.ok(MRHighlight.highlight('{"a":1}', 'jsonc').includes('hljs-attr'), 'jsonc alias');
});
check('片段: yaml 高亮', () => {
    const h = MRHighlight.highlight('# 注释\nkey: "value"\nnum: 42', 'yaml');
    assert.ok(h.includes('hljs-comment'), 'yaml comment');
    assert.ok(h.includes('hljs-attr'), 'yaml key');
});
check('片段: xml 高亮', () => {
    const h = MRHighlight.highlight('<div class="x">text</div>', 'html');
    assert.ok(h.includes('hljs-keyword'), 'xml tag');
    assert.ok(h.includes('hljs-attr'), 'xml attr');
});
check('片段: 高亮不会产生未转义尖括号', () => {
    const h = MRHighlight.highlight('const s = "<b> & </b>";', 'js');
    assert.ok(!/(?<!&lt;)<(?!\/?span)/.test(h), 'raw tag leaked');
});

/* ---------------- 预览页生成 ---------------- */

function buildPreview() {
    const theme = fs.readFileSync(path.join(__dirname, '..', 'content', 'theme.css'), 'utf8');
    const base = [
        '.md-reader { min-height: 100vh; }',
        '.markdown-body, .markdown-body *, .markdown-body *::before, .markdown-body *::after { box-sizing: border-box; }',
        '.markdown-body details { margin: 22px 0; padding: 14px 20px; background: rgba(60,50,40,0.03); border: 1px solid #e8e3dc; border-radius: 14px; }',
        '.markdown-body summary { cursor: pointer; font-weight: 600; color: #242424; }',
        '.markdown-body kbd { display: inline-block; padding: 2px 7px; font-size: 0.85em; font-family: "JetBrains Mono", Consolas, monospace; color: #343434; background: #f1eee8; border: 1px solid #d8d2c9; border-bottom-width: 2px; border-radius: 6px; }',
        '.markdown-body mark { background: rgba(203,189,167,0.35); color: #343434; padding: 1px 5px; border-radius: 4px; }'
    ].join('\n');
    const page = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Markdown Reader 渲染预览</title>
<style>
${base}
</style>
<link rel="stylesheet" href="../content/theme.css">
</head>
<body>
<div class="md-reader">
<article class="markdown-body">
${html}
</article>
</div>
</body>
</html>`;
    fs.writeFileSync(path.join(__dirname, 'preview.html'), page, 'utf8');
    return page;
}

buildPreview();

/* ---------------- 汇总 ---------------- */

console.log(`\n通过 ${passed} 项，失败 ${failed} 项`);
if (failed > 0) {
    console.log('\n' + failures.join('\n'));
    process.exit(1);
}
console.log('已生成 test/preview.html（浏览器打开可查看渲染效果）');
