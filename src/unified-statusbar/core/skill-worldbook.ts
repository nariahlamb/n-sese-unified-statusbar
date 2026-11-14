import { getSheetByName, getCellByHeader } from './data-manager';
import { STANDARD_RECURSION } from './constants';
import { readSkillTree } from './skill-store';
import { rebuildSkillDesc } from './skill-desc';
import { SKILL_TABLE_NAME, SKILL_COL, SKILL_MANAGED_PREFIX, SKILL_MANAGED_DISPLAY_NAME, type SkillProseMode, type SkillTalentTree } from './skill-types';
import { SKILL_DETAIL_PREFIX, isManagedSkillEntry, reconcileSingleManagedEntry, wbEntryName } from './worldbook-entry';
import { dsCachePos, registerManagedWbEntry } from './wb-position';
import { requestWorldbookProjection } from './worldbook-projection-events';
import { getCurrentStoryChatKey } from './story-floor-store';
import { getWorldProjectionRuntimeContext } from './world-engine/world-worldbook';
import { getConfig } from './config-store';

export { isManagedSkillEntry, SKILL_DETAIL_PREFIX };

let _accentColorMap: Record<string, string> = {};
export function getSkillAccentColorMap(): Record<string, string> { return _accentColorMap; }

type SkillTagColorSyncListener = () => void;
let _colorSyncListener: SkillTagColorSyncListener | null = null;
export function setSkillTagColorSyncListener(fn: SkillTagColorSyncListener | null): void { _colorSyncListener = fn; }

export interface SkillSelectiveEntrySpec {
  skillName: string;
  entryName: string;
  keys: string[];
  content: string;
}

export interface SkillWorldbookBundle {
  mode: SkillProseMode;
  catalogContent: string;
  detailEntries: SkillSelectiveEntrySpec[];
}

/** 泛动作停用词：若技能名恰好是纯泛动作词，禁止作为裸 selective 关键词，只放行显式施展短语，防止普通对话误触发。 */
const GENERIC_SKILL_ACTION_WORDS = new Set([
  '看', '听', '走', '跑', '说', '笑', '想', '问', '答', '动', '做', '吃', '喝', '睡', '坐', '站', '行', '来', '去',
  '观察', '行动', '移动', '交谈', '聊天', '对话', '思考', '交流', '沟通', '试探', '留意', '判断', '攻击', '防御', '闪避',
  '使用', '发动', '施展', '技能', '天赋', '日常', '基础', '入门', '精通', '强化', '被动', '主动',
]);

/** P3 极简前提提取：常亮清单只保留技能名、主动/被动与单句前提，绝不塞 rebuildSkillDesc 强化长文。 */
export function buildSkillBriefPremise(storedDescription: string, tree: SkillTalentTree | null): string {
  const rootDesc = tree?.nodes?.[tree.rootId]?.desc;
  const raw = String(rootDesc || storedDescription || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '符合当前情境时自然体现';
  const firstClause = raw.split(/[。！？；;\n]/).map(s => s.trim()).find(Boolean) || raw;
  return firstClause.length > 36 ? firstClause.slice(0, 35) + '…' : firstClause;
}

/** P3 严格关键词构造：仅当明确输入/当前行动命中技能名或显式施展触发时命中，避免泛动作误命中。 */
export function buildStrictSkillKeys(skillName: string, _tree?: SkillTalentTree | null): string[] {
  const name = String(skillName || '').trim();
  if (!name) return [];
  const explicit = [
    `[技能发动：${name}]`,
    `【技能发动：${name}】`,
    `发动${name}`,
    `施展${name}`,
    `使用${name}`,
    `动用${name}`,
  ];
  const allowBare = name.length >= 2 && !GENERIC_SKILL_ACTION_WORDS.has(name);
  const rawList = allowBare ? [name, ...explicit] : explicit;
  return Array.from(new Set(rawList));
}

function buildSkillRecords(): Array<{
  name: string;
  type: string;
  isPassive: boolean;
  premise: string;
  fullDesc: string;
  keys: string[];
}> {
  const colorMap: Record<string, string> = {};
  const records: Array<{
    name: string;
    type: string;
    isPassive: boolean;
    premise: string;
    fullDesc: string;
    keys: string[];
  }> = [];

  const sheet = getSheetByName(SKILL_TABLE_NAME);
  if (sheet && Array.isArray(sheet.content) && sheet.content.length >= 2) {
    for (let row = 1; row < sheet.content.length; row++) {
      const name = String(getCellByHeader(SKILL_TABLE_NAME, row, SKILL_COL.name) || '').trim();
      if (!name) continue;
      const type = String(getCellByHeader(SKILL_TABLE_NAME, row, SKILL_COL.type) || '').trim() || '主动';
      const isPassive = type.includes('被动');
      const storedDescription = String(getCellByHeader(SKILL_TABLE_NAME, row, SKILL_COL.desc) || '');
      const tree = readSkillTree(name);
      const fullDesc = skillDisplayDesc(storedDescription, tree);
      const premise = buildSkillBriefPremise(storedDescription, tree);
      const keys = buildStrictSkillKeys(name, tree);

      if (tree?.accentColor) {
        colorMap[name] = tree.accentColor;
        const nodes = (tree as any).nodes || {};
        for (const id of Object.keys(nodes)) {
          const title = nodes[id]?.title;
          if (title && !colorMap[title]) colorMap[title] = tree.accentColor;
        }
      }

      records.push({ name, type, isPassive, premise, fullDesc, keys });
    }
  }
  _accentColorMap = colorMap;
  _colorSyncListener?.();
  return records;
}

/** P3 组装世界书投影片包：
 *  - off：常亮与 selective 均不注入（保留技能表、经验与天赋树原数据）
 *  - reference：常亮仅保留技能名 + 主动/被动 + 极简前提；详述进 selective（scan_depth 2）
 *  - tag：常亮同样精简目录 + 只标关键施展（日常/被动不标）；详述进 selective */
export function buildSkillWorldbookBundle(mode: SkillProseMode): SkillWorldbookBundle {
  const records = buildSkillRecords();
  if (!records.length || mode === 'off') {
    return { mode, catalogContent: '', detailEntries: [] };
  }

  const catalogLines = records.map(r => {
    const rule = r.isPassive ? '仅微调对应行动细节' : '仅明确尝试或直接需要时启用';
    return `· ${r.name}（${r.type}）— ${rule}；前提：${r.premise}`;
  });

  let catalogContent = '';
  if (mode === 'reference') {
    catalogContent = `【主角当前技能清单（设定参考）】\n以下是主角已掌握技能的名称、主动/被动类别与极简前提，仅作人物设定参考：日常普通对话不要强行炫技或主动制造技能剧情；主动技能仅在当前行动明确尝试或直接需要时参与，被动技能仅微调适合的行动细节，无需输出任何技能标签。\n${catalogLines.join('\n')}`;
  } else if (mode === 'tag') {
    catalogContent = `【主角当前技能清单（关键施展标注）】\n格式要求：仅当主角在关键时刻明确施展主动技能或技能效果对局势产生决定性影响时，才在对应内容前加前缀[技能发动：技能名]（技能名必须与下方清单完全一致，不得改写、不得添加类别或括号）；日常普通对话、轻微体现或被动技能默认不写发动标签。\n当主角在剧情中初次学会一项下方清单之外的全新技能时，在学会的情节之后另起一行用标签记录：[技能新增]技能名|类别|技能描述。类别只能是「主动」或「被动」；技能描述为 10-50 字、一句具体可演绎的效果；同名技能不得重复记录，清单中已有的技能一律不再记录。\n${catalogLines.join('\n')}`;
  }

  const detailEntries: SkillSelectiveEntrySpec[] = records.map(r => ({
    skillName: r.name,
    entryName: `${SKILL_DETAIL_PREFIX}${r.name}`,
    keys: r.keys,
    content: `【技能详述：${r.name}（${r.type}）】\n仅当当前输入或正在进行的行动明确涉及「${r.name}」时按以下细则体现（未涉及则忽略）：\n${r.fullDesc}`,
  }));

  return { mode, catalogContent, detailEntries };
}

/** 确定性匹配：给定明确输入/当前行动文本，按严格关键词选出至多一个最匹配的技能详述（泛动作不误命中）。 */
export function matchSingleSkillDetailForInput(inputText: string, mode: SkillProseMode): SkillSelectiveEntrySpec | null {
  const text = String(inputText || '').trim();
  if (!text || mode === 'off') return null;
  const bundle = buildSkillWorldbookBundle(mode);
  let best: { spec: SkillSelectiveEntrySpec; score: number } | null = null;
  for (const spec of bundle.detailEntries) {
    let topScore = 0;
    for (const k of spec.keys) {
      if (!k || !text.includes(k)) continue;
      // 显式施展触发（含括号或动词前缀）权重最高，其次较长精确技能名
      const explicitBoost = k !== spec.skillName ? 100 : 0;
      const sc = explicitBoost + k.length;
      if (sc > topScore) topScore = sc;
    }
    if (topScore > 0 && (!best || topScore > best.score)) {
      best = { spec, score: topScore };
    }
  }
  return best ? best.spec : null;
}

/** 技能显示描述口径（用于卡片展开与 selective 详述）：树激活≥2 节点用派生强化描述，否则用表内基础描述。 */
export function skillDisplayDesc(storedDescription: string, tree: SkillTalentTree | null): string {
  return tree && tree.activated.length > 1 ? rebuildSkillDesc(tree) : storedDescription;
}

export interface SkillDisplayInfo { skillName: string; type: string; desc: string; }

/** 卡片展开时取效果文本（纯读）：技能名命中技能表行；未命中回退扫天赋树节点 title（节点效果也可标注）。 */
export function resolveSkillDisplayDesc(text: string): SkillDisplayInfo | null {
  const name = String(text || '').trim();
  if (!name) return null;
  const sheet = getSheetByName(SKILL_TABLE_NAME);
  if (!sheet || !Array.isArray(sheet.content)) return null;
  for (let row = 1; row < sheet.content.length; row++) {
    const skill = String(getCellByHeader(SKILL_TABLE_NAME, row, SKILL_COL.name) || '').trim();
    if (!skill) continue;
    const type = String(getCellByHeader(SKILL_TABLE_NAME, row, SKILL_COL.type) || '');
    if (skill === name) {
      const stored = String(getCellByHeader(SKILL_TABLE_NAME, row, SKILL_COL.desc) || '');
      return { skillName: skill, type, desc: skillDisplayDesc(stored, readSkillTree(skill)) };
    }
    const tree = readSkillTree(skill);
    if (tree) {
      const nodes = (tree as any).nodes || {};
      for (const id of Object.keys(nodes)) {
        if (nodes[id]?.title === name) {
          return { skillName: skill, type, desc: String(nodes[id]?.desc || '') };
        }
      }
    }
  }
  return null;
}

const SKILL_ORIG_POS = { type: 'before_character_definition', role: 'system', depth: 2, order: 8124 } as const;
const SKILL_DETAIL_ORIG_POS = { type: 'before_character_definition', role: 'system', depth: 2, order: 8125 } as const;

function makeNewEntry(content: string): any {
  return {
    name: SKILL_MANAGED_PREFIX,
    comment: SKILL_MANAGED_DISPLAY_NAME,
    enabled: true,
    content,
    strategy: { type: 'constant', keys: [] },
    position: dsCachePos(SKILL_ORIG_POS),
    recursion: STANDARD_RECURSION,
    addMemo: true,
  };
}

function makeDetailEntry(spec: SkillSelectiveEntrySpec): any {
  return {
    name: spec.entryName,
    comment: spec.entryName,
    enabled: true,
    content: spec.content,
    strategy: {
      type: 'selective',
      keys: [...spec.keys],
      keys_secondary: { logic: 'and_any', keys: [] },
    },
    // 原生 ST/TT 世界书读取 extensions.scan_depth，而非自定义 strategy 子字段。
    scanDepth: 2,
    position: dsCachePos(SKILL_DETAIL_ORIG_POS),
    recursion: STANDARD_RECURSION,
    addMemo: true,
    triggers: [],
  };
}

function sameDetailEntry(a: any, b: any): boolean {
  return wbEntryName(a) === wbEntryName(b)
    && a?.enabled === b?.enabled
    && a?.content === b?.content
    && JSON.stringify(a?.strategy) === JSON.stringify(b?.strategy)
    && JSON.stringify(a?.position) === JSON.stringify(b?.position);
}

/** Mutates the coordinator-owned entry copy and reports whether it changed.
 *  兼容字符串入参（'' 清空全族；非空字符串仅更新常亮条目）与 SkillWorldbookBundle（同步常亮清单 + selective 详情族）。 */
export function reconcileSkillWorldbookEntries(entries: any[], contentOrBundle: string | SkillWorldbookBundle): boolean {
  if (typeof contentOrBundle === 'string') {
    let changed = reconcileSingleManagedEntry(entries, {
      content: contentOrBundle,
      isMine: e => wbEntryName(e).startsWith(SKILL_MANAGED_PREFIX),
      makeEntry: makeNewEntry,
    });
    if (!contentOrBundle) {
      for (let i = entries.length - 1; i >= 0; i--) {
        if (wbEntryName(entries[i]).startsWith(SKILL_DETAIL_PREFIX)) {
          entries.splice(i, 1);
          changed = true;
        }
      }
    }
    return changed;
  }

  let changed = reconcileSingleManagedEntry(entries, {
    content: contentOrBundle.catalogContent,
    isMine: e => wbEntryName(e).startsWith(SKILL_MANAGED_PREFIX),
    makeEntry: makeNewEntry,
  });

  // 世界书选择本身由原生扫描器按本轮输入完成；这里保留严格关键词，拒绝泛动作。
  // 当前输入只决定扫描签名，不把“已匹配”当成已施展或写入技能状态。
  const desired = new Map<string, any>();
  for (const spec of contentOrBundle.detailEntries) {
    desired.set(spec.entryName, makeDetailEntry(spec));
  }

  for (let i = entries.length - 1; i >= 0; i--) {
    const name = wbEntryName(entries[i]);
    if (name.startsWith(SKILL_DETAIL_PREFIX) && !desired.has(name)) {
      entries.splice(i, 1);
      changed = true;
    }
  }
  for (const [name, target] of desired.entries()) {
    const idx = entries.findIndex(e => wbEntryName(e) === name);
    if (idx < 0) {
      entries.push(target);
      changed = true;
    } else if (!sameDetailEntry(entries[idx], target)) {
      entries[idx] = { ...entries[idx], ...target };
      changed = true;
    }
  }
  return changed;
}

export function getSkillWorldbookContent(mode: SkillProseMode): string {
  return buildSkillWorldbookBundle(mode).catalogContent;
}

let _lastDispatchSignature: string | null = null;

/** 强制下次 tick 重新派发（测试用/外部直写世界书后补救）。 */
export function resetSkillWorldbookSignature(): void {
  _lastDispatchSignature = null;
}

export async function syncSkillWorldbook(): Promise<void> {
  const sheet = getSheetByName(SKILL_TABLE_NAME);
  const sheetSig = sheet && Array.isArray(sheet.content)
    ? `${sheet.content.length}|${JSON.stringify(sheet.content)}`
    : 'none';
  const treeSigs: string[] = [];
  if (sheet && Array.isArray(sheet.content)) {
    for (let row = 1; row < sheet.content.length; row++) {
      const name = String(getCellByHeader(SKILL_TABLE_NAME, row, SKILL_COL.name) || '').trim();
      if (!name) continue;
      const t = readSkillTree(name);
      if (t) treeSigs.push(`${name}:${t.activated.join(',')}`);
    }
  }
  const mode = getConfig().skillProseMode;
  const signature = `${getCurrentStoryChatKey()}|${mode}|${sheetSig}|${treeSigs.join(';')}|${getWorldProjectionRuntimeContext().actionText || ''}`;
  if (signature === _lastDispatchSignature) return;
  _lastDispatchSignature = signature;
  await requestWorldbookProjection('skills', 'data-change');
}

registerManagedWbEntry({
  match: entry => isManagedSkillEntry(entry),
  origPos: () => SKILL_ORIG_POS,
});
