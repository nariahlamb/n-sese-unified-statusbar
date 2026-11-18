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
const snapMod = await load('core/world-engine/world-snapshot.ts');

test('P4：版本化只读快照含聊天身份、必要角色 knownFacts、候选公开入口与限制，不含完整 desc/hiddenGoal/写接口', () => {
  const sampleState = {
    ...types.emptyWorldState(),
    lastEvolveDateKey: '2026-06-05',
    profiles: {
      阿青: {
        name: '阿青',
        onStage: false,
        activity: '在码头等风信',
        plans: '带账本来找主角',
        hiddenGoal: '秘密替父亲翻案（绝密不可泄露）',
        goalProgress: 80,
        goalProgressText: '已收集三份证据',
        relation: '故交',
        knownFacts: ['知道：账本缺了一页（亲历）', '不知道：主角已收到密信'],
        updatedAt: '2026-06-05',
        lastEvolveRound: 3,
      },
      路人甲: {
        name: '路人甲',
        onStage: false,
        activity: '在城外砍柴',
        plans: '',
        updatedAt: '2026-06-05',
        lastEvolveRound: 1,
      },
    },
    pendingIntrusions: [
      {
        id: 'in_10',
        kind: 'character_arrival',
        refId: '阿青',
        title: '码头对账',
        hook: '阿青抱着旧账本走进院子',
        desc: '绝密完整描述：阿青其实已经联系好走私船，今晚准备撤离。',
        dateKey: '2026-06-05',
        status: 'pending',
        aiTriggered: true,
        revision: 2,
        publicInfo: '神色略显疲惫',
        reason: '同在星海商圈',
        condition: '主角非私密对话',
        region: '星海商圈',
        delivery: { eventId: 'in_10', revision: 2, chatKey: 'chat_uuid_1', offeredAtFloor: 5 },
      },
      {
        id: 'in_11',
        kind: 'character_arrival',
        refId: '阿青',
        title: '后院暗语',
        hook: '阿青在门廊下轻敲三下木柱',
        desc: '绝密参考描述：这是接头暗号，准备交出第二份账册。',
        dateKey: '2026-06-05',
        status: 'pending',
        aiTriggered: true,
        revision: 1,
        publicInfo: '神色警惕',
        reason: '同在星海商圈',
        condition: '非战斗中',
        region: '星海商圈',
        delivery: { eventId: 'in_11', revision: 1, chatKey: 'chat_uuid_1' },
      },
    ],
  };

  const bridge = snapMod.createWorldCognitionBridge({
    getChatKey: () => 'chat_uuid_1',
    isStorageReady: () => true,
    isWorldEnabled: () => true,
    loadState: () => sampleState,
    getDateKey: () => '2026-06-05',
    getRuntimeContext: () => ({
      dateKey: '2026-06-05',
      playerRegion: '星海商圈',
      onStageNames: [],
      nsfwActive: false,
    }),
  });

  assert.equal(bridge.version, types.WORLD_SNAPSHOT_VERSION);
  assert.deepEqual(Object.keys(bridge).sort(), ['getSnapshot', 'version'], '只读桥不得暴露任何写入/突变接口');

  const snap = bridge.getSnapshot();
  assert.equal(snap.version, types.WORLD_SNAPSHOT_VERSION);
  assert.equal(snap.version, 2, 'v2：快照版本号已升级');
  assert.equal(snap.chatKey, 'chat_uuid_1');
  assert.equal(snap.chatIdentity, null, '无实时宿主上下文时 chatIdentity 为 null，不得用 chatKey 冒充');
  assert.equal(snap.available, true);
  assert.equal(snap.restrictions.forbidPendingFullDesc, true);
  assert.equal(snap.restrictions.forbidHiddenGoal, true);
  assert.equal(snap.restrictions.maxPrimaryCandidate, 1);
  assert.equal(snap.restrictions.maxReferenceCandidates, 2);
  // v2：双开收敛字段 + 结构化事件池
  assert.equal(snap.worldbookDelegated, false, '无台账驱动桥时不得自称交由驱动接管');
  assert.deepEqual(snap.onStageNames, []);
  assert.ok(Array.isArray(snap.eventPool));
  const poolArrival = snap.eventPool.filter(e => e.kind === 'arrival');
  assert.ok(poolArrival.length >= 1, '合格 pending 入镜应进事件池');
  assert.ok(poolArrival.every(e => !('desc' in e)), '事件池 arrival 不得含 desc');

  // 必要角色存在，无关联且无 knownFacts 的路人不冗余塞入
  assert.ok(snap.characters.阿青);
  assert.equal(snap.characters.路人甲, undefined);
  assert.deepEqual(snap.characters.阿青.knownFacts, ['知道：账本缺了一页（亲历）', '不知道：主角已收到密信']);
  assert.equal('hiddenGoal' in snap.characters.阿青, false, '角色快照不得包含 hiddenGoal 字段');
  assert.equal('goalProgress' in snap.characters.阿青, false, '角色快照不得包含 goalProgress 字段');
  assert.equal('goalProgressText' in snap.characters.阿青, false, '角色快照不得包含 goalProgressText 字段');

  // 候选公开入口存在且严格不含完整 desc / hiddenGoal
  assert.equal(snap.candidates.primary?.refId, '阿青');
  assert.equal(snap.candidates.primary?.entryCue, '阿青抱着旧账本走进院子');
  assert.equal('desc' in snap.candidates.primary, false, '主候选快照不得包含 desc 字段');
  assert.equal(snap.candidates.references.length, 1);
  for (const ref of snap.candidates.references) {
    assert.equal('desc' in ref, false, '参考候选快照不得包含 desc 字段');
  }
  const serialized = JSON.stringify(snap);
  assert.ok(!serialized.includes('绝密完整描述'), '快照绝不能泄露 pending 完整 desc');
  assert.ok(!serialized.includes('绝密参考描述'), '快照绝不能泄露参考候选完整 desc');
  assert.ok(!serialized.includes('秘密替父亲翻案'), '快照绝不能泄露 hiddenGoal');
  assert.ok(!serialized.includes('已收集三份证据'), '快照绝不能泄露 goalProgressText');

  // 副本防篡改：修改返回快照不影响原数据与下一次读取
  snap.characters.阿青.knownFacts.push('外部篡改');
  snap.candidates.primary.title = '被篡改标题';
  const snap2 = bridge.getSnapshot();
  assert.equal(snap2.characters.阿青.knownFacts.length, 2);
  assert.equal(snap2.candidates.primary?.title, '码头对账');
});

test('P4：默认桥按宿主实时上下文生成同口径 chatIdentity，不覆盖 chatKey 且不硬编码未知 chatId', () => {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const dom = new JSDOM('<!doctype html><body></body>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  try {
    let liveCtx = {
      chatId: 'story_chat_100',
      characterId: 0,
      characters: [{ avatar: 'qing.png', name: '阿青' }],
    };
    dom.window.SillyTavern = {
      getContext: () => liveCtx,
    };

    const ledgerStyleIdentity = (ctx) => {
      if (!ctx) return null;
      const chatKey = String(ctx.chatId || ctx.getCurrentChatId?.() || '').trim();
      if (!chatKey || chatKey.startsWith('unknown-')) return null;
      const owner = ctx.groupId != null && String(ctx.groupId).trim()
        ? `group:${String(ctx.groupId).trim()}`
        : `character:${String(ctx.characters?.[Number(ctx.characterId)]?.avatar || ctx.characterId || '')}`;
      return `${owner}|chat:${chatKey}`;
    };

    snapMod.bindWorldCognitionBridge({
      getChatKey: () => 'storage_uuid_alpha',
      isStorageReady: () => true,
      isWorldEnabled: () => true,
      loadState: () => types.emptyWorldState(),
      getDateKey: () => '2026-06-05',
      getRuntimeContext: () => ({ dateKey: '2026-06-05', playerRegion: '星海商圈', onStageNames: [] }),
    });

    const hostBridge = dom.window[snapMod.WORLD_COGNITION_BRIDGE_KEY];
    assert.ok(hostBridge);

    // 1. 单聊角色卡（索引 + avatar）与台账同身份夹具一致，chatKey 保留存储键
    const s1 = hostBridge.getSnapshot();
    assert.equal(s1.chatKey, 'storage_uuid_alpha');
    assert.equal(s1.chatIdentity, 'character:qing.png|chat:story_chat_100');
    assert.equal(s1.chatIdentity, ledgerStyleIdentity(liveCtx));

    // 2. 切到字符型 characterId 回退与 getCurrentChatId，实时跟随变化
    liveCtx = {
      getCurrentChatId: () => 'story_chat_101',
      characterId: 'bob.png',
      characters: [],
    };
    const s2 = hostBridge.getSnapshot();
    assert.equal(s2.chatIdentity, 'character:bob.png|chat:story_chat_101');
    assert.equal(s2.chatIdentity, ledgerStyleIdentity(liveCtx));

    // 3. 切到群聊，实时产出 group:<groupId>|chat:<chatId>
    liveCtx = {
      chatId: 'group_chat_9',
      groupId: 'grp_9',
      characterId: undefined,
    };
    const s3 = hostBridge.getSnapshot();
    assert.equal(s3.chatIdentity, 'group:grp_9|chat:group_chat_9');
    assert.equal(s3.chatIdentity, ledgerStyleIdentity(liveCtx));

    // 4. 未知/空 chatId 与缺失 owner 一律返回 null，不得硬编码 unknown-* 也不得拿 chatKey 冒充
    for (const badCtx of [
      null,
      { chatId: '', characterId: 0, characters: [{ avatar: 'qing.png' }] },
      { chatId: 'unknown-chat-1', characterId: 0, characters: [{ avatar: 'qing.png' }] },
      { chatId: 'story_chat_102' },
      { chatId: 'group_chat_10', groupId: 'unknown-group-1' },
    ]) {
      liveCtx = badCtx;
      const badSnap = hostBridge.getSnapshot();
      assert.equal(badSnap.chatKey, 'storage_uuid_alpha');
      assert.equal(badSnap.chatIdentity, null);
    }
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    if (prevDocument === undefined) delete globalThis.document;
    else globalThis.document = prevDocument;
  }
});

test('P4：单开/存储未就绪/亲密拦截/跨窗挂载均照常安全降级', () => {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const dom = new JSDOM('<!doctype html><body></body>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  try {
    snapMod.bindWorldCognitionBridge({
      getChatKey: () => '',
      isStorageReady: () => false,
      isWorldEnabled: () => false,
      getRuntimeContext: () => ({ nsfwActive: true }),
    });

    const hostBridge = dom.window[snapMod.WORLD_COGNITION_BRIDGE_KEY];
    assert.ok(hostBridge);
    const unavailable = hostBridge.getSnapshot();
    assert.equal(unavailable.version, types.WORLD_SNAPSHOT_VERSION);
    assert.equal(unavailable.chatIdentity, null);
    assert.equal(unavailable.available, false);
    assert.equal(unavailable.sceneGuard.blocked, true);
    assert.equal(unavailable.restrictions.externalIntrusionBlocked, true);
    assert.equal(unavailable.candidates.primary, null);
    assert.deepEqual(unavailable.candidates.references, []);
    assert.deepEqual(unavailable.characters, {});
    assert.equal(unavailable.worldbookDelegated, false);
    assert.deepEqual(unavailable.eventPool, []);
    assert.deepEqual(unavailable.onStageNames, []);
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    if (prevDocument === undefined) delete globalThis.document;
    else globalThis.document = prevDocument;
  }
});
test('P4 v2：事件池含 arrival/encounter/rumor/ambient，冷却内暂不进池，绝不携带秘密字段', () => {
  const state = {
    ...types.emptyWorldState(),
    lastEvolveDateKey: '2026-06-05',
    lastEvolveRound: 3,
    guidance: {
      signals: [
        { voice: 'encounter', sourceId: 'seed-2026-06-01-1', text: '码头有人打听账本的下落' },
        { voice: 'rumor', sourceId: 'clock', text: '街口在传城西要封路' },
        { voice: 'ambient', sourceId: 'clock', text: '城外的风比昨日更冷' },
      ],
    },
    seeds: [
      { id: 'seed-2026-06-01-1', title: '码头罢工', status: 'active', level: 2, visibility: 'limited', catalyst: '工钱谈不拢', region: '星海商圈', actorIds: [], expiresAtDay: '', missedOutcome: '绝密后果：罢工失控', createdAtDay: '2026-06-01', revision: 0 },
      { id: 'seed_hidden', title: '密室交易', status: 'active', level: 3, visibility: 'hidden', catalyst: '暗线', region: '星海商圈', actorIds: [], expiresAtDay: '', missedOutcome: '幕后隐情', createdAtDay: '2026-06-01', revision: 0 },
    ],
    rumors: [
      { id: 'r_local', topic: '码头加派', content: '码头今天加派了人手', level: 'known', progress: 60, createdAt: '2026-06-01', region: '星海商圈' },
      { id: 'r_cool', topic: '冷却中的传闻', content: '刚被挑过的风声', level: 'known', progress: 60, createdAt: '2026-06-01', region: '星海商圈' },
    ],
    pendingIntrusions: [
      { id: 'in_pool', kind: 'character_arrival', refId: '阿青', title: '码头对账', hook: '阿青抱着旧账本走进院子', desc: '绝密完整描述：今晚要撤离。', dateKey: '2026-06-05', status: 'pending', aiTriggered: true, region: '星海商圈' },
    ],
    eventCooldowns: { r_cool: { id: 'r_cool', action: 'picked', untilRound: 20 } },
  };
  const bridge = snapMod.createWorldCognitionBridge({
    getChatKey: () => 'chat_v2',
    isStorageReady: () => true,
    isWorldEnabled: () => true,
    loadState: () => state,
    getDateKey: () => '2026-06-05',
    getCurrentRound: () => 5,
    isWorldbookDelegated: () => false,
    getRuntimeContext: () => ({ dateKey: '2026-06-05', playerRegion: '星海商圈', onStageNames: [] }),
  });
  const snap = bridge.getSnapshot();
  const kinds = [...new Set(snap.eventPool.map(e => e.kind))].sort();
  assert.deepEqual(kinds, ['ambient', 'arrival', 'encounter', 'rumor']);
  assert.ok(snap.eventPool.length <= 8, '事件池总量上限 8 条');
  assert.ok(snap.eventPool.some(e => e.id === 'in_pool' && e.kind === 'arrival'));
  assert.ok(!snap.eventPool.some(e => e.id === 'r_cool'), 'picked 冷却期内的传闻暂不进池');
  assert.ok(!snap.eventPool.some(e => e.id === 'seed_hidden'), 'hidden 伏线不进事件池');
  const poolJson = JSON.stringify(snap.eventPool);
  assert.ok(!poolJson.includes('绝密完整描述'), '事件池不得携带 pending desc');
  assert.ok(!poolJson.includes('绝密后果'), '事件池不得携带 missedOutcome');
  assert.ok(!poolJson.includes('幕后隐情'));
});

test('P4 v2：亲密场景拦截时事件池不出现 arrival，但事件本身不被删除', () => {
  const state = {
    ...types.emptyWorldState(),
    lastEvolveDateKey: '2026-06-05',
    pendingIntrusions: [
      { id: 'in_guard', kind: 'character_arrival', refId: '阿青', title: '码头对账', hook: '阿青抱着旧账本走进院子', dateKey: '2026-06-05', status: 'pending', aiTriggered: true },
    ],
  };
  const bridge = snapMod.createWorldCognitionBridge({
    getChatKey: () => 'chat_guard',
    isStorageReady: () => true,
    isWorldEnabled: () => true,
    loadState: () => state,
    getDateKey: () => '2026-06-05',
    getCurrentRound: () => 5,
    isWorldbookDelegated: () => false,
    getRuntimeContext: () => ({ dateKey: '2026-06-05', playerRegion: '星海商圈', onStageNames: [], nsfwActive: true }),
  });
  const snap = bridge.getSnapshot();
  assert.equal(snap.sceneGuard.blocked, true);
  assert.equal(snap.eventPool.filter(e => e.kind === 'arrival').length, 0);
  assert.equal(state.pendingIntrusions.length, 1, '守护只拦截投影，不删事件');
});

test('P4 v2：isWorldbookDelegated 为真时快照标记 worldbookDelegated', () => {
  const bridge = snapMod.createWorldCognitionBridge({
    getChatKey: () => 'chat_delegated',
    isStorageReady: () => true,
    isWorldEnabled: () => true,
    loadState: () => types.emptyWorldState(),
    getDateKey: () => '2026-06-05',
    getCurrentRound: () => 0,
    isWorldbookDelegated: () => true,
    getRuntimeContext: () => ({ dateKey: '2026-06-05' }),
  });
  const snap = bridge.getSnapshot();
  assert.equal(snap.worldbookDelegated, true);
  assert.deepEqual(snap.eventPool, []);
});
