// core/world-engine/world-worldbook.ts
// 台前摘要 → 世界书投影：专用条目「世界动态」（constant 蓝灯，at_depth order 199）。
// 认知边界总闸：注入内容 = frontDigest（主角可知集合）+ 双区自然入镜候选（最多 1 主入口 + 2 极简参考，pending 禁出完整 desc）；
// worldEnabled 关或内容空时移除条目。
// 角色动态 → 世界书投影：绿色（角色姓名关键词触发）条目族「角色动态-<角色名>」（before_character_definition order 202），
//   含该角色当前真实动向/打算/暗中打算/角色自身认知视角（knownFacts，非主角全知）与「主角不知情」限制提示；
//   pending 入镜绝不输出完整 desc。
import { getTavernHelper, getToastr } from '../env';
import { STANDARD_RECURSION } from '../constants';
import { dsCachePos, registerManagedWbEntry } from '../wb-position';
import { hasWorldbookProjectionDispatcher, requestWorldbookProjection } from '../worldbook-projection-events';
import { loadWorldState } from './world-store';
import { hasWorldState } from './world-store';
import { charThreadStage, DIGEST_SECTION_HERE, DIGEST_SECTION_RUMOR, DIGEST_SECTION_UNDER } from './world-state';
import {
  assessIntrusionSceneGuard,
  selectIntrusionCandidates,
  type IntrusionCandidate,
  type IntrusionCandidateView,
} from './world-intrusion';
import {
  KNOWN_FACTS_MAX,
  WORLD_DIGEST_CHARS_MAX,
  WORLD_FEATURE_KEY,
  type CharProfile,
  type WorldState,
} from './world-types';
import { deleteStoryFeature } from '../story-floor-store';
import { getConfig } from '../config-store';
import { ledgerHandlesWorldFrontEvents } from '../ledger-takeover';

export const WORLD_WB_NAME = 'UBS-世界演化-世界动态';
export const CHARACTER_DYNAMIC_WB_PREFIX = 'UBS-世界演化-角色动态-';
export const DIGEST_SECTION_PRIMARY_CANDIDATE = '〔自然入镜·主入口〕';
export const DIGEST_SECTION_REF_CANDIDATES = '〔自然入镜·参考〕';
export const DIGEST_SECTION_ANTI_COLLISION = '〔防撞车索引〕';
/** 双开收敛：已发生入镜事件的回响段（只有这两段会被投影）。 */
export const DIGEST_SECTION_ACTED = '〔近期入镜余波〕';
// O18-A：旧版条目名（`瑟瑟灵感状态栏-*`）兼容已退役——改由 core/legacy-worldbook-entries.ts
// 在投影全量刷新时统一回收；本模块只认当前名。

registerManagedWbEntry({
  match: (e: any) => (e?.comment || e?.name || '') === WORLD_WB_NAME,
  origPos: () => ({ type: 'at_depth', role: 'system', depth: 0, order: 199 }),
});

registerManagedWbEntry({
  match: (e: any) => String(e?.comment || e?.name || '').startsWith(CHARACTER_DYNAMIC_WB_PREFIX),
  origPos: () => ({ type: 'before_character_definition', role: 'system', depth: 0, order: 202 }),
});

export interface WorldProjectionRuntimeContext {
  dateKey?: string;
  playerRegion?: string;
  onStageNames?: string[];
  nsfwActive?: boolean;
  location?: string;
  onStageStatuses?: string[];
  recentText?: string;
  /** 当前输入/行动文本，供技能按本轮明确意图选择一条详述。 */
  actionText?: string;
}

let _runtimeProvider: (() => WorldProjectionRuntimeContext) | null = null;

/** 由 world-sources.ts 注册，供世界书投影期间读取当前场景守护与地区/在场上下文（单测无宿主时安全回退空上下文）。 */
export function setWorldProjectionRuntimeProvider(provider: (() => WorldProjectionRuntimeContext) | null): void {
  _runtimeProvider = provider;
}

export function getWorldProjectionRuntimeContext(): WorldProjectionRuntimeContext {
  return getRuntimeContext();
}

function getRuntimeContext(): WorldProjectionRuntimeContext {
  try {
    return _runtimeProvider ? (_runtimeProvider() || {}) : {};
  } catch (_e) {
    return {};
  }
}

const DIGEST_SECTIONS = [
  DIGEST_SECTION_HERE,
  DIGEST_SECTION_RUMOR,
  DIGEST_SECTION_UNDER,
  DIGEST_SECTION_PRIMARY_CANDIDATE,
  DIGEST_SECTION_REF_CANDIDATES,
  DIGEST_SECTION_ANTI_COLLISION,
];

/** 裁剪优先级（数值越大越优先裁掉）：泛风声/远处暗流先裁，此地此刻/主入口/必要认知最后裁。 */
function sectionTrimPriority(title: string): number {
  if (title === DIGEST_SECTION_RUMOR) return 100;
  if (title === DIGEST_SECTION_UNDER) return 80;
  if (title === DIGEST_SECTION_ANTI_COLLISION) return 70;
  if (title === DIGEST_SECTION_REF_CANDIDATES) return 60;
  if (!title) return 50;
  if (title === DIGEST_SECTION_HERE) return 20;
  if (title === DIGEST_SECTION_PRIMARY_CANDIDATE) return 10;
  return 40;
}

/** 行级留存价值（越高越晚被裁）：当前事件、地点人物、临近约定与必要认知优先保留；泛风声/远处内容先裁。 */
function rowRetentionScore(row: string): number {
  let score = 0;
  if (/此地|此刻|附近|眼下|当前|现场|→|主入口|契机：|条件：/.test(row)) score += 30;
  if (/约定|赴约|临近|期限|即将|明日|今日|今晚|正在发生|将要收场/.test(row)) score += 25;
  if (/认知|知道：|不知道：|公开面：|边界/.test(row)) score += 20;
  if (/远处|外域|他乡|遥远|据说|听说|闲话|传闻/.test(row)) score -= 15;
  return score;
}

function formatPrimaryCandidateLine(c: IntrusionCandidate): string {
  const parts = [`[${c.id}#r${c.revision}] ${c.refId}：${c.entryCue}`];
  if (c.reason) parts.push(`契机：${c.reason}`);
  if (c.condition) parts.push(`条件：${c.condition}`);
  if (c.publicInfo) parts.push(`公开面：${c.publicInfo}`);
  return `- ${parts.join('｜')}（${c.epistemicBoundary}）`;
}

function formatRefCandidateLine(c: IntrusionCandidate): string {
  return `- [${c.id}#r${c.revision}] ${c.refId}：${c.entryCue}${c.region ? `（${c.region}）` : ''}`;
}

export interface WorldDigestContentOptions {
  /** true＝双开收敛：世界书只保留已发生余波 + 极短〔世界暗流〕，未发生事件交由推进驱动按需挑选。 */
  delegatedToDriver?: boolean;
  /** acted 余波行（状态里 status==='acted' 且有 desc/title/hook 的事件）。 */
  actedEchoes?: string[];
}

const DELEGATED_ECHO_MAX = 3;
const DELEGATED_UNDER_MAX_ROWS = 3;
const DELEGATED_UNDER_CHARS_MAX = 300;

/** 双开收敛版世界动态：只留〔近期入镜余波〕（≤3）与极短〔世界暗流〕（≤3 行且正文 ≤300 字）；
 *  〔此地此刻〕〔风闻轶事〕〔自然入镜·主入口〕〔自然入镜·参考〕〔防撞车索引〕一律剔除。 */
function buildDelegatedDigestContent(frontDigest: string, actedEchoes: string[]): string {
  const echoes = (actedEchoes || [])
    .map(e => String(e || '').trim().replace(/^[-·•]\s*/, ''))
    .filter(Boolean)
    .slice(0, DELEGATED_ECHO_MAX);

  const lines = String(frontDigest || '').split('\n').map(l => l.trim()).filter(Boolean);
  const underRows: string[] = [];
  let inUnder = false;
  for (const line of lines) {
    if (DIGEST_SECTIONS.includes(line) || /^【世界动态/.test(line) || line.includes('入镜】')) {
      inUnder = line === DIGEST_SECTION_UNDER;
      continue;
    }
    if (!inUnder) continue;
    const remain = DELEGATED_UNDER_CHARS_MAX - underRows.reduce((n, r) => n + r.length, 0);
    if (remain <= 1) break;
    underRows.push(line.length <= remain ? line : line.slice(0, remain - 1) + '…');
    if (underRows.length >= DELEGATED_UNDER_MAX_ROWS) break;
  }

  if (!echoes.length && !underRows.length) return '';
  const body: string[] = [];
  if (echoes.length) body.push(DIGEST_SECTION_ACTED, ...echoes.map(e => `- ${e}`));
  if (underRows.length) body.push(DIGEST_SECTION_UNDER, ...underRows);
  return `【世界动态】只保留已发生余波与极短大势；尚未发生的事件不在世界书里预告，由台前推进按需挑选。\n\n${body.join('\n')}`;
}

/** 从状态里抽取 acted 事件余波行（双开收敛时投影用）。 */
export function collectActedEchoes(state: WorldState | null | undefined): string[] {
  if (!state || !Array.isArray(state.pendingIntrusions)) return [];
  const out: string[] = [];
  for (const it of state.pendingIntrusions) {
    if (it?.status !== 'acted') continue;
    const title = String(it.title || '').trim();
    const desc = String(it.desc || '').trim();
    const hook = String(it.hook || '').trim();
    if (!title && !desc && !hook) continue;
    const head = [String(it.refId || '').trim(), title].filter(Boolean).join('·');
    const rest = desc || hook;
    out.push(rest ? `${head}：${rest}` : head);
  }
  return out;
}

export function buildWorldDigestContent(
  frontDigest: string,
  candidateView?: IntrusionCandidateView,
  opts?: WorldDigestContentOptions,
): string {
  // 双开收敛分支：未显式开启时与旧行为 100% 一致
  if (opts?.delegatedToDriver === true) return buildDelegatedDigestContent(frontDigest, opts.actedEchoes || []);

  const hasCandidate = Boolean(
    candidateView && !candidateView.blocked && (candidateView.primary || candidateView.references.length),
  );
  if (!frontDigest.trim() && !hasCandidate) return '';

  // WS10：入镜事件内容不进旧式「【X 入镜】」泄密行，改为下方双区候选视图（pending 绝不含完整 desc）。
  const lines = frontDigest.split('\n').filter(l => l.trim() && !l.includes('入镜】'));
  const head = lines[0]?.startsWith('【世界动态') ? lines.shift()! : '';
  const sections: { title: string; rows: string[] }[] = [];
  for (const l of lines) {
    if (DIGEST_SECTIONS.includes(l)) sections.push({ title: l, rows: [] });
    else if (sections.length) sections[sections.length - 1].rows.push(l);
    else sections.push({ title: '', rows: [l] });
  }

  if (candidateView && !candidateView.blocked) {
    if (candidateView.primary) {
      sections.push({
        title: DIGEST_SECTION_PRIMARY_CANDIDATE,
        rows: [formatPrimaryCandidateLine(candidateView.primary)],
      });
    }
    if (candidateView.references.length) {
      sections.push({
        title: DIGEST_SECTION_REF_CANDIDATES,
        rows: candidateView.references.map(formatRefCandidateLine),
      });
    }
    if (candidateView.backgroundAntiCollision.length) {
      sections.push({
        title: DIGEST_SECTION_ANTI_COLLISION,
        rows: [`- 后台未命中线索（仅防撞车，勿提前展开）：${candidateView.backgroundAntiCollision.join('；')}`],
      });
    }
  }

  const size = () => sections
    .filter(s => s.rows.length)
    .reduce((n, s) => n + (s.title ? s.title.length + 1 : 0) + s.rows.reduce((m, r) => m + r.length + 1, 0), head ? head.length + 1 : 0);

  while (size() > WORLD_DIGEST_CHARS_MAX) {
    const nonEmpty = sections.filter(s => s.rows.length);
    if (!nonEmpty.length) break;
    // 先裁高优先级裁剪段（风闻轶事 > 世界暗流 > 防撞车 > 参考 > 此地此刻 > 主入口）
    nonEmpty.sort((a, b) => sectionTrimPriority(b.title) - sectionTrimPriority(a.title)
      || (b.rows.join('').length - a.rows.join('').length));
    const target = nonEmpty[0];
    if (target.rows.length === 1 && size() - target.rows[0].length <= WORLD_DIGEST_CHARS_MAX && nonEmpty.length === 1) {
      // 只剩最后一行且单行超预算：做末尾安全截断，保住前缀骨架
      const overhead = size() - target.rows[0].length;
      const budget = Math.max(12, WORLD_DIGEST_CHARS_MAX - overhead - 1);
      target.rows[0] = target.rows[0].slice(0, budget) + '…';
      break;
    }
    // 同段内优先裁掉价值最低的行（泛风声/远处内容先出局）
    let dropIdx = target.rows.length - 1;
    let lowestScore = Infinity;
    for (let i = target.rows.length - 1; i >= 0; i--) {
      const sc = rowRetentionScore(target.rows[i]);
      if (sc < lowestScore) {
        lowestScore = sc;
        dropIdx = i;
      }
    }
    target.rows.splice(dropIdx, 1);
  }

  const body = sections.filter(s => s.rows.length)
    .map(s => (s.title ? [s.title, ...s.rows] : s.rows).join('\n'))
    .join('\n');
  if (!body.trim()) return '';
  return `【世界动态】以下为最近幕后演化后、主角可知或可碰到的世界动态。「此地此刻」与「自然入镜」仅在剧情顺势、气氛合适时自然引出，不强行打断当前对话。\n\n${head ? head + '\n' : ''}${body}`;
}

function sameEntry(a: any, b: any): boolean {
  return a?.name === b.name
    && a?.comment === b.comment
    && a?.enabled === b.enabled
    && a?.content === b.content
    && JSON.stringify(a?.strategy) === JSON.stringify(b?.strategy)
    && JSON.stringify(a?.position) === JSON.stringify(b?.position)
    && JSON.stringify(a?.recursion) === JSON.stringify(b?.recursion)
    && a?.addMemo === b.addMemo
    && JSON.stringify(a?.triggers) === JSON.stringify(b?.triggers);
}

function buildEntry(content: string): any {
  return {
    name: WORLD_WB_NAME,
    comment: WORLD_WB_NAME,
    enabled: Boolean(content),
    content,
    strategy: { type: 'constant', keys: [] },
    position: dsCachePos({ type: 'at_depth', role: 'system', depth: 0, order: 199 }),
    recursion: STANDARD_RECURSION,
    addMemo: true,
    triggers: [],
  };
}

function resolveCurrentCandidateView(state: WorldState): IntrusionCandidateView {
  const rt = getRuntimeContext();
  const sceneGuard = assessIntrusionSceneGuard({
    nsfwActive: rt.nsfwActive,
    location: rt.location,
    onStageStatuses: rt.onStageStatuses,
    recentText: rt.recentText,
  });
  return selectIntrusionCandidates(state, {
    dateKey: rt.dateKey || state.lastEvolveDateKey || '',
    playerRegion: rt.playerRegion || '',
    onStageNames: rt.onStageNames || [],
    sceneGuard,
  });
}

/** 由投影协调器调用；不得 mutate getWorldbook 返回的原对象。 */
export function reconcileWorldWorldbookEntries(
  entries: any[],
  frontDigest?: string,
  candidateView?: IntrusionCandidateView,
  opts?: WorldDigestContentOptions,
): boolean {
  const needDelegated = opts?.delegatedToDriver === undefined;
  const needEchoes = opts?.actedEchoes === undefined;
  const state = frontDigest == null || candidateView === undefined || needDelegated || needEchoes
    ? loadWorldState()
    : null;
  const digest = frontDigest == null ? (state?.frontDigest || '') : frontDigest;
  const candidates = candidateView === undefined && state ? resolveCurrentCandidateView(state) : candidateView;
  // 未显式指定时读接管判据：台账驱动世界桥激活即双开收敛（单开完全照旧）
  const delegatedToDriver = opts?.delegatedToDriver ?? ledgerHandlesWorldFrontEvents();
  const actedEchoes = opts?.actedEchoes ?? collectActedEchoes(state);
  const content = getConfig().worldEnabled === false
    ? ''
    : buildWorldDigestContent(digest, candidates, { delegatedToDriver, actedEchoes });
  const idx = entries.findIndex((e: any) => (e?.comment || e?.name || '') === WORLD_WB_NAME);
  if (idx < 0 && !content) return false;
  if (idx < 0) {
    entries.push(buildEntry(content));
    return true;
  }
  if (!content) {
    entries.splice(idx, 1);
    return true;
  }
  const target = buildEntry(content);
  if (sameEntry(entries[idx], target)) return false;
  entries[idx] = { ...entries[idx], ...target };
  return true;
}

async function getCharWorldbookNames(): Promise<string[]> {
  // 仅无 dispatcher 的兜底路径使用
  const w = getTavernHelper();
  if (!w || typeof w.getCharWorldbookNames !== 'function') return [];
  const names: string[] = [];
  try {
    const cw = w.getCharWorldbookNames('current');
    if (cw?.primary) names.push(cw.primary);
    if (Array.isArray(cw?.additional)) names.push(...cw.additional);
  } catch (_e) { /* ignore */ }
  return names;
}

export async function projectWorldDigest(frontDigest: string): Promise<void> {
  if (hasWorldbookProjectionDispatcher()) {
    await requestWorldbookProjection('world', 'data-change');
    return;
  }
  // —— 以下为无 dispatcher 的直写兜底 ——
  const toastr = getToastr();
  const wbNames = await getCharWorldbookNames();
  if (!wbNames.length) return;
  const state = loadWorldState();
  const candidates = resolveCurrentCandidateView(state);
  const content = buildWorldDigestContent(frontDigest, candidates, {
    delegatedToDriver: ledgerHandlesWorldFrontEvents(),
    actedEchoes: collectActedEchoes(state),
  });
  for (const wbName of wbNames) {
    try {
      const w = getTavernHelper();
      const wb = await w.getWorldbook(wbName);
      if (!Array.isArray(wb)) continue;
      const filtered = wb.filter((e: any) => { const n = (e?.comment || e?.name || ''); return n !== WORLD_WB_NAME; });
      if (content) filtered.push(buildEntry(content));
      await w.replaceWorldbook(wbName, filtered);
    } catch (_e) { /* skip single book */ }
  }
  if (!content) toastr?.info('世界动态已清空（无主角可知内容）', '世界动态');
}

export async function cleanupWorldDigest(): Promise<void> {
  if (hasWorldbookProjectionDispatcher()) {
    await requestWorldbookProjection('world', 'config-change');
    return;
  }
  const wbNames = await getCharWorldbookNames();
  for (const wbName of wbNames) {
    try {
      const w = getTavernHelper();
      const wb = await w.getWorldbook(wbName);
      if (!Array.isArray(wb)) continue;
      const filtered = wb.filter((e: any) => { const n = (e?.comment || e?.name || ''); return n !== WORLD_WB_NAME; });
      if (filtered.length !== wb.length) await w.replaceWorldbook(wbName, filtered);
    } catch (_e) { /* skip single book */ }
  }
}

// ═══════════════════════════════════════════════════════════════
// 角色动态（绿灯条目族）—— 含动向/打算/暗中打算/角色自身认知视角（knownFacts）+ 主角不知情限制；
// P1 硬边界：pending 入镜绝不输出完整 desc（防止提前泄密）；仅 acted 已发生入镜保留回响摘要。
// ═══════════════════════════════════════════════════════════════

/** 该角色当前入镜事件信息：
 *  - acted（正文已实际承接）：可带 desc 供近两轮回响消散；
 *  - pending（尚未发生）：严禁输出完整 desc，仅保留无剧透的公开入口标题。 */
function arrivalEventInfo(
  state: WorldState | undefined,
  name: string,
): { acted: boolean; desc?: string; title?: string; publicInfo?: string } | null {
  if (!state) return null;
  const items = (state.pendingIntrusions || []).filter(i => i.kind === 'character_arrival' && i.refId === name);
  const acted = items.find(i => i.status === 'acted' && (i.desc || '').trim());
  if (acted) return { acted: true, desc: acted.desc!.trim() };
  const pending = items.find(i => i.status === 'pending' && ((i.title || '').trim() || (i.publicInfo || '').trim()));
  if (pending) {
    return {
      acted: false,
      title: (pending.title || '').trim(),
      publicInfo: (pending.publicInfo || '').trim(),
    };
  }
  return null;
}

function normalizedKnownFacts(p: CharProfile): string[] {
  if (!Array.isArray(p.knownFacts)) return [];
  return p.knownFacts.map(f => String(f || '').trim()).filter(Boolean).slice(0, KNOWN_FACTS_MAX);
}

/** 角色是否有可注入角色动态条目的内容（不构造字符串，仅布尔判定；供 reconcile 判空用）。 */
function hasCharacterDynamicContent(
  p: CharProfile,
  state: WorldState | undefined,
  currentDate: string,
  opts?: { delegatedToDriver?: boolean },
): boolean {
  if (currentDate && p.updatedAt === currentDate) return true; // 动向可注入（含「如常」）
  if (p.plans) return true;
  if (p.hiddenGoal) return true;
  if (normalizedKnownFacts(p).length > 0) return true;
  const arr = arrivalEventInfo(state, p.name);
  // acted 余波始终可注入；pending 线索在双开收敛下改走事件池，不再生成角色动态
  if (arr && (arr.acted || opts?.delegatedToDriver !== true)) return true;
  return false;
}

/** 角色动态条目：绿色 selective、关键词=角色名、注入角色定义前 order 202、整条替换不可迭代。 */
export function buildCharacterDynamicEntry(
  name: string,
  p: CharProfile,
  state?: WorldState,
  opts?: { delegatedToDriver?: boolean },
): any {
  const currentDate = state?.lastEvolveDateKey || '';
  const parts = characterDynamicParts(p, state, currentDate, opts);
  const asOf = p.updatedAt || state?.lastEvolveDateKey || '';
  const asOfPart = asOf ? `截至 ${asOf} ` : '';
  const content = `以下是${name}${asOfPart}不在主角视野中的真实状态与角色自身认知边界（主角不知情；除非剧情自然推进令其得知，否则不得作为主角已知信息使用，亦不得把主角全知视角强加给${name}）。\n· ${parts.join('\n· ')}`;
  return {
    name: `${CHARACTER_DYNAMIC_WB_PREFIX}${name}`,
    comment: `${CHARACTER_DYNAMIC_WB_PREFIX}${name}`,
    enabled: true,
    content,
    strategy: { type: 'selective', keys: [name] },
    position: dsCachePos({ type: 'before_character_definition', role: 'system', depth: 0, order: 202 }),
    recursion: STANDARD_RECURSION,
    addMemo: true,
    triggers: [],
  };
}

/** 构造角色动态条目正文各字段行（不含包装语）。pending 入镜绝不输出完整 desc。
 *  双开收敛（delegatedToDriver=true）：保留 acted 余波与动向/打算/暗中打算/认知视角，
 *  不再输出 pending「待入镜线索」——未发生事件统一走事件池，避免两处重复喂料。 */
export function characterDynamicParts(
  p: CharProfile,
  state: WorldState | undefined,
  currentDate: string,
  opts?: { delegatedToDriver?: boolean },
): string[] {
  const parts: string[] = [];
  // 动向日期闸：仅当动向日期与当前日期一致时注入；旧日期动向视为过时不注入
  if (currentDate && p.updatedAt === currentDate) {
    parts.push(`动向：${p.activity || '如常'}`);
  }
  if (p.plans) parts.push(`打算：${p.plans}`);
  if (p.hiddenGoal) {
    const g = Number(p.goalProgress);
    const threadText = typeof p.goalProgress === 'number'
      ? (g >= 100 ? `暗中打算（已完成）：${p.hiddenGoal}` : `暗中打算（${Math.round(g)}%·${charThreadStage(g)}）：${p.hiddenGoal}${p.goalProgressText ? `——${p.goalProgressText}` : ''}`)
      : `暗中打算：${p.hiddenGoal}`;
    parts.push(threadText);
  }
  // P1：knownFacts 进入角色动态，明确角色自身知识视角而非主角全知
  const facts = normalizedKnownFacts(p);
  if (facts.length) {
    parts.push(`角色自身认知视角（仅代表${p.name}本人的已知/未知与来历，非主角全知；禁止将主角或他人秘密当成${p.name}已知）：${facts.join('；')}`);
  }
  const arr = arrivalEventInfo(state, p.name);
  if (arr) {
    if (arr.acted && arr.desc) {
      parts.push(`近期已入镜（近两轮内消散）：${arr.desc}`);
    } else if (!arr.acted && opts?.delegatedToDriver !== true) {
      // P1/P2：pending 入镜禁出完整 desc，只留极简非剧透线索
      const brief = [arr.title, arr.publicInfo].filter(Boolean).join('｜');
      if (brief) parts.push(`待入镜线索（尚未发生，勿提前剧透结局）：${brief}`);
    }
  }
  return parts;
}

function sameCharacterEntry(a: any, b: any): boolean {
  return a?.name === b.name
    && a?.content === b.content
    && JSON.stringify(a?.strategy) === JSON.stringify(b?.strategy)
    && JSON.stringify(a?.position) === JSON.stringify(b?.position)
    && JSON.stringify(a?.recursion) === JSON.stringify(b?.recursion)
    && a?.enabled === b.enabled;
}

/** 由投影协调器调用；同步全部「有动向/打算/暗中打算/认知/入镜」角色的动态条目。 */
export function reconcileCharacterDynamicEntries(
  entries: any[],
  state?: WorldState,
  opts?: { delegatedToDriver?: boolean },
): boolean {
  const st = state || loadWorldState();
  const currentDate = st.lastEvolveDateKey || '';
  // 未显式指定时读接管判据（与 reconcileWorldWorldbookEntries 同口径）
  const resolved = { delegatedToDriver: opts?.delegatedToDriver ?? ledgerHandlesWorldFrontEvents() };
  const desired = new Map<string, { entry: any }>();
  for (const p of Object.values(st.profiles)) {
    if (!hasCharacterDynamicContent(p, st, currentDate, resolved)) continue;
    const entry = buildCharacterDynamicEntry(p.name, p, st, resolved);
    desired.set(entry.name, { entry });
  }
  let changed = false;
  for (let i = entries.length - 1; i >= 0; i--) {
    const n = String(entries[i]?.comment || entries[i]?.name || '');
    if (n.startsWith(CHARACTER_DYNAMIC_WB_PREFIX) && !desired.has(n)) {
      entries.splice(i, 1);
      changed = true;
    }
  }
  for (const { entry } of desired.values()) {
    const idx = entries.findIndex((e: any) => (e?.comment || e?.name || '') === entry.name);
    if (idx < 0) { entries.push(entry); changed = true; }
    else if (!sameCharacterEntry(entries[idx], entry)) { entries[idx] = { ...entries[idx], ...entry }; changed = true; }
  }
  return changed;
}

/** 投影角色动态条目（dispatcher 优先；无 dispatcher 直写兜底）。 */
export async function projectCharacterDynamics(): Promise<void> {
  if (hasWorldbookProjectionDispatcher()) {
    await requestWorldbookProjection('character-dynamic', 'data-change');
    return;
  }
  const wbNames = await getCharWorldbookNames();
  for (const wbName of wbNames) {
    try {
      const w = getTavernHelper();
      const wb = await w.getWorldbook(wbName);
      if (!Array.isArray(wb)) continue;
      const changed = reconcileCharacterDynamicEntries(wb, loadWorldState());
      if (changed) await w.replaceWorldbook(wbName, wb);
    } catch (_e) { /* skip single book */ }
  }
}

/** 移除角色动态条目族（无 dispatcher 直写兜底）。 */
export async function cleanupCharacterDynamics(): Promise<void> {
  if (hasWorldbookProjectionDispatcher()) {
    await requestWorldbookProjection('character-dynamic', 'config-change');
    return;
  }
  const wbNames = await getCharWorldbookNames();
  for (const wbName of wbNames) {
    try {
      const w = getTavernHelper();
      const wb = await w.getWorldbook(wbName);
      if (!Array.isArray(wb)) continue;
      const filtered = wb.filter((e: any) => { const n = String(e?.comment || e?.name || ''); return !n.startsWith(CHARACTER_DYNAMIC_WB_PREFIX); });
      if (filtered.length !== wb.length) await w.replaceWorldbook(wbName, filtered);
    } catch (_e) { /* skip single book */ }
  }
}

/** 重置世界演化：删除当前聊天世界状态 + 清理世界书注入条目（世界动态 + 角色动态）。 */
export async function resetWorldEvolution(): Promise<{ ok: boolean }> {
  const had = hasWorldState();
  if (had && !(await deleteStoryFeature(WORLD_FEATURE_KEY))) {
    return { ok: false };
  }
  await cleanupWorldDigest();
  await cleanupCharacterDynamics();
  return { ok: true };
}
