// core/world-engine/world-sources.ts
// 世界演化的真实数据源 + 双轨触发注册 + P2 落楼承接确认与删楼/Swipe 回退监听。
import { getConfig } from '../config-store';
import { getCellByHeader, getSheetByName, isNsfwPlayActive } from '../data-manager';
import { parseProtagonistAttitude, parseCharacterRelationRows, formatRelationInjectionLines } from '../character-relation-model';
import { getAiReplyContext, getRecentStoryContext } from '../map-system';
import { getTodayDateKey } from '../calendar-core';
import { getTavernHelper } from '../env';
import {
  configureWorldEvolutionSources,
  isWorldPhoneBridgeAvailable,
  lastAiReplyText,
  maybeEvolve,
  type EvolutionSources,
} from './world-evolution';
import { formatChronicleBlocks, readChronicleRowsForNames } from '../chronicle-blocks';
import { buildFrontDigest, decideEvolve, gapDaysBetween, normalizeRegion, selectFocusSubset, type RosterCandidate } from './world-state';
import { applyWorldAckReceipt, confirmIntrusionAdoptionFromFloor, markIntrusionCandidatesOffered, reconcileIntrusionsWithChat, selectIntrusionCandidates } from './world-intrusion';
import { getDefaultChatIdentity } from './world-snapshot';
import { loadWorldState, saveWorldState } from './world-store';
import { projectCharacterDynamics, projectWorldDigest, setWorldProjectionRuntimeProvider, type WorldProjectionRuntimeContext } from './world-worldbook';
import type { CharProfile, WorldState } from './world-types';
import { DEFAULT_CHRONICLE_TOTAL } from './world-types';
import { isRefillMode } from '../refill-mode';
import { resolveWorldEvolveStyleForCurrentCard } from './world-style-library';
import { selectedMessageAnchor } from '../external-story-store';
import { getCurrentStoryChatKey, isStoryStorageReady } from '../story-floor-store';

function readRosterCandidates(): RosterCandidate[] {
  const seen = new Set<string>();
  const out: RosterCandidate[] = [];
  let protagonist = '';
  try { protagonist = (getCellByHeader('主角信息表', 1, '姓名') || '').trim(); } catch (_e) { /* ignore */ }
  const push = (table: '重要角色表' | '恋爱对象表') => {
    const sheet = getSheetByName(table);
    if (!sheet || !Array.isArray(sheet.content)) return;
    for (let i = 1; i < sheet.content.length; i++) {
      const name = (getCellByHeader(table, i, '姓名') || '').trim();
      if (!name || name === protagonist || seen.has(name)) continue;
      seen.add(name);
      // 与主角的关系：角色表「对主角态度」列的关系段（人物关系表不再记录主角对）
      const relation = parseProtagonistAttitude(getCellByHeader(table, i, '对主角态度')).relation;
      out.push({ name, relation });
    }
  };
  push('重要角色表');
  push('恋爱对象表');
  return out;
}

function readOnStageNames(): string[] {
  const names: string[] = [];
  try {
    const sheet = getSheetByName('在场角色表');
    if (sheet && Array.isArray(sheet.content)) {
      for (let i = 1; i < sheet.content.length; i++) {
        const n = getCellByHeader('在场角色表', i, '姓名');
        if (n && String(n).trim()) names.push(String(n).trim());
      }
    }
  } catch (_e) { /* ignore */ }
  return names;
}

function readOnStageStatuses(): string[] {
  const statuses: string[] = [];
  try {
    const sheet = getSheetByName('在场角色表');
    if (sheet && Array.isArray(sheet.content)) {
      for (let i = 1; i < sheet.content.length; i++) {
        const st = (getCellByHeader('在场角色表', i, '当前状态') || '').trim();
        const emo = (getCellByHeader('在场角色表', i, '情绪') || '').trim();
        if (st || emo) statuses.push(`${st} ${emo}`.trim());
      }
    }
  } catch (_e) { /* ignore */ }
  return statuses;
}

function readAppointmentNames(): string[] {
  const names = new Set<string>();
  try {
    const sheet = getSheetByName('备忘录');
    if (sheet && Array.isArray(sheet.content)) {
      for (let i = 1; i < sheet.content.length; i++) {
        const st = String(getCellByHeader('备忘录', i, '当前状态') || '').trim();
        if (/(?:已完成|已取消|作废|过期)/.test(st)) continue;
        const related = String(getCellByHeader('备忘录', i, '相关角色') || '').trim();
        if (!related) continue;
        for (const n of related.split(/[,，、;\s]+/)) {
          if (n.trim()) names.add(n.trim());
        }
      }
    }
  } catch (_e) { /* ignore */ }
  return [...names];
}

function readLocationText(): string {
  try { return String(getCellByHeader('全局数据表', 1, '当前详细地点') || ''); } catch (_e) { return ''; }
}

function readHostChat(): any[] {
  try {
    const rawSt: any = (typeof window !== 'undefined' ? (window as any).SillyTavern : undefined)
      || (typeof window !== 'undefined' ? (window as any).TavernHelper?.SillyTavern : undefined)
      || (typeof parent !== 'undefined' ? (parent as any).SillyTavern : undefined);
    const ctx = typeof rawSt?.getContext === 'function' ? rawSt.getContext() : rawSt;
    return Array.isArray(ctx?.chat) ? ctx.chat : [];
  } catch (_e) {
    return [];
  }
}

function readCurrentActionText(): string {
  const chat = readHostChat();
  return chat.slice(-2).map(message => {
    const text = String(message?.mes || '');
    const original = text.match(/<本轮用户输入>([\s\S]*?)<\/本轮用户输入>/);
    return original ? original[1].trim() : text;
  }).filter(Boolean).join('\n');
}

function readRuntimeContext(): WorldProjectionRuntimeContext {
  const location = readLocationText();
  return {
    dateKey: getTodayDateKey() || '',
    playerRegion: normalizeRegion(location),
    onStageNames: readOnStageNames(),
    nsfwActive: isNsfwPlayActive(),
    location,
    onStageStatuses: readOnStageStatuses(),
    recentText: readLatestAiReply(),
    actionText: readCurrentActionText(),
  };
}

function readRecentNames(): string[] {
  const context = getRecentStoryContext(8);
  if (!context) return [];
  return readRosterCandidates().map(c => c.name).filter(name => context.includes(name));
}

/** 最新 AI 回复文本：优先酒馆助手 getChatMessages（纯文本、与 generateRaw 同源）；回退 SillyTavern.chat 尾部扫描。 */
function readLatestAiReply(): string {
  const th = getTavernHelper();
  if (th && typeof th.getChatMessages === 'function' && typeof th.getLastMessageId === 'function') {
    try {
      const lastId = th.getLastMessageId();
      if (typeof lastId === 'number' && lastId >= 0) {
        const msgs = th.getChatMessages(`${lastId}-${lastId}`, { role: 'assistant', hide_state: 'all', include_swipes: false }) as any[];
        const msg = Array.isArray(msgs) ? msgs[msgs.length - 1] : undefined;
        if (msg && typeof msg.message === 'string') return msg.message;
      }
    } catch (_e) { /* ignore */ }
  }
  try {
    const chat = readHostChat();
    if (chat.length) return lastAiReplyText(chat);
  } catch (_e) { /* ignore */ }
  return '';
}

function describeTimeGap(a: string, b: string): string {
  const days = gapDaysBetween(a, b);
  if (days <= 0) return '数小时';
  if (days === 1) return '1 天';
  if (days < 7) return `${days} 天`;
  if (days < 30) return `${Math.round(days / 7)} 周`;
  return `${Math.round(days / 30)} 月`;
}

export async function readEvolutionSources(focus: CharProfile[], _state: WorldState): Promise<EvolutionSources> {
  const cfg = getConfig();
  const chronicleTotal = cfg.worldChronicleTotal ?? DEFAULT_CHRONICLE_TOTAL;
  const overviewCount = Math.round(chronicleTotal * 0.7);
  const chronicleBlocks = formatChronicleBlocks(
    readChronicleRowsForNames(focus.map(p => p.name), chronicleTotal),
    { overview: overviewCount, full: chronicleTotal - overviewCount },
  );
  const recentChat = getAiReplyContext(cfg.worldContextCount || 2);
  const relationLines = formatRelationInjectionLines(
    parseCharacterRelationRows(getSheetByName('人物关系表')),
    { involve: focus.map(p => p.name), limit: 20 },
  );
  return { chronicleBlocks, recentChat, relations: relationLines };
}

/** 读取推进驱动写在用户楼上的确定性回执（sl_world_ack）；形状非法/版本不符一律返回 null。
 *  台账侧落点：自产用户楼字段（版本 1，picked 单对象或数组，skippedIds 数组）。 */
function readWorldAck(msg: any): any | null {
  if (!msg || typeof msg !== 'object') return null;
  const raw = (msg as any).sl_world_ack ?? (msg as any).extra?.sl_world_ack ?? null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (Number((raw as any).version) !== 1) return null;
  return raw;
}

/** 回执命中 id（兼容 picked 单对象 { id } 与数组 [{ id }]）。 */
function readWorldAckPickedIds(ack: any): string[] {
  const picked = ack?.picked;
  const list = Array.isArray(picked) ? picked : (picked && typeof picked === 'object' ? [picked] : []);
  const ids: string[] = [];
  for (const item of list) {
    const id = typeof item === 'string' ? item : (item && typeof item === 'object' ? item.id : '');
    const clean = String(id || '').trim();
    if (clean && !ids.includes(clean)) ids.push(clean);
  }
  return ids;
}

/** P2 落楼后同步入镜消费状态：先按现存楼层/Swipe 回退失效的 acted，再依据当前 AI 楼层证据确认实际承接。 */
async function syncIntrusionsOnTurn(confirmAdoption: boolean): Promise<void> {
  if (isRefillMode() || !isStoryStorageReady() || getConfig().worldEnabled === false) return;
  const chat = readHostChat();
  const chatKey = getCurrentStoryChatKey();
  if (!chatKey) return;

  const initial = loadWorldState();
  const rec = reconcileIntrusionsWithChat(initial, chat, chatKey);
  let next = rec.state;
  let changed = rec.rolledBackIds.length > 0;

  if (confirmAdoption && Array.isArray(chat) && chat.length > 0) {
    let aiFloor = -1;
    for (let i = chat.length - 1; i >= 0; i--) {
      const m = chat[i];
      if (m && !m.is_user && !m.is_system && typeof m.mes === 'string' && m.mes.trim()) {
        aiFloor = i;
        break;
      }
    }
    if (aiFloor >= 0) {
      const aiMsg = chat[aiFloor];
      const anchor = selectedMessageAnchor(aiMsg, aiFloor);
      const swipeId = Number(aiMsg?.swipe_id) || 0;
      let userText = '';
      let userMsg: any = null;
      for (let j = aiFloor - 1; j >= 0; j--) {
        if (chat[j]?.is_user && typeof chat[j].mes === 'string') {
          userText = chat[j].mes;
          userMsg = chat[j];
          break;
        }
      }
      // 确定性回执：推进驱动若在用户楼上落了 sl_world_ack，就按它优先承接，不再靠窄动词启发式猜
      const ack = readWorldAck(userMsg);
      const pickedIds = ack ? readWorldAckPickedIds(ack) : [];
      // 落楼前展示给本轮输入的候选，用同一 AI 锚点绑定；正文承接不依赖用户手点。
      const view = selectIntrusionCandidates(next, {
        dateKey: getTodayDateKey() || next.lastEvolveDateKey || '',
        playerRegion: normalizeRegion(readLocationText()),
        onStageNames: readOnStageNames(),
        sceneGuard: readRuntimeContext() as any,
        cooldowns: next.eventCooldowns,
        currentRound: chat.length,
      });
      const offered = markIntrusionCandidatesOffered(next, view, { chatKey, floor: aiFloor, anchor, swipeId });
      if (offered !== next) {
        next = offered;
        changed = true;
      }
      const res = confirmIntrusionAdoptionFromFloor(next, {
        chatKey,
        floor: aiFloor,
        anchor,
        swipeId,
        aiText: String(aiMsg.mes || ''),
        userText,
        onStageNames: readOnStageNames(),
        ...(pickedIds.length ? { pickedIds } : {}),
      });
      if (res.confirmedIds.length > 0) {
        next = res.state;
        changed = true;
      }
      // 回执消费：picked 的非入镜事件冷却 4 轮、skippedIds 冷却 2 轮；过期冷却顺带清理
      if (ack) {
        const withReceipt = applyWorldAckReceipt(next, ack, {
          chatKey,
          round: chat.length,
          floor: aiFloor,
          anchor,
          swipeId,
          liveChatIdentity: getDefaultChatIdentity(),
        });
        if (withReceipt !== next) {
          next = withReceipt;
          changed = true;
        }
      }
    }
  }

  if (!changed) return;
  const dateKey = getTodayDateKey() || next.lastEvolveDateKey || '';
  const playerRegion = normalizeRegion(readLocationText());
  next.frontDigest = buildFrontDigest(next, dateKey, { playerRegion });
  const saved = await saveWorldState(next);
  if (saved) {
    await projectWorldDigest(next.frontDigest);
    await projectCharacterDynamics();
  }
}

let _evolveTimer: ReturnType<typeof setTimeout> | null = null;

/** 演化触发（防抖）：消息事件共用一个 500ms 重臂防抖。 */
function scheduleEvolve(): void {
  if (isRefillMode()) return;
  if (getConfig().worldAutoUpdate === false) return;
  if (_evolveTimer) clearTimeout(_evolveTimer);
  _evolveTimer = setTimeout(() => {
    _evolveTimer = null;
    if (isRefillMode()) return;
    void maybeEvolve();
  }, 500);
}

export function initWorldEvolution(): void {
  setWorldProjectionRuntimeProvider(readRuntimeContext);
  configureWorldEvolutionSources({
    round: () => {
      try {
        const ctx = (window as any).SillyTavern?.getContext?.() || (window.parent as any).SillyTavern?.getContext?.();
        return Array.isArray(ctx?.chat) ? ctx.chat.length : 0;
      } catch { return 0; }
    },
    date: () => getTodayDateKey() || '',
    enabled: () => getConfig().worldEnabled !== false,
    config: () => {
      const c = getConfig();
      const evolveStyle = resolveWorldEvolveStyleForCurrentCard(c);
      return {
        evolveEveryTurns: c.worldEvolveEveryTurns,
        focusMax: c.worldFocusMax,
        rotationBatch: c.worldRotationBatch,
        worldContextCount: c.worldContextCount,
        worldEvolveStyle: evolveStyle.style,
        worldEvolveStyleCustom: evolveStyle.custom,
        evolveMinReply: c.worldEvolveMinReply,
        worldPhoneLink: c.worldPhoneLink === true && isWorldPhoneBridgeAvailable(),
      };
    },
    decide: decideEvolve,
    select: selectFocusSubset,
    onStage: readOnStageNames,
    recent: readRecentNames,
    roster: readRosterCandidates,
    gap: describeTimeGap,
    latestReply: readLatestAiReply,
    location: readLocationText,
    appointments: readAppointmentNames,
    sources: readEvolutionSources,
  });

  // F4：window 令牌——模块重求值后旧闭包仍挂在宿主 eventSource 上，模块布尔挡不住第二份注册
  const w = window as any;
  if (w.__ub_world_evolution_bound) return;
  w.__ub_world_evolution_bound = true;
  const skipQuiet = (type?: string) => type === 'quiet' || type === 'impersonate' || type === 'command' || type === 'extension' || type === 'first_message';
  const onTurn = (_id?: unknown, type?: string) => {
    if (!skipQuiet(type)) {
      // 让出当前事件栈，避免状态栏正则/世界书读写抢在台账等监听之前占满同步阶段。
      setTimeout(() => {
        void syncIntrusionsOnTurn(true).finally(() => {
          scheduleEvolve();
        });
      }, 0);
    }
  };
  const onReconcileOnly = () => {
    void syncIntrusionsOnTurn(false);
  };
  try {
    const rawSt: any = (window as any).SillyTavern || (window as any).TavernHelper?.SillyTavern;
    const st: any = typeof rawSt?.getContext === 'function' ? rawSt.getContext() : rawSt;
    const source = st?.eventSource;
    const types = st?.eventTypes || {};
    if (source && typeof source.on === 'function') {
      source.on(types.MESSAGE_RECEIVED || 'message_received', onTurn);
      source.on(types.MESSAGE_SWIPED || 'message_swiped', onReconcileOnly);
      source.on(types.MESSAGE_DELETED || 'message_deleted', onReconcileOnly);
    }
  } catch (_e) { /* ignore */ }
}
