# n-sese-unified-statusbar 仓库规范 (AGENTS.md)

本文件继承 [`n-sese-suite/AGENTS.md`](../AGENTS.md)，作为 `n-sese-unified-statusbar` 的长期工程与交付规则。与上级规范冲突时以上级为准，本文件只补充本仓的具体步骤。

## 1. 标准交付流水线（按此顺序执行）

1. **改代码 / 改文档**：先读后改；文档改动也要确认不破坏引用链接与校验清单。
2. **改 `src/` 时同步刷新哈希与产物**：
   - 重算并更新 `source-files.sha256.json` 中被改动文件的 SHA-256（只改变更条目，不整表重写；新增文件需手工补登记）；
   - 运行 `npm run build`，重建 `dist/index.js` 与 `dist/statusbar.html`（构建脚本读 `package.json` 的 `sourceModule`）。
3. **递增版本（仅功能 / 界面 / 修复改动）**：同步更新四处 —— `manifest.json` `version`、`package.json` `version`、`package-lock.json` 顶层 `version` 与 `packages[""].version`；**纯文档同步不递增版本号**，但改了 `src/*.md` 仍要刷新哈希清单。
4. **更新 `README.md`**：当前版本 / HEAD、第 2 节状态表、第 5 节测试数、第 6 节 Changelog（倒序追加）。
5. **最终验证**：`npm run build`、`npm test`、`npm run check` 三条全部退出码 0，并核对 `git diff -- dist` 是否为空（无业务改动时应保持干净）。
6. **提交推送**：`git add <显式文件列表>` → `git commit` → `git push origin main`，供手机端 TauriTavern (TT) `git pull` 实机复测。
   - 不用 `git add -A`；Windows 下等长字节 JSON 改写后要确认 `git status` 已识别全部变更。
   - 仓库所有者已长期授权自动提交推送：不要反问「是否 commit / push」，也不要打包 zip。

## 2. 在 Antigravity 等独立客户端中维护

若客户端以本仓为根目录独立打开（看不到 `n-sese-suite` 工作区），需同时参考：

- 总套件 [`../README.md`](../README.md) 与本仓 [`README.md`](README.md) 的**跨仓共享件矩阵**（本仓 README 第 3.4 节）；
- 修改 `src/unified-statusbar/core/` 中的共享模块时，按矩阵同步 `n-sese-ledger` 与 `n-sese-phone` 的内嵌副本；`env.ts`、`worldbook-projection-events.ts`、`data-manager.ts`、`ledger-takeover.ts` **故意存在仓内差异，禁止整目录覆盖**。

## 3. 其它约束

- 测试位于仓库根目录 `tests/`（`node --test tests/*.test.mjs`），需要 Node `>= 22.12.0`（本机实测 Node 24 通过）。
- 交付结论须区分「文件已写入 / 静态校验通过 / 真机已验证」，未跑过的步骤标为「待验证」。
