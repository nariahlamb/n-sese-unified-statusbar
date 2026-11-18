import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('..', import.meta.url));

async function loadBundle(code) {
  const result = await build({
    absWorkingDir: root,
    stdin: { contents: code, resolveDir: root, loader: 'ts', sourcefile: 'bg-isolation-bundle.ts' },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}

test('STANDARD_PROMPT_MIDDLE 已移除 chat_history 槽位且保留其余 8 槽', async () => {
  const mod = await loadBundle(`export * from './src/unified-statusbar/core/ai-request-pipeline.ts';`);
  assert.equal(mod.STANDARD_MAX_CHAT_HISTORY, 0);
  assert.equal(mod.STANDARD_PROMPT_MIDDLE.includes('chat_history'), false);
  assert.deepEqual([...mod.STANDARD_PROMPT_MIDDLE], [
    'world_info_before',
    'persona_description',
    'char_description',
    'char_personality',
    'scenario',
    'world_info_after',
    'dialogue_examples',
    'user_input',
  ]);
});

test('isBuiltinMainStoryBlockedEntry：内置核心词根 + role:assistant + 受管族护栏', async () => {
  const mod = await loadBundle(`export * from './src/unified-statusbar/core/worldbook-entry.ts';`);

  // 1. role: assistant 条目拦截（含 normalized position.role 与 raw role=2）
  assert.deepEqual(
    mod.isBuiltinMainStoryBlockedEntry({ comment: '<场景美化>', position: { role: 'assistant' } }),
    { blocked: true, reason: 'assistant' },
  );
  assert.deepEqual(
    mod.isBuiltinMainStoryBlockedEntry({ comment: '暖场片段', role: 2 }),
    { blocked: true, reason: 'assistant' },
  );
  // 关闭 dropAssistantLore 后放行
  assert.deepEqual(
    mod.isBuiltinMainStoryBlockedEntry({ comment: '<场景美化>', position: { role: 'assistant' } }, { dropAssistantLore: false }),
    { blocked: false },
  );

  // 2. 内置核心词根拦截用户条目（中文子串 + 英文边界）
  for (const name of [
    '正文文风设定',
    'CoT思维链输出',
    'MVU变量初始化',
    'InitVar规则',
    'Status状态面板',
    '检定判断逻辑',
    '叙事格式要求',
  ]) {
    const res = mod.isBuiltinMainStoryBlockedEntry({ comment: name });
    assert.equal(res.blocked, true, `${name} 应被内置词根拦截`);
    assert.equal(res.reason, 'keyword');
  }

  // 3. 普通英文单词不被边界外误伤
  for (const safeName of ['Cottage', 'Ruler of North', '人物档案-苏晴', '青云宗外门设定']) {
    assert.equal(mod.isBuiltinMainStoryBlockedEntry({ comment: safeName }).blocked, false, `${safeName} 不应误伤`);
  }

  // 4. 受管族（UBS- / SeseLedger- / [UBS手机] / TavernDB-）跳过内置词根拦截
  for (const managedName of [
    'UBS-技能-状态检查',
    'SeseLedger-状态表：主角',
    '[UBS手机]消息记录-苏晴',
    'TavernDB-ACU-状态表',
  ]) {
    assert.equal(mod.isBuiltinMainStoryBlockedEntry({ comment: managedName }).blocked, false, `${managedName} 受管族不得误伤`);
  }
});

test('withNativeScanWorldbook：书源默认只放行 primary + 白名单 + assistant/词根/黑名单叠加净化', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  const prevWin = globalThis.window;
  const listeners = new Map();
  const books = {
    主世界书: [
      { uid: 1, comment: '青云宗设定', content: '主世界书设定' },
      { uid: 2, comment: '正文文风规范', content: '只给正文用' },
      { uid: 3, comment: '<场景美化>', position: { role: 'assistant' }, content: '美化 HTML' },
      { uid: 4, comment: 'UBS-技能-状态', content: '受管条目' },
    ],
    外挂附加书: [
      { uid: 10, comment: '附加世界观', content: '附加书内容' },
      { uid: 11, comment: '心之壁认知隔离', content: '附加书内容2' },
    ],
    放行全局书: [
      { uid: 20, comment: '通用修仙百科', content: '允许的全局书' },
    ],
  };

  dom.window.SillyTavern = {
    getContext: () => ({
      eventSource: {
        on(evt, fn) { listeners.set(evt, fn); },
      },
    }),
  };
  dom.window.TavernHelper = {
    getCharWorldbookNames: () => ({ primary: '主世界书', additional: ['外挂附加书'] }),
    getWorldbook: async (name) => books[name] || [],
  };
  globalThis.window = dom.window;

  try {
    const mod = await loadBundle(`export * from './src/unified-statusbar/core/worldbook-entry.ts';`);
    mod.__setBackgroundIsolationForTests({
      blockGlobalLore: true,
      blockAdditionalLore: true,
      dropAssistantLore: true,
      useBuiltinKeywords: true,
      allowedBooks: ['放行全局书'],
    });
    mod.__setEntryBlacklistForTests(['^青云宗']);

    // 注意测试既覆盖带 entry.world 的场景，也覆盖不带 entry.world 时通过 getWorldbook 识别附加书的兜底路径
    const payload = {
      globalLore: [
        { uid: 99, world: '外挂全局书', comment: '#状态栏', content: '全局状态栏' },
        { uid: 20, world: '放行全局书', comment: '通用修仙百科', content: '允许的全局书' },
      ],
      characterLore: [
        { uid: 1, world: '主世界书', comment: '青云宗设定', content: '主世界书设定' },
        { uid: 2, world: '主世界书', comment: '正文文风规范', content: '只给正文用' },
        { uid: 3, world: '主世界书', comment: '<场景美化>', position: { role: 'assistant' }, content: '美化 HTML' },
        { uid: 4, world: '主世界书', comment: 'UBS-技能-状态', content: '受管条目' },
        { uid: 5, comment: '主世界书人物-林汐', content: '无 world 字段的主书条目应保留' },
        // 无 world 字段的附加书条目：走 primary/additional 签名兜底识别并剔除
        { uid: 10, comment: '附加世界观', content: '附加书内容' },
        { uid: 11, world: '外挂附加书', comment: '另一条附加书', content: '有 world 字段也剔除' },
      ],
      chatLore: [
        { uid: 30, world: '聊天外挂书', comment: '聊天附加', content: '应剔除' },
      ],
      personaLore: [
        { uid: 40, comment: '主角个人背景', content: '保留 personaLore 正常条目' },
      ],
    };

    await mod.withNativeScanWorldbook({}, async () => {
      const handler = listeners.get('worldinfo_entries_loaded');
      assert.equal(typeof handler, 'function');
      await handler(payload);
    });

    assert.deepEqual(payload.globalLore.map(e => e.comment), ['通用修仙百科']);
    assert.deepEqual(payload.characterLore.map(e => e.comment), ['UBS-技能-状态', '主世界书人物-林汐']);
    assert.deepEqual(payload.chatLore.map(e => e.comment), []);
    assert.deepEqual(payload.personaLore.map(e => e.comment), ['主角个人背景']);

    const stats = mod.getLastNativeScanStats();
    assert.equal(stats.droppedBySource, 4); // 外挂全局书 + 两条附加书 + chatLore
    assert.equal(stats.droppedAssistant, 1);
    assert.equal(stats.droppedBuiltinKeyword, 1);
    assert.equal(stats.droppedBlacklist, 1);
  } finally {
    globalThis.window = prevWin;
    dom.window.close();
  }
});

test('宅仙 assistant-sources 3.A 口径：保留用户手选世界书范围，仅将内置正文向规则条目跳过（仅列名）', async () => {
  const mod = await loadBundle(`
    export * from './src/unified-statusbar/core/assistant-sources.ts';
    export * from './src/unified-statusbar/core/worldbook-entry.ts';
  `);
  mod.__setBackgroundIsolationForTests({
    blockGlobalLore: true,
    blockAdditionalLore: true,
    dropAssistantLore: true,
    useBuiltinKeywords: true,
    allowedBooks: [],
  });

  const host = {
    getChatKey: () => 'chat-1',
    getCachedSheets: () => [],
    getWorldbookBindings: () => ({ primary: '主书', additional: ['附加设定书'] }),
    getWorldbook: async (name) => {
      if (name === '主书') {
        return [
          { uid: 1, comment: '天枢阁简介', constant: true, enabled: true, content: '天枢阁是修仙宗门。' },
          { uid: 2, comment: 'CoT思维链规范', constant: true, enabled: true, content: 'SECRET_COT_TEXT' },
          { uid: 3, comment: '<场景美化>', constant: true, enabled: true, position: { role: 'assistant' }, content: 'SECRET_HTML' },
        ];
      }
      if (name === '附加设定书') {
        return [
          { uid: 10, comment: '北境风物', constant: true, enabled: true, content: '附加设定书仍应被宅仙读取。' },
        ];
      }
      return [];
    },
    getRawStoryMessages: () => [],
    getMapSnapshot: async () => null,
    getWardrobeSnapshot: () => null,
    getSkillSnapshot: () => null,
    getPlayState: () => null,
    getCycleRecords: () => null,
    getJournalSnapshot: () => null,
    getWorldStateSnapshot: () => null,
    getSettingsSnapshot: () => ({}),
  };

  const result = await mod.readAssistantSources(host, { sources: ['worldbook'], terms: [] });
  const text = result.payloads[0]?.text || '';
  assert.ok(text.includes('天枢阁是修仙宗门'));
  assert.ok(text.includes('附加设定书仍应被宅仙读取'));
  assert.equal(text.includes('SECRET_COT_TEXT'), false);
  assert.equal(text.includes('SECRET_HTML'), false);
  assert.ok(text.includes('CoT思维链规范（正文向规则已跳过）'));
  assert.ok(text.includes('<场景美化>（正文向规则已跳过）'));
});
