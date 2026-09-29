# Markdown Reader 演示文档

这是一个用于测试与演示的 **Markdown** 文档：既包含*中文*排版，也包含 English inline styles、***粗斜体*** 与 ~~删除线~~。

## 行内语法

普通文本包含 **粗体**、*斜体*、`行内代码`、[链接](https://example.com "示例站点")，以及自动链接 https://github.com 和 <dev@example.com>。

转义字符：\*不是斜体\*、3 \> 2、5 \< 6。

HTML 实体：&copy; 2026 &mdash; Markdown Reader &amp; Friends。

行尾两个空格产生硬换行  
第二行内容。

反斜杠硬换行\
第三行内容。

<kbd>Ctrl</kbd> + <kbd>C</kbd> 复制，<mark>高亮文本</mark>，<details><summary>点开详情</summary>这里是被折叠的内容。</details>

Setext 一级标题
===============

Setext 二级标题
---------------

###### 六级标题

## 引用块

> 这是一段引用文字。
> 第二行延续。
>
> > 嵌套引用。

## 列表

### 无序列表

- 第一项
- 第二项包含 `代码`
  - 嵌套项 A
  - 嵌套项 B
- 第三项

### 有序列表

1. 步骤一
2. 步骤二
   1. 子步骤
   2. 子步骤二
3. 步骤三

98. 从 98 开始的有序列表

### 任务列表

- [x] 已完成：设计主题样式
- [ ] 待办：支持数学公式
- [x] 已完成：暗色模式

## 表格

| 功能 | 状态 | 备注 |
| :--- | :---: | ---: |
| Markdown 渲染 | ✅ | 支持 GFM 表格 |
| 自定义 CSS | ✅ | 弹窗编辑，实时生效 |
| 数学公式 | ❌ | 暂不支持 |

表格内 `code`、**粗体** 与 [链接](https://example.org) 也可用。

## 代码块

```js
// 计算斐波那契数列
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2); // 递归
}
const message = "Hello, 世界!";
class App extends Base {}
console.log(`${message} n=10 → ${fib(10)}`);
```

```python
# 快速排序
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[0]
    left = [x for x in arr[1:] if x < pivot]
    right = [x for x in arr[1:] if x >= pivot]
    return quicksort(left) + [pivot] + quicksort(right)
```

```json
{
  "name": "markdown-reader",
  "version": "1.0.0",
  "private": true,
  "tags": ["markdown", "reader"]
}
```

```html
<div class="card">
  <!-- 注释 -->
  <h2>标题</h2>
  <p>内容 <a href="https://example.com">链接</a></p>
</div>
```

```css
.card {
  /* 卡片样式 */
  padding: 16px 20px;
  border-radius: 12px;
  background: #f3f1ed;
}
```

```bash
# 安装依赖
npm install && npm run build
echo "版本: $VERSION"
```

```diff
+ 新增的功能
- 移除的功能
@@ 上下文 @@
```

```plaintext
未知语言回退到纯文本 <b>不会被解释</b>
```

    缩进代码块
    第二行

## 分割线

---

## 原生 HTML 块

<div class="raw-block">
  <p>HTML 块中的内容，危险标签会被净化。</p>
</div>

## 引用式链接

参见 [Zen Browser][zen] 与 [MDN][mdn]，以及简写 [MDN]。

[zen]: https://zen-browser.app "Zen 官网"
[mdn]: https://developer.mozilla.org

## 危险内容净化

<script>alert('应当被整块移除');</script>

[点击我](javascript:alert(1)) —— 危险协议链接应当被剥除，仅保留文字。

<img src="https://example.com/pic.png" onerror="alert(2)"> —— 事件属性应当被移除。

## 长标题测试：这一行有非常多的中文字符用来测试自动换行以及标题样式的实际显示效果

一段较长的正文用于测试段落宽度与行高：排版参考了 Notion、Apple Notes 与 Medium 的阅读体验，正文最大宽度 900px，行高 1.85，字间距略微放宽，让中文阅读更加舒适。标题采用暖黑色并带有分隔线，代码块使用暖灰色背景融入整体风格，表格带有圆角与悬浮高亮。
