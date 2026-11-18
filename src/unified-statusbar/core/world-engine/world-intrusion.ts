// core/world-engine/world-intrusion.ts
// 入镜队列（两态 pending/acted）：pending 去重覆盖更新、草稿预留、双区候选投影、
// 场景守护（亲密/私密/关键对话）、楼层证据确认（不以草稿=发生）、删楼/Swipe 回退与过期结算。

import {
  EXP_MAX,
  INTRUSION_ACT_TTL,
  INTRUSION_CANDIDATE_PRIMARY_MAX,
  INTRUSION_CANDIDATE_REF_MAX,
  INTRUSION_QUEUE_MAX,
  type Intrusion,
  type IntrusionDeliveryMeta,
  type WorldEventCooldown,
  type WorldState,
} from './world-types';
import { plainClone } from '../deep-clone';
import { appendMessageToChat } from '../data-manager';
import { compareDateKey } from '../calendar-core';
import { gapDaysBetween, isSeedTerminal, normalizeRegion, tokensOf } from './world-state';
import { messageLevelAnchor, selectedMessageAnchor } from '../external-story-store';

export { INTRUSION_ACT_TTL } from './world-types';

export interface IntrusionCandidate {
  id: string;
  revision: number;
  kind: 'character_arrival';
  refId: string;
  title: string;
  /** 简短公开入口（不含完整 desc）。 */
  entryCue: string;
  reason: string;
  condition: string;
  publicInfo: string;
  epistemicBoundary: string;
  region: string;
  expiresAtDay: string;
  delivery: IntrusionDeliveryMeta;
}

export interface IntrusionCandidateView {
  blocked: boolean;
  blockReason: string;
  primary: IntrusionCandidate | null;
  references: IntrusionCandidate[];
  backgroundAntiCollision: string[];
}

export interface IntrusionSceneGuardContext {
  nsfwActive?: boolean;
  location?: string;
  onStageStatuses?: string[];
  recentText?: string;
}

export interface IntrusionSceneGuardResult {
  blocked: boolean;
  reason: string;
}

export interface FloorAdoptionContext {
  chatKey: string;
  floor: number;
  anchor: string;
  swipeId: number;
  aiText: string;
  userText?: string;
  onStageNames?: string[];
  /** v2：本轮确定性回执（sl_world_ack）命中的事件 id；命中项走宽松承接判定，其余保持原严格启发式。 */
  pickedIds?: string[];
}

function nextRevision(it: Pick<Intrusion, 'revision'>): number {
  const cur = Number(it.revision);
  return Number.isFinite(cur) && cur >= 0 ? Math.floor(cur) + 1 : 1;
}

function ensureDelivery(it: Intrusion, rev: number): IntrusionDeliveryMeta {
  return {
    ...(it.delivery ? plainClone(it.delivery) : {}),
    eventId: it.delivery?.eventId || it.id,
    revision: rev,
  };
}

export function enqueueIntrusion(state: WorldState, intrusion: Intrusion): WorldState {
  const next: WorldState = plainClone(state);
  // 判重只对 pending：同角色已有待处理项 → 覆盖更新（刷新标题/钩子/描述与候选元信息，保留原 id 与 pending 态）。
  // acted 项在 TTL 内自然消散，不挡新事件——同角色可「已触发·剩N轮」与「待处理」并存。
  const dup = next.pendingIntrusions.find(i => i.kind === intrusion.kind && i.refId === intrusion.refId && i.status === 'pending');
  if (dup) {
    const rev = nextRevision(dup);
    Object.assign(dup, {
      title: intrusion.title,
      hook: intrusion.hook,
      desc: intrusion.desc,
      dateKey: intrusion.dateKey,
      aiTriggered: intrusion.aiTriggered,
      revision: rev,
      ...(intrusion.reason !== undefined ? { reason: intrusion.reason } : {}),
      ...(intrusion.condition !== undefined ? { condition: intrusion.condition } : {}),
      ...(intrusion.publicInfo !== undefined ? { publicInfo: intrusion.publicInfo } : {}),
      ...(intrusion.epistemicBoundary !== undefined ? { epistemicBoundary: intrusion.epistemicBoundary } : {}),
      ...(intrusion.region !== undefined ? { region: intrusion.region } : {}),
      ...(intrusion.expiresAtDay !== undefined ? { expiresAtDay: intrusion.expiresAtDay } : {}),
      // 偏离后重写入口必须作废旧投递证据，不能把新文案当成已在旧正文发生。
      delivery: { eventId: dup.delivery?.eventId || dup.id, revision: rev },
    });
    return next;
  }
  const rev = Number(intrusion.revision) > 0 ? Math.floor(Number(intrusion.revision)) : 1;
  const normalized: Intrusion = {
    ...intrusion,
    revision: rev,
    delivery: ensureDelivery(intrusion, rev),
  };
  next.pendingIntrusions.unshift(normalized);
  if (next.pendingIntrusions.length > INTRUSION_QUEUE_MAX) {
    next.pendingIntrusions = next.pendingIntrusions.slice(0, INTRUSION_QUEUE_MAX);
  }
  return next;
}

export function markIntrusionStatus(
  state: WorldState,
  id: string,
  status: Intrusion['status'],
): WorldState {
  const next: WorldState = plainClone(state);
  const item = next.pendingIntrusions.find(i => i.id === id);
  if (item) {
    item.status = status;
    const rev = nextRevision(item);
    item.revision = rev;
    item.delivery = ensureDelivery(item, rev);
  }
  return next;
}

/** 仅记录「已填入输入框草稿 / 已预留」，保持 pending，绝不提前消费为 acted。 */
export function prepareIntrusionDraft(
  state: WorldState,
  id: string,
  meta: { chatKey?: string; floor?: number; anchor?: string; preparedAt?: string } = {},
): WorldState {
  const next: WorldState = plainClone(state);
  const item = next.pendingIntrusions.find(i => i.id === id);
  if (!item || item.status !== 'pending') return next;
  const rev = nextRevision(item);
  item.revision = rev;
  item.delivery = {
    ...ensureDelivery(item, rev),
    ...(meta.chatKey ? { chatKey: meta.chatKey } : {}),
    draftPreparedAt: meta.preparedAt || new Date().toISOString(),
    ...(typeof meta.floor === 'number' ? { draftFloor: meta.floor } : {}),
    ...(meta.anchor ? { draftAnchor: meta.anchor } : {}),
  };
  return next;
}

/** 触发入镜事件：置 acted + TTL，并写入投递/落楼证据（仅应在确认正文实际承接后调用）。 */
export function triggerIntrusion(
  state: WorldState,
  id: string,
  deliveryMeta: Partial<IntrusionDeliveryMeta> = {},
): WorldState {
  const next: WorldState = plainClone(state);
  const item = next.pendingIntrusions.find(i => i.id === id);
  if (item) {
    const rev = nextRevision(item);
    item.status = 'acted';
    item.ttl = INTRUSION_ACT_TTL;
    item.revision = rev;
    item.delivery = {
      ...ensureDelivery(item, rev),
      ...deliveryMeta,
      eventId: deliveryMeta.eventId || item.delivery?.eventId || item.id,
      revision: rev,
      actedAt: deliveryMeta.actedAt || new Date().toISOString(),
    };
  }
  return next;
}

/** 直接删除入镜事件（窗口「删除」按钮）。 */
export function removeIntrusion(state: WorldState, id: string): WorldState {
  const next: WorldState = plainClone(state);
  const idx = next.pendingIntrusions.findIndex(i => i.id === id);
  if (idx >= 0) next.pendingIntrusions.splice(idx, 1);
  return next;
}

export function pendingIntrusions(state: WorldState): Intrusion[] {
  return state.pendingIntrusions.filter(i => i.status === 'pending');
}

/** 放入聊天框的最终文本：钩子不含角色名时补【角色名行动】前缀。
 *  主 AI 靠这行认出是谁；角色动态绿灯条目也按角色名触发（纯代词钩子会连 desc 一起丢）。 */
export function composeIntrusionFillText(intrusion: Intrusion): string {
  const hook = (intrusion.hook || '').trim();
  if (!hook) return '';
  const name = (intrusion.refId || '').trim();
  if (!name || hook.includes(name)) return hook;
  return `【${name}行动】${hook}`;
}

/** v1.1 + P2：把入镜钩子追加到酒馆输入框；输入框不存在或未成功写入时返回 false。 */
export function fillIntrusionHook(intrusion: Intrusion): boolean {
  const text = composeIntrusionFillText(intrusion);
  if (!text) return false;
  try {
    const parentDoc = typeof window !== 'undefined'
      ? ((window as any)?.parent?.document || (typeof document !== 'undefined' ? document : null))
      : null;
    const input = parentDoc?.getElementById?.('send_textarea') as HTMLTextAreaElement | null | undefined;
    if (!input) return false;
    const before = String(input.value || '');
    appendMessageToChat(text);
    const after = String(input.value || '');
    if (after === before && !after.includes(text)) return false;
    return true;
  } catch (_e) {
    return false;
  }
}

/** P2 场景守护：可靠识别亲密/私密/关键对话场景，阻止外部无关闯入（仅拦截投影，不删除事件）。
 *  无法可靠判定时不猜测（返回 blocked: false）。 */
export function assessIntrusionSceneGuard(ctx: IntrusionSceneGuardContext = {}): IntrusionSceneGuardResult {
  if (ctx.nsfwActive === true) {
    return { blocked: true, reason: 'intimate-nsfw' };
  }
  const statuses = (ctx.onStageStatuses || []).join(' ');
  if (/(?:亲密|缠绵|拥吻|欢好|情动|交合|温存|高潮|告白|表白|求婚|决裂|诀别|对峙|密谈|秘密交谈|私聊|吐露心声)/.test(statuses)) {
    return { blocked: true, reason: 'scene-status' };
  }
  const location = String(ctx.location || '');
  if (/(?:反锁|锁门|私密|密室|浴室|私汤|更衣室|隔间|试衣间|床榻|被窝)/.test(location)) {
    return { blocked: true, reason: 'private-location' };
  }
  const recent = String(ctx.recentText || '');
  if (/(?:反锁(?:了)?门|锁(?:上|住)(?:了)?门|正在(?:亲吻|拥吻|缠绵|欢好|做爱|温存|告白|表白|密谈|对峙)|别打扰|不要让人进来)/.test(recent)) {
    return { blocked: true, reason: 'key-dialogue' };
  }
  return { blocked: false, reason: '' };
}

function toCandidate(it: Intrusion): IntrusionCandidate {
  const rev = Number(it.revision) > 0 ? Math.floor(Number(it.revision)) : 1;
  const entryCue = (it.hook || it.title || '').trim().slice(0, 80);
  // 严格只输出公开表面入口，绝不复制或透传 it.desc / hiddenGoal
  return {
    id: it.id,
    revision: rev,
    kind: it.kind,
    refId: it.refId,
    title: (it.title || '').trim(),
    entryCue,
    reason: (it.reason || '').trim(),
    condition: (it.condition || '').trim(),
    publicInfo: (it.publicInfo || '').trim(),
    epistemicBoundary: (it.epistemicBoundary || '').trim() || '主角尚不知其背后原因与隐秘动机，仅可从表面可感知契机自然交汇',
    region: normalizeRegion(it.region || ''),
    expiresAtDay: (it.expiresAtDay || '').trim(),
    delivery: ensureDelivery(it, rev),
  };
}

function scoreIntrusionCandidate(
  it: Intrusion,
  state: WorldState,
  ctx: { curRegion: string; dateKey: string },
): number {
  let score = 0;
  const region = normalizeRegion(it.region || '');
  if (ctx.curRegion && region && region === ctx.curRegion) score += 40;
  if (it.expiresAtDay && ctx.dateKey && compareDateKey(it.expiresAtDay, ctx.dateKey) >= 0) {
    const gap = gapDaysBetween(ctx.dateKey, it.expiresAtDay);
    if (gap <= 3) score += 35;
    else if (gap <= 7) score += 15;
  }
  const linkedSeed = (state.seeds || []).some(
    s => !isSeedTerminal(s.status) && Array.isArray(s.actorIds) && s.actorIds.includes(it.refId),
  );
  if (linkedSeed) score += 20;
  if (it.delivery?.draftPreparedAt) score += 15;
  if (!it.freeArrival) score += 10;
  if ((it.hook || '').trim()) score += 5;
  return score;
}

/** v2：事件池/候选排序上下文（冷却与当前轮次可选，旧调用签名完全兼容）。 */
export interface IntrusionCandidatePoolContext {
  dateKey?: string;
  playerRegion?: string;
  onStageNames?: string[];
  /** v2：事件冷却台账；skipped 冷却期内的入镜事件仅降权，不删事件。 */
  cooldowns?: Record<string, WorldEventCooldown>;
  /** v2：当前轮次（缺省回退 state.lastEvolveRound）。 */
  currentRound?: number;
}

/** v2：事件是否处于 skipped 冷却（untilRound > currentRound 才算冷却中）。 */
export function isSkippedCooldownActive(
  cooldowns: Record<string, WorldEventCooldown> | undefined,
  id: string,
  currentRound: number,
): boolean {
  const cd = cooldowns ? cooldowns[id] : undefined;
  if (!cd || cd.action !== 'skipped') return false;
  const until = Number(cd.untilRound);
  return Number.isFinite(until) && until > currentRound;
}

/** v2：事件是否处于任意冷却（picked/skipped 都算；encounter/rumor/ambient 冷却期内暂不进池）。 */
export function isEventCooledDown(
  cooldowns: Record<string, WorldEventCooldown> | undefined,
  id: string,
  currentRound: number,
): boolean {
  const cd = cooldowns ? cooldowns[id] : undefined;
  if (!cd) return false;
  const until = Number(cd.untilRound);
  return Number.isFinite(until) && until > currentRound;
}

/** v2：skipped 冷却中的入镜事件排序降权（-50），事件本身照旧留在队列里。 */
export const SKIPPED_COOLDOWN_PENALTY = 50;

function resolvePoolRound(state: WorldState, ctx?: IntrusionCandidatePoolContext): number {
  const explicit = Number(ctx?.currentRound);
  if (Number.isFinite(explicit)) return explicit;
  const stored = Number(state.lastEvolveRound);
  return Number.isFinite(stored) ? stored : 0;
}

/** P2/P4 合格 pending 入镜排序（纯函数）：日期/在场/有效期闸 + 评分（v2 含 skipped 冷却 -50 降权）。 */
export function rankEligibleArrivals(
  state: WorldState,
  ctx: IntrusionCandidatePoolContext = {},
): Intrusion[] {
  const curRegion = normalizeRegion(ctx.playerRegion || '');
  const dateKey = ctx.dateKey || state.lastEvolveDateKey || '';
  const onStage = new Set(ctx.onStageNames || []);
  const currentRound = resolvePoolRound(state, ctx);
  const eligible = (state.pendingIntrusions || []).filter(it => {
    if (it.status !== 'pending' || it.kind !== 'character_arrival') return false;
    if (onStage.has(it.refId)) return false;
    if (it.expiresAtDay && dateKey && compareDateKey(dateKey, it.expiresAtDay) > 0) return false;
    return Boolean((it.hook || it.title || '').trim());
  });
  const weight = (it: Intrusion) => scoreIntrusionCandidate(it, state, { curRegion, dateKey })
    - (isSkippedCooldownActive(ctx.cooldowns, it.id, currentRound) ? SKIPPED_COOLDOWN_PENALTY : 0);
  return eligible.slice().sort((a, b) => weight(b) - weight(a));
}

/** P2 双区候选投影（纯函数）：每轮最多 1 个主入口 + 2 条极简参考；pending 绝不携带完整 desc。 */
export function selectIntrusionCandidates(
  state: WorldState,
  ctx: IntrusionCandidatePoolContext & { sceneGuard?: IntrusionSceneGuardResult } = {},
): IntrusionCandidateView {
  if (ctx.sceneGuard?.blocked) {
    return {
      blocked: true,
      blockReason: ctx.sceneGuard.reason || 'scene-guard',
      primary: null,
      references: [],
      backgroundAntiCollision: [],
    };
  }
  const ranked = rankEligibleArrivals(state, ctx);
  if (!ranked.length) {
    return { blocked: false, blockReason: '', primary: null, references: [], backgroundAntiCollision: [] };
  }

  const primary = ranked.length > 0 ? toCandidate(ranked[0]) : null;
  const references = ranked.slice(INTRUSION_CANDIDATE_PRIMARY_MAX, INTRUSION_CANDIDATE_PRIMARY_MAX + INTRUSION_CANDIDATE_REF_MAX)
    .map(toCandidate);
  const rest = ranked.slice(INTRUSION_CANDIDATE_PRIMARY_MAX + INTRUSION_CANDIDATE_REF_MAX, INTRUSION_CANDIDATE_PRIMARY_MAX + INTRUSION_CANDIDATE_REF_MAX + 3);
  const backgroundAntiCollision = rest.map(it => {
    const r = normalizeRegion(it.region || '');
    return `${it.refId}·${it.title}${r ? `（${r}）` : ''}`;
  });

  return {
    blocked: false,
    blockReason: '',
    primary,
    references,
    backgroundAntiCollision,
  };
}

/** 记录本轮被选为候选提供的投递元信息（offeredAtFloor/anchor/swipe/chatKey），保持 pending 不消费。 */
export function markIntrusionCandidatesOffered(
  state: WorldState,
  view: IntrusionCandidateView,
  offerCtx: { chatKey: string; floor: number; anchor: string; swipeId: number },
): WorldState {
  if (view.blocked) return state;
  const offeredIds = new Set<string>();
  if (view.primary) offeredIds.add(view.primary.id);
  for (const r of view.references) offeredIds.add(r.id);
  if (!offeredIds.size) return state;

  let changed = false;
  const next: WorldState = plainClone(state);
  for (const item of next.pendingIntrusions) {
    if (!offeredIds.has(item.id) || item.status !== 'pending') continue;
    const prev = item.delivery;
    if (
      prev?.chatKey === offerCtx.chatKey
      && prev?.offeredAtFloor === offerCtx.floor
      && prev?.offeredAnchor === offerCtx.anchor
      && prev?.offeredSwipeId === offerCtx.swipeId
    ) {
      continue;
    }
    const rev = Number(item.revision) > 0 ? Math.floor(Number(item.revision)) : 1;
    item.revision = rev;
    item.delivery = {
      ...ensureDelivery(item, rev),
      chatKey: offerCtx.chatKey,
      offeredAtFloor: offerCtx.floor,
      offeredAnchor: offerCtx.anchor,
      offeredSwipeId: offerCtx.swipeId,
    };
    changed = true;
  }
  return changed ? next : state;
}

const ARRIVAL_ACTION_CUE_RE = /(?:赶来|来到|推门|敲门|走进|走来|出现|现身|到来|登门|发来|打来|迎面|拦住|找到|抵达|归来|回来了|来了|上前|递来)/;

/** P2 正文实际承接确认（严格基于楼层证据；无法可靠判定时保持 pending，不猜）。
 *  防重复消费：同一 (chatKey, anchor, swipeId) 不会重复消费；已 acted 不会再次消费。 */
export function confirmIntrusionAdoptionFromFloor(
  state: WorldState,
  floorCtx: FloorAdoptionContext,
): { state: WorldState; confirmedIds: string[] } {
  const aiText = String(floorCtx.aiText || '').trim();
  if (!aiText || !floorCtx.anchor) return { state, confirmedIds: [] };

  // 防重复消费：该楼层/锚点/swipe 已确认过一次事件则不再重复消费
  const alreadyConfirmedHere = state.pendingIntrusions.some(
    it => it.status === 'acted'
      && it.delivery?.actedAnchor === floorCtx.anchor
      && it.delivery?.actedSwipeId === floorCtx.swipeId
      && (!it.delivery?.chatKey || !floorCtx.chatKey || it.delivery.chatKey === floorCtx.chatKey),
  );
  if (alreadyConfirmedHere) return { state, confirmedIds: [] };

  const aiTokens = new Set(tokensOf(aiText));
  const onStageSet = new Set(floorCtx.onStageNames || []);
  const userText = String(floorCtx.userText || '');

  // v2：确定性回执命中的条目优先遍历，其余条目保持原顺序与原严格启发式。
  const pickedIdSet = new Set((floorCtx.pickedIds || []).map(id => String(id || '').trim()).filter(Boolean));
  const ordered = pickedIdSet.size
    ? [
        ...state.pendingIntrusions.filter(it => pickedIdSet.has(it.id)),
        ...state.pendingIntrusions.filter(it => !pickedIdSet.has(it.id)),
      ]
    : state.pendingIntrusions;

  const matchedIds: string[] = [];
  for (const item of ordered) {
    if (item.status !== 'pending' || item.kind !== 'character_arrival') continue;
    if (item.delivery?.chatKey && floorCtx.chatKey && item.delivery.chatKey !== floorCtx.chatKey) continue;
    if (!item.refId) continue;
    const pickedHere = pickedIdSet.has(item.id);
    // 未命中 pickedIds：保持原严格启发式（正文必须出现角色名才可能承接）
    if (!pickedHere && !aiText.includes(item.refId)) continue;

    const hookCueTokens = Array.from(new Set(tokensOf(`${item.hook || ''} ${item.title || ''}`)));
    let overlap = 0;
    for (const tok of hookCueTokens) {
      if (aiTokens.has(tok)) overlap += 1;
    }
    const onStageNow = onStageSet.has(item.refId);
    const offeredHere = item.delivery?.chatKey === floorCtx.chatKey
      && item.delivery?.offeredAnchor === floorCtx.anchor
      && item.delivery?.offeredSwipeId === floorCtx.swipeId;
    const fillText = composeIntrusionFillText(item);
    const draftUsed = Boolean(
      item.delivery?.draftPreparedAt
      && userText
      && ((item.hook && userText.includes(item.hook)) || (fillText && userText.includes(fillText))),
    );
    const hasArrivalCue = ARRIVAL_ACTION_CUE_RE.test(aiText);

    // v2：命中 pickedIds ＝魔改推进已明确挑选，正文点到角色名即算承接（不再要求固定入镜动词），
    // 未点到角色名时要求线索重叠 ≥2 或「动作线索 + 至少 1 条重叠」。
    const reliable = pickedHere
      ? (aiText.includes(item.refId) || overlap >= 2 || (hasArrivalCue && overlap >= 1))
      : ((onStageNow && (overlap >= 2 || draftUsed || hasArrivalCue))
        || (offeredHere && (overlap >= 1 || hasArrivalCue))
        || (draftUsed && (overlap >= 1 || hasArrivalCue))
        || (overlap >= 3 && hasArrivalCue)
        || overlap >= 4);

    if (reliable) {
      matchedIds.push(item.id);
      break; // 单楼层最多可靠承接一条主导事件，避免误连坐
    }
  }

  if (!matchedIds.length) return { state, confirmedIds: [] };
  let next = state;
  for (const id of matchedIds) {
    next = triggerIntrusion(next, id, {
      chatKey: floorCtx.chatKey,
      actedFloor: floorCtx.floor,
      actedAnchor: floorCtx.anchor,
      actedSwipeId: floorCtx.swipeId,
    });
  }
  return { state: next, confirmedIds: matchedIds };
}

export interface WorldAckReceiptContext {
  chatKey: string;
  /** 当前聊天轮次（= chat.length），冷却截止轮次据此推算。 */
  round: number;
  floor?: number;
  anchor?: string;
  swipeId?: number;
  /** 宿主实时聊天身份（getDefaultChatIdentity 口径）；与回执 chatIdentity 不一致则不消费。 */
  liveChatIdentity?: string | null;
}

/** 回执里的 picked：兼容单对象 { id } 与数组 [{ id }] 两种形状（也容忍纯字符串 id）。 */
function ackPickedIds(ack: any): string[] {
  const raw = ack?.picked;
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
  const ids: string[] = [];
  for (const item of list) {
    const id = typeof item === 'string' ? item : (item && typeof item === 'object' ? item.id : '');
    const clean = String(id || '').trim();
    if (clean && !ids.includes(clean)) ids.push(clean);
  }
  return ids;
}

/** v2：确定性回执消费（纯函数）。读取魔改推进写在用户楼上的 `sl_world_ack`，把挑选结果落成
 *  事件冷却台账（不打乱 pending 入镜队列）：
 *  - 先清掉 `untilRound <= round` 的过期冷却；
 *  - picked 里的非 pending 入镜事件（encounter/rumor/ambient/伏线…）→ picked 冷却 4 轮；
 *  - skippedIds 里未被本轮 picked 选中的 id → skipped 冷却 2 轮（入镜事件只降权，不删事件）；
 *  - 回执 chatIdentity 与实时聊天身份不一致 → 整条跳过不消费（防跨聊天串味）。 */
export function applyWorldAckReceipt(
  state: WorldState,
  ack: unknown,
  ctx: WorldAckReceiptContext,
): WorldState {
  if (!ack || typeof ack !== 'object' || Array.isArray(ack)) return state;
  const raw = ack as any;
  if (Number(raw.version) !== 1) return state;
  const rounded = Number(ctx.round);
  if (!Number.isFinite(rounded)) return state;
  const round = Math.floor(rounded);
  const liveIdentity = typeof ctx.liveChatIdentity === 'string' && ctx.liveChatIdentity.trim()
    ? ctx.liveChatIdentity.trim()
    : null;
  const ackIdentity = typeof raw.chatIdentity === 'string' ? raw.chatIdentity.trim() : '';
  if (ackIdentity && liveIdentity && ackIdentity !== liveIdentity) return state;

  const pickedIds = ackPickedIds(raw);
  const skippedIds = Array.isArray(raw.skippedIds)
    ? (raw.skippedIds as unknown[]).map(id => String(id || '').trim()).filter(Boolean)
    : [];
  const next: WorldState = plainClone(state);
  const cooldowns: Record<string, WorldEventCooldown> = { ...(next.eventCooldowns || {}) };
  let changed = false;

  for (const [id, cd] of Object.entries(cooldowns)) {
    const until = Number(cd?.untilRound);
    if (!Number.isFinite(until) || until <= round) {
      delete cooldowns[id];
      changed = true;
    }
  }

  const writeCooldown = (id: string, action: 'picked' | 'skipped', untilRound: number) => {
    cooldowns[id] = {
      id,
      action,
      untilRound,
      ...(ctx.chatKey ? { chatKey: ctx.chatKey } : {}),
      ...(typeof ctx.floor === 'number' ? { floor: ctx.floor } : {}),
      ...(ctx.anchor ? { anchor: ctx.anchor } : {}),
      ...(typeof ctx.swipeId === 'number' ? { swipeId: ctx.swipeId } : {}),
    };
    changed = true;
  };

  const pendingArrivalIds = new Set(
    (next.pendingIntrusions || [])
      .filter(it => it.status === 'pending' && it.kind === 'character_arrival')
      .map(it => it.id),
  );
  for (const id of pickedIds) {
    // 被选中的 pending 入镜由楼层承接确认转 acted，不写冷却（否则会把刚发生的事件压掉）
    if (pendingArrivalIds.has(id)) continue;
    writeCooldown(id, 'picked', round + 4);
  }
  const pickedSet = new Set(pickedIds);
  for (const id of skippedIds) {
    if (pickedSet.has(id)) continue;
    writeCooldown(id, 'skipped', round + 2);
  }

  if (!changed) return state;
  if (Object.keys(cooldowns).length) next.eventCooldowns = cooldowns;
  else delete next.eventCooldowns;
  return next;
}

/** P2 删楼 / Swipe / 中止回退校验：基于 story-floor-store / external-story-store 锚点与 swipe 证据，
 *  若 acted 对应的楼层已被删除或已切换到其他 swipe 变体，立即回退为 pending。 */
export function reconcileIntrusionsWithChat(
  state: WorldState,
  chat: any[],
  chatKey: string,
): { state: WorldState; rolledBackIds: string[] } {
  if (!Array.isArray(chat)) return { state, rolledBackIds: [] };
  const rolledBackIds: string[] = [];
  const next: WorldState = plainClone(state);
  let changed = false;

  for (const item of next.pendingIntrusions) {
    if (item.status !== 'acted') continue;
    const d = item.delivery;
    if (!d || (!d.actedAnchor && typeof d.actedFloor !== 'number')) continue;
    if (d.chatKey && chatKey && d.chatKey !== chatKey) continue;

    const floor = d.actedFloor;
    const msg = typeof floor === 'number' && floor >= 0 && floor < chat.length ? chat[floor] : null;
    let valid = Boolean(msg && msg.is_user !== true);

    if (valid && typeof d.actedSwipeId === 'number') {
      const curSwipe = Number(msg.swipe_id) || 0;
      if (curSwipe !== d.actedSwipeId) valid = false;
    }

    if (valid && d.actedAnchor) {
      const curAnchor = selectedMessageAnchor(msg, floor!);
      const msgAnchor = messageLevelAnchor(msg);
      const curSwipe = Number(msg.swipe_id) || 0;
      const anchorMatches = d.actedAnchor === curAnchor
        || (Boolean(msgAnchor) && d.actedAnchor === msgAnchor && curSwipe === (d.actedSwipeId ?? 0));
      if (!anchorMatches) valid = false;
    }

    if (!valid) {
      item.status = 'pending';
      delete item.ttl;
      const rev = nextRevision(item);
      item.revision = rev;
      if (item.delivery) {
        delete item.delivery.actedFloor;
        delete item.delivery.actedAnchor;
        delete item.delivery.actedSwipeId;
        delete item.delivery.actedAt;
        item.delivery.revision = rev;
      }
      rolledBackIds.push(item.id);
      changed = true;
    }
  }

  // v2：冷却台账同样带楼层证据——对应楼层已删 / 已切换 swipe / 锚点不符时一并移除（回退为未冷却）
  const cool = next.eventCooldowns;
  if (cool) {
    for (const [id, cd] of Object.entries(cool)) {
      if (!cd || typeof cd.id !== 'string' || !cd.id) {
        delete cool[id];
        changed = true;
        continue;
      }
      if (cd.chatKey && chatKey && cd.chatKey !== chatKey) continue;
      const hasFloorEvidence = typeof cd.floor === 'number' || Boolean(cd.anchor);
      if (!hasFloorEvidence) continue;
      const floorIdx = typeof cd.floor === 'number' ? cd.floor : -1;
      const msg = floorIdx >= 0 && floorIdx < chat.length ? chat[floorIdx] : null;
      let cooldownValid = Boolean(msg && msg.is_user !== true);
      if (cooldownValid && typeof cd.swipeId === 'number') {
        const curSwipe = Number((msg as any).swipe_id) || 0;
        if (curSwipe !== cd.swipeId) cooldownValid = false;
      }
      if (cooldownValid && cd.anchor) {
        const curAnchor = selectedMessageAnchor(msg as any, floorIdx);
        const msgAnchor = messageLevelAnchor(msg as any);
        const curSwipe = Number((msg as any)?.swipe_id) || 0;
        const anchorMatches = cd.anchor === curAnchor
          || (Boolean(msgAnchor) && cd.anchor === msgAnchor && curSwipe === (cd.swipeId ?? 0));
        if (!anchorMatches) cooldownValid = false;
      }
      if (!cooldownValid) {
        delete cool[id];
        changed = true;
      }
    }
    if (!Object.keys(cool).length) delete next.eventCooldowns;
  }

  return { state: changed ? next : state, rolledBackIds };
}

/** P2 过期入镜事件转背景结算：超期未承接的 pending 入镜移出候选池并留存角色经历。 */
export function sweepExpiredIntrusions(
  state: WorldState,
  today: string,
): { state: WorldState; missed: Array<{ id: string; refId: string; title: string; summary: string }> } {
  if (!today) return { state, missed: [] };
  const missed: Array<{ id: string; refId: string; title: string; summary: string }> = [];
  const kept: Intrusion[] = [];
  let changed = false;

  for (const it of state.pendingIntrusions || []) {
    if (it.status === 'pending' && it.expiresAtDay && compareDateKey(today, it.expiresAtDay) > 0) {
      missed.push({
        id: it.id,
        refId: it.refId,
        title: it.title,
        summary: `[错过] ${it.refId}·${it.title}`,
      });
      changed = true;
      continue;
    }
    kept.push(it);
  }

  if (!changed) return { state, missed: [] };
  const next: WorldState = plainClone(state);
  next.pendingIntrusions = kept;
  for (const m of missed) {
    const profile = next.profiles[m.refId];
    if (profile) {
      profile.experiences = [
        { text: `原本拟议「${m.title}」`, endedAtDay: today, outcome: '时机错过，在幕后自行了结' },
        ...(profile.experiences || []),
      ].slice(0, EXP_MAX);
    }
  }
  return { state: next, missed };
}
