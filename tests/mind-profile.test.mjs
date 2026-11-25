import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));

async function load(entry) {
  const output = await build({
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64'));
}

const tableMgr = await load('src/unified-statusbar/core/table-manager.ts');
const dataMgr = await load('src/unified-statusbar/core/data-manager.ts');
const mindView = await load('src/unified-statusbar/core/mind-profile-view.ts');
const worldState = await load('src/unified-statusbar/core/world-engine/world-state.ts');
const worldSources = await load('src/unified-statusbar/core/world-engine/world-sources.ts');
const worldEvo = await load('src/unified-statusbar/core/world-engine/world-evolution.ts');

function installMockTables(sheets, targetWin = null) {
  let importedPayload = null;
  let refreshCalls = 0;
  const legacyFace = {
    exportTableAsJson: () => sheets,
    importTableAsJson: async (jsonStr) => {
      importedPayload = JSON.parse(jsonStr);
      Object.assign(sheets, importedPayload);
      return true;
    },
    importTemplateFromData: async () => true,
    refreshDataAndWorldbook: async () => { refreshCalls += 1; },
  };
  const win = targetWin || {
    SeseLedgerAPI: { __legacyFace: legacyFace },
    AutoCardUpdaterAPI: legacyFace,
    _activeChar: '',
  };
  win.SeseLedgerAPI = { __legacyFace: legacyFace };
  win.AutoCardUpdaterAPI = legacyFace;
  win._activeChar = '';
  if (!targetWin) globalThis.window = win;
  dataMgr.invalidateCache();
  dataMgr.markSheetCacheChatKey(`test-chat-${Math.random()}`);
  return {
    getImported: () => importedPayload,
    getRefreshCalls: () => refreshCalls,
  };
}

test('table-manager：角色心路档案表默认不注入世界书且强制纠偏防全知泄漏', async () => {
  assert.equal(tableMgr.isDefaultInjected('角色心路档案表'), false);
  assert.equal(tableMgr.isDefaultInjected('恋爱日记表'), false);
  assert.equal(tableMgr.getInitialGroupId('角色心路档案表'), 2);

  const sheets = {
    sheet_mind: {
      uid: 'sheet_mind',
      name: '角色心路档案表',
      orderNo: 19,
      updateConfig: { groupId: 3, updateFrequency: 0 },
      exportConfig: { injectIntoWorldbook: true }, // 模拟脏数据误开世界书注入
      content: [['row_id', '姓名', '人格底色与筹码']],
    },
  };
  const mock = installMockTables(sheets);
  const res = await tableMgr.setTableClosed('sheet_mind', false);
  assert.equal(res.ok, true);
  assert.equal(mock.getImported().sheet_mind.updateConfig.updateFrequency, -1);
  assert.equal(mock.getImported().sheet_mind.exportConfig.injectIntoWorldbook, false);
  assert.equal(mock.getRefreshCalls(), 0);
});

test('world-sources：readMindProfilesForFocus 读取心路档案（<=450字）与去 span 日记（<=120字）并接入 readEvolutionSources', async () => {
  const longDim = '深谋远虑且极度防备，'.repeat(80);
  const longDiary = '<span class="highlight">今天</span>在码头<span class="censored">偷偷</span>看见了他的动作，' + '心里反复盘算接下来的对策，'.repeat(20);
  installMockTables({
    sheet_mind: {
      name: '角色心路档案表',
      content: [
        ['row_id', '姓名', '人格底色与筹码', '已知事实与盲点', '四向关系认知', '个人进度与打算', '核心纠结与情绪惯性', '蝴蝶效应留痕'],
        ['1', '顾沉舟', longDim, '以为主角尚未察觉账簿去向', '表面合作，暗自忌惮', '三日内约见盐商', '不甘被挟制又离不开港口', '前日扣船引发码头涨价'],
      ],
    },
    sheet_diary: {
      name: '恋爱日记表',
      content: [
        ['row_id', '写作角色', '关联角色', '日记内容', '发生时间', '事件类型'],
        ['1', '顾沉舟', '主角', '<span class="handwritten">第一篇旧日记</span>', '2026-06-01', '日常互动'],
        ['2', '顾沉舟', '主角', longDiary, '2026-06-05', '冲突矛盾'],
      ],
    },
    sheet_chronicle: {
      name: '纪要表',
      content: [['row_id', '编码索引', '时间跨度', '概览', '纪要', '重要对话']],
    },
    sheet_rel: {
      name: '人物关系表',
      content: [['row_id', '人物A', '人物B', '关系类型', '相互看法', '起因备注', '关系状态']],
    },
  });

  const block = worldSources.readMindProfilesForFocus(['顾沉舟', '路人甲']);
  assert.ok(block.includes('- 顾沉舟'));
  assert.ok(!block.includes('路人甲'));

  const mindLine = block.split('\n').find(line => line.includes('心路档案：'));
  assert.ok(mindLine);
  const mindContent = mindLine.replace(/^\s*心路档案：/, '');
  assert.ok(mindContent.length <= 450, `心路维度超过 450 字：${mindContent.length}`);
  assert.ok(mindContent.endsWith('…'));

  const diaryLine = block.split('\n').find(line => line.includes('近期独白日记'));
  assert.ok(diaryLine);
  assert.ok(!diaryLine.includes('<span'));
  assert.ok(!diaryLine.includes('第一篇旧日记'));
  const diaryContent = diaryLine.replace(/^\s*近期独白日记[^：]*：/, '');
  assert.ok(diaryContent.length <= 120, `日记摘要超过 120 字：${diaryContent.length}`);
  assert.ok(diaryContent.endsWith('…'));

  const src = await worldSources.readEvolutionSources(
    [{ name: '顾沉舟', onStage: false, activity: '', plans: '', updatedAt: '', lastEvolveRound: 0 }],
    worldState.emptyWorldState ? worldState.emptyWorldState() : { version: 1, lastEvolveRound: 0, lastEvolveDateKey: '', profiles: {}, rumors: [], chronicle: [], frontDigest: '', pendingIntrusions: [] },
  );
  assert.equal(src.mindProfiles, block);
});

test('world-evolution & world-state：mindProfiles 注入与 WorldSeed 到期 missedOutcome 既成事实回流（不破坏防全知）', () => {
  const hiddenSeed = {
    id: 'seed-2026-06-01-1',
    title: '暗仓交易',
    status: 'incubating',
    level: 2,
    visibility: 'hidden',
    catalyst: '货船靠岸',
    region: '星海商圈',
    actorIds: ['顾沉舟'],
    expiresAtDay: '2026-06-03',
    missedOutcome: '走私船连夜改停南港，码头帮丢了半船盐引',
    createdAtDay: '2026-06-01',
    revision: 0,
  };
  const publicSeed = {
    id: 'seed-2026-06-01-2',
    title: '码头涨租公告',
    status: 'active',
    level: 2,
    visibility: 'public',
    catalyst: '商会批文',
    region: '星海商圈',
    actorIds: ['顾沉舟'],
    expiresAtDay: '2026-06-03',
    missedOutcome: '新租约已自动生效，老摊主被迫搬离西栈道',
    createdAtDay: '2026-06-01',
    revision: 0,
  };
  const prevState = {
    version: 1,
    lastEvolveRound: 4,
    lastEvolveDateKey: '2026-06-03',
    profiles: {
      '顾沉舟': {
        name: '顾沉舟',
        onStage: false,
        activity: '清点货单',
        plans: '盯着南港水路',
        updatedAt: '2026-06-03',
        lastEvolveRound: 4,
      },
    },
    rumors: [],
    chronicle: [],
    frontDigest: '',
    pendingIntrusions: [],
    seeds: [hiddenSeed, publicSeed],
    dimensions: [],
    guidance: { signals: [] },
  };

  // 第 R 轮在 2026-06-05 结算到期种子
  const swept = worldState.sweepExpiredSeeds(prevState, '2026-06-05');
  assert.equal(swept.missed.length, 2);
  assert.equal(swept.state.seeds[0].settledAtDay, '2026-06-05');
  assert.equal(swept.state.seeds[0].retiredReason, 'missed');

  // 台前摘要：公开伏线保留错过余波，隐藏暗线绝不泄漏进台前摘要
  const front = worldState.buildFrontDigest(swept.state, '2026-06-05', { playerRegion: '星海商圈' });
  assert.ok(front.includes('码头涨租公告（已错过时限：新租约已自动生效，老摊主被迫搬离西栈道）'));
  assert.ok(!front.includes('暗仓交易'));
  assert.ok(!front.includes('走私船连夜改停南港'));

  // 下一轮演化（2026-06-06）构造 prompt：dossier 必须回流所有近期既成事实 + mindProfiles
  const parts = worldEvo.buildEvolutionInstructionParts(
    'big',
    swept.state,
    [swept.state.profiles['顾沉舟']],
    { evolveEveryTurns: 1, focusMax: 6, rotationBatch: 4 },
    6,
    '2026-06-06',
    '1 天',
    {
      chronicleBlocks: '（无）',
      recentChat: '（无）',
      mindProfiles: '- 顾沉舟\n  心路档案：个人进度与打算：已联络南港接应',
    },
    [],
    undefined,
    '星海商圈',
  );
  assert.ok(parts.dossier.includes('【焦点角色心路档案与近期独白】'));
  assert.ok(parts.dossier.includes('已联络南港接应'));
  assert.ok(parts.dossier.includes('【近期已成既成事实（可衍生蝴蝶效应余波）】'));
  assert.ok(parts.dossier.includes('走私船连夜改停南港，码头帮丢了半船盐引'));
  assert.ok(parts.dossier.includes('新租约已自动生效，老摊主被迫搬离西栈道'));
  assert.ok(parts.userInput.includes('场外独立推进与蝴蝶效应'));
});

test('mind-profile-view：只读视图 XSS 安全转义、空态降级与双 Tab/标题文案', () => {
  const xssProfile = {
    name: '林晚<script>alert(1)</script>',
    fields: {
      '人格底色与筹码': '<script>window.__xss=1</script>握着当铺半块玉佩',
      '已知事实与盲点': '"><img src=x onerror=alert(2)>以为对手已撤离',
      '四向关系认知': 'Surface & Depth',
      '个人进度与打算': '',
      '核心纠结与情绪惯性': '无',
      '蝴蝶效应留痕': '<svg onload=alert(3)>雨夜改道',
    },
  };
  const html = mindView.renderMindProfileHtml(xssProfile.name, xssProfile, 'minimal');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img '));
  assert.ok(!html.includes('<svg '));
  assert.ok(html.includes('&lt;script&gt;window.__xss=1&lt;/script&gt;握着当铺半块玉佩'));
  assert.ok(html.includes('&quot;&gt;&lt;img src=x onerror=alert(2)&gt;以为对手已撤离'));
  assert.ok(html.includes('&lt;svg onload=alert(3)&gt;雨夜改道'));
  assert.ok(html.includes('Surface &amp; Depth'));
  assert.ok(html.includes('暂无记录'));

  const emptyHtml = mindView.renderMindProfileHtml('沈青<img src=x>', null, 'ancient');
  assert.ok(emptyHtml.includes('data-mind-empty="1"'));
  assert.ok(!emptyHtml.includes('<img '));
  assert.ok(emptyHtml.includes('暂无「沈青&lt;img src=x&gt;」的心路档案'));

  const bodyMindDefault = mindView.renderDiaryPopupBodyHtml(
    '林晚',
    [{ row: 3, time: '昨晚', content: '<span class="highlight">雨声</span>很大' }],
    xssProfile,
    'sweet',
    'mind',
  );
  assert.ok(bodyMindDefault.includes('data-diary-tab="mind" role="tab" aria-selected="true"'));
  assert.ok(bodyMindDefault.includes('data-tab-panel="diary" hidden'));
  assert.ok(bodyMindDefault.includes('data-row="3"'));
  assert.ok(bodyMindDefault.includes('雨声很大'));

  assert.equal(mindView.getDiaryPopupLabels('ancient').titleSuffix, '的情笺');
  assert.equal(mindView.getDiaryPopupLabels('bridge').titleSuffix, '的日记');
  assert.equal(mindView.getDiaryPopupLabels('sweet').titleSuffix, '的心路日记');
  assert.equal(mindView.getDiaryPopupLabels('minimal').emptyDiary, '暂无心路日记');
});

test('全皮肤渲染器与弹窗：重要角色在场时均有心路日记与心路档案入口，双 Tab 可切换', async () => {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevDollar = globalThis.$;
  const dom = new JSDOM('<!doctype html><body><div id="char-selector-buttons"></div><div id="panelOverlay"></div></body>', { url: 'http://localhost:8000' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.$ = (sel) => ({
    html: (s) => {
      const el = typeof sel === 'string' ? dom.window.document.querySelector(sel) : sel;
      if (el && typeof s === 'string') el.innerHTML = s;
      return el?.innerHTML ?? '';
    },
  });
  try {
    const htmlBuilder = await load('src/unified-statusbar/renderers/html-builder.ts');
    const popupMgr = await load('src/unified-statusbar/renderers/popup-manager.ts');

    installMockTables({
      sheet_main: {
        name: '主角信息表',
        content: [['row_id', '姓名', '性别', '生日', '外貌特征', '身份背景', '近况', '瑟瑟能量'], ['1', '阿音', '女', '01-01', '黑发', '掌柜', '营业中', '50']],
      },
      sheet_global: {
        name: '全局数据表',
        content: [['row_id', '当前详细地点', '上轮场景时间', '经过的时间', '当前时间', '是否色色'], ['1', '星海商圈-茶楼', '', '', '2026-06-05 14:00', '否']],
      },
      sheet_imp: {
        name: '重要角色表',
        content: [['row_id', '姓名', '性别', '生日', '一句话介绍', '外貌特征', '身份', '语言风格和口癖', '对主角态度', '过往经历'], ['1', '厉寒', '男', '03-08', '冷面总捕', '玄衣', '捕头', '言简', '警惕·防备', '旧年曾追查盐案']],
      },
      sheet_love: {
        name: '恋爱对象表',
        content: [['row_id', '姓名', '性别', '生日', '一句话介绍', '外貌特征', '身份', '语言风格和口癖', '对主角态度', '过往经历', '最近亲密互动']],
      },
      sheet_presence: {
        name: '在场角色表',
        content: [['row_id', '姓名', '当前状态', '内心想法', '下一步打算', '当前穿搭', '上装', '下装', '内衣/内裤', '袜子', '鞋子', '饰品', '情绪'], ['1', '厉寒', '抱臂旁观', '此人有古怪', '试探口风', '玄色官服', '劲装', '长裤', '无', '黑袜', '官靴', '无', '不屑']],
      },
      sheet_nsfw: {
        name: 'NSFW信息表',
        content: [['row_id', '姓名', '调教值']],
      },
      sheet_react: {
        name: '即时生理反应表',
        content: [['row_id', '姓名', '胸部', '下体', '口穴', '菊穴', '其他部位']],
      },
      sheet_diary: {
        name: '恋爱日记表',
        content: [
          ['row_id', '写作角色', '关联角色', '日记内容', '发生时间', '事件类型'],
          ['1', '厉寒', '阿音', '茶楼初探，暗记在册。', '2026-06-05', '日常互动'],
        ],
      },
      sheet_mind: {
        name: '角色心路档案表',
        content: [
          ['row_id', '姓名', '人格底色与筹码', '已知事实与盲点', '四向关系认知', '个人进度与打算', '核心纠结与情绪惯性', '蝴蝶效应留痕'],
          ['1', '厉寒', '刚正不阿，手里握着半份案卷', '不知阿音与茶楼暗道有关', '', '', '', ''],
        ],
      },
    }, dom.window);
    dom.window._activeChar = '厉寒';
    const cfg = { investigationEnabled: true, interviewEnabled: true, showHelpTips: false };

    const minimalHtml = htmlBuilder.buildMinimalPresentChars(cfg);
    assert.ok(minimalHtml.includes('diary-preview-clickable'));
    assert.ok(minimalHtml.includes('mind-profile-entry-btn is-ready'));
    assert.ok(minimalHtml.includes('茶楼初探'));

    const flirtHtml = htmlBuilder.buildHTML('flirtatious');
    assert.ok(flirtHtml.includes('id="ac-diary-btn"'));
    assert.ok(flirtHtml.includes('id="ac-mind-profile-btn"'));

    const sweetHtml = htmlBuilder.buildHTML('sweet');
    assert.ok(sweetHtml.includes('id="ac-diary-btn">📔 心路日记</button>'));
    assert.ok(sweetHtml.includes('id="ac-mind-profile-btn"'));

    const ancientHtml = htmlBuilder.buildHTML('ancient');
    assert.ok(ancientHtml.includes('id="ac-diary-btn"'));
    assert.ok(ancientHtml.includes('id="ac-mind-profile-btn"'));

    const xianxiaHtml = htmlBuilder.buildHTML('xianxia');
    assert.ok(xianxiaHtml.includes('id="ac-diary-btn"'));
    assert.ok(xianxiaHtml.includes('id="ac-mind-profile-btn"'));

    const bridgeHtml = htmlBuilder.buildHTML('bridge');
    assert.ok(bridgeHtml.includes('id="ac-diary-btn"'));
    assert.ok(bridgeHtml.includes('id="ac-mind-profile-btn"'));

    const iosHtml = htmlBuilder.buildHTML('ios');
    assert.ok(iosHtml.includes('id="ac-diary-btn"'));
    assert.ok(iosHtml.includes('id="ac-mind-profile-btn"'));

    // 真实 DOM 弹窗 + 双 Tab 切换校验
    popupMgr.showDiaryPopup('厉寒', 'sweet');
    const overlay = dom.window.document.getElementById('panelOverlay');
    assert.ok(overlay.innerHTML.includes('厉寒 的心路日记'));
    const mindTabBtn = overlay.querySelector('[data-diary-tab="mind"]');
    assert.ok(mindTabBtn);
    mindTabBtn.click();
    assert.equal(mindTabBtn.getAttribute('aria-selected'), 'true');
    assert.equal(overlay.querySelector('[data-tab-panel="diary"]').hasAttribute('hidden'), true);
    assert.equal(overlay.querySelector('[data-tab-panel="mind"]').hasAttribute('hidden'), false);
    assert.ok(overlay.querySelector('[data-tab-panel="mind"]').textContent.includes('刚正不阿，手里握着半份案卷'));

    popupMgr.showDiaryPopup('厉寒', 'ancient', 'mind');
    assert.ok(overlay.innerHTML.includes('厉寒 的情笺'));
    assert.equal(overlay.querySelector('[data-diary-tab="mind"]').getAttribute('aria-selected'), 'true');
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    if (prevDocument === undefined) delete globalThis.document;
    else globalThis.document = prevDocument;
    if (prevDollar === undefined) delete globalThis.$;
    else globalThis.$ = prevDollar;
  }
});
