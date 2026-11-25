// ===== 角色心路档案只读视图与日记弹窗双 Tab 渲染辅助（纯函数，Node 可直测） =====
import { getCellByHeader, getSheetByName, findRowByColumn } from './data-manager';
import { diaryPlainText } from './diary-sanitizer';
import { escapeAttr, escapeHtml } from './html-escape';

export const MIND_PROFILE_TABLE = '角色心路档案表';

export const MIND_PROFILE_DIMENSIONS = [
  { key: '人格底色与筹码', label: '人格底色与筹码', hint: '性格底色、能力边界与手中筹码' },
  { key: '已知事实与盲点', label: '已知事实与盲点', hint: '确定知道什么、不知道或误解什么' },
  { key: '四向关系认知', label: '四向关系认知', hint: '双向态度与多阶猜疑视角' },
  { key: '个人进度与打算', label: '个人进度与打算', hint: '独立筹谋进展与下一步盘算' },
  { key: '核心纠结与情绪惯性', label: '核心纠结与情绪惯性', hint: '当下权衡痛点与行为惯性' },
  { key: '蝴蝶效应留痕', label: '蝴蝶效应留痕', hint: '行动对后续局面造成的连锁反应' },
] as const;

export type MindProfileColumn = (typeof MIND_PROFILE_DIMENSIONS)[number]['key'];

export interface MindProfileData {
  name: string;
  fields: Record<MindProfileColumn, string>;
}

export interface DiaryListEntry {
  row: number;
  time: string;
  content: string;
}

export type DiaryPopupTab = 'diary' | 'mind';

export interface DiaryPopupLabels {
  titleSuffix: string;
  detailSuffix: string;
  emptyDiary: string;
}

/** 按风格返回日记弹窗标题与空态文案（通用微调为「心路日记」，保留古风「情笺/手记」与 bridge「日记」）。 */
export function getDiaryPopupLabels(style: string): DiaryPopupLabels {
  if (style === 'ancient') {
    return { titleSuffix: '的情笺', detailSuffix: ' 的手记', emptyDiary: '暂无情笺' };
  }
  if (style === 'bridge') {
    return { titleSuffix: '的日记', detailSuffix: ' 的日记', emptyDiary: '暂无日记' };
  }
  return { titleSuffix: '的心路日记', detailSuffix: ' 的心路日记', emptyDiary: '暂无心路日记' };
}

/** 读取指定角色在「角色心路档案表」的 7 维快照；缺表或全部维度为空时返回 null。 */
export function readCharMindProfile(charName: string): MindProfileData | null {
  const target = String(charName || '').trim();
  if (!target) return null;
  const sheet = getSheetByName(MIND_PROFILE_TABLE);
  if (!sheet || !Array.isArray(sheet.content) || sheet.content.length < 2) return null;
  const rowIdx = findRowByColumn(MIND_PROFILE_TABLE, '姓名', target);
  if (rowIdx === -1) return null;
  const fields = {} as Record<MindProfileColumn, string>;
  let hasAny = false;
  for (const dim of MIND_PROFILE_DIMENSIONS) {
    const raw = getCellByHeader(MIND_PROFILE_TABLE, rowIdx, dim.key);
    const val = raw == null ? '' : String(raw).trim();
    fields[dim.key] = val;
    if (val && val !== '无') hasAny = true;
  }
  return hasAny ? { name: target, fields } : null;
}

/** 快捷判定角色是否已有心路档案（供角色卡角标使用）。 */
export function hasCharMindProfile(charName: string): boolean {
  return readCharMindProfile(charName) !== null;
}

/** 只读渲染「心路档案」Tab 正文；全部字段经 escapeHtml 安全转义防 XSS，缺失时展示引导空态。 */
export function renderMindProfileHtml(
  charName: string,
  profile: MindProfileData | null,
  _style = '',
): string {
  const safeName = escapeHtml(charName || '该角色');
  if (!profile) {
    return (
      '<div class="mind-profile-empty" data-mind-empty="1">' +
      `<div class="mind-profile-empty-title">暂无「${safeName}」的心路档案</div>` +
      '<div class="mind-profile-empty-desc">角色尚未在「角色心路档案表」建档。随着剧情推进或台账填表更新后，这里会展示其人格底色、认知盲点、四向关系、独立进度、情绪惯性与蝴蝶效应留痕。</div>' +
      '</div>'
    );
  }

  let cards = '';
  for (const dim of MIND_PROFILE_DIMENSIONS) {
    const rawVal = String(profile.fields[dim.key] || '').trim();
    const isEmpty = !rawVal || rawVal === '无';
    cards += '<section class="mind-profile-dim' + (isEmpty ? ' is-empty' : '') + '">';
    cards += '<div class="mind-profile-dim-head">';
    cards += '<span class="mind-profile-dim-label">' + escapeHtml(dim.label) + '</span>';
    cards += '<span class="mind-profile-dim-hint">' + escapeHtml(dim.hint) + '</span>';
    cards += '</div>';
    cards += '<div class="mind-profile-dim-body">';
    cards += isEmpty ? '<span class="mind-profile-dim-none">暂无记录</span>' : escapeHtml(rawVal);
    cards += '</div>';
    cards += '</section>';
  }

  return (
    '<div class="mind-profile-card" data-mind-char="' + escapeAttr(profile.name) + '">' +
    '<div class="mind-profile-header">' +
    '<span class="mind-profile-name">' + escapeHtml(profile.name) + '</span>' +
    '<span class="mind-profile-badge">只读档案</span>' +
    '</div>' +
    '<div class="mind-profile-grid">' + cards + '</div>' +
    '</div>'
  );
}

/** 渲染「心路日记」列表片段（倒序展示，保留点击进入详情的 .diary-list-item[data-row] 结构）。 */
export function renderDiaryListHtml(
  items: DiaryListEntry[],
  emptyText: string,
): string {
  if (!items.length) {
    return '<div class="panel-empty">' + escapeHtml(emptyText) + '</div>';
  }
  let html = '';
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const plain = diaryPlainText(item.content);
    const preview = plain.length > 60 ? plain.slice(0, 60) + '...' : plain;
    html += '<div class="diary-list-item" data-row="' + item.row + '">';
    html += '<div class="diary-item-top"><span class="diary-time">' + escapeHtml(item.time || '时间未知') + '</span></div>';
    html += '<div class="diary-item-content">' + escapeHtml(preview) + '</div>';
    html += '</div>';
  }
  return html;
}

/** 渲染日记弹窗双 Tab 完整 body HTML（心路日记 / 心路档案，全部输出经转义）。 */
export function renderDiaryPopupBodyHtml(
  charName: string,
  items: DiaryListEntry[],
  mindProfile: MindProfileData | null,
  style: string,
  activeTab: DiaryPopupTab = 'diary',
): string {
  const labels = getDiaryPopupLabels(style);
  const tab: DiaryPopupTab = activeTab === 'mind' ? 'mind' : 'diary';
  const diaryCountBadge = items.length > 0 ? `<span class="diary-tab-count">${items.length}</span>` : '';
  const mindDot = mindProfile ? '<span class="diary-tab-dot" title="已建档"></span>' : '';

  let html = '';
  html += '<div class="diary-popup-tabs" role="tablist">';
  html += `<button type="button" class="diary-popup-tab${tab === 'diary' ? ' is-active' : ''}" data-diary-tab="diary" role="tab" aria-selected="${tab === 'diary'}">心路日记${diaryCountBadge}</button>`;
  html += `<button type="button" class="diary-popup-tab${tab === 'mind' ? ' is-active' : ''}" data-diary-tab="mind" role="tab" aria-selected="${tab === 'mind'}">心路档案${mindDot}</button>`;
  html += '</div>';

  html += `<div class="diary-tab-panel${tab === 'diary' ? ' is-active' : ''}" data-tab-panel="diary"${tab === 'diary' ? '' : ' hidden'}>`;
  html += renderDiaryListHtml(items, labels.emptyDiary);
  html += '</div>';

  html += `<div class="diary-tab-panel${tab === 'mind' ? ' is-active' : ''}" data-tab-panel="mind"${tab === 'mind' ? '' : ' hidden'}>`;
  html += renderMindProfileHtml(charName, mindProfile, style);
  html += '</div>';

  return html;
}
