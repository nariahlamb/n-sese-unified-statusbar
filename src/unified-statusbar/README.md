# unified-statusbar（统一状态栏）

主扩展入口：`index.ts` + `index.html`；构建产物 `dist/index.js` + `dist/statusbar.html`。

## 宿主装载链

```
manifest.json                       "js": "index.js"，loading_order: 200（先于台账 210、小手机 220）
  └─ index.js                       单例守卫 + DOMContentLoaded 启动 createExtension
      └─ runtime/extension.js       REQUIRED_HELPER_METHODS 能力检查、模块动态 import、模板读取、错误壳
          ├─ runtime/config.js      扩展 id 与展示配置
          ├─ dist/index.js          esbuild 打包的业务 bundle（源 src/unified-statusbar/index.ts）
          └─ dist/statusbar.html    状态栏 DOM 模板（源 src/unified-statusbar/index.html）
```

能力检查缺项（`SillyTavern.getContext` / `CHAT_CHANGED`、jQuery、toastr、`TavernHelper` 的 `generateRaw` / `injectPrompts` / 世界书方法）时，装载器停在错误壳并给出缺失清单，不会静默半启动。

## 目录

- `core/`：数据层、AI 请求管线（`ai-request-pipeline.ts` / `ai-tool-shield.ts` / `api-config.ts` / `assistant-runtime.ts`）、存储（`config-store.ts` / `data-manager.ts`）、世界演化（`core/world-engine/`：`world-evolution.ts` / `world-intrusion.ts` / `world-worldbook.ts` / `world-snapshot.ts` / `world-sources.ts` / `world-store.ts`）、地图、立绘（`portrait-*.ts`）、衣柜（`wardrobe-orchestration.ts`）、成就（`achievement-*.ts`）、商城（`shop-*.ts`）、日历与纪要（`calendar-*.ts` / `chronicle-*.ts`）、周期等引擎
- `renderers/`：状态栏与各弹窗/面板的 DOM 渲染
- `styles/`：多套主题 CSS
- `panels/`：设置面板与表格/存储管理面板
- `chrome/`：悬浮壳与拖拽
- `achievements/achievements.json`：成就定义
- `data/`：卡池与通用技能数据
- `docs/`：仅保留运行期会 import 的正则与数据库标准模板

## 数据后端：台账接管 / 台账旁观 / 外部数据库

- `core/ledger-takeover.ts`：接管判据 —— `SeseLedgerAPI` 在场且真数据库（AutoCardUpdater）不在场 = **台账接管模式**，此时状态栏「设置 → 表格」页整体退役，模板、分组调度、表格开关与存量迁移全部由**瑟瑟台账工作台**承担；台账与真数据库并存（`realDbPresent === true`）= **台账旁观模式**，表格后端仍是真数据库。
- `core/data-manager.ts`：数据源适配层 —— 优先 `SeseLedgerAPI`，未装载回落 `AutoCardUpdaterAPI`（外部/真数据库模式，状态栏走 SQL 读写）。
- `core/db-row-edit.ts` / `db-schema-map.ts` / `db-write-queue.ts`：表格行编辑、物理列映射与串行写入队列。

## 跨仓桥接指针

窗口桥（`window.__ubWorldCognitionSnapshot` / `__ubWorldbookProjection` / `__ubStorageRelocation` / `__ub_openLightbox` / `__ub_resetFloatBtn` / `__ubPortraitCharTags` / `__ubPortraitFanwork` / `__ubPortraitFanTags` 等）、就绪事件（`ub-worldbook-projection-ready` / `ub-storage-relocation-ready` / `ub-phone-online` / `ub-ledger-presence-filled`）与台账回执 `sl_world_ack` 的契约，见根目录 [README.md](../README.md) 第 3.3 节；三仓共享文件同步边界见第 3.4 节。

## 测试

测试套件位于**仓库根目录 `tests/`**（`npm test`，当前 115 项全通过），不在本目录内；本目录不再有「未包含测试」的限制。

## 说明

早期注释仍可能引用分享包时剔除的内部 `docs/` 路径，仅作历史线索，不影响阅读与运行。
