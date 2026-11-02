/** TauriTavern ChatSurface v1 的所有权判断；API 存在不等于虚拟化已开启。 */
export function isTtManagedChatSurface(win: Window = window): boolean {
  try {
    const tt = (win as unknown as Record<string, any>).__TAURITAVERN__;
    return tt?.api?.chatSurface?.isManagedOwnershipRequired?.() === true;
  } catch {
    return false;
  }
}

/**
 * TT fff9af0 的 bounded layout 禁止额外的 #chat 直接子元素，且没有全局 footer API。
 * 全局栏放在真实末楼的独立子容器，不进入 .mes_text，也不修改宿主投影或滚动位置。
 * 这不是 per-message renderer；不尝试在首次投影后注册 ChatSurface participant。
 */
export function createManagedChatTail(win: Window = window) {
  const doc = win.document;
  let tail: HTMLElement | null = null;
  let slot: HTMLDivElement | null = null;
  let chat: HTMLElement | null = null;
  let host: HTMLElement | null = null;
  let observer: MutationObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let style: HTMLStyleElement | null = null;

  function syncHeight(): void {
    if (host && slot) host.style.setProperty('--ub-chat-tail-height', slot.getBoundingClientRect().height + 'px');
  }

  function releaseHost(): void {
    host?.classList.remove('ub-chat-tail-host');
    host?.style.removeProperty('--ub-chat-tail-height');
  }

  function observe(): void {
    observer?.disconnect();
    if (chat) observer?.observe(chat, { childList: true });
    if (host) observer?.observe(host, { attributes: true, attributeFilter: ['mesid'] });
  }

  function place(): void {
    if (!tail || !slot) return;
    const nextChat = doc.getElementById('chat');
    let lastId = -1;
    try {
      const context = (win as any).SillyTavern?.getContext?.();
      if (Array.isArray(context?.chat)) lastId = context.chat.length - 1;
    } catch { /* 宿主正在切换聊天。 */ }
    const nextHost = lastId < 0 ? null
      : nextChat?.querySelector<HTMLElement>(':scope > .mes[mesid="' + lastId + '"]') ?? null;
    const changed = chat !== nextChat || host !== nextHost;
    if (host !== nextHost) releaseHost();
    chat = nextChat;
    host = nextHost;
    if (host) {
      host.classList.add('ub-chat-tail-host');
      slot.style.display = 'block';
      if (slot.parentElement !== host || host.lastElementChild !== slot) host.appendChild(slot);
    } else {
      // 清空/重建间隙保留同一个 UI 和监听器，避免 loader 重建壳或短暂浮到页面顶部。
      slot.style.display = 'none';
      if (slot.parentElement !== doc.body) doc.body.appendChild(slot);
    }
    if (tail.parentElement !== slot) slot.appendChild(tail);
    if (changed) {
      if (typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(syncHeight);
      else syncHeight();
      observe();
    }
  }

  function dispose(): void {
    observer?.disconnect();
    observer = null;
    resizeObserver?.disconnect();
    resizeObserver = null;
    releaseHost();
    if (tail && slot?.contains(tail)) doc.body.appendChild(tail);
    slot?.remove();
    style?.remove();
    tail = null;
    slot = null;
    chat = null;
    host = null;
    style = null;
  }

  function sync(element: HTMLElement | null): void {
    if (!element) {
      dispose();
      return;
    }
    if (tail && tail !== element) dispose();
    tail = element;
    if (!slot) {
      slot = doc.createElement('div');
      slot.className = 'ub-chat-tail-slot';
      slot.style.cssText = 'display:none;flex:0 0 auto;width:100%;min-width:0;grid-column:1 / -1;order:1;';
      style = doc.createElement('style');
      // 宽度与主轴基线分开：flex-basis:100% 会按整楼高度撑出空档，而非按状态栏内容换行。
      style.textContent = '#chat > .mes.ub-chat-tail-host{flex-wrap:wrap}'
        + '#chat > .mes.ub-chat-tail-host > .mes_block{flex:1;min-width:0}'
        + '#chat > .mes.ub-chat-tail-host > .swipe_left{bottom:calc(var(--ub-chat-tail-height,0px) + var(--swipeCounterHeight) + var(--swipeCounterMargin))}'
        + '#chat > .mes.ub-chat-tail-host > .swipeRightBlock{bottom:var(--ub-chat-tail-height,0px)}';
      doc.head.appendChild(style);
      // swipe 按钮相对整楼底部定位，必须扣回全局栏高度，仍留在正文旁。
      resizeObserver = typeof (win as any).ResizeObserver === 'function'
        ? new (win as any).ResizeObserver(syncHeight) : null;
      resizeObserver?.observe(slot);
      // 只看投影结构和当前末楼编号，不监听流式正文，不扫描历史。
      observer = new (win as any).MutationObserver(place);
    }
    place();
  }

  return { sync, dispose };
}
