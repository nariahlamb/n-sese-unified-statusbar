# 瑟瑟灵感状态栏（`n-sese-unified-statusbar`）

> **致后续接手本仓库的 AI（强制维护纪律）**
> 1. **每次修改本仓库代码、对外接口、世界书条目或提示词契约后，必须同步更新本 README**（至少更新「当前改造状态与未完成项」「契约速查」及文末「改造记录」），严禁只改代码不留记录。
> 2. **先读再改，改完自动推仓（长期明确授权）**：涉及 `src/` 的修改**先**刷新 `source-files.sha256.json` 并执行 `npm run build` 重建 `dist/`；功能/修复改动**再**递增 4 处版本号（`manifest.json`、`package.json`、`package-lock.json` 顶层与 `packages[""]`）并更新本 README；**最终** `npm test` 与 `npm run check` 全绿后**直接 `git commit` 与 `git push origin main`**（无需逐次询问，也不要打包 zip，详见 [AGENTS.md](AGENTS.md)）。纯文档同步不递增版本号，但改了 `src/*.md` 仍要刷新哈希清单。
> 3. **做角色卡联动必看**：第 3 节列出了本插件注入到角色主世界书的全部条目名、`order`、正文标签剥离与只读快照桥，写角色卡世界书/正则/MVU 时直接对照，避免重名冲突或内容回喂。

---

## 1. 定位与运行依赖

- **扩展名称**：`瑟瑟灵感状态栏`（`manifest.json` `loading_order: 200`，早于 `n-sese-ledger` `210` 与 `n-sese-phone` `220`）
- **当前版本**：`0.1.0-alpha.14`（基于 `5c229b4` 推进，功能性改动均递增版本并推仓供 TT 拉取测）
- **设置持久化（当前真实方案，详见 [core/config-store.ts](src/unified-statusbar/core/config-store.ts)）**：
  - **偏好本体**：写入酒馆 `/api/files` 的 `usb_g_preferences_*`（snapshot + segment 协议），跨浏览器/设备同步，清缓存不丢；
  - **宿主命名空间**：`extensionSettings.__userscripts.unified_statusbar__settings_v1`，只存 secrets 影子（API 密钥等）与元数据，不存偏好本体；
  - **设备本地临时态**：折叠态等不跨设备同步的状态存 `localStorage`（如 `ub_device_config_*`）。
  - 旧文档中的 `extensionSettings.kei_unified_global_v22` 已过时。
- **安装使用**：
  1. 先安装并启用[酒馆助手（JS-Slash-Runner）](https://gitlab.com/novi028/JS-Slash-Runner)。
  2. 在酒馆「扩展 → 安装扩展」粘贴本仓库地址，装好后刷新页面；同名旧脚本请先停用。
  3. 按数据后端三选一（不要一律去状态栏「表格」）：
     - **台账接管模式**（推荐）：`SeseLedgerAPI` 在场且真数据库不在场时自动接管，模板/分组调度/表格开关/存量迁移全部由**瑟瑟台账工作台**管理，状态栏「设置 → 表格」页整体退役；
     - **台账旁观模式**：台账与真数据库（AutoCardUpdater）并存，表格后端仍是真数据库，台账只做旁路；
     - **外部数据库模式**：只装真数据库插件，状态栏直接走 SQL 读写。
  4. 进入角色聊天，打开右上角 `⚙` 设置 API；新开档的模板导入由对应后端完成，已有数据只修复模板，不要重填。
- **来源与参考**：业务原始源码源自原作者 2026-10-25 公开分享包（原作者已停更），本仓库为个人后续适配与改造维护版本，版权归属见 [SOURCE_NOTICE.md](SOURCE_NOTICE.md) 与 [src/README.md](src/README.md)。 · [简易教程](https://docs.google.com/document/d/1f5B-GmNLJExH7FE9bwpOb4Ditx5EDHfQtTIXY0WDnX4/edit)

---

## 2. 当前改造状态与未完成项（截至 2026-11-19，当前 `0.1.0-alpha.14`）

| 模块 / 阶段 | 当前状态 | 关键证据与说明 |
|---|---|---|
| **P1 世界演化防泄密与认知隔离** | ✅ 代码+单测完成 | `pending` 入镜禁止向 `UBS-世界演化-角色动态-*` 输出完整 `desc`；`CharProfile.knownFacts` 写入角色自身认知视图；传闻按 `region` 与 `earliestRevealDay` 过滤；世界动态超限优先裁泛风声/远处内容（[world-worldbook.ts](src/unified-statusbar/core/world-engine/world-worldbook.ts)、[world-state.ts](src/unified-statusbar/core/world-engine/world-state.ts)） |
| **P2 自然入镜事件池与回退** | ✅ 代码+单测完成 | 双区候选投影每次最多 `1` 主入口 + `2` 极简参考；亲密/私密场景拦截但不删事件；放进草稿不消费，正文落楼承接后才 `acted`；删楼/Swipe 按消息锚点回退为 `pending`；超期自动转背景结算（[world-intrusion.ts](src/unified-statusbar/core/world-engine/world-intrusion.ts)、[world-sources.ts](src/unified-statusbar/core/world-engine/world-sources.ts)） |
| **P3 技能提示词降载** | ✅ 代码+单测完成 | `reference` 模式常亮仅保留技能名+主动/被动+单句前提；完整详述拆为 `UBS-技能-详情-*`（`selective`, `scanDepth: 2`）按严格关键词触发，排除泛动作误命中（[skill-worldbook.ts](src/unified-statusbar/core/skill-worldbook.ts)） |
| **P4 跨插件认知快照桥** | ✅ 代码+单测完成 | 暴露 `window.__ubWorldCognitionSnapshot`（版本化只读深拷贝，不含 `desc`/`hiddenGoal`/写接口）供 `n-sese-ledger` 剧情推进消费（[world-snapshot.ts](src/unified-statusbar/core/world-engine/world-snapshot.ts)） |
| **P4-Fix 小手机联动去强制** | ✅ 代码+单测完成（已实机确认） | 解除四套风格 `PHONE_LINK_RULES` 的「禁止缺席/至少产出 1 份」，改为默认留空有事才发；新增 `applyPhoneContactPolicy` 拦截在场角色、同轮限 1 人 ≤2 条，全剧冷却 2 轮/单人冷却 4 轮（[world-evolution.ts](src/unified-statusbar/core/world-engine/world-evolution.ts) `v0.1.0-alpha.4`） |
| **上下文标签剥离分层与 UI 试跑** | ✅ 代码+单测完成 | 拆分 `contextKeepTags`（保留标签白名单）与 `contextStripTags`（剥离标签黑名单，从上到下优先级保护），改为逐楼独立清洗后再拼接；设置页新增双框编辑与零 API 本地试跑预览（[context-strip.ts](src/unified-statusbar/core/context-strip.ts) `v0.1.0-alpha.5`） |
| **事件调度与双端 UI 适配** | ✅ 代码+单测完成 | `MESSAGE_RECEIVED` 监听用 `setTimeout(..., 0)` 让出当前事件栈，避免抢在台账之前运行（`ad73be6`，证据指针 [world-sources.ts:365](src/unified-statusbar/core/world-engine/world-sources.ts#L365)）；`applyMobileFixes` 收敛到 `<= 600px`，悬浮球实时 resize 重算边界；TT `ChatSurface` 虚拟化贴尾适配（[index.ts](src/unified-statusbar/index.ts)、[mobile-environment.ts](src/unified-statusbar/core/mobile-environment.ts)） |
| **Toast 半透明紧凑与防误触改造** | ✅ 代码+单测完成 | 宿主通知壳（素瓷/云墨/手账/怪盗）与成就通知卡统一改为半透明与紧凑尺寸；右上角关闭到后台 `×` 放大至 `30px`（配 `::after` 扩热区与右内边距 40px 隔离带），`ai-activity-notify.ts` 加右侧防误触拦截及单开/原版兜底样式（[notify-base.ts](src/unified-statusbar/styles/notify-base.ts)、[ai-activity-notify.ts](src/unified-statusbar/core/ai-activity-notify.ts)、[achievement-notify.ts](src/unified-statusbar/renderers/achievement-notify.ts) `v0.1.0-alpha.6`） |
| **API 源透传与中段消息兼容（gpt-load 适配）** | ✅ 代码+单测完成 | 新增 `CustomApiSource`（`openai`/`makersuite`/`claude` 等 8 种源）与 `CustomApiPostProcessingMode`（默认 `semi`：前端出站层折叠首条对话后的 `system/developer` 为 `user` 并合并连续同角色）；`ai-tool-shield.ts` 导出 `tagCustomApiPostProcessing` 联动三仓，保留 `custom_prompt_post_processing = ''` 防二次工具注入；`assistant-runtime.ts` 非 OpenAI/Custom 源自动回退宿主 `generateRaw`；`fetchModelList` 保留路径前缀并支持原生 `/v1beta/models` 回退（`v0.1.0-alpha.8`–`9`） |
| **后台 AI 请求提示词与外挂世界书清洗** | ✅ 代码+单测完成 | 四道净化防线落地（[worldbook-entry.ts](src/unified-statusbar/core/worldbook-entry.ts)、[ai-request-pipeline.ts](src/unified-statusbar/core/ai-request-pipeline.ts)、[ai-tool-shield.ts](src/unified-statusbar/core/ai-tool-shield.ts)）：① 默认只放行角色卡 `primary` 主世界书，屏蔽 `globalLore`/`additional`/`chatLore`（配放行白名单）；② 内置 `role: assistant` 剔除与正文向核心词根过滤（保护 `UBS-`/`SeseLedger-`/`[UBS手机]`/`TavernDB-` 受管族），并收口 `nsfw-guidance`/`portrait-tags` 旁路与宅仙 `assistant-sources` 跳过列表；③ 移除 `STANDARD_PROMPT_MIDDLE` 的 `'chat_history'` 并补齐 8 处 `max_chat_history: 0`；④ 出站层剥离非我方 `assistant` 伪插话与第三方 `extensionPrompts`；保留楼层「保留标签/剥离标签」原样不动（`v0.1.0-alpha.10`–`11`） |
| **P4 v2 事件池、双开收敛与回执闭环** | ✅ 代码+单测完成 | `WORLD_SNAPSHOT_VERSION = 2` 新增 `worldbookDelegated` 与 `eventPool`（`arrival`/`encounter`/`rumor`/`ambient`，严禁泄密）；新增 `ledgerHandlesWorldFrontEvents`，双开台账魔改推进激活时世界书 `UBS-世界演化-世界动态` 收敛为仅留 `acted` 余波与极短〔世界暗流〕、角色动态不泄 `pending` 待入镜线索，同时完整保留状态栏世界窗口 UI 展示与手动触发；`world-sources.ts`/`world-intrusion.ts` 消费 `sl_world_ack` 写入 `eventCooldowns`（`picked` 4 轮 / `skipped` 2 轮降权）并随删楼/Swipe 回退（`v0.1.0-alpha.12`） |
| **资料块内联直传（修复无 `chat_history` 后 `after_system` 资料块丢失）** | ✅ 代码+单测完成 | [ai-request-pipeline.ts](src/unified-statusbar/core/ai-request-pipeline.ts) 新增 `buildStandardPromptMiddle` 并将 `injectTriggerAndContext` 收敛为仅注入 `position:'none'` 绿灯触发，全线迁移 `world-evolution` / `calendar-ai` / `shop-story-ai` / `currency-ai` / `interview` / `investigation` / `memo-goals` / `skill-tree-engine` / `wardrobe-runtime` 9 处站点改为直接将资料块内联进 `ordered_prompts`（`dialogue_examples` 与 `user_input` 之间）；扩展 `tests/bg-isolation.test.mjs`（`v0.1.0-alpha.13`） |
| **注释与内联口径清理（alpha.14）** | ✅ 代码+单测完成 | 清理 `currency-ai.ts` / `investigation.ts` / `memo-goals.ts` / `skill-prompts.ts` / `skill-tree-engine.ts` / `wardrobe-prompts.ts` / `wardrobe-runtime.ts` 中 `after_system` 遗留注释与文案，统一为「资料块内联进 `ordered_prompts`」口径（`v0.1.0-alpha.14`） | `build` / `test` 115/115 / `check` 全绿；真机未验 |
| **真机全量回归验收** | ⏳ 待继续验证 | 离线条目：`npm test` **115/115 通过**，`npm run check` 通过；`v0.1.0-alpha.4` 小手机去强制已通过，剩余「长聊多轮自然入镜 + 亲密拦截 + Swipe 回退 + 双开三轮认知一致性 + 后台世界书净化实机日志 + v2 事件池台账按需推选」在 TT Static/Managed 与手机端待持续实机观察 |

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
| `window.__ub_openLightbox` | [index.ts](src/unified-statusbar/index.ts) / [story-image-text-viewer.ts](src/unified-statusbar/renderers/story-image-text-viewer.ts) | 宿主页通用图片放大灯箱：小手机与主项目单图放大共用同一实现，视觉交互对齐立绘放大 |
| `window.__ub_resetFloatBtn` | [index.ts](src/unified-statusbar/index.ts) | 悬浮球重置到屏幕中央；小手机连点三下小手机悬浮球经此找回拖出屏外的主项目按钮（与设置项「重置到屏幕中间」共用同一实现） |
| `window.__ubPortraitCharTags` / `__ubPortraitFanwork` / `__ubPortraitFanTags` | [index.ts](src/unified-statusbar/index.ts) | 立绘固定一致性 tag、同人角色标记、同人原作 tag 的**只读**桥：小手机生图第一步读取；本插件未加载/版本过旧/开关未开时小手机自动回落数据库散文注入，零破坏 |
| 事件 `ub-worldbook-projection-ready` / `ub-storage-relocation-ready` | [events.ts](src/unified-statusbar/core/events.ts) | 桥就绪广播：伴生插件可能先于本插件装载，监听此事件补注册世界书投影 / 补挂搬家回调 |
| 事件 `ub-phone-online` | [cross-window.ts](src/unified-statusbar/core/cross-window.ts) | 小手机完成绑定时广播；状态栏据此重投影货币等世界书，覆盖「手机先于宿主绑定」的启动竞态 |
| 事件 `ub-ledger-presence-filled` | [events.ts](src/unified-statusbar/core/events.ts) | 台账接管时「在场角色表」所在分组本轮落账完成（`detail={token,aiFloor,tableNames}`），是立绘每轮更新的唯一触发源 |
| `sl_world_ack`（写在**用户楼**上的字段，非 window 桥） | [world-sources.ts](src/unified-statusbar/core/world-engine/world-sources.ts) / [world-intrusion.ts](src/unified-statusbar/core/world-engine/world-intrusion.ts) | 台账魔改推进的确定性回执：`{ version: 1, picked: string[] \| { id }[] \| string, skippedIds: string[] }`；状态栏按 `picked` 走宽松承接（正文点到角色名即算），`picked` 冷却 4 轮、`skippedIds` 冷却 2 轮（只降权不删事件），并随删楼/Swipe 回退；形状非法或版本不符按无回执处理 |
| `window.__ubp_world_inject` / `window.__ubp_phone_style` | 消费自小手机 `world-link.ts` | 世界演化 `<phone>` 与货币正文转账写入小手机时探测并投递（源码位于同级兄弟仓库 `n-sese-phone` 的 `src/UBS_phone/core/world-link.ts`；单仓克隆时该相对路径不可达） |

### 3.4 跨仓共享文件与同步边界

三个仓库（`n-sese-unified-statusbar`、`n-sese-ledger`、`n-sese-phone`）**各自内嵌一份 `src/unified-statusbar/core/` 副本**：状态栏是真源，台账（内嵌 42 个文件）与小手机（内嵌 83 个文件）只取所需。共享模块必须按变更影响**精准同步**，其余文件**故意存在仓内差异，禁止整目录覆盖**。

| 类别 | 文件 | 同步规则 |
|---|---|---|
| 必须按影响同步 | `ai-tool-shield.ts`、`context-strip.ts`、`worldbook-entry.ts`、`ai-request-pipeline.ts`（台账/状态栏）、`constants.ts`（保留台账 `STYLE_LABELS`）、`config-store.ts` | 改状态栏后按实际被引用点逐文件同步到兄弟仓，并在兄弟仓各自跑 `npm test` |
| 故意差异（禁止覆盖） | `env.ts`（各仓 Toast 前缀）、`worldbook-projection-events.ts`、`data-manager.ts`、`ledger-takeover.ts`（小手机定制） | 改动只落在需要的仓；整目录复制会把别仓的 toast 前缀、表格后端假设与投影调度一起带坏 |

- 台账内嵌副本**没有** `data-manager.ts` / `ledger-takeover.ts` / `worldbook-projection-events.ts` / `worldbook-projection-runtime.ts`；小手机内嵌副本**没有** `ai-request-pipeline.ts` / `worldbook-projection-runtime.ts`。同步前先确认目标仓是否真的引用该文件。
- 三仓各自维护 `source-files.sha256.json`：共享文件改完后，每个仓都要刷新自己的哈希清单、`npm run build` 与 `npm test`，不要只更新状态栏一处。

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
| [index.js](index.js) / [runtime/extension.js](runtime/extension.js) / [runtime/config.js](runtime/config.js) | **装载层**：单例守卫、`REQUIRED_HELPER_METHODS` 能力检查、`dist/index.js` 动态 import、`dist/statusbar.html` 模板读取与错误壳 |
| [core/ai-request-pipeline.ts](src/unified-statusbar/core/ai-request-pipeline.ts) / [ai-tool-shield.ts](src/unified-statusbar/core/ai-tool-shield.ts) / [api-config.ts](src/unified-statusbar/core/api-config.ts) / [assistant-runtime.ts](src/unified-statusbar/core/assistant-runtime.ts) | **后台 AI 请求管线**：提示词拼装（资料块内联进 `ordered_prompts`）、出站折叠与工具注入防护、API 源/模型列表、非 OpenAI 源回退宿主 `generateRaw` |
| [core/portrait-tags.ts](src/unified-statusbar/core/portrait-tags.ts) 等 `portrait-*.ts` | **立绘**：固定一致性 tag、同人标记、生图队列与资料块注入 |
| [src/unified-statusbar/wardrobe-orchestration.ts](src/unified-statusbar/wardrobe-orchestration.ts) | **衣柜编排**：穿戴/卸下、批量换装与世界书投影 |
| `achievement-*.ts` / `shop-*.ts` / `calendar-*.ts` / `chronicle-*.ts` | **成就与商城 / 日历与纪要**的引擎入口（数据层在 `core/`，渲染在 `renderers/`） |

---

## 5. 构建与自检命令

在 `n-sese-suite/n-sese-unified-statusbar` 目录下执行。**Node 要求 `>= 22.12.0`**（`package.json` `engines`；本机实测 Node 24 通过），新克隆先 `npm ci`：

```powershell
npm ci          # 按 package-lock 安装（新克隆必须先做）
npm run build   # esbuild 打包 dist/index.js 并生成 dist/statusbar.html
npm test        # node --test tests/*.test.mjs（当前 115 项全通过）
npm run check   # scripts/check-release.mjs：清单、入口、产物与已登记源码哈希校验
```

- **测试环境边界**：`tests/db-row-edit.test.mjs` 的 SQLite 用例由 `spawnSync` 调本机 `python` / `python3` 起内存库，**缺 Python 时该用例会失败**；没有兄弟仓 `n-sese-ledger` 源码或主验收模板时，相关联动用例按 `skip` 跳过（预期行为，不算失败）。
- **`npm run check` 的边界**：只校验 `manifest.json` 与 `package.json` 版本一致、`manifest.js` 入口可静态解析、`dist/index.js` 存在且非空、以及 `source-files.sha256.json` 中**已登记**条目的哈希。它**不检查 lockfile、不自动发现漏登记的新文件、不重算 dist 同构**；CI 侧另跑 `npm run build && git diff --exit-code -- dist` 兜住产物漂移。
- **更新 `source-files.sha256.json` 的方法**：改完 `src/` 后重算对应文件的 SHA-256，只替换变更条目，保持 JSON 其余内容与键序不动。例：

```powershell
node -e "const c=require('crypto'),f=require('fs');console.log(c.createHash('sha256').update(f.readFileSync('src/unified-statusbar/index.ts')).digest('hex'))"
```

新增文件必须手工补登记，否则 `check` 不会发现（它只验已登记项）。

---

## 6. 改造记录（Changelog，后续 AI 改完必须按此表倒序追加）

| 日期 | 版本 / Commit | 改动范围与摘要 | 验证状态 |
|---|---|---|---|
| 2026-11-26 | `0.1.0-alpha.14 (docs)` | 补全并更新 README / AGENTS / SOURCE_NOTICE / `src` 说明以适配 Antigravity 交接，同步刷新 `src/*.md` SHA-256 清单 | 仅文档；`build` / `test` 115/115 / `check` 全绿 |
| 2026-11-19 | `0.1.0-alpha.14` | 清理 `currency-ai.ts` / `investigation.ts` / `memo-goals.ts` / `skill-prompts.ts` / `skill-tree-engine.ts` / `wardrobe-prompts.ts` / `wardrobe-runtime.ts` 遗留 `after_system` 注释与内联口径对齐 | `build` / `test` 115/115 / `check` 全绿；待真机验收 |
| 2026-11-19 | `0.1.0-alpha.13` | 修复移除 `'chat_history'` 后 `injectPrompts({ position: 'after_system' })` 资料块被宿主 `generateRaw` 跳过的问题：[ai-request-pipeline.ts](src/unified-statusbar/core/ai-request-pipeline.ts) 新增 `buildStandardPromptMiddle`，并将 `injectTriggerAndContext` 改为仅负责 `position:'none'` 绿灯扫描触发；全线迁移 `world-evolution` / `calendar-ai` / `shop-story-ai` / `currency-ai` / `interview` / `investigation` / `memo-goals` / `skill-tree-engine` / `wardrobe-runtime` 9 处站点改为直接内联资料块进 `ordered_prompts`（`dialogue_examples` 与 `user_input` 之间）；扩展 `tests/bg-isolation.test.mjs` | `build` / `test` 115/115 / `check` 全绿；已推仓待 TT 拉取真机验收 |
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
