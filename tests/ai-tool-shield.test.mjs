import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('..', import.meta.url));

async function loadTs(entry) {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}

async function loadBundle(code) {
  const result = await build({
    absWorkingDir: root,
    stdin: { contents: code, resolveDir: root, loader: 'ts', sourcefile: 'test-bundle.ts' },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}

test('normalizeOutboundMessages：none/merge/semi/strict/single 与多模态/tool_calls 安全边界', async () => {
  const { normalizeOutboundMessages } = await loadTs('src/unified-statusbar/core/ai-tool-shield.ts');

  const raw = [
    { role: 'system', content: '头破限' },
    { role: 'system', content: '设定' },
    { role: 'user', content: '资料' },
    { role: 'user', content: '用户输入' },
    { role: 'system', content: '尾破限' },
  ];

  // none: 原样引用
  assert.equal(normalizeOutboundMessages(raw, 'none'), raw);

  // merge: 保留全部 role，仅合并连续同角色
  const merged = normalizeOutboundMessages(raw, 'merge');
  assert.deepEqual(merged, [
    { role: 'system', content: '头破限\n\n设定' },
    { role: 'user', content: '资料\n\n用户输入' },
    { role: 'system', content: '尾破限' },
  ]);

  // semi: 首条非系统消息之后的 system/developer 转为 user，并全序列合并连续同角色
  const withDev = [
    { role: 'system', content: '头破限' },
    { role: 'user', content: '资料' },
    { role: 'user', content: '用户输入' },
    { role: 'developer', content: '中段dev' },
    { role: 'system', content: '尾破限' },
  ];
  const semi = normalizeOutboundMessages(withDev, 'semi');
  assert.deepEqual(semi, [
    { role: 'system', content: '头破限' },
    { role: 'user', content: '资料\n\n用户输入\n\n中段dev\n\n尾破限' },
  ]);

  // strict: 前置 system 之后第一条对话不是 user 时补占位
  const strict = normalizeOutboundMessages([
    { role: 'system', content: '头' },
    { role: 'assistant', content: '开场白' },
    { role: 'system', content: '尾破限' },
  ], 'strict');
  assert.deepEqual(strict, [
    { role: 'system', content: '头' },
    { role: 'user', content: '[Start a new chat]' },
    { role: 'assistant', content: '开场白' },
    { role: 'user', content: '尾破限' },
  ]);

  // single: 纯文本全部折叠为单条 user
  const single = normalizeOutboundMessages(raw, 'single');
  assert.deepEqual(single, [
    { role: 'user', content: '头破限\n\n设定\n\n资料\n\n用户输入\n\n尾破限' },
  ]);

  // 多模态数组与 tool_calls 不做字符串拼接，仅安全改角色
  const multimodal = [
    { role: 'system', content: '头' },
    { role: 'user', content: [{ type: 'text', text: '看图' }, { type: 'image_url', image_url: { url: 'x' } }] },
    { role: 'system', content: '尾破限' },
  ];
  const semiMm = normalizeOutboundMessages(multimodal, 'semi');
  assert.equal(semiMm.length, 3);
  assert.equal(semiMm[1].role, 'user');
  assert.ok(Array.isArray(semiMm[1].content));
  assert.deepEqual(semiMm[2], { role: 'user', content: '尾破限' });
});

test('scrubGenerateData + createShieldedGenerateRaw：custom_url 指纹、工具剥离、tag 与宿主映射', async () => {
  const {
    buildRequestFingerprint,
    scrubGenerateData,
    createShieldedGenerateRaw,
    tagCustomApiPostProcessing,
  } = await loadTs('src/unified-statusbar/core/ai-tool-shield.ts');

  // 1. custom_url 退化指纹命中（无结构头）
  const customApi = tagCustomApiPostProcessing(
    { apiurl: 'http://192.168.2.8:3001/v1/', model: 'gemini-2.5-flash', source: 'custom' },
    'semi',
  );
  const fp = buildRequestFingerprint({ custom_api: customApi });
  assert.ok(fp && fp.apiurl && fp.model);

  const listeners = new Map();
  const bus = {
    type: 'chat_completion_settings_ready',
    eventSource: {
      on(t, fn) { listeners.set(t, fn); },
      removeListener(t, fn) { if (listeners.get(t) === fn) listeners.delete(t); },
    },
  };

  let capturedPayload = null;
  const shielded = createShieldedGenerateRaw(
    async () => {
      const payload = {
        custom_url: 'http://192.168.2.8:3001/v1',
        model: 'gemini-2.5-flash',
        custom_prompt_post_processing: 'semi_tools',
        tools: [{ type: 'function', function: { name: 'emit_complete_response_x' } }],
        tool_choice: 'auto',
        messages: [
          { role: 'system', content: '头' },
          { role: 'user', content: '你好' },
          { role: 'system', content: '尾破限\n\nCall the `emit_complete_response_x` function exactly once.' },
        ],
      };
      listeners.get('chat_completion_settings_ready')?.(payload);
      capturedPayload = payload;
      return 'ok';
    },
    {},
    bus,
  );

  await shielded({ custom_api: customApi });
  assert.equal('tools' in capturedPayload, false);
  assert.equal('tool_choice' in capturedPayload, false);
  assert.equal(capturedPayload.custom_prompt_post_processing, '');
  assert.deepEqual(capturedPayload.messages, [
    { role: 'system', content: '头' },
    { role: 'user', content: '你好\n\n尾破限' },
  ]);

  // 2. 指纹不命中宿主请求，一个字节不动
  const foreign = {
    reverse_proxy: 'http://other.host/v1',
    model: 'gpt-4o',
    custom_prompt_post_processing: 'semi',
    tools: [{ type: 'function', function: { name: 'keep_me' } }],
    messages: [{ role: 'user', content: 'hi' }, { role: 'system', content: 'tail' }],
  };
  const resForeign = scrubGenerateData(foreign, fp, 'semi');
  assert.equal(resForeign.touched, false);
  assert.equal(foreign.tools.length, 1);
  assert.equal(foreign.custom_prompt_post_processing, 'semi');
  assert.equal(foreign.messages[1].role, 'system');

  // 3. tavern 模式按宿主设置映射（含 single / semi_tools / 空）
  for (const [hostVal, expectedTailRole] of [['semi_tools', 'user'], ['', 'system']]) {
    let seen = null;
    const shieldedHost = createShieldedGenerateRaw(
      async () => {
        const payload = {
          custom_prompt_post_processing: hostVal,
          messages: [
            { role: 'system', content: '结构头前缀测试文本'.repeat(4) },
            { role: 'user', content: '正文' },
            { role: 'system', content: '尾破限' },
          ],
        };
        listeners.get('chat_completion_settings_ready')?.(payload);
        seen = payload;
        return 'ok';
      },
      {},
      bus,
      () => hostVal,
    );
    await shieldedHost({ ordered_prompts: [{ role: 'system', content: '结构头前缀测试文本'.repeat(4) }, 'user_input'] });
    assert.equal(seen.messages.at(-1).role, expectedTailRole);
  }
});

test('config-store + api-config：预设归一化、source 透传、策略登记与 fetchModelList 路径回退', async () => {
  const mod = await loadBundle(`
    export * from './src/unified-statusbar/core/constants.ts';
    export * from './src/unified-statusbar/core/config-store.ts';
    export * from './src/unified-statusbar/core/api-config.ts';
    export * from './src/unified-statusbar/core/ai-tool-shield.ts';
  `);

  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  const prevWin = globalThis.window;
  const prevFetch = globalThis.fetch;
  const mockCalls = [];
  dom.window.TavernHelper = {
    async getModelList(params) {
      mockCalls.push(params.apiurl);
      if (params.apiurl === 'http://192.168.2.8:3001/proxy/gemini') {
        throw new Error('404');
      }
      if (params.apiurl === 'http://192.168.2.8:3001/proxy/gemini/v1') {
        return ['gemini-2.5-flash', 'gemini-2.5-pro'];
      }
      throw new Error('unexpected url: ' + params.apiurl);
    },
  };
  globalThis.window = dom.window;

  try {
    // 归一化旧预设（缺 source / promptPostProcessing 或非法值）
    mod.configureConfigStorage('external', {
      load: async () => ({ state: 'ready', source: 'external' }),
      sync: async () => true,
      read: () => undefined,
      readAll: () => ({
        apiMode: 'custom',
        activeApiPresetId: 'ap_legacy',
        customApiPresets: [
          {
            id: 'ap_legacy',
            name: '旧预设',
            url: 'http://192.168.2.8:3001/v1',
            key: 'k1',
            model: 'gemini-2.5-flash',
            maxTokens: 'unset',
            temperature: 0.7,
            topP: 0,
            topK: 'unset',
            frequencyPenalty: 'unset',
            presencePenalty: 'unset',
            createdAt: 1,
          },
          {
            id: 'ap_native',
            name: '原生Gemini',
            url: 'http://192.168.2.8:3001',
            key: 'k2',
            model: 'gemini-2.5-pro',
            source: 'makersuite',
            promptPostProcessing: 'strict',
            maxTokens: 2048,
            temperature: 'unset',
            topP: 'unset',
            topK: 'unset',
            frequencyPenalty: 'unset',
            presencePenalty: 'unset',
            createdAt: 2,
          },
        ],
      }),
      patch: async () => true,
      replaceAll: async () => true,
      patchCommit: async () => ({ ok: true, confirmed: true, retryable: false }),
      replaceCommit: async () => ({ ok: true, confirmed: true, retryable: false }),
      flush: async () => true,
      status: () => ({ state: 'ready', source: 'external' }),
    });
    mod.invalidateConfigCache();
    const cfg = mod.getConfig();
    assert.equal(cfg.customApiPresets[0].source, 'openai');
    assert.equal(cfg.customApiPresets[0].promptPostProcessing, 'semi');
    assert.equal(cfg.customApiPresets[1].source, 'makersuite');
    assert.equal(cfg.customApiPresets[1].promptPostProcessing, 'strict');

    const legacyApi = mod.getCustomApiConfig();
    assert.equal('source' in legacyApi, false);
    assert.equal(legacyApi.top_p, 'unset');
    assert.equal(mod.getCustomApiPostProcessingMode(legacyApi), 'semi');

    mod.setConfig('activeApiPresetId', 'ap_native');
    const nativeApi = mod.getCustomApiConfig();
    assert.equal(nativeApi.source, 'makersuite');
    assert.equal(mod.getCustomApiPostProcessingMode(nativeApi), 'strict');

    // makersuite 优先直连原生 /v1beta/models，绝不把裸根地址交给 TavernHelper.getModelList（防撞管理页 HTML）
    globalThis.fetch = async (url) => {
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models?key=k3');
      return {
        ok: true,
        async json() { return { models: [{ name: 'models/gemini-2.5-flash' }] }; },
      };
    };
    const nativeModels = await mod.fetchModelList('https://generativelanguage.googleapis.com', 'k3', 'makersuite');
    assert.deepEqual(nativeModels, ['gemini-2.5-flash']);
    assert.deepEqual(mockCalls, []);

    // 若浏览器端 /v1beta/models 失败（如 CORS），再保留子路径并仅用 /v1 调 getModelList（绝不发裸根地址）
    globalThis.fetch = async () => { throw new TypeError('CORS blocked'); };
    const models = await mod.fetchModelList('http://192.168.2.8:3001/proxy/gemini', 'k2', 'makersuite');
    assert.deepEqual(models, ['gemini-2.5-flash', 'gemini-2.5-pro']);
    assert.deepEqual(mockCalls, [
      'http://192.168.2.8:3001/proxy/gemini/v1',
    ]);
  } finally {
    globalThis.window = prevWin;
    globalThis.fetch = prevFetch;
    dom.window.close();
  }
});

test('assistant-runtime：非 openai/custom 源自动退回宿主 generateRaw，openai 源直连折叠尾部 system', async () => {
  const mod = await loadBundle(`
    export * from './src/unified-statusbar/core/assistant-runtime.ts';
    export * from './src/unified-statusbar/core/ai-tool-shield.ts';
  `);
  const { createAssistantRuntime, tagCustomApiPostProcessing } = mod;

  const mkDeps = (customApi) => {
    let streamCalls = 0;
    let hostAnswerCalls = 0;
    let capturedBody = null;
    const book = { version: 1, activeSessionId: '', sessions: [] };
    return {
      get stats() { return { streamCalls, hostAnswerCalls, capturedBody }; },
      deps: {
        getConfig: () => ({ assistantEnabled: true, assistantStreaming: true, assistantContextDepth: 5, assistantPersonaMode: 'default' }),
        isStoreReady: () => true,
        getChatKey: () => 'chat_1',
        validateApi: () => null,
        getApiConfig: () => customApi,
        buildCatalog: async () => [{ id: 'story', title: '剧情', available: true, count: 1 }],
        readSources: async () => ({ payloads: [{ id: 'story', title: '剧情', text: '第1楼' }], failures: [] }),
        loadBook: () => book,
        saveBook: async () => true,
        generateRaw: async (req) => {
          const id = String(req.generation_id || '');
          if (id.includes('planner')) return '["story"]';
          hostAnswerCalls++;
          return '宿主回答<summary>摘要</summary>';
        },
        streamCompletion: async (args) => {
          streamCalls++;
          capturedBody = args.body;
          return '流式回答<summary>摘要</summary>';
        },
        stopGeneration: () => true,
        makeGenerationId: (kind) => `test-${kind}-1`,
        now: () => 1000,
      },
    };
  };

  // makersuite 源 → 不走直连流式（streamCalls=0），走宿主 generateRaw（hostAnswerCalls=1）
  const makerApi = tagCustomApiPostProcessing({ apiurl: 'http://192.168.2.8:3001', model: 'gemini-2.5-flash', source: 'makersuite' }, 'semi');
  const m = mkDeps(makerApi);
  const res1 = await createAssistantRuntime(m.deps).ask({ text: '怎么回事' });
  assert.equal(res1.kind, 'success');
  assert.equal(m.stats.streamCalls, 0);
  assert.equal(m.stats.hostAnswerCalls, 1);

  // openai 源 → 走直连流式且消息折叠后首条非系统消息之后无 system
  const oaiApi = tagCustomApiPostProcessing({ apiurl: 'http://192.168.2.8:3001/v1', model: 'gemini-2.5-flash' }, 'semi');
  const o = mkDeps(oaiApi);
  const res2 = await createAssistantRuntime(o.deps).ask({ text: '怎么回事' });
  assert.equal(res2.kind, 'success');
  assert.equal(o.stats.streamCalls, 1);
  const msgs = o.stats.capturedBody.messages;
  const firstConvIdx = msgs.findIndex(x => x.role !== 'system' && x.role !== 'developer');
  assert.ok(firstConvIdx > 0);
  assert.equal(msgs.slice(firstConvIdx).some(x => x.role === 'system' || x.role === 'developer'), false);
});

test('设置页 API 标签页 UI：API 源与中段系统消息兼容下拉回填、保存与切换/清空复位', async () => {
  const dom = new JSDOM(`<!doctype html><html><body>
    <select id="apiPresetSelect"><option value="">- 选择生成预设 -</option><option value="p1">测试预设</option></select>
    <input id="customApiUrlInput" value="" />
    <input id="customApiKeyInput" value="" />
    <input id="customApiModelInput" value="" />
    <select id="customApiSourceSelect">
      <option value="openai" selected>OpenAI 兼容</option>
      <option value="makersuite">makersuite</option>
      <option value="claude">claude</option>
    </select>
    <select id="customApiPostProcessingSelect">
      <option value="semi" selected>semi</option>
      <option value="strict">strict</option>
      <option value="none">none</option>
    </select>
    <button id="apiPresetUpdateBtn"></button>
  </body></html>`, { url: 'http://localhost/' });
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevEvent = globalThis.Event;
  const prevToastr = globalThis.toastr;
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.Event = dom.window.Event;
  globalThis.toastr = { success() {}, warning() {}, error() {} };
  try {
    const mod = await loadBundle(`
      export * from './src/unified-statusbar/panels/config-panel-tabs/api-tab.ts';
      export * from './src/unified-statusbar/core/config-store.ts';
    `);
    const cfg = mod.getConfig();
    cfg.customApiPresets = [{
      id: 'p1',
      name: '测试预设',
      url: 'http://192.168.2.8:3001',
      key: 'k',
      model: 'gemini-2.5-flash',
      source: 'makersuite',
      promptPostProcessing: 'none',
      maxTokens: 'unset',
      temperature: 'unset',
      topP: 'unset',
      topK: 'unset',
      frequencyPenalty: 'unset',
      presencePenalty: 'unset',
      createdAt: 1,
    }];
    mod.bindApiTab(cfg, () => {});
    const sel = dom.window.document.getElementById('apiPresetSelect');
    sel.value = 'p1';
    sel.dispatchEvent(new dom.window.Event('change'));
    assert.equal(dom.window.document.getElementById('customApiSourceSelect').value, 'makersuite');
    assert.equal(dom.window.document.getElementById('customApiPostProcessingSelect').value, 'none');

    dom.window.document.getElementById('customApiSourceSelect').value = 'claude';
    dom.window.document.getElementById('customApiPostProcessingSelect').value = 'strict';
    dom.window.document.getElementById('apiPresetUpdateBtn').click();
    assert.equal(cfg.customApiPresets[0].source, 'claude');
    assert.equal(cfg.customApiPresets[0].promptPostProcessing, 'strict');
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    globalThis.Event = prevEvent;
    globalThis.toastr = prevToastr;
    dom.window.close();
  }
});

test('scrubGenerateData + createShieldedGenerateRaw：出站剥离 stray assistant 与第三方 extensionPrompts（不动自定义预设自身 assistant）', async () => {
  const mod = await loadBundle(`
    export * from './src/unified-statusbar/core/ai-tool-shield.ts';
  `);

  const listeners = new Map();
  const foreignExt = {
    'some-beautify-ext': { value: '请用HTML卡片输出<场景美化>状态栏面板。' },
    'ub_my_own_inject': { value: '这是状态栏自己的内容不能被误剥。' },
  };
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  const prevWin = globalThis.window;
  dom.window.SillyTavern = {
    getContext: () => ({
      extensionPrompts: foreignExt,
      eventSource: {
        on(t, fn) { listeners.set(t, fn); },
        removeListener(t, fn) { if (listeners.get(t) === fn) listeners.delete(t); },
      },
      eventTypes: { CHAT_COMPLETION_SETTINGS_READY: 'chat_completion_settings_ready' },
      chatCompletionSettings: { custom_prompt_post_processing: 'semi' },
    }),
  };
  globalThis.window = dom.window;

  try {
    let seen = null;
    const shielded = mod.createShieldedGenerateRaw(
      async () => {
        const payload = {
          messages: [
            { role: 'system', content: '结构头前缀测试文本'.repeat(4) },
            { role: 'system', content: '请用HTML卡片输出<场景美化>状态栏面板。' },
            { role: 'system', content: '这是状态栏自己的内容不能被误剥。' },
            { role: 'assistant', content: '用户自定义的合法assistant预填' },
            { role: 'assistant', content: '<场景美化>混入的伪对话5.3k</场景美化>' },
            { role: 'user', content: '任务输入' },
            { role: 'system', content: '尾破限' },
          ],
        };
        listeners.get('chat_completion_settings_ready')?.(payload);
        seen = payload;
        return 'ok';
      },
      {},
    );

    await shielded({
      ordered_prompts: [
        { role: 'system', content: '结构头前缀测试文本'.repeat(4) },
        'world_info_before',
        'user_input',
        { role: 'assistant', content: '用户自定义的合法assistant预填' },
      ],
      user_input: '任务输入',
      max_chat_history: 0,
    });

    const texts = seen.messages.map(m => m.content).join('\n');
    assert.equal(texts.includes('请用HTML卡片输出<场景美化>状态栏面板'), false);
    assert.equal(texts.includes('<场景美化>混入的伪对话5.3k</场景美化>'), false);
    assert.ok(texts.includes('这是状态栏自己的内容不能被误剥'));
    assert.ok(texts.includes('用户自定义的合法assistant预填'));
    // 全局 SillyTavern.extensionPrompts 原对象绝不被篡改
    assert.equal(foreignExt['some-beautify-ext'].value, '请用HTML卡片输出<场景美化>状态栏面板。');
  } finally {
    globalThis.window = prevWin;
    dom.window.close();
  }
});
