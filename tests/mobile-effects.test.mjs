import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';
import jquery from 'jquery';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = new URL('..', import.meta.url).pathname;

async function loadDrag() {
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents: "export { bindFloatingDrag, dragJustEnded, readSavedPos } from './src/unified-statusbar/chrome/floating-drag.ts';",
      resolveDir: root, loader: 'ts', sourcefile: 'drag-test.ts',
    },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}

function pointer(win, el, type, x, y) {
  const event = new win.Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { clientX: x, clientY: y, pointerId: 1 });
  el.dispatchEvent(event);
}

function readEvents($, element) {
  return Object.values($._data(element, 'events') || {}).flat();
}

test('真实 floating-drag：跟手、右缘吸附、旧格式存档与拖后吞点击', async () => {
  const { bindFloatingDrag, dragJustEnded, readSavedPos } = await loadDrag();
  const dom = new JSDOM('<button id="ball"></button>', { url: 'http://localhost', pretendToBeVisual: true });
  const old = { window: globalThis.window, localStorage: globalThis.localStorage };
  globalThis.window = dom.window;
  globalThis.localStorage = dom.window.localStorage;
  try {
    Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
    Object.defineProperty(dom.window, 'innerHeight', { value: 792, configurable: true });
    const ball = dom.window.document.getElementById('ball');
    ball.setPointerCapture = () => {};
    let left = 100, top = 100, dragging = false, snapped = null;
    ball.getBoundingClientRect = () => {
      left = Number.parseFloat(ball.style.left) || left;
      top = Number.parseFloat(ball.style.top) || top;
      return { left, top, width: 48, height: 48, right: left + 48, bottom: top + 48 };
    };
    bindFloatingDrag(ball, ball, 'statusbar-fixed-btn-pos', () => 48, () => 48, {
      onDragging() { dragging = true; },
      onSnap(edge) { snapped = edge; },
    });
    pointer(dom.window, ball, 'pointerdown', 120, 120);
    pointer(dom.window, ball, 'pointermove', 180, 200);
    assert.equal(ball.style.left, '160px', 'pointermove 直接跟手，无追赶动画');
    assert.equal(ball.style.top, '180px');
    assert.equal(dragging, true);
    pointer(dom.window, ball, 'pointermove', 300, 320);
    pointer(dom.window, ball, 'pointerup', 300, 320);
    assert.equal(ball.style.left, '312px');
    assert.equal(ball.style.top, '300px');
    assert.equal(snapped, 'right');
    assert.deepEqual(readSavedPos('statusbar-fixed-btn-pos'), { x: 312, y: 300 });
    assert.equal(dragJustEnded(), true);
  } finally {
    if (old.window === undefined) delete globalThis.window; else globalThis.window = old.window;
    if (old.localStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = old.localStorage;
    dom.window.close();
  }
});

test('真实状态栏构建：手机不注册 ac-book/ac-effects/ac-glow', async () => {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', error => {
    if (!String(error.message).includes('Could not parse CSS stylesheet')) errors.push(error.message);
  });
  vc.on('error', (...args) => errors.push(args.map(value => value?.message || String(value)).join(' ').slice(0, 600)));
  const dom = new JSDOM('<!doctype html><body><div id="extensions_settings"></div><div id="extensions_settings2"></div><div id="sheld"><div id="chat"></div></div><form id="send_form"></form></body>', {
    url: 'http://localhost:8000', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc,
  });
  const win = dom.window;
  Object.defineProperty(win, 'innerWidth', { value: 360, configurable: true });
  Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 5, configurable: true });
  const events = new Map();
  const eventSource = {
    on(name, fn) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn); },
    off(name, fn) { events.get(name)?.delete(fn); },
    once(name, fn) { const cb = (...args) => { this.off(name, cb); fn(...args); }; this.on(name, cb); },
    async emit(name, ...args) { for (const fn of events.get(name) || []) await fn(...args); },
  };
  const context = {
    chat: [], chatId: '', characterId: undefined, groupId: null, characters: [], chatMetadata: {},
    extensionSettings: {}, eventSource, eventTypes: new Proxy({}, { get: (_, name) => name }),
    getRequestHeaders: () => ({ 'Content-Type': 'application/json' }),
    saveSettingsDebounced() {}, async saveMetadata() {}, name1: 'User', name2: '',
  };
  let aiRequests = 0;
  const files = new Map();
  win.SillyTavern = { getContext: () => context };
  win.$ = win.jQuery = jquery(win);
  win.TextEncoder = TextEncoder;
  win.TextDecoder = TextDecoder;
  win.structuredClone = structuredClone;
  win.toastr = Object.fromEntries(['info', 'warning', 'error', 'success', 'clear', 'remove'].map(name => [name, () => win.$('<div>')]));
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  win.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  win.TavernHelper = {
    generateRaw: async () => { aiRequests++; throw new Error('模拟环境禁止 AI 请求'); },
    generate: async () => { aiRequests++; throw new Error('模拟环境禁止 AI 请求'); },
    injectPrompts() {}, uninjectPrompts() {}, stopGenerationById() {},
    getWorldbook: async () => [], replaceWorldbook: async () => {}, getWorldbookNames: () => [],
    getCharWorldbookNames: () => ({ primary: null, additional: [] }),
    getTavernRegexes: () => [], replaceTavernRegexes: async () => {},
    getVariables: () => ({}), getAllVariables: () => ({}),
    getCurrentCharacterName: () => '', getLastMessageId: () => -1,
    getChatMessages: () => [], substitudeMacros: value => value,
  };
  win.fetch = async (input, options = {}) => {
    const url = new URL(String(input), win.location.href);
    let status = 200, data = {};
    if (url.pathname.startsWith('/user/files/')) {
      const stored = files.get(url.pathname);
      if (stored === undefined) status = 404; else data = stored;
    } else if (url.pathname === '/api/files/upload') {
      const payload = JSON.parse(options.body);
      const file = `/user/files/${payload.name}`;
      files.set(file, JSON.parse(Buffer.from(payload.data, 'base64').toString('utf8')));
      data = { path: file };
    } else if (url.pathname === '/api/files/verify') {
      data = Object.fromEntries(JSON.parse(options.body).urls.map(file => [file, files.has(file)]));
    } else status = 404;
    return { ok: status === 200, status, statusText: status === 404 ? 'Not Found' : 'OK', json: async () => data, text: async () => JSON.stringify(data) };
  };
  try {
    const wrapper = win.document.createElement('div');
    wrapper.id = 'ac-statusbar-wrapper';
    wrapper.innerHTML = await readFile(new URL('../dist/statusbar.html', import.meta.url), 'utf8');
    win.document.body.append(wrapper);
    const bundle = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
    const { code } = await transform(bundle, { format: 'iife', loader: 'js', target: 'es2022' });
    win.eval(code);
    await new Promise(resolve => setTimeout(resolve, 500));
    const docEvents = readEvents(win.$, win.document);
    assert.equal(docEvents.some(event => event.namespace === 'ac-glow'), false, '手机不得注册 mousemove.ac-glow');
    const acEvents = readEvents(win.$, win.document.getElementById('ac-content'));
    assert.equal(acEvents.some(event => event.namespace === 'ac-book'), false, '手机不得注册 .ac-book');
    const minimal = win.document.querySelector('.minimal-container');
    const minEvents = minimal ? readEvents(win.$, minimal) : [];
    assert.equal(minEvents.some(event => event.namespace === 'ac-effects'), false, '手机不得注册 .ac-effects');
    assert.equal(minEvents.some(event => event.namespace === 'tooltip'), false, '手机不得注册 mouseenter/mouseleave.tooltip');
    assert.equal(win.document.querySelectorAll('.mouse-glow,.click-heart,.click-text').length, 0);
    assert(wrapper.classList.contains('ub-anim-off'));
    assert.equal(win.__ub_statusbar_booted, true);
    assert.equal(aiRequests, 0);
    assert.deepEqual(errors, []);
  } finally {
    await win.__SL_DISPOSE__?.();
    win.close();
  }
});
