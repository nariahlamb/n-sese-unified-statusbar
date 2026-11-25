# 来源

业务源码最初来自原作者 `2026-10-25` 的公开分享包（三模块 webpack 源码阅读副本），**版权归原作者所有**；`MistHarbor` 最初只做个人安装适配。

此后本仓库已进行**独立工程化**，不再仅限于个人安装适配：

- 独立单模块 esbuild 构建：`scripts/build.mjs` 读取 `package.json` 的 `sourceModule` → `dist/index.js` + `dist/statusbar.html`；
- 仓库根目录 `tests/` 测试套件与 `scripts/check-release.mjs` 发布校验（`npm test` / `npm run check`）；
- 跨仓桥接（`n-sese-ledger` / `n-sese-phone`）与持续的功能迭代维护。

当前工程结构、构建与测试说明见 [`src/README.md`](src/README.md) 与 [`README.md`](README.md)；2026-10-25 原始分享包的目录、剔除范围与 webpack 构建背景作为历史来源保留在 `src/README.md` 文末。

源码版权仍归原作者。再分发、商用或二次发布前请先取得作者许可；本项目包含成人向（NSFW）内容与相关提示词，请仅在合适的受众与场景中使用。
