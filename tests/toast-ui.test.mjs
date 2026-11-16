import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

async function loadTs(path) {
  const result = await build({
    absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
    entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'esm',
    target: 'node22', logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}

async function loadAiNotifyBundle() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents: "export * from './src/unified-statusbar/core/ai-activity-notify.ts'; export * from './src/unified-statusbar/core/ai-activity.ts';",
      resolveDir: root, loader: 'ts', sourcefile: 'ai-notify-bundle.ts',
    },
    bundle: true, write: false, platform: 'node', format: 'esm', target: 'node22', logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}

test('notify-base CSS：半透明皮肤、紧凑尺寸与放大关闭到后台 × 按钮热区', async () => {
  const { notifyBaseCSS } = await loadTs('src/unified-statusbar/styles/notify-base.ts');
  assert(notifyBaseCSS.includes('--ubn-bg1:rgba(255,255,255,.64)'));
  assert(notifyBaseCSS.includes('--ubn-bg1:rgba(42,48,62,.58)'));
  assert(notifyBaseCSS.includes('color-mix(in srgb,var(--mn-card) 64%,transparent)'));
  assert(notifyBaseCSS.includes('color-mix(in srgb,var(--bridge-panel) 64%,transparent)'));
  assert(notifyBaseCSS.includes('max-width:258px'));
  assert(notifyBaseCSS.includes('padding:5px 40px 6px 26px !important'));
  assert(notifyBaseCSS.includes('padding:5px 40px 6px 25px !important'));
  assert(notifyBaseCSS.includes('font-size:11.5px'));
  assert(notifyBaseCSS.includes('font-size:11px'));
  assert(notifyBaseCSS.includes('#toast-container.ub-notify-container .toast-close-button{'));
  assert(notifyBaseCSS.includes('#toast-container.ub-notify-container .toast.ub-persist .toast-close-button{'));
  assert(notifyBaseCSS.includes('#toast-container.ub-notify-container .toast.acu-toast .toast-close-button{'));
  assert(notifyBaseCSS.includes('width:30px !important; height:30px !important'));
  assert(notifyBaseCSS.includes('.toast-close-button::after{'));
});

test('achievement-notify：半透明背景、缩小卡片与放大关闭按钮', async () => {
  const { showAchievementNotify } = await loadTs('src/unified-statusbar/renderers/achievement-notify.ts');
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost' });
  const prev = { window: globalThis.window, document: globalThis.document };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  try {
    showAchievementNotify([{ id: 'ach_test', name: '测试成就', cat: '测试', ts: 1 }], 'ios', () => {});
    const styleEl = dom.window.document.getElementById('ub-ach-notify-css');
    assert(styleEl, '成就样式应已注入');
    const css = styleEl.textContent || '';
    assert(css.includes('backdrop-filter:blur(10px)'));
    assert(css.includes('.ub-an-card .ub-an-close{position:absolute;top:4px;right:4px;width:28px;height:28px'));
    assert(css.includes('.ub-an-card .ub-an-close::after{'));
    assert(css.includes('.ub-an-card.r0{'));
    assert(css.includes('width:196px;padding:8px 34px 8px 11px'));
  } finally {
    globalThis.window = prev.window;
    globalThis.document = prev.document;
    dom.window.close();
  }
});

test('ai-activity-notify：点关闭 ×（及安全边沿）不触发任务中止并关闭通知，单开/原版注入兜底样式', async () => {
  const { initAiActivityNotify, _resetAiActivityNotifyForTest, beginAiActivity } = await loadAiNotifyBundle();
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="toast-container"></div></body></html>', { url: 'http://localhost' });
  const prev = { window: globalThis.window, document: globalThis.document, MouseEvent: globalThis.MouseEvent };
  let aborted = 0;
  let closeClicks = 0;
  let lastOpts = null;
  dom.window.toastr = {
    info(msg, title, opts) {
      lastOpts = opts;
      const el = dom.window.document.createElement('div');
      el.className = 'toast toast-info ' + (opts?.extraClasses || '');
      const closeBtn = dom.window.document.createElement('button');
      closeBtn.className = 'toast-close-button';
      closeBtn.textContent = '×';
      closeBtn.getBoundingClientRect = () => ({ left: 220, top: 2, right: 250, bottom: 32, width: 30, height: 30 });
      closeBtn.addEventListener('click', () => { closeClicks++; });
      const msgDiv = dom.window.document.createElement('div');
      msgDiv.className = 'toast-message';
      msgDiv.textContent = msg;
      el.append(closeBtn, msgDiv);
      dom.window.document.getElementById('toast-container').appendChild(el);
      return {
        0: el,
        find(sel) {
          const hit = el.querySelector(sel);
          return { get: () => hit };
        },
        remove() { el.remove(); },
      };
    },
    clear(el) { el?.[0]?.remove?.(); },
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.MouseEvent = dom.window.MouseEvent;
  try {
    _resetAiActivityNotifyForTest();
    initAiActivityNotify();
    const handle = beginAiActivity({
      label: '世界演化',
      phase: 'requesting',
      chatKey: '',
      cancelable: true,
      cancel() { aborted++; },
    });
    assert.equal(lastOpts?.extraClasses, 'ub-progress-toast');
    const fallbackCss = dom.window.document.getElementById('ub-progress-toast-fallback-css');
    assert(fallbackCss, '未加载 notify-base 时应注入兜底样式');
    assert((fallbackCss.textContent || '').includes('width:30px !important; height:30px !important'));

    const toastNode = dom.window.document.querySelector('#toast-container .toast');
    const closeBtn = toastNode.querySelector('.toast-close-button');
    assert.equal(closeBtn.getAttribute('aria-label'), '只关闭通知（任务在后台继续）');
    // 点关闭 ×：绝不中止
    closeBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 235, clientY: 16 }));
    assert.equal(aborted, 0);
    assert.equal(closeClicks, 1);
    // 点关闭 × 左下角 6px 安全缓冲带：转调关闭且绝不中止
    toastNode.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 215, clientY: 36 }));
    assert.equal(aborted, 0);
    assert.equal(closeClicks, 2);
    // 点 toast 正文区域：触发中止
    toastNode.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 40, clientY: 18 }));
    assert.equal(aborted, 1);
    handle.end();
  } finally {
    _resetAiActivityNotifyForTest();
    globalThis.window = prev.window;
    globalThis.document = prev.document;
    globalThis.MouseEvent = prev.MouseEvent;
    dom.window.close();
  }
});

test('env.getToastr & planToastOneline：状态栏所有 toast（含报错）自动加「状态栏」前缀且不污染原生对象', async () => {
  const { getToastr, prefixToastTitle } = await loadTs('src/unified-statusbar/core/env.ts');
  const { planToastOneline } = await loadTs('src/unified-statusbar/styles/notify-base.ts');
  assert.equal(prefixToastTitle(''), '状态栏');
  assert.equal(prefixToastTitle('日历生成错误'), '状态栏 · 日历生成错误');
  assert.equal(prefixToastTitle('状态栏 · 地图'), '状态栏 · 地图');
  assert.equal(prefixToastTitle('瑟瑟灵感状态栏 · 测试'), '状态栏 · 测试');
  assert.equal(planToastOneline('状态栏', '状态栏已同步', { persist: false, type: 'info' }).mode, 'none');

  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  const prevWin = globalThis.window;
  const calls = [];
  const rawToastr = {
    options: { timeOut: 3000 },
    error(msg, title) { calls.push(['error', msg, title]); },
    warning(msg, title) { calls.push(['warning', msg, title]); },
    info(msg, title) { calls.push(['info', msg, title]); },
    success(msg, title) { calls.push(['success', msg, title]); },
  };
  dom.window.toastr = rawToastr;
  globalThis.window = dom.window;
  try {
    const wrapped = getToastr();
    wrapped.error('空回', '日历生成错误');
    wrapped.warning('未就绪');
    wrapped.info('完成', '状态栏 · 地图');
    rawToastr.error('外部错误', '外部插件');
    assert.deepEqual(calls, [
      ['error', '空回', '状态栏 · 日历生成错误'],
      ['warning', '未就绪', '状态栏'],
      ['info', '完成', '状态栏 · 地图'],
      ['error', '外部错误', '外部插件'],
    ]);
  } finally {
    globalThis.window = prevWin;
    dom.window.close();
  }
});
