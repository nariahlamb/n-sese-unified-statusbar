// core/world-engine/world-snapshot.ts
// P4：状态栏向外部（如瑟瑟台账）提供的版本化只读认知/当前事件快照。
// 安全与隔离契约：
// - 只含聊天身份、必要角色 knownFacts、候选公开入口与限制；
// - 绝不含 pending 入镜完整 desc、角色 hiddenGoal/goalProgress/goalProgressText 或任何写接口；
// - 每次返回深拷贝副本防篡改；单开或桥缺失时双方照常独立运行。

import { getConfig } from '../config-store';
import { topWindowCandidates } from '../cross-window';
import { plainClone } from '../deep-clone';
import { sillyTavernContext } from '../env';
import { getCurrentStoryChatKey, isStoryStorageReady } from '../story-floor-store';
import { getTodayDateKey } from '../calendar-core';
import { loadWorldState } from './world-store';
import { buildFrontDigest, isRumorVisibleInFront, isSeedTerminal, normalizeRegion } from './world-state';
import {
  assessIntrusionSceneGuard,
  isEventCooledDown,
  rankEligibleArrivals,
  selectIntrusionCandidates,
  type IntrusionCandidate,
} from './world-intrusion';
import { ledgerHandlesWorldFrontEvents } from '../ledger-takeover';
import { getWorldProjectionRuntimeContext, type WorldProjectionRuntimeContext } from './world-worldbook';
import {
  INTRUSION_CANDIDATE_PRIMARY_MAX,
  INTRUSION_CANDIDATE_REF_MAX,
  KNOWN_FACTS_MAX,
  WORLD_SNAPSHOT_VERSION,
  type Rumor,
  type WorldEventPoolItem,
  type WorldState,
} from './world-types';

export const WORLD_COGNITION_BRIDGE_KEY = '__ubWorldCognitionSnapshot';

export interface WorldCharacterKnowledgeSnapshot {
  name: string;
  onStage: boolean;
  relation: string;
  knownFacts: string[];
  updatedAt: string;
}

export interface WorldIntrusionCandidateSnapshot {
  eventId: string;
  revision: number;
  kind: 'character_arrival';
  refId: string;
  title: string;
  entryCue: string;
  publicInfo: string;
  reason: string;
  condition: string;
  region: string;
  expiresAtDay: string;
  epistemicBoundary: string;
  delivery: {
    eventId: string;
    revision: number;
    chatKey: string;
    offeredAtFloor?: number;
    offeredAnchor?: string;
    offeredSwipeId?: number;
    draftPreparedAt?: string;
  };
}

export interface WorldCognitionSnapshot {
  version: typeof WORLD_SNAPSHOT_VERSION;
  chatKey: string;
  chatIdentity: string | null;
  available: boolean;
  dateKey: string;
  playerRegion: string;
  sceneGuard: {
    blocked: boolean;
    reason: string;
  };
  restrictions: {
    maxPrimaryCandidate: number;
    maxReferenceCandidates: number;
    forbidPendingFullDesc: true;
    forbidHiddenGoal: true;
    protagonistOmniscienceForbidden: true;
    externalIntrusionBlocked: boolean;
    blockReason: string;
    worldEnabled: boolean;
  };
  /** 在场角色名（供台账/驱动判断谁已在台前，缺项＝空数组）。 */
  onStageNames: string[];
  characters: Record<string, WorldCharacterKnowledgeSnapshot>;
  candidates: {
    primary: WorldIntrusionCandidateSnapshot | null;
    references: WorldIntrusionCandidateSnapshot[];
  };
  /** 世界动态是否已由推进驱动接管（双开收敛判据；单开恒 false）。 */
  worldbookDelegated: boolean;
  /** v2：结构化事件池（arrival/encounter/rumor/ambient；只含公开入口，严禁 pending desc 等秘密）。 */
  eventPool: WorldEventPoolItem[];
  frontDigest: string;
}

export interface WorldCognitionSnapshotDeps {
  getChatKey?: () => string;
  getChatIdentity?: () => string | null;
  isStorageReady?: () => boolean;
  isWorldEnabled?: () => boolean;
  loadState?: () => WorldState;
  getDateKey?: () => string;
  getRuntimeContext?: () => WorldProjectionRuntimeContext;
  /** v2：当前聊天轮次（事件冷却判据；缺省读宿主 chat.length / lastEvolveRound）。 */
  getCurrentRound?: () => number;
  /** v2：世界动态是否由推进驱动接管（缺省读 ledgerHandlesWorldFrontEvents）。 */
  isWorldbookDelegated?: () => boolean;
}

export interface WorldCognitionReadOnlyBridge {
  readonly version: typeof WORLD_SNAPSHOT_VERSION;
  readonly getSnapshot: () => WorldCognitionSnapshot;
}

function getLiveStContext(): any {
  const ctx = sillyTavernContext();
  if (ctx) return ctx;
  for (const w of topWindowCandidates()) {
    try {
      const rawSt = (w as any)?.SillyTavern || (w as any)?.TavernHelper?.SillyTavern;
      if (!rawSt) continue;
      const resolved = typeof rawSt.getContext === 'function' ? rawSt.getContext() : rawSt;
      if (resolved) return resolved;
    } catch (_e) { /* cross-origin */ }
  }
  return null;
}

/** 按宿主实时上下文计算 owner+chat 聊天身份（与台账 getChatIdentity 同口径；不拿状态存储键冒充，不硬编码未知 chatId）。 */
export function deriveLiveChatIdentity(ctx: any): string | null {
  if (!ctx || typeof ctx !== 'object') return null;
  const chatId = String(ctx.chatId || (typeof ctx.getCurrentChatId === 'function' ? ctx.getCurrentChatId() : '') || '').trim();
  if (!chatId || chatId.startsWith('unknown-')) return null;

  const groupId = ctx.groupId != null ? String(ctx.groupId).trim() : '';
  if (groupId) {
    if (groupId.startsWith('unknown-')) return null;
    return `group:${groupId}|chat:${chatId}`;
  }

  const rawCharId = ctx.characterId;
  const chars = Array.isArray(ctx.characters) ? ctx.characters : [];
  const idx = rawCharId !== undefined && rawCharId !== null && rawCharId !== '' ? Number(rawCharId) : NaN;
  const byIndex = Number.isInteger(idx) && idx >= 0 && idx < chars.length ? chars[idx] : undefined;
  const avatar = typeof byIndex?.avatar === 'string' ? byIndex.avatar.trim() : '';
  const fallbackChar = rawCharId !== undefined && rawCharId !== null ? String(rawCharId).trim() : '';
  const ownerId = avatar || fallbackChar;
  if (!ownerId || ownerId.startsWith('unknown-')) return null;
  return `character:${ownerId}|chat:${chatId}`;
}

export function getDefaultChatIdentity(): string | null {
  try {
    return deriveLiveChatIdentity(getLiveStContext());
  } catch (_e) {
    return null;
  }
}

function toCandidateSnapshot(c: IntrusionCandidate, fallbackChatKey: string): WorldIntrusionCandidateSnapshot {
  return {
    eventId: c.delivery?.eventId || c.id,
    revision: c.revision,
    kind: c.kind,
    refId: c.refId,
    title: c.title,
    entryCue: c.entryCue,
    publicInfo: c.publicInfo,
    reason: c.reason,
    condition: c.condition,
    region: c.region,
    expiresAtDay: c.expiresAtDay,
    epistemicBoundary: c.epistemicBoundary,
    delivery: {
      eventId: c.delivery?.eventId || c.id,
      revision: c.delivery?.revision ?? c.revision,
      chatKey: c.delivery?.chatKey || fallbackChatKey,
      ...(typeof c.delivery?.offeredAtFloor === 'number' ? { offeredAtFloor: c.delivery.offeredAtFloor } : {}),
      ...(c.delivery?.offeredAnchor ? { offeredAnchor: c.delivery.offeredAnchor } : {}),
      ...(typeof c.delivery?.offeredSwipeId === 'number' ? { offeredSwipeId: c.delivery.offeredSwipeId } : {}),
      ...(c.delivery?.draftPreparedAt ? { draftPreparedAt: c.delivery.draftPreparedAt } : {}),
    },
  };
}

const EVENT_POOL_MAX = 8;
const EVENT_POOL_MAX_ARRIVAL = 4;
const EVENT_POOL_MAX_ENCOUNTER = 3;
const EVENT_POOL_MAX_RUMOR = 3;
const EVENT_POOL_MAX_AMBIENT = 1;

function poolText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** v2 事件池：台前可挑选事件的公开入口集合（总量 ≤8，绝不携带 pending desc / hiddenGoal 等秘密）。
 *  - arrival：合格 pending 入镜按评分降序（skipped 冷却 -50 降权），场景守护命中时 0 条；
 *  - encounter：encounter 信号 + 未收场且非 hidden 的活跃伏线；
 *  - rumor：过台前可见闸的传闻（同地区 + known 优先），再补未重复的 rumor 信号；
 *  - ambient：ambient 信号最多 1 条。
 *  冷却期内：encounter/rumor/ambient 暂不进池；arrival 仅 skipped 冷却降权（不删事件）。 */
function buildWorldEventPool(
  state: WorldState,
  params: {
    dateKey: string;
    playerRegion: string;
    onStageNames: string[];
    sceneGuardBlocked: boolean;
    currentRound: number;
  },
): WorldEventPoolItem[] {
  const cooldowns = state.eventCooldowns;
  const { dateKey, playerRegion, currentRound } = params;
  const cooled = (id: string) => isEventCooledDown(cooldowns, id, currentRound);
  const seen = new Set<string>();

  const arrivals: WorldEventPoolItem[] = [];
  if (!params.sceneGuardBlocked) {
    const ranked = rankEligibleArrivals(state, {
      dateKey,
      playerRegion,
      onStageNames: params.onStageNames,
      cooldowns,
      currentRound,
    });
    for (const it of ranked) {
      if (arrivals.length >= EVENT_POOL_MAX_ARRIVAL) break;
      const cue = poolText(it.hook, 120) || poolText(it.title, 120);
      if (!cue || seen.has(it.id)) continue;
      seen.add(it.id);
      const region = normalizeRegion(it.region || '');
      const expiresAtDay = poolText(it.expiresAtDay, 32);
      const publicInfo = poolText(it.publicInfo, 160);
      const reason = poolText(it.reason, 120);
      const condition = poolText(it.condition, 120);
      const epistemicBoundary = poolText(it.epistemicBoundary, 160);
      arrivals.push({
        id: it.id,
        kind: 'arrival',
        title: poolText(it.title, 60) || cue.slice(0, 40),
        cue,
        refId: it.refId,
        ...(region ? { region } : {}),
        ...(expiresAtDay ? { expiresAtDay } : {}),
        ...(publicInfo ? { publicInfo } : {}),
        ...(reason ? { reason } : {}),
        ...(condition ? { condition } : {}),
        ...(epistemicBoundary ? { epistemicBoundary } : {}),
        threadDriven: !it.freeArrival,
      });
    }
  }

  const signals = state.guidance?.signals || [];
  const encounter: WorldEventPoolItem[] = [];
  for (let i = 0; i < signals.length; i++) {
    const g = signals[i];
    if (!g || g.voice !== 'encounter') continue;
    if (encounter.length >= EVENT_POOL_MAX_ENCOUNTER) break;
    const body = poolText(g.text, 160);
    if (!body) continue;
    const sourceId = poolText(g.sourceId, 80);
    const id = sourceId && sourceId !== 'clock' && !seen.has(sourceId) ? sourceId : `sig_enc_${i}`;
    if (seen.has(id) || cooled(id)) continue;
    seen.add(id);
    encounter.push({ id, kind: 'encounter', title: body.slice(0, 30), cue: body });
  }
  for (const s of state.seeds || []) {
    if (encounter.length >= EVENT_POOL_MAX_ENCOUNTER) break;
    if (!s || !s.id || isSeedTerminal(s.status) || s.visibility === 'hidden') continue;
    if (seen.has(s.id) || cooled(s.id)) continue;
    const seedTitle = poolText(s.title, 60);
    if (!seedTitle) continue;
    seen.add(s.id);
    const region = normalizeRegion(s.region || '');
    encounter.push({
      id: s.id,
      kind: 'encounter',
      title: seedTitle,
      cue: poolText(s.catalyst, 160) || `「${seedTitle}」这条线正在暗中发酵`,
      ...(region ? { region } : {}),
      level: Number(s.level) || 0,
    });
  }

  const curRegion = normalizeRegion(playerRegion || '');
  const rumor: WorldEventPoolItem[] = [];
  const visibleRumors = (state.rumors || [])
    .filter(r => r && r.id && !seen.has(r.id) && !cooled(r.id) && isRumorVisibleInFront(r, dateKey, playerRegion))
    .slice()
    .sort((a: Rumor, b: Rumor) => {
      const aLocal = curRegion && normalizeRegion(a.region || '') === curRegion ? 2 : 0;
      const bLocal = curRegion && normalizeRegion(b.region || '') === curRegion ? 2 : 0;
      const aLv = a.level === 'known' ? 1 : 0;
      const bLv = b.level === 'known' ? 1 : 0;
      return (bLocal + bLv) - (aLocal + aLv);
    });
  for (const r of visibleRumors) {
    if (rumor.length >= EVENT_POOL_MAX_RUMOR) break;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const region = normalizeRegion(r.region || '');
    rumor.push({
      id: r.id,
      kind: 'rumor',
      title: poolText(r.topic, 60) || r.id,
      cue: poolText(r.content, 200),
      ...(region ? { region } : {}),
      level: r.level,
    });
  }
  for (let i = 0; i < signals.length; i++) {
    if (rumor.length >= EVENT_POOL_MAX_RUMOR) break;
    const g = signals[i];
    if (!g || g.voice !== 'rumor') continue;
    const body = poolText(g.text, 160);
    if (!body) continue;
    const sourceId = poolText(g.sourceId, 80);
    const linked = sourceId && sourceId !== 'clock' ? sourceId : '';
    if (linked && seen.has(linked)) continue; // 传闻本体已进池，信号不重复
    const id = linked || `sig_rumor_${i}`;
    if (seen.has(id) || cooled(id)) continue;
    seen.add(id);
    rumor.push({ id, kind: 'rumor', title: body.slice(0, 30), cue: body });
  }

  const ambient: WorldEventPoolItem[] = [];
  for (let i = 0; i < signals.length; i++) {
    if (ambient.length >= EVENT_POOL_MAX_AMBIENT) break;
    const g = signals[i];
    if (!g || g.voice !== 'ambient') continue;
    const body = poolText(g.text, 160);
    if (!body) continue;
    const id = `sig_ambient_${i}`;
    if (seen.has(id) || cooled(id)) continue;
    seen.add(id);
    ambient.push({ id, kind: 'ambient', title: body.slice(0, 30), cue: body });
  }

  // 总上限 8：溢出先裁传闻尾部，再裁 encounter 尾部，最后才动 arrival（ambient 保留）。
  let overflow = arrivals.length + encounter.length + rumor.length + ambient.length - EVENT_POOL_MAX;
  while (overflow > 0 && rumor.length) { rumor.pop(); overflow -= 1; }
  while (overflow > 0 && encounter.length) { encounter.pop(); overflow -= 1; }
  while (overflow > 0 && arrivals.length) { arrivals.pop(); overflow -= 1; }

  return [...arrivals, ...encounter, ...rumor, ...ambient];
}

/** 构造只读世界认知与候选事件快照（每次返回全新深拷贝副本，防调用方篡改内部状态）。 */
export function buildWorldCognitionSnapshot(deps: WorldCognitionSnapshotDeps = {}): WorldCognitionSnapshot {
  const chatKey = (() => {
    try { return String((deps.getChatKey || getCurrentStoryChatKey)() || ''); } catch (_e) { return ''; }
  })();
  const chatIdentity = (() => {
    try {
      const value = (deps.getChatIdentity || getDefaultChatIdentity)();
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    } catch (_e) { return null; }
  })();
  const storageReady = (() => {
    try { return Boolean((deps.isStorageReady || isStoryStorageReady)()); } catch (_e) { return false; }
  })();
  const worldEnabled = (() => {
    try { return deps.isWorldEnabled ? Boolean(deps.isWorldEnabled()) : getConfig().worldEnabled !== false; } catch (_e) { return true; }
  })();
  const rt = (() => {
    try { return (deps.getRuntimeContext || getWorldProjectionRuntimeContext)() || {}; } catch (_e) { return {}; }
  })();
  const dateKey = (() => {
    if (rt.dateKey) return String(rt.dateKey);
    try { return String((deps.getDateKey || getTodayDateKey)() || ''); } catch (_e) { return ''; }
  })();
  const playerRegion = normalizeRegion(rt.playerRegion || rt.location || '');
  const sceneGuard = assessIntrusionSceneGuard({
    nsfwActive: rt.nsfwActive,
    location: rt.location,
    onStageStatuses: rt.onStageStatuses,
    recentText: rt.recentText,
  });

  if (!storageReady || !chatKey || !worldEnabled) {
    return plainClone({
      version: WORLD_SNAPSHOT_VERSION,
      chatKey,
      chatIdentity,
      available: false,
      dateKey,
      playerRegion,
      sceneGuard: { blocked: sceneGuard.blocked, reason: sceneGuard.reason },
      restrictions: {
        maxPrimaryCandidate: INTRUSION_CANDIDATE_PRIMARY_MAX,
        maxReferenceCandidates: INTRUSION_CANDIDATE_REF_MAX,
        forbidPendingFullDesc: true,
        forbidHiddenGoal: true,
        protagonistOmniscienceForbidden: true,
        externalIntrusionBlocked: sceneGuard.blocked,
        blockReason: sceneGuard.reason,
        worldEnabled,
      },
      onStageNames: [],
      characters: {},
      candidates: { primary: null, references: [] },
      worldbookDelegated: false,
      eventPool: [],
      frontDigest: '',
    });
  }

  const state = (deps.loadState || loadWorldState)();
  const effectiveDate = dateKey || state.lastEvolveDateKey || '';
  const onStageNames = Array.isArray(rt.onStageNames) ? rt.onStageNames : [];
  const onStageSet = new Set(onStageNames);
  const currentRound = (() => {
    try {
      if (deps.getCurrentRound) {
        const explicit = Number(deps.getCurrentRound());
        if (Number.isFinite(explicit)) return explicit;
      }
      const live = getLiveStContext();
      if (live && Array.isArray(live.chat)) return live.chat.length;
      const stored = Number(state.lastEvolveRound);
      return Number.isFinite(stored) ? stored : 0;
    } catch (_e) { return 0; }
  })();
  const worldbookDelegated = (() => {
    try {
      return deps.isWorldbookDelegated ? Boolean(deps.isWorldbookDelegated()) : ledgerHandlesWorldFrontEvents();
    } catch (_e) { return false; }
  })();

  const view = selectIntrusionCandidates(state, {
    dateKey: effectiveDate,
    playerRegion,
    onStageNames,
    sceneGuard,
    cooldowns: state.eventCooldowns,
    currentRound,
  });
  const eventPool = buildWorldEventPool(state, {
    dateKey: effectiveDate,
    playerRegion,
    onStageNames,
    sceneGuardBlocked: view.blocked,
    currentRound,
  });

  const candidateNames = new Set<string>();
  if (view.primary) candidateNames.add(view.primary.refId);
  for (const r of view.references) candidateNames.add(r.refId);

  const characters: Record<string, WorldCharacterKnowledgeSnapshot> = {};
  for (const p of Object.values(state.profiles || {})) {
    const facts = Array.isArray(p.knownFacts)
      ? p.knownFacts.map(f => String(f || '').trim()).filter(Boolean).slice(0, KNOWN_FACTS_MAX)
      : [];
    const onStage = Boolean(p.onStage || onStageSet.has(p.name));
    if (!onStage && !candidateNames.has(p.name) && facts.length === 0) continue;
    characters[p.name] = {
      name: p.name,
      onStage,
      relation: String(p.relation || ''),
      knownFacts: [...facts],
      updatedAt: String(p.updatedAt || ''),
    };
  }

  const snapshot: WorldCognitionSnapshot = {
    version: WORLD_SNAPSHOT_VERSION,
    chatKey,
    chatIdentity,
    available: true,
    dateKey: effectiveDate,
    playerRegion,
    sceneGuard: { blocked: view.blocked, reason: view.blockReason },
    restrictions: {
      maxPrimaryCandidate: INTRUSION_CANDIDATE_PRIMARY_MAX,
      maxReferenceCandidates: INTRUSION_CANDIDATE_REF_MAX,
      forbidPendingFullDesc: true,
      forbidHiddenGoal: true,
      protagonistOmniscienceForbidden: true,
      externalIntrusionBlocked: view.blocked,
      blockReason: view.blockReason,
      worldEnabled: true,
    },
    onStageNames: [...onStageNames],
    characters,
    candidates: {
      primary: view.primary ? toCandidateSnapshot(view.primary, chatKey) : null,
      references: view.references.map(r => toCandidateSnapshot(r, chatKey)),
    },
    worldbookDelegated,
    eventPool,
    frontDigest: buildFrontDigest(state, effectiveDate, { playerRegion }),
  };

  return plainClone(snapshot);
}

/** 创建不可变只读桥对象（无任何写入/突变接口）。 */
export function createWorldCognitionBridge(deps?: WorldCognitionSnapshotDeps): WorldCognitionReadOnlyBridge {
  const resolvedDeps: WorldCognitionSnapshotDeps = {
    ...deps,
    getChatIdentity: deps?.getChatIdentity || getDefaultChatIdentity,
  };
  return Object.freeze({
    version: WORLD_SNAPSHOT_VERSION,
    getSnapshot: () => buildWorldCognitionSnapshot(resolvedDeps),
  });
}

/** 在跨窗候选上挂载只读认知快照桥（单开状态栏或桥缺失时不阻断任何一方）。 */
export function bindWorldCognitionBridge(deps?: WorldCognitionSnapshotDeps): void {
  const bridge = createWorldCognitionBridge(deps);
  for (const w of topWindowCandidates()) {
    try {
      w[WORLD_COGNITION_BRIDGE_KEY] = bridge;
    } catch (_e) { /* 只读窗口忽略 */ }
  }
}
