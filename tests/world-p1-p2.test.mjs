import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));

async function load(relPath) {
  const out = await build({
    absWorkingDir: root,
    entryPoints: [`src/unified-statusbar/${relPath}`],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
}

const types = await load('core/world-engine/world-types.ts');
const ws = await load('core/world-engine/world-state.ts');
const wi = await load('core/world-engine/world-intrusion.ts');
const wb = await load('core/world-engine/world-worldbook.ts');
const store = await load('core/world-engine/world-store.ts');
const evo = await load('core/world-engine/world-evolution.ts');
const anchors = await load('core/external-story-store.ts');
const sdq = await load('core/system-decision-queue.ts');

const mkProfile = (name, over = {}) => ({
  name,
  onStage: false,
  activity: '',
  plans: '',
  updatedAt: '2026-06-05',
  lastEvolveRound: 1,
  ...over,
});

test('P1：pending 入镜禁止向角色动态输出完整 desc，knownFacts 以角色自身认知视角进入', () => {
  const state = {
    ...types.emptyWorldState(),
    lastEvolveDateKey: '2026-06-05',
    profiles: {
      阿青: mkProfile('阿青', {
        activity: '在码头核对账目',
        hiddenGoal: '偷偷筹集船票钱',
        goalProgress: 45,
        knownFacts: ['知道：工头昨夜克扣工钱（亲历）', '不知道：主角已收到南港密信'],
      }),
    },
    pendingIntrusions: [
      {
        id: 'in_1',
        kind: 'character_arrival',
        refId: '阿青',
        title: '码头对账风波',
        hook: '阿青抱着账簿急匆匆走来',
        desc: '绝密前因后果：阿青其实已经买通了南港舵手，今晚子时就要带账本叛逃，他故意来试探主角口风。',
        dateKey: '2026-06-05',
        status: 'pending',
        aiTriggered: true,
        publicInfo: '神色焦急地抱着旧账簿',
      },
      {
        id: 'in_acted',
        kind: 'character_arrival',
        refId: '老周',
        title: '老周送茶',
        hook: '老周提着茶壶敲门',
        desc: '已发生回响：老周把茶放到桌上顺便说了码头停工的消息。',
        dateKey: '2026-06-05',
        status: 'acted',
        ttl: 2,
        aiTriggered: true,
      },
    ],
  };
  state.profiles.老周 = mkProfile('老周', { activity: '在茶馆歇脚' });

  const entryA = wb.buildCharacterDynamicEntry('阿青', state.profiles.阿青, state);
  assert.ok(!entryA.content.includes('买通了南港舵手'), 'pending 入镜完整 desc 严禁进角色动态');
  assert.ok(!entryA.content.includes('待发生事件（等待主角触发）'), '不得沿用旧版泄露格式');
  assert.match(entryA.content, /角色自身认知视角/);
  assert.match(entryA.content, /非主角全知/);
  assert.match(entryA.content, /知道：工头昨夜克扣工钱（亲历）/);
  assert.match(entryA.content, /不知道：主角已收到南港密信/);

  // 仅 acted（正文已实际承接）允许保留回响 desc
  const entryZ = wb.buildCharacterDynamicEntry('老周', state.profiles.老周, state);
  assert.match(entryZ.content, /近期已入镜（近两轮内消散）：已发生回响/);

  // 仅 knownFacts 非空也会建立角色动态条目
  const onlyFactsState = {
    ...types.emptyWorldState(),
    lastEvolveDateKey: '2026-06-05',
    profiles: {
      林雪: mkProfile('林雪', { updatedAt: '', knownFacts: ['知道：城门今晚提前关闭（听闻）'] }),
    },
  };
  const entries = [];
  assert.equal(wb.reconcileCharacterDynamicEntries(entries, onlyFactsState), true);
  assert.equal(entries.length, 1);
  assert.match(entries[0].content, /知道：城门今晚提前关闭（听闻）/);
});

test('P1：buildFrontDigest 对 rumor 的 region 与 earliestRevealDay 实际过滤', () => {
  const state = {
    ...types.emptyWorldState(),
    rumors: [
      { id: 'r_ok', topic: '本地码头', content: '码头今天加派了人手', level: 'heard', progress: 30, dissipation: 90, createdAt: '2026-06-01', region: '星海商圈', earliestRevealDay: '2026-06-05' },
      { id: 'r_future', topic: '未到披露日', content: '下周才会传开的消息', level: 'known', progress: 100, dissipation: 90, createdAt: '2026-06-01', region: '星海商圈', earliestRevealDay: '2026-06-09' },
      { id: 'r_far', topic: '王都政变', content: '王都那边昨晚换了守备', level: 'known', progress: 100, dissipation: 90, createdAt: '2026-06-01', region: '王都', earliestRevealDay: '2026-06-01' },
      { id: 'r_vague', topic: '幕后流言', content: '还在暗处发酵', level: 'vague', progress: 20, createdAt: '2026-06-01', region: '星海商圈' },
    ],
  };

  const front = ws.buildFrontDigest(state, '2026-06-05', { playerRegion: '星海商圈-南码头' });
  assert.ok(front.includes('【传闻·本地码头】'));
  assert.ok(!front.includes('未到披露日'), '早于 earliestRevealDay 的传闻不应进台前');
  assert.ok(!front.includes('王都政变'), '异地传闻不应在当前地区进台前');
  assert.ok(!front.includes('幕后流言'), 'vague 幕后流言不应进台前');
});

test('P1：buildWorldDigestContent 优先裁泛风声/远处内容，保留当前事件、地点人物、临近约定与主入口', () => {
  const padWind = Array.from({ length: 22 }, (_, i) => `【传闻·远处风声${i}】据说外域他乡的商队又换了一批货物在路上缓缓前行${'，路人都在随口闲聊'.repeat(2)}`).join('\n');
  const front = [
    '【世界动态 2026-06-05】',
    ws.DIGEST_SECTION_HERE,
    '- 此地此刻：阿青在星海码头约你午后核对账目（临近约定）',
    ws.DIGEST_SECTION_RUMOR,
    padWind,
    ws.DIGEST_SECTION_UNDER,
    '- 远处山林传说（酝酿）',
    '- 码头罢工（正在发生·此地）',
  ].join('\n');

  const candidateView = {
    blocked: false,
    blockReason: '',
    primary: {
      id: 'in_main',
      revision: 2,
      kind: 'character_arrival',
      refId: '阿青',
      title: '码头对账',
      entryCue: '阿青抱着旧账本在门口张望',
      reason: '同在星海商圈且临近约定',
      condition: '主角得空且非私密',
      publicInfo: '手里的账本边角被水浸湿',
      epistemicBoundary: '主角尚不知背后隐情',
      region: '星海商圈',
      expiresAtDay: '2026-06-06',
      delivery: { eventId: 'in_main', revision: 2 },
    },
    references: [],
    backgroundAntiCollision: [],
  };

  const out = wb.buildWorldDigestContent(front, candidateView);
  const body = out.slice(out.indexOf('\n\n') + 2);
  assert.ok(body.length <= types.WORLD_DIGEST_CHARS_MAX, `实际长度 ${body.length} 超过预算`);
  assert.ok(out.includes('阿青在星海码头约你午后核对账目'), '此地此刻与临近约定必须保留');
  assert.ok(out.includes('阿青抱着旧账本在门口张望'), '自然入镜主入口必须保留');
  assert.ok(!out.includes('远处风声21'), '泛风声应被优先裁掉');
});

test('P2：双区候选投影最多 1 主入口 + 2 极简参考，pending 绝不出完整 desc，亲密场景拦截不删事件', () => {
  const state = {
    ...types.emptyWorldState(),
    lastEvolveDateKey: '2026-06-05',
    pendingIntrusions: [
      { id: 'i_far', kind: 'character_arrival', refId: '远客', title: '远方来信', hook: '驿卒送来封蜡信', desc: '秘密全文A', dateKey: '2026-06-05', status: 'pending', aiTriggered: true, region: '王都' },
      { id: 'i_local', kind: 'character_arrival', refId: '阿青', title: '码头急事', hook: '阿青叩响院门', desc: '绝密剧情结果：阿青私藏了货单', dateKey: '2026-06-05', status: 'pending', aiTriggered: true, region: '星海商圈', expiresAtDay: '2026-06-06', publicInfo: '袖口沾着泥水', reason: '同区临到期' },
      { id: 'i_ref1', kind: 'character_arrival', refId: '老周', title: '茶馆口信', hook: '伙计代老周传话', desc: '秘密全文B', dateKey: '2026-06-05', status: 'pending', aiTriggered: true, region: '星海商圈' },
      { id: 'i_ref2', kind: 'character_arrival', refId: '小四', title: '修船消息', hook: '小四在巷口招手', desc: '秘密全文C', dateKey: '2026-06-05', status: 'pending', aiTriggered: true },
    ],
  };

  const view = wi.selectIntrusionCandidates(state, {
    dateKey: '2026-06-05',
    playerRegion: '星海商圈',
    onStageNames: [],
    sceneGuard: wi.assessIntrusionSceneGuard({ nsfwActive: false }),
  });
  assert.equal(view.blocked, false);
  assert.equal(view.primary?.refId, '阿青', '同区临到期应成为唯一主入口');
  assert.equal(view.references.length, 2, '极简参考最多 2 条');
  assert.equal('desc' in view.primary, false, '候选视图不得携带 desc');
  assert.equal(view.references.every(r => !('desc' in r)), true);

  const wbText = wb.buildWorldDigestContent('', view);
  assert.ok(!wbText.includes('绝密剧情结果'), '世界书投影绝不能出现 pending desc');
  assert.ok(wbText.includes('〔自然入镜·主入口〕'));
  assert.ok(wbText.includes('〔自然入镜·参考〕'));

  // 亲密场景守护：阻止外部闯入，但不删除 pendingIntrusions
  const guard = wi.assessIntrusionSceneGuard({ nsfwActive: true });
  assert.equal(guard.blocked, true);
  const blockedView = wi.selectIntrusionCandidates(state, { dateKey: '2026-06-05', playerRegion: '星海商圈', sceneGuard: guard });
  assert.equal(blockedView.blocked, true);
  assert.equal(blockedView.primary, null);
  assert.equal(blockedView.references.length, 0);
  assert.equal(state.pendingIntrusions.length, 4, '亲密场景只阻止闯入，不得删除原事件');
});

test('P2：草稿预留不等于 acted，弹窗忽略填充失败漏洞已修复，删楼/Swipe 回退且不重复消费', async () => {
  // 1) 无输入框时 fillIntrusionHook 返回 false，prepareIntrusionDraft 保持 pending
  const domEmpty = new JSDOM('<!doctype html><body></body>');
  globalThis.window = domEmpty.window;
  globalThis.document = domEmpty.window.document;
  const baseIntrusion = {
    id: 'in_fill_1',
    kind: 'character_arrival',
    refId: '阿青',
    title: '码头急讯',
    hook: '阿青气喘吁吁推门进来递出货单',
    desc: '完整原因：阿青发现仓库账本少了一页。',
    dateKey: '2026-06-05',
    status: 'pending',
    aiTriggered: true,
    revision: 1,
  };
  assert.equal(wi.fillIntrusionHook(baseIntrusion), false, '缺少 #send_textarea 时必须返回 false');

  // 2) 有输入框时填草稿仅写入 draftPreparedAt，status 仍为 pending
  const domWithInput = new JSDOM('<!doctype html><body><textarea id="send_textarea"></textarea></body>');
  globalThis.window = domWithInput.window;
  globalThis.document = domWithInput.window.document;
  globalThis.Event = domWithInput.window.Event;
  assert.equal(wi.fillIntrusionHook(baseIntrusion), true);
  assert.equal(domWithInput.window.document.getElementById('send_textarea').value, '阿青气喘吁吁推门进来递出货单');

  const st0 = { ...types.emptyWorldState(), pendingIntrusions: [baseIntrusion] };
  const stDraft = wi.prepareIntrusionDraft(st0, 'in_fill_1', { chatKey: 'chat_A', floor: 2 });
  assert.equal(stDraft.pendingIntrusions[0].status, 'pending', '填草稿绝不能提前标为 acted');
  assert.ok(stDraft.pendingIntrusions[0].delivery?.draftPreparedAt);

  // 3) 模糊提及（未可靠承接）不猜测，保持 pending
  const floor1Msg = { is_user: false, mes: '今天天气不错，听说阿青前几天也路过集市。', id: 'm1', swipe_id: 0, swipes: ['今天天气不错，听说阿青前几天也路过集市。'] };
  const anchor1 = anchors.selectedMessageAnchor(floor1Msg, 1);
  const ambiguous = wi.confirmIntrusionAdoptionFromFloor(stDraft, {
    chatKey: 'chat_A',
    floor: 1,
    anchor: anchor1,
    swipeId: 0,
    aiText: floor1Msg.mes,
    userText: '随便聊聊',
    onStageNames: [],
  });
  assert.equal(ambiguous.confirmedIds.length, 0);
  assert.equal(ambiguous.state.pendingIntrusions[0].status, 'pending');

  // 4) 真正承接落楼后标记 acted 并写入完整投递证据，且同楼层不重复消费
  const floor2Msg = {
    is_user: false,
    mes: '院门忽然被推开，阿青气喘吁吁地走进屋内，把手里的货单递到你面前。',
    id: 'm2',
    swipe_id: 0,
    swipes: ['院门忽然被推开，阿青气喘吁吁地走进屋内，把手里的货单递到你面前。'],
  };
  const anchor2 = anchors.selectedMessageAnchor(floor2Msg, 2);
  const confirmed = wi.confirmIntrusionAdoptionFromFloor(stDraft, {
    chatKey: 'chat_A',
    floor: 2,
    anchor: anchor2,
    swipeId: 0,
    aiText: floor2Msg.mes,
    userText: '阿青气喘吁吁推门进来递出货单',
    onStageNames: ['阿青'],
  });
  assert.deepEqual(confirmed.confirmedIds, ['in_fill_1']);
  const actedItem = confirmed.state.pendingIntrusions[0];
  assert.equal(actedItem.status, 'acted');
  assert.equal(actedItem.delivery.actedFloor, 2);
  assert.equal(actedItem.delivery.actedAnchor, anchor2);
  assert.equal(actedItem.delivery.actedSwipeId, 0);

  // 同楼层再次确认不会重复消费第二条同角色或再刷一次
  const stateWithSecond = wi.enqueueIntrusion(confirmed.state, { ...baseIntrusion, id: 'in_fill_2', title: '另一件事' });
  const repeat = wi.confirmIntrusionAdoptionFromFloor(stateWithSecond, {
    chatKey: 'chat_A',
    floor: 2,
    anchor: anchor2,
    swipeId: 0,
    aiText: floor2Msg.mes,
    onStageNames: ['阿青'],
  });
  assert.equal(repeat.confirmedIds.length, 0, '同楼层锚点/swipe 不应重复消费');

  // 5) Swipe 到另一个变体 → 回退回 pending
  const chatSwiped = [
    { is_user: true, mes: 'hi' },
    floor1Msg,
    {
      ...floor2Msg,
      swipe_id: 1,
      swipes: [floor2Msg.mes, '另一版回复：屋里只有风吹动窗帘，没人进来。'],
      swipe_info: [{ send_date: 't0' }, { send_date: 't1' }],
    },
  ];
  const rolledSwipe = wi.reconcileIntrusionsWithChat(confirmed.state, chatSwiped, 'chat_A');
  assert.deepEqual(rolledSwipe.rolledBackIds, ['in_fill_1']);
  assert.equal(rolledSwipe.state.pendingIntrusions[0].status, 'pending');
  assert.equal(rolledSwipe.state.pendingIntrusions[0].delivery.actedFloor, undefined);

  // 6) 删除楼层 → 回退回 pending
  const rolledDelete = wi.reconcileIntrusionsWithChat(confirmed.state, [{ is_user: true, mes: 'hi' }, floor1Msg], 'chat_A');
  assert.deepEqual(rolledDelete.rolledBackIds, ['in_fill_1']);
  assert.equal(rolledDelete.state.pendingIntrusions[0].status, 'pending');

  // 7) 弹窗路径：验证 enqueueWorldEvolutionPopup 在填充失败时不提前 acted 且不返回 ok:true；填充成功仅写草稿预留、仍保持 pending
  const bundleMod = await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export * as evo from './src/unified-statusbar/core/world-engine/world-evolution.ts';
        export * as worldStore from './src/unified-statusbar/core/world-engine/world-store.ts';
        export * as storyStore from './src/unified-statusbar/core/story-floor-store.ts';
        export * as sdq from './src/unified-statusbar/core/system-decision-queue.ts';
      `,
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  const shared = await import('data:text/javascript;base64,' + Buffer.from(bundleMod.outputFiles[0].text).toString('base64'));
  void sdq;
  const domNoInput = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost:8000' });
  globalThis.window = domNoInput.window;
  globalThis.document = domNoInput.window.document;
  const mockChat = [{ is_user: false, mes: '开场白', id: 'm0' }];
  domNoInput.window.SillyTavern = {
    getContext: () => ({ chat: mockChat, chatId: 'chat_popup_1', characterId: 0, characters: [{ avatar: 'c.png', name: 'C' }] }),
  };
  let savedWorld = { ...types.emptyWorldState(), pendingIntrusions: [baseIntrusion] };
  const memDomain = {
    replay: () => ({ world: savedWorld }),
    flush: async () => {},
    revision: () => 1,
    append: async (_anchor, updates) => {
      if (updates && updates.world) savedWorld = updates.world;
      return { ok: true, confirmed: true, retryable: false };
    },
    exportJournal: () => ({ entries: [] }),
  };
  shared.storyStore._setStoryWriteBehindDebounceMs(0);
  shared.storyStore.configureStoryStorage({
    journal: { readAll: () => ({ world: savedWorld }) },
    portraits: { readAll: () => ({}), replaceAll: async () => true, flush: async () => {}, sync: async () => {}, revision: () => 1 },
    domains: { core: memDomain, map: memDomain },
  }, 'chat_popup_1');

  shared.evo.enqueueWorldEvolutionPopup([baseIntrusion], []);
  const failRes = await shared.sdq.systemDecisionQueue.submitActive({ action: 'fill', id: 'in_fill_1' });
  assert.equal(failRes.ok, false, '缺少输入框时弹窗提交必须返回 ok:false');
  assert.equal(savedWorld.pendingIntrusions[0].status, 'pending', '填充失败后必须保持 pending');

  // 加上输入框后再提交：返回 ok:true，但仍只写草稿预留，保持 pending
  const domInput2 = new JSDOM('<!doctype html><body><textarea id="send_textarea"></textarea></body>', { url: 'http://localhost:8000' });
  domInput2.window.SillyTavern = domNoInput.window.SillyTavern;
  globalThis.window = domInput2.window;
  globalThis.document = domInput2.window.document;
  globalThis.Event = domInput2.window.Event;
  const okRes = await shared.sdq.systemDecisionQueue.submitActive({ action: 'fill', id: 'in_fill_1' });
  assert.equal(okRes.ok, true);
  assert.equal(savedWorld.pendingIntrusions[0].status, 'pending', '弹窗填入草稿后仍保持 pending，绝不提前 acted');
  assert.ok(savedWorld.pendingIntrusions[0].delivery?.draftPreparedAt);
});

test('P2：焦点选择优先当前地区、临到期、约定、伏线与近期互动，同时保留少量远处轮转', () => {
  const state = {
    ...types.emptyWorldState(),
    lastEvolveDateKey: '2026-06-05',
    profiles: {
      远客A: mkProfile('远客A', { lastEvolveRound: 1, activity: '在王都散步' }),
      远客B: mkProfile('远客B', { lastEvolveRound: 2, activity: '在王都读书' }),
      远客C: mkProfile('远客C', { lastEvolveRound: 3, activity: '在王都练剑' }),
      近邻: mkProfile('近邻', { lastEvolveRound: 8, activity: '在星海商圈巡店' }),
      临期者: mkProfile('临期者', { lastEvolveRound: 9 }),
      约定者: mkProfile('约定者', { lastEvolveRound: 10 }),
    },
    seeds: [
      { id: 's1', title: '码头罢工', status: 'active', level: 2, visibility: 'limited', catalyst: '涨薪', region: '星海商圈', actorIds: ['近邻'], expiresAtDay: '', missedOutcome: '', createdAtDay: '2026-06-01', revision: 0 },
    ],
    pendingIntrusions: [
      { id: 'i_exp', kind: 'character_arrival', refId: '临期者', title: '限期交货', hook: '敲门', desc: 'd', dateKey: '2026-06-05', status: 'pending', aiTriggered: true, expiresAtDay: '2026-06-06' },
    ],
  };

  const sel = ws.selectFocusSubset(
    state,
    [],
    { focusMax: 4, rotationBatch: 2 },
    () => 0,
    { playerRegion: '星海商圈', today: '2026-06-05', recentNames: [], appointmentNames: ['约定者'] },
  );
  const names = sel.profiles.map(p => p.name);
  assert.ok(names.includes('近邻'), '当前地区+伏线角色应优先入选');
  assert.ok(names.includes('临期者'), '临到期角色应优先入选');
  assert.ok(names.includes('约定者'), '有约定角色应优先入选');
  assert.equal(names.filter(n => n.startsWith('远客')).length, 1, '保留 1 个少量远处轮转席位');
});

test('P2：旧存档无扩展字段时 normalizeWorldState 兼容且不丢失原字段', () => {
  const legacy = {
    ...types.emptyWorldState(),
    pendingIntrusions: [
      { id: 'legacy_1', kind: 'character_arrival', refId: '阿青', title: '旧入镜', hook: '敲门', desc: '旧描述', dateKey: '2026-06-01', status: 'pending', aiTriggered: true },
    ],
  };
  const norm = store.normalizeWorldState(structuredClone(legacy));
  assert.equal(norm.pendingIntrusions.length, 1);
  assert.equal(norm.pendingIntrusions[0].id, 'legacy_1');
  assert.equal(norm.pendingIntrusions[0].status, 'pending');
});
test('v2：sl_world_ack 命中的入镜即使没有固定入镜动词也确定性承接，未命中保持原严格启发式', () => {
  const mkArrival = (id, refId) => ({
    id, kind: 'character_arrival', refId, title: '码头对账', hook: '旧账本',
    desc: '完整秘密', dateKey: '2026-06-05', status: 'pending', aiTriggered: true,
  });
  const state = { ...types.emptyWorldState(), pendingIntrusions: [mkArrival('ev_ack', '阿青')] };
  const aiText = '阿青把账本摊在桌上，抬眼等你开口。'; // 静默承接：没有 赶来/推门 之类的固定动词
  const base = { chatKey: 'chat_A', floor: 3, anchor: 'anc3', swipeId: 0, aiText, userText: '' };

  const strict = wi.confirmIntrusionAdoptionFromFloor(state, base);
  assert.equal(strict.confirmedIds.length, 0, '无回执时保持严格启发式，不猜');
  assert.equal(strict.state.pendingIntrusions[0].status, 'pending');

  const acked = wi.confirmIntrusionAdoptionFromFloor(state, { ...base, pickedIds: ['ev_ack'] });
  assert.deepEqual(acked.confirmedIds, ['ev_ack']);
  assert.equal(acked.state.pendingIntrusions[0].status, 'acted');
  assert.equal(acked.state.pendingIntrusions[0].delivery.actedFloor, 3);

  const unrelated = wi.confirmIntrusionAdoptionFromFloor(state, { ...base, pickedIds: ['ev_other'] });
  assert.equal(unrelated.confirmedIds.length, 0, '未命中的其余项仍走严格启发式');
});

test('v2：applyWorldAckReceipt 写入 picked 4 轮 / skipped 2 轮冷却，清理过期项且跨聊天不消费', () => {
  const state = {
    ...types.emptyWorldState(),
    eventCooldowns: { old_one: { id: 'old_one', action: 'skipped', untilRound: 5 } },
  };
  const ack = {
    version: 1,
    chatIdentity: '',
    picked: { id: 'r_rumor', targetTag: 'world_cue', reason: '顺势提及' },
    skippedIds: ['s_seed', 'r_rumor'],
  };
  const next = wi.applyWorldAckReceipt(state, ack, {
    chatKey: 'chat_A', round: 10, floor: 9, anchor: 'anc9', swipeId: 0, liveChatIdentity: null,
  });
  assert.equal(next.eventCooldowns.old_one, undefined, '过期冷却应清掉');
  assert.equal(next.eventCooldowns.r_rumor.action, 'picked');
  assert.equal(next.eventCooldowns.r_rumor.untilRound, 14);
  assert.equal(next.eventCooldowns.r_rumor.floor, 9);
  assert.equal(next.eventCooldowns.r_rumor.chatKey, 'chat_A');
  assert.equal(next.eventCooldowns.s_seed.action, 'skipped');
  assert.equal(next.eventCooldowns.s_seed.untilRound, 12);

  // 跨聊天身份：整条跳过不消费
  const blocked = wi.applyWorldAckReceipt(state, { ...ack, chatIdentity: 'character:a|chat:1' }, {
    chatKey: 'chat_A', round: 10, liveChatIdentity: 'character:b|chat:2',
  });
  assert.equal(blocked, state);

  // 被 picked 的 pending 入镜由楼层承接确认转 acted，不写冷却
  const withArrival = {
    ...types.emptyWorldState(),
    pendingIntrusions: [{ id: 'ev1', kind: 'character_arrival', refId: '甲', title: '来访', dateKey: '', status: 'pending', aiTriggered: true }],
  };
  const arrivalAck = wi.applyWorldAckReceipt(withArrival, { version: 1, picked: { id: 'ev1' }, skippedIds: [] }, { chatKey: 'c', round: 3 });
  assert.equal(arrivalAck.eventCooldowns, undefined);

  // 非法形状 / 版本不符一律不消费
  assert.equal(wi.applyWorldAckReceipt(state, null, { chatKey: 'c', round: 3 }), state);
  assert.equal(wi.applyWorldAckReceipt(state, { version: 2, picked: { id: 'x' } }, { chatKey: 'c', round: 3 }), state);
});

test('v2：skipped 冷却只在候选排序中 -50 降权，不删除事件，过期后恢复原序', () => {
  const mk = (id, refId) => ({
    id, kind: 'character_arrival', refId, title: '码头对账', hook: '抱着旧账本走来',
    dateKey: '2026-06-05', status: 'pending', aiTriggered: true, region: '星海商圈', expiresAtDay: '2026-06-06',
  });
  const state = {
    ...types.emptyWorldState(),
    lastEvolveDateKey: '2026-06-05',
    pendingIntrusions: [mk('i_b', '乙'), mk('i_a', '甲')],
    eventCooldowns: { i_b: { id: 'i_b', action: 'skipped', untilRound: 12 } },
  };
  const base = { dateKey: '2026-06-05', playerRegion: '星海商圈', onStageNames: [] };

  const noCooldown = wi.selectIntrusionCandidates(state, { ...base });
  assert.equal(noCooldown.primary.id, 'i_b');

  const cooled = wi.selectIntrusionCandidates(state, { ...base, cooldowns: state.eventCooldowns, currentRound: 10 });
  assert.equal(cooled.primary.id, 'i_a', 'skipped 冷却期内降权到后面');
  assert.equal(state.pendingIntrusions.length, 2, '降权绝不删除事件');

  const expired = wi.selectIntrusionCandidates(state, { ...base, cooldowns: state.eventCooldowns, currentRound: 12 });
  assert.equal(expired.primary.id, 'i_b', '冷却到期后恢复原排序');
});

test('v2：删楼 / Swipe 回退同时清掉带楼层证据的 eventCooldowns', () => {
  const mkState = (cooldowns) => ({
    ...types.emptyWorldState(),
    pendingIntrusions: [{
      id: 'ev_roll', kind: 'character_arrival', refId: '阿青', title: '码头对账', hook: '推门进来',
      dateKey: '2026-06-05', status: 'acted', ttl: 2, aiTriggered: true,
      delivery: { eventId: 'ev_roll', revision: 2, chatKey: 'chat_A', actedFloor: 2, actedAnchor: 'anc2', actedSwipeId: 0 },
    }],
    eventCooldowns: cooldowns,
  });
  const cd = { r1: { id: 'r1', action: 'picked', untilRound: 20, chatKey: 'chat_A', floor: 2, anchor: 'anc2', swipeId: 0 } };

  // 楼层被删除 → acted 回退 + 冷却清除
  const deleted = wi.reconcileIntrusionsWithChat(mkState(cd), [{ is_user: true, mes: 'hi' }, { is_user: false, mes: '开场', swipe_id: 0 }], 'chat_A');
  assert.deepEqual(deleted.rolledBackIds, ['ev_roll']);
  assert.equal(deleted.state.pendingIntrusions[0].status, 'pending');
  assert.equal(deleted.state.eventCooldowns, undefined, '楼层证据失效的冷却一并回退');

  // Swipe 切到别的变体 → 同样回退
  const chat = [
    { is_user: true, mes: 'hi' },
    { is_user: false, mes: '开场', swipe_id: 0, swipes: ['开场', '另一版'] },
    { is_user: false, mes: '承接', swipe_id: 1, swipes: ['承接', '另一版承接'] },
  ];
  const swiped = wi.reconcileIntrusionsWithChat(mkState(cd), chat, 'chat_A');
  assert.deepEqual(swiped.rolledBackIds, ['ev_roll']);
  assert.equal(swiped.state.eventCooldowns, undefined);

  // 别的聊天 / 无楼层证据的冷却不受影响
  const otherChat = wi.reconcileIntrusionsWithChat(
    mkState({ r2: { id: 'r2', action: 'picked', untilRound: 20, chatKey: 'chat_B', floor: 2 } }),
    [{ is_user: true, mes: 'hi' }],
    'chat_A',
  );
  assert.ok(otherChat.state.eventCooldowns?.r2, '其他聊天的冷却不得被误删');
  const noEvidence = wi.reconcileIntrusionsWithChat(mkState({ r3: { id: 'r3', action: 'skipped', untilRound: 20 } }), [{ is_user: true, mes: 'hi' }], 'chat_A');
  assert.ok(noEvidence.state.eventCooldowns?.r3, '无楼层证据的冷却保留');
});
test('v2：双开收敛 buildWorldDigestContent 只留 acted 余波与极短〔世界暗流〕', () => {
  const front = [
    '【世界动态 2026-06-05】',
    ws.DIGEST_SECTION_HERE,
    '- 此地此刻：阿青约你午后核对账目',
    ws.DIGEST_SECTION_RUMOR,
    '【传闻·码头】码头今天加派了人手',
    ws.DIGEST_SECTION_UNDER,
    '- 暗流一',
    '- 暗流二',
    '- 暗流三',
    '- 暗流四',
    '- 【阿青 入镜】码头对账　阿青抱着账本走来',
  ].join('\n');
  const view = {
    blocked: false,
    blockReason: '',
    primary: {
      id: 'in_main', revision: 1, kind: 'character_arrival', refId: '阿青', title: '码头对账',
      entryCue: '阿青抱着旧账本在门口张望', reason: '', condition: '', publicInfo: '',
      epistemicBoundary: '', region: '星海商圈', expiresAtDay: '', delivery: { eventId: 'in_main', revision: 1 },
    },
    references: [],
    backgroundAntiCollision: ['老周·茶馆口信'],
  };

  const delegated = wb.buildWorldDigestContent(front, view, {
    delegatedToDriver: true,
    actedEchoes: ['阿青·码头对账：阿青把账本摊开', '老周·送茶：老周放下茶壶'],
  });
  assert.ok(delegated.includes(wb.DIGEST_SECTION_ACTED));
  assert.ok(delegated.includes('阿青·码头对账：阿青把账本摊开'));
  assert.ok(delegated.includes(ws.DIGEST_SECTION_UNDER));
  assert.ok(delegated.includes('暗流一'));
  assert.ok(!delegated.includes('暗流四'), '世界暗流最多 3 行');
  assert.ok(!delegated.includes(ws.DIGEST_SECTION_HERE), '剔除此地此刻');
  assert.ok(!delegated.includes(ws.DIGEST_SECTION_RUMOR), '剔除风闻轶事');
  assert.ok(!delegated.includes(wb.DIGEST_SECTION_PRIMARY_CANDIDATE), '剔除自然入镜主入口');
  assert.ok(!delegated.includes(wb.DIGEST_SECTION_REF_CANDIDATES), '剔除自然入镜参考');
  assert.ok(!delegated.includes(wb.DIGEST_SECTION_ANTI_COLLISION), '剔除防撞车索引');
  assert.ok(!delegated.includes('码头今天加派了人手'), '收敛版不再注入传闻正文');

  assert.equal(wb.buildWorldDigestContent('', undefined, { delegatedToDriver: true, actedEchoes: [] }), '', '两段皆空返回空串');

  const longUnder = [ws.DIGEST_SECTION_UNDER, '- ' + '很长的暗流行文'.repeat(60)].join('\n');
  const longOut = wb.buildWorldDigestContent(longUnder, undefined, { delegatedToDriver: true, actedEchoes: [] });
  const underBody = (longOut.split(ws.DIGEST_SECTION_UNDER)[1] || '').trim();
  assert.ok(underBody.length <= 300, '世界暗流正文不得超过 300 字，实际 ' + underBody.length);

  const legacy = wb.buildWorldDigestContent(front, view);
  assert.ok(legacy.includes(ws.DIGEST_SECTION_HERE));
  assert.ok(legacy.includes(wb.DIGEST_SECTION_PRIMARY_CANDIDATE));
  assert.ok(legacy.includes(wb.DIGEST_SECTION_ANTI_COLLISION));
  assert.ok(!legacy.includes(wb.DIGEST_SECTION_ACTED), '未开启收敛时行为与旧版一致');
});

test('v2：双开收敛时角色动态保留 acted 余波与动向/打算/认知，不输出 pending 待入镜线索', () => {
  const state = {
    ...types.emptyWorldState(),
    lastEvolveDateKey: '2026-06-05',
    profiles: {
      阿青: mkProfile('阿青', {
        activity: '在码头核对账目',
        plans: '带账本来找主角',
        hiddenGoal: '偷偷筹集船票钱',
        goalProgress: 45,
        knownFacts: ['知道：工头昨夜克扣工钱（亲历）'],
      }),
      老周: mkProfile('老周', { activity: '在茶馆歇脚' }),
      林雪: mkProfile('林雪', { updatedAt: '' }),
    },
    pendingIntrusions: [
      { id: 'in_pending', kind: 'character_arrival', refId: '阿青', title: '码头对账风波', hook: '阿青抱着账簿走来', desc: '绝密：今晚叛逃', dateKey: '2026-06-05', status: 'pending', aiTriggered: true, publicInfo: '神色焦急' },
      { id: 'in_acted', kind: 'character_arrival', refId: '老周', title: '老周送茶', desc: '已发生回响：老周把茶放到桌上', dateKey: '2026-06-05', status: 'acted', ttl: 2, aiTriggered: true },
      { id: 'in_lx', kind: 'character_arrival', refId: '林雪', title: '林雪来访', dateKey: '2026-06-05', status: 'pending', aiTriggered: true },
    ],
  };

  const delegated = wb.buildCharacterDynamicEntry('阿青', state.profiles.阿青, state, { delegatedToDriver: true });
  assert.ok(!delegated.content.includes('待入镜线索'), '双开收敛不向角色动态输出 pending 线索');
  assert.ok(!delegated.content.includes('绝密：今晚叛逃'));
  assert.ok(delegated.content.includes('动向：在码头核对账目'));
  assert.ok(delegated.content.includes('打算：带账本来找主角'));
  assert.ok(delegated.content.includes('暗中打算'));
  assert.ok(delegated.content.includes('角色自身认知视角'));

  const zhou = wb.buildCharacterDynamicEntry('老周', state.profiles.老周, state, { delegatedToDriver: true });
  assert.match(zhou.content, /近期已入镜/, 'acted 余波照常保留');

  const plain = wb.buildCharacterDynamicEntry('阿青', state.profiles.阿青, state);
  assert.match(plain.content, /待入镜线索/, '单开时行为不变');

  const delegatedEntries = [];
  assert.equal(wb.reconcileCharacterDynamicEntries(delegatedEntries, state, { delegatedToDriver: true }), true);
  const delegatedNames = delegatedEntries.map(e => e.name);
  assert.ok(!delegatedNames.includes(wb.CHARACTER_DYNAMIC_WB_PREFIX + '林雪'), '仅 pending 的角色在收敛模式不生成条目');
  assert.ok(delegatedNames.includes(wb.CHARACTER_DYNAMIC_WB_PREFIX + '阿青'));

  const singleEntries = [];
  assert.equal(wb.reconcileCharacterDynamicEntries(singleEntries, state, { delegatedToDriver: false }), true);
  assert.ok(singleEntries.some(e => e.name === wb.CHARACTER_DYNAMIC_WB_PREFIX + '林雪'));
});

test('v2：双开收敛不改状态栏 UI —— 待定入镜与传闻照常完整展示', async () => {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost:8000' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  try {
    const worldWindow = await load('renderers/world-window.ts');
    const state = {
      ...types.emptyWorldState(),
      lastEvolveDateKey: '2026-06-05',
      profiles: { 阿青: mkProfile('阿青', { activity: '在码头核对账目' }) },
      rumors: [
        { id: 'r_ui', topic: '码头加派', content: '码头今天加派了人手', level: 'known', progress: 60, createdAt: '2026-06-01', region: '星海商圈' },
      ],
      pendingIntrusions: [
        { id: 'in_ui_1', kind: 'character_arrival', refId: '阿青', title: '码头对账', hook: '阿青抱着旧账本走进院子', dateKey: '2026-06-05', status: 'pending', aiTriggered: true },
        { id: 'in_ui_2', kind: 'character_arrival', refId: '老周', title: '茶馆口信', hook: '伙计代老周传话', dateKey: '2026-06-05', status: 'pending', aiTriggered: true },
        { id: 'in_ui_3', kind: 'character_arrival', refId: '小四', title: '修船消息', hook: '小四在巷口招手', dateKey: '2026-06-05', status: 'acted', ttl: 2, aiTriggered: true },
      ],
    };
    const sections = worldWindow.frontSectionsFromState(state, '2026-06-05', '星海商圈');
    assert.equal(sections.arrivals.length, 3, '待定与已发生的入镜都要完整展示');
    assert.equal(sections.rumors.length, 1);
    const html = worldWindow.buildWorldWindowHtml('ancient', state, '2026-06-05', true, '星海商圈');
    assert.ok(html.includes('码头对账'));
    assert.ok(html.includes('茶馆口信'));
    assert.ok(html.includes('码头加派'));
    assert.equal(state.pendingIntrusions.length, 3, 'UI 渲染不得增删状态');
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    if (prevDocument === undefined) delete globalThis.document;
    else globalThis.document = prevDocument;
  }
});
