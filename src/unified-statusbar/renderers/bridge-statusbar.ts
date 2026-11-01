// ===== 怪盗手记主状态栏（代码键 bridge） =====
import { getCellByHeader, getSheetByName, findRowByColumn, isNsfwPlayActive } from '../core/data-manager';
import { getConfig, type StatusBarConfig } from '../core/config-store';
import { walletEntryHtml } from './currency-entry';
import { aiActivityBarHtml } from './ai-activity-bar';
// eslint-disable-next-line import-x/no-cycle -- cycle-debt: 08 待修：同上（主题状态栏从 html-builder 取共享零件，html-builder 又反向装配本文件）
import {
  buildOptionsBar,
  buildPastExpButton,
  buildPlayChipsBlock,
  buildPortraitBoxHtml,
  buildProtagonistPortraitBoxHtml,
  buildSceneButton,
  buildSkillButton,
  buildWardrobeButton,
  buildWardrobeSummary,
  buildWeatherIconHTML,
  charRelationPillHtml,
  getCharProfile,
} from './html-builder';
import { PROTAGONIST_CYCLE_SECTION, cycleMoodVariantClass, cyclePhaseBar } from './cycle-ui';
import { escapeHtml } from '../core/html-escape';
import { buildBeyondTabButton, buildBeyondLensHtml, beyondViewActive, beyondBatchNames, beyondAvailable } from './beyond-lens';
import { loadWorldState } from '../core/world-engine/world-store';
import { getTodayDateKey } from '../core/calendar-core';

function readGlobal(column: string): string {
  return getCellByHeader('全局数据表', 1, column) || '';
}

function readProtagonist(column: string): string {
  return getCellByHeader('主角信息表', 1, column) || '';
}

function isNsfwScene(): boolean {
  return isNsfwPlayActive();
}

function resolveActiveCharacter(): string {
  const sheet = getSheetByName('在场角色表');
  if (!sheet || sheet.content.length <= 1) {
    (window as any)._activeChar = null;
    return '';
  }

  let active = String((window as any)._activeChar || '');
  if (!active || findRowByColumn('在场角色表', '姓名', active) === -1) {
    active = getCellByHeader('在场角色表', 1, '姓名') || '';
  }
  (window as any)._activeChar = active || null;
  return active;
}

function buildBridgeCommandHeader(config: StatusBarConfig): string {
  const location = readGlobal('当前详细地点') || '地点未知';
  const currentTime = readGlobal('当前时间') || '时间未知';
  const protagonist = readProtagonist('姓名') || '主角';
  const status = readProtagonist('近况');
  const energy = readProtagonist('瑟瑟能量') || '0';

  let html = '<header class="bridge-command-header bridge-module" data-ub-section="cmdheader">';
  html += '<div class="bridge-head-line">';
  html += '<button class="book-head-time bridge-clock" type="button"><span class="bridge-star">★</span><strong>' + escapeHtml(currentTime) + '</strong>' + buildWeatherIconHTML(16) + '</button>';
  html += '</div>';
  html += '<button class="bridge-coordinate"' + (config.mapEnabled ? ' id="ac-location-btn"' : '') + ' type="button"><span class="bridge-caret">▸</span><strong>' + escapeHtml(location) + '</strong></button>';

  html += '<div class="bridge-protagonist-row">';
  html += buildProtagonistPortraitBoxHtml();
  html += '<div class="bridge-protagonist-main">';
  html += '<div class="bridge-chip-row">';
  html += '<button class="bridge-protagonist-name" data-clickable="char-name" type="button">' + escapeHtml(protagonist) + '</button>';
  html += '<span class="bridge-energy"><span class="bridge-chip-key">能量</span><strong>' + escapeHtml(energy) + '</strong></span>';
  html += walletEntryHtml('bridge');
  html += '</div>';
  if (status) html += '<div class="bridge-command-status">' + escapeHtml(status) + '</div>';
  html += '</div>';
  html += '</div>';
  html += cyclePhaseBar(protagonist, 'bridge', PROTAGONIST_CYCLE_SECTION);
  html += buildWardrobeSummary('bridge', config);

  html += '<div class="bridge-system-controls">';
  html += buildSceneButton('bridge', config);
  html += '<button class="bridge-btn" id="ac-theme-btn" type="button">' + (config.darkTheme ? '亮色' : '暗色') + '</button>';
  if (config.achievementEnabled) {
    html += '<button class="bridge-btn" id="ac-achievement-btn" type="button" title="成就系统">成就</button>';
  }
  if (config.dbViewerEnabled) {
    html += '<button class="bridge-btn" id="ac-database-btn" type="button" title="数据库">数据库</button>';
  }
  html += '<button class="bridge-btn" id="ac-settings-btn" type="button" title="设置">设置</button>';
  html += '</div>';
  html += '</header>';
  return html;
}

function buildBridgeQuickActions(config: StatusBarConfig): string {
  let html = '<nav class="bridge-quick-actions" data-ub-section="quick" aria-label="快捷入口">';
  // 商店按开关条件输出（同 interview 惯例；仅靠内联 display 会在重建后丢失，2026-10-05 修复）
  if (config.shopEnabled) html += '<button class="bridge-btn is-primary" id="ac-lottery-head-btn" type="button">商店</button>';
  html += '<button class="bridge-btn" id="ac-item-head-btn" type="button">物品</button>';
  html += buildWardrobeButton('bridge', config);
  html += '<button class="bridge-btn" id="ac-mission-head-btn" type="button">任务</button>';
  html += '<button class="bridge-btn" id="ac-memo-head-btn" type="button">备忘</button>';
  html += buildSkillButton('bridge', config);
  html += '<button class="bridge-btn" id="ac-chronicle-btn" type="button">回顾</button>';
  html += '</nav>';
  return html;
}

function buildBridgeCharacterChannels(activeCharacter: string): string {
  const sheet = getSheetByName('在场角色表');
  const count = sheet ? sheet.content.length - 1 : 0;
  if (count <= 0) {
    return '<section class="bridge-character-channels" data-ub-section="channels"><div class="bridge-empty">暂无在场角色</div></section>';
  }

  let html = '<section class="bridge-character-channels" data-ub-section="channels">';
  html += '<div class="bridge-role-selector" role="tablist">';
  for (let row = 1; row <= count; row++) {
    const name = getCellByHeader('在场角色表', row, '姓名');
    if (!name) continue;
    const isActive = name === activeCharacter && !beyondViewActive();
    html += '<button class="tab bridge-role-chip' + (isActive ? ' active' : '') + '" data-char="' + escapeHtml(name) + '" type="button" role="tab" aria-selected="' + (isActive ? 'true' : 'false') + '">';
    html += escapeHtml(name);
    html += '</button>';
  }
  html += buildBeyondTabButton('bridge', beyondViewActive(), beyondAvailable());
  html += '</div>';
  html += '</section>';
  return html;
}

function buildBridgeTelemetryItem(label: string, value: string): string {
  return '<div class="bridge-telemetry-item">'
    + '<span class="bridge-tag">' + escapeHtml(label) + '</span>'
    + '<span class="bridge-readout">' + (value ? escapeHtml(value) : '<span class="bridge-muted">暂无</span>') + '</span>'
    + '</div>';
}

function buildBridgeDetailItem(label: string, value: string): string {
  return '<div class="bridge-detail-item">'
    + '<span class="bridge-detail-key">' + escapeHtml(label) + '</span>'
    + '<span class="bridge-readout">' + (value ? escapeHtml(value) : '<span class="bridge-muted">暂无</span>') + '</span>'
    + '</div>';
}

function buildBridgeDetailLists(activeCharacter: string): string {
  const profile = getCharProfile(activeCharacter);
  if (!profile) return '<div class="bridge-empty">暂无档案</div>';

  let html = '<div class="bridge-detail-console" data-ub-section="bridge-details">';
  html += '<div class="bridge-detail-tabs">';
  html += '<button class="bridge-btn active-switch" id="ac-switch-clothes" type="button">服装</button>';
  html += '<button class="bridge-btn" id="ac-switch-body" type="button">身体</button>';
  html += '</div>';

  html += '<div class="bridge-detail-list" id="ac-clothes-list">';
  if (profile.currentOutfit) {
    html += buildBridgeDetailItem('当前穿搭', profile.currentOutfit);
  }
  for (const [label, value] of profile.clothesEntries) {
    html += buildBridgeDetailItem(label, value);
  }
  if (!profile.currentOutfit && profile.clothesEntries.length === 0) {
    html += '<div class="bridge-empty">暂无服装数据</div>';
  }
  html += '</div>';

  html += '<div class="bridge-detail-list" id="ac-body-list" style="display:none;">';
  for (const [label, value] of profile.bodyEntries) {
    html += buildBridgeDetailItem(label, value);
  }
  if (profile.bodyEntries.length === 0) {
    html += '<div class="bridge-empty">暂无身体数据</div>';
  }
  html += '</div>';
  html += '</div>';
  return html;
}

function buildBridgePersonnelGrid(config: StatusBarConfig, activeCharacter: string): string {
  if (beyondViewActive()) {
    return buildBeyondLensHtml('bridge', loadWorldState(), getTodayDateKey() || '', beyondBatchNames());
  }
  if (!activeCharacter) {
    return '<section class="bridge-personnel-grid bridge-module" data-ub-section="personnel"><div class="bridge-empty">暂无在场角色</div></section>';
  }

  const profile = getCharProfile(activeCharacter);
  if (!profile) {
    return '<section class="bridge-personnel-grid bridge-module" data-ub-section="personnel"><div class="bridge-stale">角色已登记，档案尚未同步</div></section>';
  }

  const moodClass = cycleMoodVariantClass(activeCharacter);
  // F53(第十二轮)：personnel 大分区退役——它内部嵌着 charportrait（buildPortraitBoxHtml 自带）与
  // charcycle（cyclePhaseBar 自带），而嵌套分区无效（外层替换连带销毁内层）⇒ 每次角色状态更新立绘重解码闪烁。
  // 改法=section 与两列 div 只作静态外壳，把**每一块会变的内容**提成平级子分区；
  // 漏一块=该块永不更新，故逐块补齐（identity / actions / telemetry / train / details）。
  let html = '<section class="bridge-personnel-grid bridge-status-layout bridge-module">';
  html += '<div class="bridge-personnel-portrait">';
  html += buildPortraitBoxHtml(activeCharacter);
  html += '<div class="bridge-personnel-side">';
  html += '<div class="bridge-personnel-identity" data-ub-section="bridge-identity">';
  html += '<button class="bridge-personnel-name" id="ac-char-name" type="button">' + escapeHtml(activeCharacter) + '</button>';
  if (profile.basicInfo) html += '<span class="bridge-muted bridge-basic-info">' + escapeHtml(profile.basicInfo) + '</span>';
  html += '<div class="bridge-chip-row">';
  if (profile.charRelation) html += charRelationPillHtml(activeCharacter, profile.charRelation);
  html += '<span class="bridge-status-chip ' + moodClass + '">' + escapeHtml(profile.emotionRaw || '状态未知') + '</span>';
  html += '</div>';
  html += '</div>';
  html += '<div class="bridge-personnel-actions" data-ub-section="bridge-actions">';
  if (config.investigationEnabled) html += '<button class="bridge-btn ub-lp-hint" id="ac-investigate-btn" data-name="' + escapeHtml(activeCharacter) + '" type="button">调查</button>';
  if (config.interviewEnabled) {
    html += '<button class="bridge-btn interview-btn" id="ac-interview-btn" data-name="' + escapeHtml(activeCharacter) + '" type="button">采访</button>';
  }
  html += buildPastExpButton(activeCharacter, '过往');
  html += '<button class="bridge-btn" id="ac-diary-btn" type="button">日记</button>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="bridge-personnel-telemetry">';
  html += '<div class="bridge-telemetry-grid" data-ub-section="bridge-telemetry">';
  html += buildBridgeTelemetryItem('状态', profile.charCurrentStatus);
  html += buildBridgeTelemetryItem('打算', profile.charIntention);
  html += buildBridgeTelemetryItem('内心', profile.charInnerThought);
  html += '</div>';
  html += '<div class="bridge-train-row" data-ub-section="bridge-train">';
  html += '<span class="bridge-chip-key">调教</span>';
  html += '<div class="bridge-meter"><span style="width:' + profile.trainPercent + '%"></span></div>';
  html += '<strong>' + profile.trainValue + '/' + profile.maxTrainValue + '</strong>';
  html += '</div>';
  html += cyclePhaseBar(activeCharacter, 'bridge');
  html += buildBridgeDetailLists(activeCharacter);
  html += '</div>';
  html += '</section>';
  return html;
}

function buildBridgeProtocol(config: StatusBarConfig): string {
  let html = '<section class="bridge-protocol bridge-module' + (config.playCollapsed ? ' collapsed' : '') + '" id="ac-play-section" data-ub-section="protocol">';
  html += '<div class="bridge-protocol-head">';
  html += '<div class="bridge-module-title">玩法</div>';
  html += '<div class="bridge-protocol-controls">';
  html += '<button class="bridge-btn ub-lp-hint" id="ac-nsfw-guidance-btn" type="button">指导</button>';
  html += '<button class="bridge-btn" id="ac-item-use-toggle" type="button">物品使用 OFF</button>';
  html += '<button class="bridge-btn is-danger" id="ac-play-clear-btn" type="button">清空</button>';
  html += '<button class="bridge-btn" id="ac-play-collapse-btn" type="button" title="折叠">' + (config.playCollapsed ? '+' : '−') + '</button>';
  html += '</div>';
  html += '</div>';
  html += '<div class="bridge-protocol-grid">';
  html += buildPlayChipsBlock('未选择玩法');
  html += '</div>';
  html += '</section>';
  return html;
}

export function buildBridgeHTML(): string {
  const config = getConfig();
  const activeCharacter = resolveActiveCharacter();
  const stateClasses = (config.darkTheme ? ' dark-mode' : '') + (isNsfwScene() ? ' nsfw-border' : '');

  return [
    '<div class="bridge-container book' + stateClasses + '" id="ac-book">',
    aiActivityBarHtml(),
    buildBridgeCommandHeader(config),
    buildBridgeQuickActions(config),
    buildBridgeCharacterChannels(activeCharacter),
    buildBridgePersonnelGrid(config, activeCharacter),
    config.nsfwPlayEnabled ? buildBridgeProtocol(config) : '',
    buildOptionsBar('bridge'),
    '</div>',
  ].join('');
}
