# WordPress 文章迁移说明

## 目标与边界

- 当前仓库内的 WordPress 迁移脚本统一放在 `scripts/wp-migration/`。
- 当前脚本只处理 **WordPress WXR XML 导出文件**，不直接读取 SQL dump。
- 当前流程分成两步：
  1. `audit` 先扫描 XML，产出审计报告，识别 permalink、标签、短代码、区块和需要人工处理的内容。
  2. `transform` 再把 XML 转成 FangYuan 可审阅的 Markdown 预览文件。
- `transform` 的输出建议先写到临时目录，人工验收通过后再合并进最终内容目录，不要直接把输出目标指向正式内容目录。

## 目录约定

### 脚本目录

```text
scripts/wp-migration/
  wordpress-wxr-audit.js
  wordpress-wxr-audit-core.js
  wordpress-wxr-audit-parse.js
  wordpress-wxr-audit-scan.js
  wordpress-wxr-audit-summary.js
  wordpress-wxr-audit-utils.js
  wordpress-wxr-transform.js
  wordpress-wxr-transform-core.js
  wordpress-wxr-transform.user.js
```

### 推荐的运行目录

```text
.temp/wp-migration/
  audit/
  preview/
```

- `audit/` 用来放扫描产物，例如 `audit-report.json`、`audit-summary.md`、`audit-index.csv`。
- `preview/` 用来放转换后的 Markdown 预览，例如 `posts/*.md`、`spec/*.md` 和 `transform-summary.json`。
- 审阅通过后，再把 `preview/` 下确认无误的内容合并到当前项目实际内容根目录。

## 推荐流程

### 1. 准备 WordPress 导出

- 在 WordPress 后台导出 XML，拿到 WXR 文件。
- 如果你的站点 permalink 是自定义规则，先准备好原站的 permalink 模板，例如：
  - `/%year%/%monthnum%/%day%/%postname%/`
  - `/%postname%.html`
- 如果原站里既有文章也有页面，默认保留 `post,page`。

### 2. 先跑审计

PowerShell 示例：

以下示例统一使用仓库相对路径，不包含任何本机绝对路径：

```powershell
node scripts/wp-migration/wordpress-wxr-audit.js `
  --input ".temp\wp-migration\source\wordpress.xml" `
  --output ".temp\wp-migration\audit" `
  --content-types "post,page" `
  --path-mode "flat" `
  --wp-permalink-template "/%year%/%monthnum%/%day%/%postname%/" `
  --report-formats "json,md,csv"
```

运行完成后，默认会输出：

- `audit-report.json`
- `audit-summary.md`
- `audit-index.csv`，前提是 `--report-formats` 包含 `csv`

优先看这几类信息：

- `permalinkPatternDetected`
- `alias` / `permalinkCandidate` / `aliasRaw`
- `category` / `subCategory`
- `blocking`
- `suggestedAction`

如果 `audit` 结果还没达到你能接受的程度，不要继续跑 `transform`，先补规则。

### 3. 再跑转换

PowerShell 示例：

```powershell
node scripts/wp-migration/wordpress-wxr-transform.js `
  --input ".temp\wp-migration\source\wordpress.xml" `
  --output ".temp\wp-migration\preview" `
  --content-types "post,page" `
  --path-mode "flat" `
  --wp-permalink-template "/%year%/%monthnum%/%day%/%postname%/" `
  --detect-link-pattern "true"
```

运行完成后，默认会输出：

- `posts/*.md`
- `spec/*.md`
- `transform-summary.json`

这些文件只是 **预览产物**。建议你先人工检查：

- frontmatter 是否符合 FangYuan 现有约定
- `alias` 是否正确
- `category` / `tags` 是否落到了对的字段
- 短代码、区块和特殊 HTML 是否已经转换成期望的 Markdown / directive

确认无误后，再把需要的内容并入正式目录。

## 审计脚本用法

入口文件：`scripts/wp-migration/wordpress-wxr-audit.js`

### 必填参数

- `--input`
  - WXR XML 文件路径
- `--output`
  - 审计输出目录

### 常用参数

- `--content-types`
  - 逗号分隔，默认 `post,page`
  - 例如：`post`、`post,page`
- `--path-mode`
  - 候选路径生成方式
  - `flat`：输出 `posts/foo.md`
  - `date-tree`：输出 `posts/YYYY/MM/DD/foo.md`
- `--use-gmt-dates`
  - `true` 时使用 WordPress 的 GMT 时间字段
  - 其他情况使用本地时间字段
- `--filename-source`
  - 预留给候选文件名来源策略
- `--wp-permalink-template`
  - 原站 permalink 模板
  - 如果你已知模板，优先显式传入，不要依赖猜测
- `--detect-link-pattern`
  - `true` 时允许从 `link` 推断 permalink pattern
  - 如果已经给了 `--wp-permalink-template`，通常仍建议保留 `true`，但结果以显式模板优先
- `--report-formats`
  - 逗号分隔，支持 `json`、`md`、`csv`
- `--default-frontmatter`
  - 可重复传入
  - 例如：`--default-frontmatter "lang=zh_CN"`
- `--legacy-id-field`
  - 审计记录里的旧站 ID 字段名，默认 `legacyId`
- `--alias-field`
  - 别名字段名，默认 `alias`
- `--permalink-candidate-field`
  - permalink 候选字段名，默认 `permalinkCandidate`
- `--alias-raw-field`
  - 原始未解析 alias 字段名，默认 `aliasRaw`

## 转换脚本用法

入口文件：`scripts/wp-migration/wordpress-wxr-transform.js`

### 必填参数

- `--input`
  - WXR XML 文件路径
- `--output`
  - 预览 Markdown 输出目录

### 常用参数

- `--content-types`
  - 默认 `post,page`
- `--path-mode`
  - `flat` 或 `date-tree`
- `--use-gmt-dates`
  - 是否使用 GMT 时间字段
- `--wp-permalink-template`
  - 原站 permalink 模板
- `--detect-link-pattern`
  - 是否允许从原始 `link` 自动推断 pattern

### 输出语义

- 文章会写到 `posts/`
- 页面会写到 `spec/`
- 每篇内容都会保留 frontmatter
- `transform-summary.json` 用于快速回看总条数和 note 数量

## 自定义规则怎么加

### 一类：内容转换规则

文件：`scripts/wp-migration/wordpress-wxr-transform.user.js`

这是 **第一优先级的自定义规则入口**。如果你要处理：

- 特定 shortcode
- 特定 Gutenberg block
- 第三方主题 / 插件私有块
- 需要转成 FangYuan directive 的特殊 HTML

优先在这里加。

当前入口函数是：

```js
export function applyUserTransformRules(source, context = {}) {
  const notes = context.notes ?? [];
  const helpers = context.helpers ?? {};
  let body = source;

  body = removeEditorSpecificBlocks(body);
  body = renderAlertBlocks(body, notes, helpers);
  body = renderAlertShortcodes(body, notes, helpers);
  body = renderFoldBlocks(body, notes, helpers);
  body = renderFoldShortcodes(body, notes, helpers);
  body = renderBilibiliShortcodes(body, notes, helpers);
  body = renderGithubEmbeds(body, notes, helpers);
  body = renderGistEmbeds(body, notes, helpers);
  body = removeMusicShortcodes(body, notes);

  return body;
}
```

新增一条转换规则时，推荐按下面的步骤：

1. 先写一个独立的 `renderXxx` 或 `removeXxx` 函数
2. 函数签名保持 `(source, notes, helpers)` 或接近当前风格
3. 用正则或结构化匹配只处理你明确知道的输入
4. 如果转换会丢信息，把说明写进 `notes`
5. 再把这条规则接到 `applyUserTransformRules(...)` 的合适顺序
6. 最后补测试

示例：

```js
function renderMyShortcode(source, notes, helpers) {
  return source.replace(
    /\[my_box\]([\s\S]*?)\[\/my_box\]/gi,
    (raw, body) => {
      notes.push({
        kind: "my-box-converted",
        rawSnippet: raw.trim(),
      });
      return helpers.renderAdmonition(
        "note",
        helpers.stripHtmlTags(body),
      );
    },
  );
}
```

然后在 `applyUserTransformRules(...)` 中接入：

```js
body = renderMyShortcode(body, notes, helpers);
```

### `helpers` 里有什么

当前 `transform.user.js` 能用到的 helper 包括：

- `extractAttr`
- `renderAdmonition`
- `renderFold`
- `renderInlineFormatting`
- `renderInlineHighlights`
- `stripHtmlTags`
- `trimString`
- `safeParseJson`
- `yamlString`

如果新增规则需要这些能力，优先复用 helper，不要在 `transform.user.js` 里重复造一套 HTML 清洗逻辑。

### 什么时候要写 `notes`

下面这几类情况建议写 `notes`：

- 转换会丢失一部分表现信息
- 输入格式不稳定，只能做降级处理
- 你需要在 `transform-summary.json` 里回头追查某类转换

例如当前已有的 note：

- `music-shortcode-removed`
- `image-alignment-dropped`

### 二类：结构扫描规则

文件：`scripts/wp-migration/wordpress-wxr-audit-scan.js`

如果你不是要“直接转换”，而是要：

- 在审计阶段标出某种危险标签
- 给某类私有区块单独分类
- 在 summary 里统计某类命中

先改 `audit-scan.js`，必要时再联动：

- `scripts/wp-migration/wordpress-wxr-audit-summary.js`
- `scripts/wp-migration/wordpress-wxr-audit-core.js`

适用场景：

- 新的 Gutenberg block 需要先分类为 `safe` / `review` / `blocking`
- 某类 shortcode 需要在 audit 报告里单独列出来
- 想让 summary 里出现新的统计项

## 加规则时的测试要求

相关测试文件：

- `tests/wordpress-wxr-audit.test.mjs`
- `tests/wordpress-wxr-audit-cli.test.mjs`
- `tests/wordpress-wxr-transform.test.mjs`

推荐做法：

1. 先在 `tests/test-helpers/wordpress-wxr-fixture.mjs` 现有样例基础上拼出最小输入
2. 为新增规则补一条 focused test
3. 只断言结果，不去匹配脚本源码文本

常用验证命令：

```powershell
node --test tests/wordpress-wxr-audit.test.mjs tests/wordpress-wxr-audit-cli.test.mjs tests/wordpress-wxr-transform.test.mjs
```

## 当前约束

- 当前脚本没有直接把预览内容导入正式内容目录的步骤
- 当前脚本没有直接处理 SQL dump 的 parser
- 当前脚本不会自动下载媒体资源，只会保留原始链接或转成 Markdown / HTML 占位

如果后续要扩展 SQL 导入、媒体落盘或自动写入正式目录，也建议继续放在 `scripts/wp-migration/` 下面，不要再把迁移相关脚本散回 `scripts/` 根目录。
