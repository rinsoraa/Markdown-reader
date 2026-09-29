# Markdown Reader — 优雅的 Markdown 阅读器扩展

一个适用于 **Zen Browser**（优先）、**Microsoft Edge**、**Chrome / Chromium** 的浏览器扩展：
打开 `.md` 文件时自动将其渲染为优雅排版的阅读页面（Notion × Apple Notes × Medium 风格），
并支持在弹窗中**自定义 CSS**，保存后所有已打开的 md 页面实时生效。

- 纯本地运行，无任何网络请求，不上传任何数据
- 零第三方依赖：内置自研 Markdown 解析器（CommonMark + GFM 子集）与轻量语法高亮
- 支持本地文件（`file://`）、`raw.githubusercontent.com` 等任何以 `text/plain` / `text/markdown`
  提供的 `.md` 页面
- 自动适配亮色 / 暗色模式（跟随系统）
- XSS 净化：`<script>` 整块移除、`javascript:` 链接剥除、事件属性剥离，只保留安全的 HTML

## 下载安装

前往 [Releases](https://github.com/rinsoraa/Markdown-reader/releases/latest) 下载安装包：

- **Zen Browser / Firefox**：`markdown-reader-1.0.0.xpi`（直接安装）
- **Edge / Chrome / Chromium**：`markdown-reader-1.0.0.zip`（解压后以开发者模式加载）

各浏览器的详细安装步骤与注意事项见 [Release 说明](https://github.com/rinsoraa/Markdown-reader/releases/latest)
与下文「安装」一节；从源码运行则按本目录结构加载即可。

## 目录结构

```
markdown_reader/
├── manifest.json          # MV3 清单（Chromium 与 Gecko 双兼容）
├── content/
│   ├── theme.css          # 默认主题（即初始 CSS，可在弹窗中覆盖）
│   ├── parser.js          # Markdown → HTML 解析器
│   ├── highlight.js       # 轻量语法高亮（hljs 兼容 class）
│   └── content.js         # 内容脚本：检测 / 渲染 / 实时样式更新
├── popup/                 # 工具栏弹窗（自定义 CSS 编辑器）
│   ├── popup.html / popup.css / popup.js
├── icons/                 # 扩展图标（含生成脚本 gen_icons.py）
├── test/                  # Node 测试与渲染预览
│   ├── sample.md          # 综合测试样例
│   ├── test.js            # 测试套件（54 项断言）
│   └── preview.html       # 浏览器渲染预览（由测试生成）
├── scripts/build.py       # 打包脚本
└── dist/                  # 打包产物（zip / xpi）
```

## 安装

### Zen Browser（优先适配）

Zen 基于 Firefox（Gecko），支持 Manifest V3。三种方式任选：

**方式一：临时加载（开发调试，重启浏览器后失效）**

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件…」，选择本目录的 `manifest.json`
3. 授予站点权限：点击工具栏中的扩展图标，按提示允许
   「访问所有网站的数据」；或在 `about:addons` → Markdown Reader →
   「权限」页签中勾选该权限（MV3 的主机权限需要手动授权一次）

**方式二：永久安装（推荐）**

1. 使用 `dist/markdown-reader-1.0.0.xpi`
2. 打开 `about:addons` → 齿轮图标 →「从文件安装附加组件…」，选择该 xpi
3. 若提示签名校验失败，在 `about:config` 中将
   `xpinstall.signatures.required` 设为 `false` 后重试
4. 同上，在权限页签中允许「访问所有网站的数据」

**方式三：**
将 zip 提交到 addons.mozilla.org 签名后自行安装（适合长期分发）。

### Microsoft Edge

1. 打开 `edge://extensions`，开启左下角「开发人员模式」
2. 点击「加载解压缩的扩展」，选择本目录（含 `manifest.json` 的文件夹）
3. **重要**：在扩展详情页中开启「允许访问文件 URL」，否则本地 `.md` 文件无法渲染

### Chrome / Chromium

1. 打开 `chrome://extensions`，开启右上角「开发者模式」
2. 点击「加载已解压的扩展程序」，选择本目录
3. **重要**：在扩展详情页中开启「允许访问文件网址」

## 使用

1. 用浏览器直接打开任意 `.md` 文件（本地文件或网页 URL），页面会自动渲染为优雅排版
2. 点击工具栏扩展图标，弹出设置面板：
   - **启用渲染**：总开关，关闭后恢复浏览器原生纯文本显示
   - **自定义 CSS**：文本框预填了当前默认主题，直接修改即可；
     保存的 CSS 追加在默认主题之后，相同规则以自定义为准（可覆盖任意默认样式）
   - **保存**（支持 `Ctrl/Cmd + S`）：立即应用到所有已打开的 md 页面
   - **恢复默认主题**：重新载入默认样式到编辑框
   - **清空自定义**：恢复为纯默认主题
   - 底部显示当前标签页的渲染状态
3. 自定义示例（粘贴到编辑框后保存）：

```css
/* 更窄的版心 + 衬线标题 */
.markdown-body { max-width: 760px !important; }
h1, h2 { font-family: Georgia, "Songti SC", serif !important; }

/* 代码块换成深色 */
pre {
  background: #20242c !important;
  color: #d5dae3 !important;
  border-color: #2c313a !important;
}
pre code { color: #d5dae3 !important; }
```

## 检测规则（何时渲染）

满足以下任一条件时渲染：

- URL 路径以 `.md` / `.markdown` / `.mdown` / `.mkd` 结尾，且响应类型为 `text/plain`
- 响应类型为 `text/markdown`、`text/x-markdown`、`application/markdown` 等

以 `text/html` 提供的 .md 页面（如 GitHub 仓库页面）不会被改动。

## 本地开发

```bash
# 运行测试（54 项断言），并生成 test/preview.html
node test/test.js

# 浏览器打开 test/preview.html 可直接预览默认主题渲染效果

# 重新生成图标
python icons/gen_icons.py

# 打包 dist/markdown-reader-<版本>.zip 与 .xpi
python scripts/build.py
```

## 已知限制

- 服务器以 `application/octet-stream` 下发的 `.md` 会被浏览器直接下载，扩展无法拦截（浏览器机制）
- 数学公式（LaTeX）、Mermaid 图表暂未支持
- 高亮为自研轻量实现，覆盖常见语言（js/ts、python、c/c++、java、c#、go、rust、php、ruby、
  swift、kotlin、bash、sql、json、yaml、toml、html/xml、css、diff、markdown），未覆盖的语言以纯文本显示

## 隐私

扩展不包含任何遥测、不发起任何网络请求；所有解析与渲染均在本地完成。
