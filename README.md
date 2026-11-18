# 瑟瑟灵感状态栏（`n-sese-unified-statusbar`）

> **致后续接手本仓库的 AI（强制维护纪律）**
> 1. **每次修改本仓库代码、对外接口、世界书条目或提示词契约后，必须同步更新本 README**（至少更新「当前改造状态与未完成项」「契约速查」及文末「改造记录」），严禁只改代码不留记录。
> 2. **先读再改，改完自动推仓（长期明确授权）**：涉及 `src/` 修改必须同步刷新 `source-files.sha256.json`，重建 `dist/index.js`，并运行 `npm test` 与 `npm run check`；全绿后同步递增版本号并**直接 `git commit` 与 `git push origin main`**（无需逐次询问，也不要打包 zip，详见 [AGENTS.md](AGENTS.md)）。
> 3. **做角色卡联动必看**：第 3 节列出了本插件注入到角色主世界书的全部条目名、`order`、正文标签剥离与只读快照桥，写角色卡世界书/正则/MVU 时直接对照，避免重名冲突或内容回喂。

---

## 1. 定位与运行依赖

- **扩展名称**：`瑟瑟灵感状态栏`（`manifest.json` `loading_order: 200`，早于 `n-sese-ledger` `210` 与 `n-sese-phone` `220`）
- **当前版本**：`0.1.0-alpha.12`（基于 `5c229b4` 推进，功能性改动均递增版本并推仓供 TT 拉取测）
- **宿主设置键**：`extensionSettings.kei_unified_global_v22`（详见 [core/config-store.ts](src/unified-statusbar/core/config-store.ts)）
- **安装使用**：
  1. 先安装并启用[酒馆助手（JS-Slash-Runner）](https://gitlab.com/novi028/JS-Slash-Runner)。
  2. 在酒馆「扩展 → 安装扩展」粘贴本仓库地址，装好后刷新页面；同名旧脚本请先停用。
  3. 搭配 `n-sese-ledger`（瑟瑟台账）使用；若使用外部数据库，需切到 SQL 模式。
  4. 进入角色聊天，打开右上角 `⚙` 设置 API 与表格；新开档导入模板，已有数据只修复模板，不要重填。
- **来源与参考**：业务原始源码源自原作者 2026-10-25 公开分享包（原作者已停更），本仓库为个人后续适配与改造维护版本，版权归属见 [SOURCE_NOTICE.md](SOURCE_NOTICE.md) 与 [src/README.md](src/README.md)。 · [简易教程](https://docs.google.com/document/d/1f5B-GmNLJExH7FE9bwpOb4Ditx5EDHfQtTIXY0WDnX4/edit)

---

## 2. 当前改造状态与未完成项（截至 2026-11-15）

| 模块 / 阶段 | 当前状态 | 关键证据与说明 |
|---|---|---|
| **P1 世界演化防泄密与认知隔离** | ✅ 代码+单测完成 | `pending` 入镜禁止向 `UBS-世界演化-角色动态-*` 输出完整 `desc`；`CharProfile.knownFacts` 写入角色自身认知视图；传闻按 `region` 与 `earliestRevealDay` 过滤；世界动态超限优先裁泛风声/远处内容（[world-worldbook.ts](src/unified-statusbar/core/world-engine/world-worldbook.ts)、[world-state.ts](src/unified-statusbar/core/world-engine/world-state.ts)） |
| **P2 自然入镜事件池与回退** | ✅ 代码+单测完成 | 双区候选投影每次最多 `1` 主入口 + `2` 极简参考；亲密/私密场景拦截但不删事件；放进草稿不消费，正文落楼承接后才 `acted`；删楼/Swipe 按消息锚点回退为 `pending`；超期自动转背景结算（[world-intrusion.ts](src/unified-statusbar/core/world-engine/world-intrusion.ts)、[world-sources.ts](src/unified-statusbar/core/world-engine/world-sources.ts)） |
| **P3 技能提示词降载** | ✅ 代码+单测完成 | `reference` 模式常亮仅保留技能名+主动/被动+单句前提；完整详述拆为 `UBS-技能-详情-*`（`selective`, `scanDepth: 2`）按严格关键词触发，排除泛动作误命中（[skill-worldbook.ts](src/unified-statusbar/core/skill-worldbook.ts)） |
| **P4 跨插件认知快照桥** | ✅ 代码+单测完成 | 暴露 `window.__ubWorldCognitionSnapshot`（版本化只读深拷贝，不含 `desc`/`hiddenGoal`/写接口）供 `n-sese-ledger` 剧情推进消费（[world-snapshot.ts](src/unified-statusbar/core/world-engine/world-snapshot.ts)） |
| **P4-Fix 小手机联动去强制** | ✅ 代码+单测完成（已实机确认） | 解除四套风格 `PHONE_LINK_RULES` 的「禁止缺席/至少产出 1 份」，改为默认留空有事才发；新增 `applyPhoneContactPolicy` 拦截在场角色、同轮限 1 人 ≤2 条，全剧冷却 2 轮/单人冷却 4 轮（[world-evolution.ts](src/unified-statusbar/core/world-engine/world-evolution.ts) `v0.1.0-alpha.4`） |
| **上下文标签剥离分层与 UI 试跑** | ✅ 代码+单测完成 | 拆分 `contextKeepTags`（保留标签白名单）与 `contextStripTags`（剥离标签黑名单，从上到下优先级保护），改为逐楼独立清洗后再拼接；设置页新增双框编辑与零 API 本地试跑预览（[context-strip.ts](src/unified-statusbar/core/context-strip.ts) `v0.1.0-alpha.5`） |
| **事件调度与双端 UI 适配** | ✅ 代码+单测完成 | `MESSAGE_RECEIVED` 让出当前事件栈避免抢在台账之前运行（`ad73be6`）；`applyMobileFixes` 收敛到 `<= 600px`，悬浮球实时 resize 重算边界；TT `ChatSurface` 虚拟化贴尾适配（[index.ts](src/unified-statusbar/index.ts)、[mobile-environment.ts](src/unified-statusbar/core/mobile-environment.ts)） |
| **Toast 半透明紧凑与防误触改造** | ✅ 代码+单测完成 | 宿主通知壳（素瓷/云墨/手账/怪盗）与成就通知卡统一改为半透明与紧凑尺寸；右上角关闭到后台 `×` 放大至 `30px`（配 `::after` 扩热区与右内边距 40px 隔离带），`ai-activity-notify.ts` 加右侧防误触拦截及单开/原版兜底样式（[notify-base.ts](src/unified-statusbar/styles/notify-base.ts)、[ai-activity-notify.ts](src/unified-statusbar/core/ai-activity-notify.ts)、[achievement-notify.ts](src/unified-statusbar/renderers/achievement-notify.ts) `v0.1.0-alpha.6`） |
| **API 源透传与中段消息兼容（gpt-load 适配）** | ✅ 代码+单测完成 | 新增 `CustomApiSource`（`openai`/`makersuite`/`claude` 等 8 种源）与 `CustomApiPostProcessingMode`（默认 `semi`：前端出站层折叠首条对话后的 `system/developer` 为 `user` 并合并连续同角色）；`ai-tool-shield.ts` 导出 `tagCustomApiPostProcessing` 联动三仓，保留 `custom_prompt_post_processing = ''` 防二次工具注入；`assistant-runtime.ts` 非 OpenAI/Custom 源自动回退宿主 `generateRaw`；`fetchModelList` 保留路径前缀并支持原生 `/v1beta/models` 回退（`v0.1.0-alpha.8`–`9`） |
| **后台 AI 请求提示词与外挂世界书清洗** | ✅ 代码+单测完成 | 四道净化防线落地（[worldbook-entry.ts](src/unified-statusbar/core/worldbook-entry.ts)、[ai-request-pipeline.ts](src/unified-statusbar/core/ai-request-pipeline.ts)、[ai-tool-shield.ts](src/unified-statusbar/core/ai-tool-shield.ts)）：① 默认只放行角色卡 `primary` 主世界书，屏蔽 `globalLore`/`additional`/`chatLore`（配放行白名单）；② 内置 `role: assistant` 剔除与正文向核心词根过滤（保护 `UBS-`/`SeseLedger-`/`[UBS手机]`/`TavernDB-` 受管族），并收口 `nsfw-guidance`/`portrait-tags` 旁路与宅仙 `assistant-sources` 跳过列表；③ 移除 `STANDARD_PROMPT_MIDDLE` 的 `'chat_history'` 并补齐 8 处 `max_chat_history: 0`；④ 出站层剥离非我方 `assistant` 伪插话与第三方 `extensionPrompts`；保留楼层「保留标签/剥离标签」原样不动（`v0.1.0-alpha.10`–`11`） |
| **P4 v2 事件池、双开收敛与回执闭环** | ✅ 代码+单测完成 | `WORLD_SNAPSHOT_VERSION = 2` 新增 `worldbookDelegated` 与 `eventPool`（`arrival`/`encounter`/`rumor`/`ambient`，严禁泄密）；新增 `ledgerHandlesWorldFrontEvents`，双开台账魔改推进激活时世界书 `UBS-世界演化-世界动态` 收敛为仅留 `acted` 余波与极短〔世界暗流〕、角色动态不泄 `pending` 待入镜线索，同时完整保留状态栏世界窗口 UI 展示与手动触发；`world-sources.ts`/`world-intrusion.ts` 消费 `sl_world_ack` 写入 `eventCooldowns`（`picked` 4 轮 / `skipped` 2 轮降权）并随删楼/Swipe 回退（`v0.1.0-alpha.12`） |
| **真机全量回归验收** | ⏳ 待继续验证 | 离线条目：`npm test` **114/114 通过**，`npm run check` 通过；`v0.1.0-alpha.4` 小手机去强制已通过，剩余「长聊多轮自然入镜 + 亲密拦截 + Swipe 回退 + 双开三轮认知一致性 + 后台世界书净化实机日志 + v2 事件池台账按需推选」在 TT Static/Managed 与手机端待持续实机观察 |

---

## 3. 角色卡开发必读：与本扩展的联动契约

### 3.1 本扩展写入角色主世界书的受管条目（写卡勿重名 / 勿手动修改）

所有受管条目由协调器 [worldbook-projection-runtime.ts](src/unified-statusbar/core/worldbook-projection-runtime.ts) 统一幂等同步，定位规格由 [wb-position.ts](src/unified-statusbar/core/wb-position.ts) 管理，**主前缀为 `UBS`**（判定见 [worldbook-entry.ts](src/unified-statusbar/core/worldbook-entry.ts) `isUserEntryName`）：

| 条目名 / 前缀 | 触发模式 | 注入位置 (`position`) | `order` | 用途与写卡注意事项 |
|---|---|---|---|---|
| `UBS-世界演化-世界动态` | `constant` | `at_depth` (`system`, `depth: 0`) | `199` | 单开时：台前摘要+入镜候选+防撞车；**双开且台账魔改推进激活时自动收敛**：仅留 `acted` 余波与极短〔世界暗流〕（未发生事件走 `eventPool` 交由推进按需挑选） |
| `UBS-世界演化-角色动态-<角色名>` | `selective` | `before_character_definition` (`system`, `depth: 0`) | `202` | 离场/在场角色的动向、公开打算、角色视角 `knownFacts` 与认知限制（**不含**未入镜 `desc`） |
| `UBS-关系-<A>与<B>` | `selective` (`and_any`) | `before_character_definition` | 详见关系模块 | **台账接管时会主动让位撤场**（由台账侧 `SeseLedger-人物关系表：…` 独占投影） |
| `UBS-技能-主角当前技能` | `constant` | `before_character_definition` (`system`, `depth: 2`) | `8124` | 主角已掌握技能的极简前提目录（`reference`/`tag`/`off` 三模式） |
| `UBS-技能-详情-<技能名>` | `selective` (`scanDepth: 2`) | `before_character_definition` (`system`, `depth: 2`) | `8125` | 仅明确涉及或施展该技能时激活详述（泛动作词已屏蔽） |
| `UBS-货币-当前货币体系` | `constant` | 见 [currency-worldbook.ts](src/unified-statusbar/core/currency-worldbook.ts) | — | 开启货币体系且有币种时注入余额与转账/红包格式指导 |
| `UBS-衣柜-角色当前穿搭-<角色名>` 等 | `selective` / `constant` | 见 [wardrobe-worldbook.ts](src/unified-statusbar/core/wardrobe-worldbook.ts) | — | 主角与 NPC 当前穿搭注入 |
| `UBS-玩法-清单…` / `UBS-玩法-物品使用（头/尾）` | 按状态 | `at_depth` (`depth: 10000`) | `8120` / `8122` | NSFW 玩法指南与道具提示词 |
| `UBS-周期-经期…` / `UBS-周期-孕期…` | 按状态 | 见 [cycle-worldbook.ts](src/unified-statusbar/core/cycle-worldbook.ts) | — | 生理周期/孕期状态注入 |
| `UBS-地图-…` | 按配置 | 见 [map-worldbook-inject.ts](src/unified-statusbar/core/map-worldbook-inject.ts) | — | 地图节点/位置上下文 |

> **自有 AI 管线防回喂机制**：状态栏/台账/小手机发起内部 AI 请求时，通过 [worldbook-entry.ts](src/unified-statusbar/core/worldbook-entry.ts) 的 `withNativeScanWorldbook` 拦截 `worldinfo_entries_loaded`：各自按请求挂 `suspend`（暂停自投影）和 `keep`（如放行 `[UBS手机]消息记录` / `[UBS手机]窥私记录`），且就地渲染条目内 EJS 模板。写角色卡时若用了 EJS 世界书，在插件内部请求中也会正常求值。

### 3.2 上下文标签剥离与角色卡输出格式兼容

- 状态栏「设置 → API → 上下文标签剥离」支持分别配置**保留标签**（正文白名单，如 `content`、`playtxt`）与**剥离标签**（思考与功能块黑名单，从上到下按优先级，建议将 `thinking` / `think` 置于最前），并提供**本地试跑预览**。
- 自 `0.1.0-alpha.5` 起，上下文采用**逐楼层独立清洗后再拼接**：先按剥离标签优先级清除思考/功能块，命中保留标签时仅提取其正文并二次净化，未命中则回退为剥离标签以外的内容；同时联动台账与小手机。

### 3.3 跨插件对外窗口桥（状态栏暴露给台账与小手机）

| 全局桥 / 方法 | 位置 | 消费者与契约 |
|---|---|---|
| `window.__ubWorldCognitionSnapshot` | [world-snapshot.ts](src/unified-statusbar/core/world-engine/world-snapshot.ts) | 台账只读调用 `getSnapshot()`（v2）：读取 `chatIdentity`、角色 `knownFacts`、分级 `eventPool`（入镜/遭遇/传闻/氛围）、`worldbookDelegated`、`sceneGuard` 与兼容 `candidates` |
| `window.__ubWorldbookProjection` | [worldbook-projection-runtime.ts](src/unified-statusbar/core/worldbook-projection-runtime.ts) | 台账 (`ledger-projections`) 与小手机 (`phone-messages` / `spy-messages`) 共享单一世界书写入队列，防并发覆写 |
| `window.__ubStorageRelocation` | [chat-relocation.ts](src/unified-statusbar/core/chat-relocation.ts) / [storage-relocation-bridge.ts](src/unified-statusbar/core/storage-relocation-bridge.ts) | 一键搬家结转桥：台账与小手机各自注册搬家回调 |
| `window.__ub_currency_host` / `window.__ubImageGenQueue` | [currency-host-bridge.ts](src/unified-statusbar/core/currency-host-bridge.ts) / [image-gen.ts](src/unified-statusbar/core/image-gen.ts) | 向小手机暴露货币读写与统一生图队列 |
| `window.__ub_showCharacterHub` / `window.__ub_showMapForLocation` | [index.ts](src/unified-statusbar/index.ts) | 台账推进面板点击人物/地点时唤起状态栏弹窗 |
| `window.__ubCycleAPI` | [cycle-external-api.ts](src/unified-statusbar/core/cycle-external-api.ts) | 周期/孕育引擎外部订阅接口 |
| `window.__ubp_world_inject` / `window.__ubp_phone_style` | 消费自小手机 [world-link.ts](../n-sese-phone/src/UBS_phone/core/world-link.ts) | 世界演化 `<phone>` 与货币正文转账写入小手机时探测并投递 |

---

## 4. 模块与关键源码索引

| 目录 / 文件 | 职责 |
|---|---|
| [src/unified-statusbar/index.ts](src/unified-statusbar/index.ts) | 扩展入口、宿主挂载（含 TT `ChatSurface` 贴尾挂载）、事件监听、面板生命周期 |
| [src/unified-statusbar/core/config-store.ts](src/unified-statusbar/core/config-store.ts) | 全局配置读写与归一化（API 预设、剥离标签、世界演化频率/开关等） |
| [src/unified-statusbar/core/data-manager.ts](src/unified-statusbar/core/data-manager.ts) | 数据源适配层：优先走 `SeseLedgerAPI`，未装载回落 `AutoCardUpdaterAPI` |
| [src/unified-statusbar/core/world-engine/](src/unified-statusbar/core/world-engine/) | 世界演化引擎：`world-evolution.ts`（演化+`<phone>` 策略）、`world-intrusion.ts`（入镜五闸与楼层承接）、`world-worldbook.ts`（双条目投影）、`world-snapshot.ts`（P4 桥）、`world-sources.ts`（事件/数据源）、`world-state.ts`/`world-store.ts`/`world-types.ts` |
| [src/unified-statusbar/core/skill-worldbook.ts](src/unified-statusbar/core/skill-worldbook.ts) & `skill-*.ts` | 技能清单/按需详述投影、技能树生成与激活、正文中 `[技能发动：…]` / `[技能新增]` 提取 |
| [src/unified-statusbar/core/context-strip.ts](src/unified-statusbar/core/context-strip.ts) | 单遍栈式上下文标签剥离工具（台账与状态栏共用） |
| [src/unified-statusbar/core/worldbook-projection*.ts](src/unified-statusbar/core/worldbook-projection-runtime.ts) & [worldbook-entry.ts](src/unified-statusbar/core/worldbook-entry.ts) | 唯一主世界书协调器、全局 `order` 登记、`withNativeScanWorldbook` 扫描隔离与 EJS 求值 |
| [src/unified-statusbar/core/map-system.ts](src/unified-statusbar/core/map-system.ts) & `map-*.ts` | 区域/地标/房间地图、天气/时段/气候/交通速率、移动耗时计算 |
| [src/unified-statusbar/core/currency*.ts](src/unified-statusbar/core/currency.ts) / `wardrobe-*.ts` / `play-*.ts` / `cycle-*.ts` | 货币转账提取、衣柜穿搭、NSFW 玩法、生理周期与孕育系统 |
| [src/unified-statusbar/core/mobile-environment.ts](src/unified-statusbar/core/mobile-environment.ts) & `chrome/` | 移动端判定（`<= 600px`）、悬浮球拖拽吸附与跨屏 resize 边界钳制 |

---

## 5. 构建与自检命令

在 `n-sese-suite/n-sese-unified-statusbar` 目录下执行：

```powershell
npm run build   # esbuild 打包 dist/index.js 并生成 dist/statusbar.html
npm test        # node --test tests/*.test.mjs（当前 114 项全通过）
npm run check   # scripts/check-release.mjs：清单、产物及 src/ SHA-256 完整性校验
```

> 若修改了 `src/` 下任意文件，必须先重算 `source-files.sha256.json` 与执行 `npm run build`，否则 `npm run check` 会拦截发布校验。

---

## 6. 改造记录（Changelog，后续 AI 改完必须按此表倒序追加）

| 日期 | 版本 / Commit | 改动范围与摘要 | 验证状态 |
|---|---|---|---|
| 2026-11-19 | `0.1.0-alpha.12` | 升级世界认知快照桥至 v2 并打通台账魔改推进双向闭环：`ledger-takeover.ts` 新增 `ledgerHandlesWorldFrontEvents`；`world-snapshot.ts` 输出分级 `eventPool`（`arrival`/`encounter`/`rumor`/`ambient`）与 `worldbookDelegated`；`world-worldbook.ts` 在双开推进激活时收敛世界动态为 `acted` 余波+极短暗流并屏蔽 `pending` 待入镜线索（状态栏世界窗口 UI 原样完整保留）；`world-intrusion.ts`/`world-sources.ts`/`world-store.ts`/`world-types.ts` 新增 `sl_world_ack` 确定性承接、`eventCooldowns` 冷却及删楼/Swipe 回退；扩展 `tests/world-snapshot-p4.test.mjs` 与 `tests/world-p1-p2.test.mjs` | `build` / `test` 114/114 / `check` 全绿；待真机验收 |
| 2026-11-18 | `0.1.0-alpha.11` | 精简设置页「上下文标签剥离」与「条目黑名单与后台净化」界面冗余提示文本，移除无关第三方引用词 | `build` / `test` 104/104 / `check` 全绿；已推仓 |
| 2026-11-18 | `0.1.0-alpha.10` | 后台 AI 请求提示词与外挂世界书清洗专项：`constants.ts`/`config-store.ts` 新增五项后台净化开关与放行白名单；`worldbook-entry.ts` 默认屏蔽 `globalLore`/`additional`/`chatLore`（仅放行主世界书与白名单）、剔除 `role:assistant` 并内置正文向核心词根过滤用户条目；`ai-request-pipeline.ts` 移除 `'chat_history'` 并补齐 8 处 `max_chat_history: 0`；`nsfw-guidance.ts`/`portrait-tags.ts`/`assistant-sources.ts` 接入对应过滤；`ai-tool-shield.ts` 出站剥离 stray `assistant` 与第三方 `extensionPrompts`；设置页「条目黑名单与后台净化」、角色卡黑名单弹窗字数/拦截标记及 `assistant-help.ts`（`HELP_VERSION = 127`）同步更新；保留「保留标签/剥离标签」清洗楼层不变；新增 `tests/bg-isolation.test.mjs` 与扩展 `tests/ai-tool-shield.test.mjs` | `build` / `test` 104/104 / `check` 全绿；已推仓待 TT 拉取真机验收 |
| 2026-11-17 | `0.1.0-alpha.9` | 修复 `api-config.ts` `fetchModelList` 在 `source === 'makersuite'` 时先拿裸根地址调用宿主 `getModelList` 撞上 `gpt-load` 管理页 HTML 触发 TT 后端非 JSON 报错的 bug：改为优先直连 `/v1beta/models`，失败再补 `/v1` 调 `getModelList`；更新 `tests/ai-tool-shield.test.mjs` | `build` / `test` 99/99 / `check` 全绿；已推仓待 TT 拉取真机验收 |
| 2026-11-17 | `0.1.0-alpha.8` | 适配 `gpt-load` 及中转网关：`constants.ts`/`config-store.ts`/`api-config.ts` 新增 `source`（8 种 API 源）与 `promptPostProcessing`（默认 `semi`）；`ai-tool-shield.ts` 新增 `normalizeOutboundMessages` 与 `tagCustomApiPostProcessing` 在出站层折叠中段 `system/developer` 并兼容 `custom_url` 指纹与宿主映射；`assistant-runtime.ts` 对非 `openai/custom` 源回退宿主并在直连流式应用同款折叠；`config-panel.ts`/`api-tab.ts`/`assistant-help.ts` 补齐 UI 与帮助；新增 `tests/ai-tool-shield.test.mjs` | `build` / `test` 99/99 / `check` 全绿；已推仓待 TT 拉取真机验收 |
| 2026-11-17 | `0.1.0-alpha.7` | `env.ts` 的 `getToastr()` 统一通过非侵入代理为状态栏全部 toast（含报错）自动加「状态栏」前缀；`notify-base.ts` 禁止 `planToastOneline` 剥离插件前缀；`api-tab.ts` 直调补充前缀；扩展 `tests/toast-ui.test.mjs` | `build` / `test` 94/94 / `check` 全绿；已推仓待 TT 拉取真机验收 |
| 2026-11-17 | `0.1.0-alpha.6` | 通知壳（`notify-base.ts`）全主题半透明与紧凑缩小，`×` 关闭到后台按钮放大至 `30×30` 并扩展热区防误触；`ai-activity-notify.ts` 新增贴边防误触转关闭与单开/原版兜底样式；`achievement-notify.ts` 成就浮卡同步半透明缩小并放大关闭钮；新增 `tests/toast-ui.test.mjs` | `build` / `test` 93/93 / `check` 全绿；已推仓待 TT 拉取真机验收 |
| 2026-11-17 | `0.1.0-alpha.5` | 上下文标签剥离拆分为「保留标签」+「剥离标签（从上到下优先级）」，全链路改为逐楼独立清洗（`map-system.ts`/`nsfw-guidance.ts`/`story-image-parser.ts` 等），设置页新增双框编辑与本地试跑预览；新增 JSDOM UI 与优先级/跨楼测试 | `build` / `test` 90/90 / `check` 全绿；已推仓待 TT 拉取真机验收 |
| 2026-11-15 | `0.1.0-alpha.4` (`4d11bd4`) | 修复世界演化小手机联动每轮强制产消息：`world-evolution.ts` 删除四风格「禁止缺席/至少产出 1 份」要求改为默认留空；新增 `applyPhoneContactPolicy` 拦截在场角色、同轮限 1 人 ≤2 条并加全剧 2 轮/单人 4 轮硬冷却；新增 `tests/world-phone-policy.test.mjs` | `build` / `test` 83/83 / `check` 全绿；已推仓且用户实机确认 OK |
| 2026-11-15 | `0.1.0-alpha.3` (`fcc5960`) | 修复 `context-strip.ts` 顺序正则跨块吞正文漏洞，改写为单遍栈式配对；新增 `tests/context-strip.test.mjs` | `build` / `test` 81/81 / `check` 全绿 |
| 2026-11-15 | (`ad73be6`) | `world-sources.ts` `MESSAGE_RECEIVED` 监听包裹 `setTimeout(..., 0)`，退出宿主同步栈让出优先权给台账 | `build` / `test` 79/79 / `check` 全绿 |
| 2026-11-14 | (`09ce7b2`) | 落地 P1–P4：防泄密与 `knownFacts` 注入、自然入镜双区与 Swipe 回退、技能目录+selective 详述、暴露 `__ubWorldCognitionSnapshot` 只读快照桥 | `build` / `test` 79/79 / `check` 全绿 |
| 2026-11-13 | (`c1275d2` / `3f52638`) | 恢复内置卡池与玩法数据；修复电脑端弹窗尺寸、`applyMobileFixes` 视口误判与悬浮按钮实时 resize 贴边 | `build` / `test` / `check` 通过 |
| 2026-11-07 | `table-v1` (`1984363` / `d78d439`) | 工作台数据编辑、字段影响保护与自定义列/多行安全保存 | 当轮测试与构建通过 |
