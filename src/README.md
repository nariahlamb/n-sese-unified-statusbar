# 统一状态栏源码（`n-sese-unified-statusbar`）

> 本文件说明**当前仓库**的源码结构。2026-10-25 原始分享包（三模块 webpack 阅读副本）的说明作为历史来源保留在文末「历史来源说明」。

## 当前工程：独立单模块 esbuild 工程

`n-sese-unified-statusbar` 已不再是三模块 webpack 阅读包，而是独立单模块工程：

- **`src/` 只包含 `unified-statusbar/`**：本插件全部 TypeScript 源码、样式、面板、数据与运行期模板。
- **`n-sese-ledger`（瑟瑟台账）与 `n-sese-phone`（小手机）是同级的兄弟仓库**，不在本目录内。三仓各自内嵌一份 `src/unified-statusbar/core/` 副本用于跨 bundle 复用；同步边界见根目录 [README.md](../README.md) 第 3.4 节。
- **构建入口 `scripts/build.mjs`**：读取 `package.json` 的 `sourceModule`（当前 `"unified-statusbar"`），esbuild 打包 `src/unified-statusbar/index.ts` → **`dist/index.js`**；并从 `src/unified-statusbar/index.html` 提取 `<body>` 生成 **`dist/statusbar.html`**。
- **测试套件位于仓库根目录 `tests/`**（`node --test tests/*.test.mjs`，即 `npm test`），不再随分享包剔除。
- **发布校验 `scripts/check-release.mjs`**（`npm run check`）。

## 目录

```
src/unified-statusbar/
├── index.ts / index.html     扩展入口与状态栏 DOM 模板
├── core/                     数据层、AI 请求管线、世界演化、地图、立绘、衣柜、成就、周期等
│   └── world-engine/         世界演化引擎（事件池 / 入镜 / 世界书投影 / 快照桥）
├── renderers/                状态栏与各弹窗/面板渲染
├── styles/                   多套主题
├── panels/                   设置面板与表格 / 存储管理面板
├── chrome/                   悬浮壳与拖拽
├── achievements/             成就定义（achievements.json）
├── data/                     卡池与通用技能数据
└── docs/                     运行期仍会 import 的正则与数据库标准模板
```

## 构建与测试

```powershell
npm ci          # 新克隆先按 lockfile 安装依赖（Node >= 22.12.0）
npm run build   # esbuild → dist/index.js + dist/statusbar.html
npm test        # tests/*.test.mjs（当前 115 项全通过）
npm run check   # 清单、入口依赖、产物与已登记源码哈希校验
```

修改 `src/` 下任意文件后，必须同步刷新根目录 `source-files.sha256.json` 中对应条目的哈希，否则 `npm run check` 会以「原始源码被修改」拦截。

## 版权与内容提示

源码版权归原作者所有；本仓库在 2026-10-25 分享包基础上做独立工程化与持续维护。项目包含成人向（NSFW）内容与相关提示词，请仅在合适的受众与场景中使用与分享。

---

## 历史来源说明（2026-10-25 原始分享包）

<details>
<summary>展开：2026-10-25 三模块 webpack 阅读包原始说明（保留完整版权与内容提示）</summary>

本目录是三个酒馆助手扩展模块的**源码阅读副本**（日期：2026-10-25）。

### 目录

```
unified-statusbar/   主扩展（统一状态栏）
UBS_phone/           小手机
sese-ledger/         瑟瑟台账
```

> 三个目录必须保持同级。`sese-ledger` 会从 `../unified-statusbar/core` 引用事件总线、聊天元数据宿主、世界书投影等公共模块，并从 `../unified-statusbar/docs` 读取数据库标准模板。

### 包含内容

- 三个模块的 TypeScript 运行源码（`index.ts`、`core/`、`renderers/`、`styles/`、`panels/`、`settings/` 等）
- 运行期资源：成就数据、卡池数据、技能/货币正文正则、数据库标准模板、台账标准模板与召回预设
- 各模块入口 HTML（宿主内联构建用）

### 未包含内容

为控制分享范围并避免泄露内部资料，以下内容已剔除：

- 开发用 AI 记忆、架构笔记、协作规范（`claude_memory/`、`CLAUDE.md`、`AGENTS.md`）
- 内部设计文档、研究笔记、方案稿、mockup 与历史归档
- 测试套件与测试夹具
- 历史版本打包产物、旧版脚本 JSON、第三方正则与第三方角色卡资料
- 本地编辑器/代理配置、构建产物、依赖目录、绝对路径与个人标识

### 关于第三方名称

代码中仍保留少量**功能性**的第三方名称与兼容常量（例如宿主平台 API、数据库插件的公开接口名、生图插件的通道名、插件 toast 标题匹配串）。这些是运行时互通所必需的标识符，不是对第三方代码的复制。源码中涉及**外部项目**的借鉴/移植/调研来源说明与对比内容已移除；三个模块之间的内部复用说明（如「小手机复用主项目契约」）保留。

### 规模（2026-10-25 分享包）

- `unified-statusbar/`：361 个文件
- `UBS_phone/`：155 个文件
- `sese-ledger/`：51 个文件
- 合计 568 个文件、约 15 MB；其中 TypeScript 553 个（含 3 个入口与 1 个编排文件）

> 上述规模与「未包含内容」描述的是 2026-10-25 分享包当时的状态；本仓库现已独立工程化，当前结构以上文「当前工程」为准，测试套件已位于仓库根目录 `tests/`。

### 构建说明（历史）

本包不是可独立构建的工程：三个模块原本是同一个 webpack + TypeScript 工程的多入口。若要构建，请把它们放回同类酒馆助手模板工程的 `src/` 下，并沿用该工程的：

- `package.json`（webpack、ts-loader、TypeScript 等依赖）
- `webpack.config.ts` 的多入口配置
- 酒馆助手宿主类型声明（`docs/@types` 或等价声明）

> 当前仓库已改为独立 esbuild 单模块构建（见上文「构建与测试」），不再需要 webpack 多入口工程。

### 内容提示

本项目包含成人向（NSFW）内容与相关提示词，请仅在合适的受众与场景中分享。

### 版权

源码版权归原作者所有。本副本仅用于交流与阅读；如需再分发、商用或二次发布，请先取得作者许可。

</details>
