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
import { buildFrontDigest, normalizeRegion } from './world-state';
import {
  assessIntrusionSceneGuard,
  selectIntrusionCandidates,
  type IntrusionCandidate,
} from './world-intrusion';
import { getWorldProjectionRuntimeContext, type WorldProjectionRuntimeContext } from './world-worldbook';
import {
  INTRUSION_CANDIDATE_PRIMARY_MAX,
  INTRUSION_CANDIDATE_REF_MAX,
  KNOWN_FACTS_MAX,
  WORLD_SNAPSHOT_VERSION,
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
  characters: Record<string, WorldCharacterKnowledgeSnapshot>;
  candidates: {
    primary: WorldIntrusionCandidateSnapshot | null;
    references: WorldIntrusionCandidateSnapshot[];
  };
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
      characters: {},
      candidates: { primary: null, references: [] },
      frontDigest: '',
    });
  }

  const state = (deps.loadState || loadWorldState)();
  const effectiveDate = dateKey || state.lastEvolveDateKey || '';
  const onStageNames = Array.isArray(rt.onStageNames) ? rt.onStageNames : [];
  const onStageSet = new Set(onStageNames);

  const view = selectIntrusionCandidates(state, {
    dateKey: effectiveDate,
    playerRegion,
    onStageNames,
    sceneGuard,
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
    characters,
    candidates: {
      primary: view.primary ? toCandidateSnapshot(view.primary, chatKey) : null,
      references: view.references.map(r => toCandidateSnapshot(r, chatKey)),
    },
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
