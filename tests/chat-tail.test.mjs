import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { JSDOM } from 'jsdom';

const source = await readFile(new URL('../src/unified-statusbar/core/tt-chat-surface.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const { createManagedChatTail, isTtManagedChatSurface } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

function fixture(count = 1000) {
  const dom = new JSDOM('<!doctype html><head></head><body><div id="chat"><div class="style-pins"></div></div></body>');
  const win = dom.window;
  const context = { chat: Array.from({ length: count }, () => ({})) };
  win.SillyTavern = { getContext: () => context };
  win.__TAURITAVERN__ = { api: { chatSurface: { isManagedOwnershipRequired: () => true } } };
  const chat = win.document.getElementById('chat');
  const tail = win.document.createElement('div');
  tail.id = 'ac-statusbar-wrapper';
  tail.innerHTML = '<button>设置</button>';
  win.document.body.append(tail);
  const resizes = new Set();
  win.ResizeObserver = class {
    constructor(callback) { this.callback = callback; }
    observe() { resizes.add(this); }
    disconnect() { resizes.delete(this); }
  };
  const manager = createManagedChatTail(win);
  function message(id) {
    const el = win.document.createElement('div');
    el.className = 'mes';
    el.setAttribute('mesid', String(id));
    el.innerHTML = '<div class="mesAvatarWrapper"><div class="avatar"></div></div><div class="mes_block"><div class="mes_text">正文</div></div>';
    return el;
  }
  function check(host) {
    assert.equal(tail.closest('.mes'), host);
    assert.equal(tail.closest('.mes_text'), null);
    assert.equal(win.document.querySelectorAll('#ac-statusbar-wrapper').length, 1);
    assert.equal(win.document.querySelectorAll('.ub-chat-tail-slot').length, 1);
    assert([...chat.children].every(el => el.matches('.mes, .style-pins, tt-chat-spacer')), '不得增加托管 #chat 的直接子节点');
  }
  return { dom, win, chat, tail, context, manager, message, check, resizes, close() { manager.dispose(); win.close(); } };
}

test('所有权仅由官方 API 决定，未就绪和非虚拟化路径不误判', () => {
  assert.equal(isTtManagedChatSurface({}), false);
  assert.equal(isTtManagedChatSurface({ __TAURITAVERN__: { api: { chatSurface: { isManagedOwnershipRequired: () => false } } } }), false);
  assert.equal(isTtManagedChatSurface({ __TAURITAVERN__: { api: { chatSurface: { isManagedOwnershipRequired() { throw new Error('not ready'); } } } } }), false);
});

test('挂在真实末楼，不把可见投影的最后一楼当成聊天尾部', async () => {
  const f = fixture();
  try {
    f.chat.append(f.message(5), f.message(6));
    f.chat.scrollTop = 345;
    f.manager.sync(f.tail);
    assert.equal(f.tail.parentElement.style.display, 'none');
    assert.equal(f.tail.parentElement.parentElement, f.win.document.body);
    const last = f.message(999);
    f.chat.append(last);
    await settle();
    f.check(last);
    assert.equal(f.chat.scrollTop, 345);
    assert.equal(last.lastElementChild, f.tail.parentElement);
    assert.equal(f.tail.parentElement.style.flexBasis, 'auto');
    assert.equal(f.tail.parentElement.style.width, '100%');
  } finally { f.close(); }
});

test('重建投影、添加/删除末楼和 swipe 后迁移同一实例，保留点击、折叠与内容', async () => {
  const f = fixture();
  try {
    let clicks = 0;
    f.tail.querySelector('button').addEventListener('click', () => clicks++);
    f.tail.classList.add('ub-collapsed');
    let last = f.message(999);
    f.chat.append(last);
    f.manager.sync(f.tail);
    for (let i = 0; i < 20; i++) {
      const next = f.message(999);
      last.replaceWith(next);
      await settle();
      f.check(next);
      assert.equal(last.classList.contains('ub-chat-tail-host'), false);
      last = next;
    }
    last.querySelector('.mes_text').innerHTML = '流式内容更新';
    await settle();
    f.check(last);
    f.context.chat.push({});
    const appended = f.message(1000);
    f.chat.append(appended);
    await settle();
    f.check(appended);
    f.context.chat.pop();
    appended.remove();
    await settle();
    f.check(last);
    assert(f.tail.classList.contains('ub-collapsed'));
    f.tail.querySelector('button').click();
    assert.equal(clicks, 1);
    assert.equal(last.querySelector('.mes_text').textContent, '流式内容更新');
  } finally { f.close(); }
});

test('清空聊天和切换聊天时隐藏停放，新投影出现后恢复且不重复创建', async () => {
  const f = fixture();
  try {
    f.chat.append(f.message(999));
    f.manager.sync(f.tail);
    f.chat.replaceChildren();
    f.context.chat = [];
    await settle();
    assert.equal(f.tail.parentElement.style.display, 'none');
    assert.equal(f.tail.isConnected, true);
    f.context.chat = [{}];
    const next = f.message(0);
    f.chat.append(next);
    await settle();
    f.check(next);
    assert.equal(f.tail.parentElement.style.display, 'block');
  } finally { f.close(); }
});

test('退出跟随模式和卸载释放宿主样式/observer，不再迁移界面', async () => {
  const f = fixture();
  try {
    const last = f.message(999);
    f.chat.append(last);
    f.manager.sync(f.tail);
    f.manager.sync(f.tail);
    assert.equal(f.win.document.head.querySelectorAll('style').length, 1);
    f.manager.sync(null);
    assert.equal(f.tail.parentElement, f.win.document.body);
    assert.equal(last.classList.contains('ub-chat-tail-host'), false);
    assert.equal(last.style.getPropertyValue('--ub-chat-tail-height'), '');
    assert.equal(f.resizes.size, 0);
    assert.equal(f.win.document.querySelector('.ub-chat-tail-slot'), null);
    assert.equal(f.win.document.head.querySelector('style'), null);
    f.chat.replaceChildren(f.message(999));
    await settle();
    assert.equal(f.tail.parentElement, f.win.document.body);
  } finally { f.close(); }
});
