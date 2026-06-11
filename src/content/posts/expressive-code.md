---
title: Expressive Code 示例
published: 2026-02-16
updated: 2026-04-24
description: 使用 Expressive Code 展示 Markdown 代码块效果。
tags: [Markdown, 写作, 示例]
category: 示例
draft: false
---

下面集中展示 [Expressive Code](https://expressive-code.com/) 在 FangYuan 中的代码块效果。示例主要整理自官方文档，方便直接对照查看渲染结果。

## Expressive Code

### 语法高亮

[Syntax Highlighting](https://expressive-code.com/key-features/syntax-highlighting/)

#### 常规语法高亮

```js
console.log("这段代码启用了语法高亮！")
```

#### 渲染 ANSI 转义序列

```ansi
ANSI colors:
- Regular: [31mRed[0m [32mGreen[0m [33mYellow[0m [34mBlue[0m [35mMagenta[0m [36mCyan[0m
- Bold:    [1;31mRed[0m [1;32mGreen[0m [1;33mYellow[0m [1;34mBlue[0m [1;35mMagenta[0m [1;36mCyan[0m
- Dimmed:  [2;31mRed[0m [2;32mGreen[0m [2;33mYellow[0m [2;34mBlue[0m [2;35mMagenta[0m [2;36mCyan[0m

256 colors (showing colors 160-177):
[38;5;160m160 [38;5;161m161 [38;5;162m162 [38;5;163m163 [38;5;164m164 [38;5;165m165[0m
[38;5;166m166 [38;5;167m167 [38;5;168m168 [38;5;169m169 [38;5;170m170 [38;5;171m171[0m
[38;5;172m172 [38;5;173m173 [38;5;174m174 [38;5;175m175 [38;5;176m176 [38;5;177m177[0m

Full RGB colors:
[38;2;34;139;34mForestGreen - RGB(34, 139, 34)[0m

Text formatting: [1mBold[0m [2mDimmed[0m [3mItalic[0m [4mUnderline[0m
```

### 编辑器与终端边框

[Editor & Terminal Frames](https://expressive-code.com/key-features/frames/)

#### 代码编辑器边框

```js title="my-test-file.js"
console.log("标题属性示例")
```

---

```html
<!-- src/content/index.html -->
<div>文件名注释示例</div>
```

#### 终端边框

```bash
echo "这个终端边框没有标题"
```

---

```powershell title="PowerShell 终端示例"
Write-Output "这个终端边框带有标题！"
```

#### 覆写边框类型

```sh frame="none"
echo "看，这里没有边框！"
```

---

```ps frame="code" title="PowerShell 配置文件.ps1"
# 如果不手动覆写，这里默认会显示成终端边框
function Watch-Tail { Get-Content -Tail 20 -Wait $args }
New-Alias tail Watch-Tail
```

### 文本与行标记

[Text & Line Markers](https://expressive-code.com/key-features/text-markers/)

#### 标记整行与行区间

```js {1, 4, 7-8}
// 第 1 行 - 通过行号命中
// 第 2 行
// 第 3 行
// 第 4 行 - 通过行号命中
// 第 5 行
// 第 6 行
// 第 7 行 - 通过区间 "7-8" 命中
// 第 8 行 - 通过区间 "7-8" 命中
```

#### 选择行标记类型（mark、ins、del）

```js title="line-markers.js" del={2} ins={3-4} {6}
function demo() {
  console.log("这一行会被标记为删除")
  // 这一行和下一行会被标记为新增
  console.log("这是第二行新增内容")

  return "这一行使用默认的中性标记类型"
}
```

#### 给行标记添加标签

```jsx {"1":5} del={"2":7-8} ins={"3":10-12}
// labeled-line-markers.jsx
<button
  role="button"
  {...props}
  value={value}
  className={buttonClassName}
  disabled={disabled}
  active={active}
>
  {children &&
    !active &&
    (typeof children === "string" ? <span>{children}</span> : children)}
</button>
```

#### 使用单独一行显示长标签

```jsx {"1. 在这里传入 value 属性：":5-6} del={"2. 去掉 disabled 和 active 状态：":8-10} ins={"3. 添加这段逻辑以渲染 children：":12-15}
// labeled-line-markers.jsx
<button
  role="button"
  {...props}

  value={value}
  className={buttonClassName}

  disabled={disabled}
  active={active}
>

  {children &&
    !active &&
    (typeof children === "string" ? <span>{children}</span> : children)}
</button>
```

#### 使用 diff 风格语法

```diff
+这一行会被标记为新增
-这一行会被标记为删除
这一行是普通内容
```

---

```diff
--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
+这是一份真正的 diff 文件
-所有内容都会保持原样
 不会额外删除任何空白字符
```

#### 结合语法高亮与 diff 风格语法

```diff lang="js"
  function thisIsJavaScript() {
    // 这一整段都会按照 JavaScript 语法高亮，
    // 同时依然可以叠加 diff 标记！
-   console.log("旧代码将被移除")
+   console.log("这里换成新的代码")
  }
```

#### 标记行内的局部文本

```js "指定文本"
function demo() {
  // 可以在一行中标记任意指定文本
  return "支持对指定文本进行多次匹配";
}
```

#### 正则表达式

```ts /ye[sp]/
console.log("yes 和 yep 这两个单词都会被标记。")
```

#### 转义正斜杠

```sh /logs\/.*\.txt/
echo "测试" > logs/output.txt
```

#### 选择行内标记类型（mark、ins、del）

```js "return true;" ins="新增" del="删除"
function demo() {
  console.log("这里演示新增与删除两种行内标记");
  // return 语句会使用默认标记类型
  return true;
}
```

### 自动换行

[Word Wrap](https://expressive-code.com/key-features/word-wrap/)

#### 按代码块配置换行

```js wrap
// 启用自动换行的示例
function getLongString() {
  return "这是一段非常长的字符串，除非容器足够宽，否则大概率放不进可见区域"
}
```

---

```js wrap=false
// 禁用自动换行的示例
function getLongString() {
  return "这是一段非常长的字符串，除非容器足够宽，否则大概率放不进可见区域"
}
```

#### 配置换行后的缩进

```js wrap preserveIndent
// preserveIndent 示例（默认启用）
function getLongString() {
  return "这是一段非常长的字符串，除非容器足够宽，否则大概率放不进可见区域"
}
```

---

```js wrap preserveIndent=false
// preserveIndent=false 示例
function getLongString() {
  return "这是一段非常长的字符串，除非容器足够宽，否则大概率放不进可见区域"
}
```

## 可折叠区块

[Collapsible Sections](https://expressive-code.com/plugins/collapsible-sections/)

```js collapse={1-5, 12-14, 21-24}
// 这一段样板初始化代码会被折叠
import { someBoilerplateEngine } from "@example/some-boilerplate"
import { evenMoreBoilerplate } from "@example/even-more-boilerplate"

const engine = someBoilerplateEngine(evenMoreBoilerplate())

// 这部分代码默认会展开显示
engine.doSomething(1, 2, 3, calcFn)

function calcFn() {
  // 可以在同一个代码块里设置多个折叠区
  const a = 1
  const b = 2
  const c = a + b

  // 这一行会保持可见
  console.log(`计算结果：${a} + ${b} = ${c}`)
  return c
}

// 从这里到代码块结尾会再次折叠
engine.closeConnection()
engine.freeMemory()
engine.shutdown({ reason: "示例样板代码结束" })
```

## 行号

[Line Numbers](https://expressive-code.com/plugins/line-numbers/)

### 按代码块显示行号

```js showLineNumbers
// 这个代码块会显示行号
console.log("这里是第 2 行")
console.log("这里是第 3 行")
```

---

```js showLineNumbers=false
// 这个代码块关闭了行号
console.log("你好")
console.log("现在你知道我在第几行了吗？")
```

### 修改起始行号

```js showLineNumbers startLineNumber=5
console.log("这里是第 5 行")
console.log("这里是第 6 行")
```
