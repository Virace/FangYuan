# FangYuan / 方圆

FangYuan 是一个基于 Astro 的个人站点二开基线项目。当前首次提交的目标，是把上游模板仓库整理成一个干净、可回溯、便于后续继续设计主题与内容的项目起点。

## 上游说明

本项目基于 [saicaca/fuwari](https://github.com/saicaca/fuwari) 二次开发。

## 本地开发

要求：

- Node.js >= 22.12.0
- pnpm >= 9

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
```

## 说明

- 站点默认配置位于 `src/config.ts`
- 文章内容位于 `src/content/posts/`
- About 页面内容位于 `src/content/spec/about.md`
- 当前项目主身份统一为 `FangYuan`

## 许可

本仓库继续使用 MIT License。
