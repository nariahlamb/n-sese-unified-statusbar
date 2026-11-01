/**
 * 怪盗手记（代码键沿用 bridge，保证旧配置与各弹窗 style === 'bridge' 分支不失效）
 *
 * 护眼 P5 风：米灰纸底 + 炭灰描边 + 暗红点缀 + 暗金数值，浅深两档。
 * 全库弹窗只消费 --bridge-* 变量与 bridge-* 结构类；--bridge-screen 系列在本主题
 * 语义为「炭灰标签底」，浅深两档都保持深色，供各弹窗的标题条/徽记复用。
 */
import { baseCSS } from './base';

const bridgeCoreCSS = /* css */ `
#ac-statusbar-wrapper,
:where(#ac-statusbar-wrapper *){margin:0;padding:0;box-sizing:border-box}

:root{
  /* U38③：全局语义色补齐（与 ancient 同族；深色组内字面量重定义） */
  --ub-success:#4F7A52;--ub-warning:#8F6E28;--ub-danger:#A8392F;
  --bridge-bg:#ede6da;
  --bridge-panel:#f8f4ec;
  --bridge-panel-2:#efe8dc;
  --bridge-panel-3:#e4dbcc;
  --bridge-panel-alt:#f3eee4;
  --bridge-panel-inset:#e8e0d2;
  --bridge-line:#cbbfad;
  --bridge-line-strong:#2f2a2c;
  --bridge-line-soft:rgba(47,42,44,.12);
  --bridge-signal:#b0413a;
  --bridge-signal-contrast:#fbf7f0;
  --bridge-signal-soft:rgba(176,65,58,.11);
  --bridge-alert:#97762c;
  --bridge-warn:var(--bridge-alert);
  --bridge-alert-soft:rgba(151,118,44,.13);
  --bridge-danger:#a8323a;
  --bridge-danger-soft:rgba(168,50,58,.11);
  --bridge-text:#2b2729;
  --bridge-muted:#6f6762;
  --bridge-text-muted:var(--bridge-muted);
  --bridge-shadow:rgba(43,39,41,.16);
  --bridge-shadow-soft:rgba(43,39,41,.09);
  --bridge-grid:rgba(43,39,41,.075);
  --bridge-stripe:rgba(176,65,58,.07);
  --bridge-glass:rgba(248,244,236,.94);
  --bridge-screen:#2d292b;
  --bridge-screen-text:#f4eee4;
  --bridge-screen-muted:#b7aca2;
  --bridge-offset:rgba(176,65,58,.55);
  --bridge-knob:#fbf8f2;
  --bridge-font-ui:"Noto Sans SC","PingFang SC","HarmonyOS Sans SC","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;
  --bridge-font-data:"Bahnschrift","DIN Alternate","Noto Sans SC","PingFang SC","Microsoft YaHei UI",sans-serif;
  --bridge-radius:5px;
  --bg-color:var(--bridge-bg);
  --text-color:var(--bridge-text);
  --text:var(--bridge-text);
  --text-sub:var(--bridge-text);
  --text-muted:var(--bridge-muted);
  --text-soft:var(--bridge-muted);
  --border-color:var(--bridge-line);
  --secondary-text:var(--bridge-muted);
  --divider:var(--bridge-line);
  --divider-light:var(--bridge-line-soft);
  --card:var(--bridge-panel);
  --card-light:var(--bridge-panel-alt);
  --card-deep:var(--bridge-panel-3);
  --card-bg:var(--bridge-panel);
  --card-border:var(--bridge-line);
  --accent:var(--bridge-signal);
  --accent-deep:var(--bridge-signal);
  --accent-soft:var(--bridge-signal-soft);
  --accent-bg:var(--bridge-signal-soft);
  --accent-bg-faint:var(--bridge-signal-soft);
  --accent-bg-hover:var(--bridge-signal-soft);
  --danger:var(--bridge-danger);
  --bg-alt:var(--bridge-panel-2);
  --ub-overlay-bg:rgba(36,31,33,.38);
  --ub-scrollbar-thumb:var(--bridge-line);
  --ub-scrollbar-thumb-hover:var(--bridge-signal);
  --ub-text-muted:var(--bridge-muted);
  --ub-bg-card:var(--bridge-panel);
  /* 日历兄弟弹窗（长按额外要求 / 事件编辑）挂在 #panelOverlay 直下、不在 .cal-theme-* 内，
     够不到 calendar-base.ts 的弹窗级桥接（bridge 那条还要求 .calendar-popup 祖先）→ 主题级补一份 */
  --ub-text:var(--bridge-text);--ub-divider:var(--bridge-line);--ub-accent:var(--bridge-signal);--ub-hover-bg:var(--bridge-panel-alt);
  --ub-popup-radius:6px;
  --ub-popup-shadow:4px 4px 0 var(--bridge-offset),0 14px 36px var(--bridge-shadow);
  --ub-popup-border:2px solid var(--bridge-line-strong);
  --ub-popup-bg:var(--bridge-panel);
  --ub-popup-head-bg:var(--bridge-panel-2);
  --ub-popup-head-border:1px solid var(--bridge-line);
  --ub-btn-radius:4px;
  --ub-toggle-width:44px;
  --ub-toggle-height:24px;
  --ub-toggle-knob:18px;
  --ub-ft-ring-start:var(--bridge-signal);
  --ub-ft-ring-end:var(--bridge-alert);
  --ub-ft-ring-glow:rgba(176,65,58,.24);
  --portrait-bg:var(--bridge-panel-2);
  --portrait-empty-color:var(--bridge-muted);
  --portrait-border:var(--bridge-line-strong);
  --portrait-radius:4px;
}

.statusbar-wrapper.style-bridge,
.bridge-container{
  color-scheme:light;
}

.statusbar-wrapper.style-bridge.dark,
#ac-content.dark .bridge-container,
.bridge-container.dark-mode,
body.dark-mode,
.panel-overlay.dark,
.settings-overlay.dark,
.nsfw-overlay.dark,
.ub-decision-overlay.dark,
#ubDbRepairOverlay.dark{
  /* U38③：语义色深色档（字面量重定义） */
  --ub-success:#86B08A;--ub-warning:#CDA65A;--ub-danger:#E0756B;
  --bridge-bg:#1b1819;
  --bridge-panel:#252123;
  --bridge-panel-2:#2d282a;
  --bridge-panel-3:#373032;
  --bridge-panel-alt:#211d1f;
  --bridge-panel-inset:#191617;
  --bridge-line:#463e40;
  --bridge-line-strong:#a99d92;
  --bridge-line-soft:rgba(236,228,216,.09);
  --bridge-signal:#c9514a;
  --bridge-signal-contrast:#f6efe6;
  --bridge-signal-soft:rgba(201,81,74,.16);
  --bridge-alert:#c8a052;
  --bridge-warn:var(--bridge-alert);
  --bridge-alert-soft:rgba(200,160,82,.14);
  --bridge-danger:#de6a62;
  --bridge-danger-soft:rgba(222,106,98,.15);
  --bridge-text:#e9e1d5;
  --bridge-muted:#a4988e;
  --bridge-text-muted:var(--bridge-muted);
  --bridge-shadow:rgba(0,0,0,.42);
  --bridge-shadow-soft:rgba(0,0,0,.22);
  --bridge-grid:rgba(236,228,216,.05);
  --bridge-stripe:rgba(201,81,74,.09);
  --bridge-glass:rgba(37,33,35,.95);
  --bridge-screen:#121011;
  --bridge-screen-text:#ece4d8;
  --bridge-screen-muted:#9a8f86;
  --bridge-offset:rgba(201,81,74,.6);
  --bridge-knob:#8a7f77;
  --bg-color:var(--bridge-bg);
  --text-color:var(--bridge-text);
  --border-color:var(--bridge-line);
  --secondary-text:var(--bridge-muted);
  --divider:var(--bridge-line);
  --divider-light:var(--bridge-line-soft);
  --card:var(--bridge-panel);
  --card-bg:var(--bridge-panel);
  --card-light:var(--bridge-panel-alt);
  --card-deep:var(--bridge-panel-3);
  --card-border:var(--bridge-line);
  --text:var(--bridge-text);
  --text-sub:var(--bridge-text);
  --text-muted:var(--bridge-muted);
  --text-soft:var(--bridge-muted);
  --bg-alt:var(--bridge-panel-2);
  --accent:var(--bridge-signal);
  --accent-deep:var(--bridge-signal);
  --accent-soft:var(--bridge-signal-soft);
  --accent-bg:var(--bridge-signal-soft);
  --accent-bg-faint:var(--bridge-signal-soft);
  --accent-bg-hover:var(--bridge-signal-soft);
  --danger:var(--bridge-danger);
  --ub-overlay-bg:rgba(0,0,0,.58);
  --ub-scrollbar-thumb:var(--bridge-line);
  --ub-scrollbar-thumb-hover:var(--bridge-signal);
  --ub-text-muted:var(--bridge-muted);
  --ub-bg-card:var(--bridge-panel);
  /* 日历兄弟弹窗变量·深色（字面量兜底；:root 处已按浅色完成替换，深色必须重声明，见 ios.ts 同款注释） */
  --ub-text:var(--bridge-text,#e9e1d5);--ub-divider:var(--bridge-line,#463e40);--ub-accent:var(--bridge-signal,#c9514a);--ub-hover-bg:var(--bridge-panel-alt,#211d1f);
  --ub-popup-shadow:4px 4px 0 var(--bridge-offset),0 18px 44px rgba(0,0,0,.48);
  --ub-popup-border:2px solid var(--bridge-line-strong);
  --ub-popup-bg:var(--bridge-panel);
  --ub-popup-head-bg:var(--bridge-panel-2);
  --ub-popup-head-border:1px solid var(--bridge-line);
  --ub-ft-ring-start:var(--bridge-signal);
  --ub-ft-ring-end:var(--bridge-alert);
  --ub-ft-ring-glow:rgba(201,81,74,.26);
  --portrait-bg:var(--bridge-panel-2);
  --portrait-empty-color:var(--bridge-muted);
  --portrait-border:var(--bridge-line);
  color-scheme:dark;
}

/* Detached overlays are moved under body, so the active theme must provide their
   complete geometry instead of relying on another theme's stylesheet. */
.nsfw-overlay,
.panel-overlay,
.settings-overlay{
  position:fixed;
  top:0;
  left:0;
  width:100%;
  height:100vh;height:100dvh;
  box-sizing:border-box;
  display:none;
  align-items:center;
  justify-content:center;
  padding:max(8px,var(--safe-top)) max(8px,var(--safe-right)) max(8px,var(--safe-bottom)) max(8px,var(--safe-left));
  overflow:hidden;
  background:var(--ub-overlay-bg);
  backdrop-filter:blur(3px);
}
.nsfw-overlay,.panel-overlay{z-index:10000}
.settings-overlay{z-index:10002}
.nsfw-overlay.show,
.panel-overlay.show,
.settings-overlay.show{display:flex}

.panel-popup,
.settings-popup{
  position:relative;
  min-width:0;
  color:var(--bridge-text);
  background:var(--bridge-panel);
  border:var(--ub-popup-border);
  border-radius:var(--ub-popup-radius);
  box-shadow:var(--ub-popup-shadow);
  font-family:var(--bridge-font-ui);
  font-variant-numeric:tabular-nums;
}
.panel-popup,
.settings-popup{display:flex;flex-direction:column;overflow:hidden}

.panel-popup-head,
.settings-popup-head{
  position:relative;
  z-index:2;
  display:flex;
  align-items:center;
  gap:10px;
  flex:0 0 auto;
  min-width:0;
  min-height:40px;
  padding:7px 10px;
  color:var(--bridge-text);
  background:var(--bridge-panel-2);
  border-bottom:2px solid var(--bridge-line-strong);
}
.panel-popup-title,
.settings-popup-title{
  min-width:0;
  flex:1 1 auto;
  color:var(--bridge-text);
  font-size:var(--ub-popup-font-title,14px);
  font-weight:900;
  letter-spacing:.06em;
  overflow-wrap:anywhere;
}
.panel-popup-close,
.panel-popup-close,
.panel-popup-back,
.settings-popup-close,
.panel-popup-warehouse-toggle{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:28px;
  min-height:28px;
  flex:0 0 auto;
  padding:3px 8px;
  color:var(--bridge-text);
  background:var(--bridge-panel);
  border:1.5px solid var(--bridge-line);
  border-radius:4px;
  font:inherit;
  cursor:pointer;
}
.panel-popup-close:hover,
.panel-popup-back:hover,
.settings-popup-close:hover,
.panel-popup-warehouse-toggle:hover{color:var(--bridge-signal);border-color:var(--bridge-signal);background:var(--bridge-signal-soft)}

.panel-popup-body,
.settings-popup-body{min-width:0;padding:10px}
.panel-popup-body,
.settings-popup-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.detail-row{display:flex;gap:10px;padding:6px 0;border-bottom:1px dashed var(--bridge-line);font-size:12px;line-height:1.6}
.detail-row:last-child{border-bottom:0}
.detail-row .dl{min-width:4em;flex:0 0 auto;color:var(--bridge-muted);font-size:11.5px;font-weight:800}
.detail-row .dv{min-width:0;flex:1;color:var(--bridge-text);overflow-wrap:anywhere}
.detail-content{padding:8px 0}
.detail-content .dl{display:inline-block;margin-bottom:6px;padding:0 8px;color:var(--bridge-screen-text);background:var(--bridge-screen);border-radius:3px;font-size:11px;font-weight:800;transform:skewX(-8deg)}
.detail-content .dc{color:var(--bridge-text);font-size:12.5px;line-height:1.75;overflow-wrap:anywhere}

.settings-tabs{
  display:flex;
  flex:0 0 auto;
  gap:5px;
  min-width:0;
  overflow-x:auto;
  padding:7px 8px;
  background:var(--bridge-bg);
  border-bottom:2px solid var(--bridge-line-strong);
}
.settings-tab{
  position:relative;
  flex:1 0 auto;
  min-height:32px;
  padding:6px 12px;
  color:var(--bridge-text);
  background:var(--bridge-panel);
  border:1.5px solid var(--bridge-line);
  border-radius:4px;
  font:800 12px/1.2 var(--bridge-font-ui);
  letter-spacing:.04em;
  cursor:pointer;
}
.settings-tab:hover{color:var(--bridge-signal);border-color:var(--bridge-signal)}
.settings-tab.active{color:var(--bridge-screen-text);background:var(--bridge-screen);border-color:var(--bridge-line-strong);box-shadow:2px 2px 0 var(--bridge-signal)}
.settings-tab-content{display:none}
.settings-tab-content.active{display:block}
.settings-section{margin:10px 0;padding:9px;border:1.5px solid var(--bridge-line);border-radius:var(--bridge-radius);background:var(--bridge-panel-alt)}
.settings-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;padding:8px 0;border-bottom:1px dashed var(--bridge-line)}
.settings-row:last-child{border-bottom:0}
.settings-label{min-width:0;color:var(--bridge-text);font-size:12px;line-height:1.45;overflow-wrap:anywhere}
/* 选择器带 button 与容器前缀：须压过 .bridge-window button / :hover / :active 及移动端 min-height:34px，
   否则开关被通用按钮规则撑成带阴影的方块 */
.settings-toggle,
.bridge-window button.settings-toggle,
.bridge-container button.settings-toggle{
  position:relative;
  box-sizing:border-box;
  width:40px;
  min-width:40px;
  height:22px;
  min-height:0;
  flex:0 0 40px;
  padding:0;
  overflow:hidden;
  background:var(--bridge-panel-inset);
  border:1.5px solid var(--bridge-line);
  border-radius:11px;
  box-shadow:inset 0 1px 2px var(--bridge-shadow-soft);
  transform:none;
  cursor:pointer;
  transition:background-color .18s ease,border-color .18s ease;
}
.settings-toggle::after,
.bridge-window button.settings-toggle::after{
  content:"";
  position:absolute;
  top:50%;
  left:2px;
  width:15px;
  height:15px;
  margin-top:-7.5px;
  border-radius:50%;
  background:var(--bridge-knob);
  box-shadow:0 0 0 1px var(--bridge-line),0 1px 2px var(--bridge-shadow);
  transition:transform .18s ease,background-color .18s ease,box-shadow .18s ease;
}
.bridge-window button.settings-toggle:hover,
.bridge-container button.settings-toggle:hover{background:var(--bridge-panel-inset);border-color:var(--bridge-line-strong)}
.bridge-window button.settings-toggle:active,
.bridge-container button.settings-toggle:active{transform:none;box-shadow:inset 0 1px 2px var(--bridge-shadow-soft)}
.settings-toggle.on,
.bridge-window button.settings-toggle.on,
.bridge-container button.settings-toggle.on,
.bridge-window button.settings-toggle.on:hover,
.bridge-container button.settings-toggle.on:hover{background:var(--bridge-signal);border-color:var(--bridge-signal)}
.settings-toggle.on::after,
.bridge-window button.settings-toggle.on::after{transform:translateX(18px);background:var(--bridge-signal-contrast);box-shadow:0 1px 2px rgba(0,0,0,.25)}
.bridge-window button.settings-toggle:disabled{opacity:.4}

.char-info-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:10px 12px}
.char-info-panel{display:none}
.char-info-panel.active{display:flex;flex-direction:column}
.item-top,
.memo-item-top,
.diary-item-top{display:flex;align-items:center;gap:8px;min-width:0}
.memo-item-top{justify-content:space-between}
.memo-item-sub{display:flex;flex-wrap:wrap;gap:6px;margin-top:5px}
.item-name,
.memo-title,
.mission-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item-desc,
.mission-desc,
.diary-item-content{margin-top:4px;color:var(--bridge-muted);font-size:11.5px;line-height:1.55;overflow-wrap:anywhere}
.item-detail-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding-top:10px;border-top:1px dashed var(--bridge-line)}
.item-detail-actions button{flex:1 1 120px;padding:7px 10px}
.mission-objective{margin-top:7px;padding:7px 10px;color:var(--bridge-text);background:var(--bridge-panel-alt);border-left:4px solid var(--bridge-signal);border-radius:3px;font-size:12px;line-height:1.6}
.mission-status{display:inline-block;margin-top:7px;padding:1px 8px;border:1.5px solid var(--bridge-line);border-radius:3px;font-size:11px;font-weight:700}
.mission-status.completed{color:var(--bridge-signal);border-color:var(--bridge-signal);background:var(--bridge-signal-soft)}
.mission-status.pending{color:var(--bridge-muted)}
.mission-delete{margin-left:auto}
.diary-notebook{position:relative;padding:14px;margin:8px 0;background:var(--bridge-panel-alt);background-image:repeating-linear-gradient(transparent 0 27px,var(--bridge-line-soft) 27px 28px);border:1.5px solid var(--bridge-line);border-left:4px solid var(--bridge-signal);border-radius:var(--bridge-radius)}
.diary-content .dc{color:var(--bridge-text);font-size:12px;line-height:1.75;overflow-wrap:anywhere}
/* 日记手账标记（全库 7 类 span；桥式窗口用扁平档案语言表达，token 浅深自适应） */
.diary-content .dc .strikethrough{text-decoration:line-through;text-decoration-thickness:1px;text-decoration-color:var(--bridge-muted);opacity:.7}
.diary-content .dc .highlight{background:var(--bridge-signal-soft);color:var(--bridge-signal);padding:0 2px;box-shadow:inset 0 -1px 0 var(--bridge-line-soft)}
.diary-content .dc .underline{text-decoration:underline dotted;text-decoration-color:var(--bridge-signal);text-underline-offset:3px}
.diary-content .dc .emphasis{color:var(--bridge-signal);font-weight:700}
.diary-content .dc .handwritten{font-style:italic;color:var(--bridge-muted);letter-spacing:.04em}
.diary-content .dc .messy{font-style:italic;color:var(--bridge-alert);opacity:.85;letter-spacing:.08em}
.diary-content .dc .censored{position:relative;color:transparent;background:var(--bridge-text);border-radius:1px;padding:0 3px;cursor:pointer;transition:color .25s,background .25s}
.diary-content .dc .censored:hover{color:var(--bridge-text);background:transparent}
.diary-detail-writer{display:flex;align-items:center;justify-content:center;gap:10px;text-align:center;color:var(--bridge-text);font-size:12px;letter-spacing:.08em;margin-bottom:8px}
.diary-nav-btn{flex:0 0 auto;width:26px;height:26px;line-height:24px;text-align:center;border:1px solid var(--bridge-line);border-radius:50%;background:transparent;color:var(--bridge-text);cursor:pointer;font-size:var(--ub-ui-font-10,10px);padding:0;transition:opacity .2s,border-color .2s}
.diary-nav-btn:hover:not(:disabled){opacity:.8;border-color:var(--bridge-text)}
.diary-nav-btn:disabled{opacity:.3;cursor:default}
.diary-nav-indicator{text-align:center;font-size:var(--ub-ui-font-10,10px);color:var(--bridge-muted);margin-top:8px;letter-spacing:.12em}

.bridge-container{
  position:relative;
  display:flex;
  flex-direction:column;
  gap:7px;
  max-width:100%;
  box-sizing:border-box;
  overflow:visible;
  isolation:isolate;
  padding:8px;
  color:var(--bridge-text);
  background-color:var(--bridge-bg);
  background-image:radial-gradient(var(--bridge-grid) 1px,transparent 1.3px);
  background-size:10px 10px;
  border:2px solid var(--bridge-line-strong);
  border-top:4px solid var(--bridge-signal);
  border-radius:8px;
  font-family:var(--bridge-font-ui);
  font-variant-numeric:tabular-nums;
  line-height:1.5;
  box-shadow:3px 3px 0 var(--bridge-shadow-soft);
}

.bridge-container::before,
.bridge-window::before{
  content:"";
  position:absolute;
  top:0;
  right:0;
  width:96px;
  height:96px;
  z-index:-1;
  pointer-events:none;
  background:repeating-linear-gradient(135deg,var(--bridge-stripe) 0 6px,transparent 6px 12px);
  -webkit-mask-image:linear-gradient(225deg,#000 10%,transparent 70%);
  mask-image:linear-gradient(225deg,#000 10%,transparent 70%);
}
.bridge-window{isolation:isolate}

.bridge-kicker,
.bridge-en-label{
  color:var(--bridge-muted);
  font-size:10px;
  font-weight:700;
  line-height:1.3;
  letter-spacing:.04em;
}

.bridge-tag{
  display:inline-block;
  flex:0 0 auto;
  padding:1px 9px 1px 7px;
  color:var(--bridge-screen-text);
  background:var(--bridge-screen);
  border:1px solid var(--bridge-line-strong);
  border-radius:3px;
  font-size:11.5px;
  font-weight:800;
  line-height:1.6;
  letter-spacing:.04em;
  transform:skewX(-8deg);
  box-shadow:2px 2px 0 var(--bridge-offset);
  white-space:nowrap;
}
.bridge-tag::before{content:"★ ";color:var(--bridge-signal);font-size:10px}

.bridge-readout{
  min-width:0;
  color:var(--bridge-text);
  font-size:var(--ub-content-font-12,13.2px);
  line-height:1.6;
  overflow-wrap:anywhere;
}

.bridge-signal{color:var(--bridge-signal)}
.bridge-alert{color:var(--bridge-alert)}
.bridge-danger{color:var(--bridge-danger)}
.bridge-muted{color:var(--bridge-muted)}

.bridge-module{
  position:relative;
  box-sizing:border-box;
  min-width:0;
  padding:8px 9px;
  color:var(--bridge-text);
  background:var(--bridge-panel);
  border:1.5px solid var(--bridge-line);
  border-radius:var(--bridge-radius);
  box-shadow:2px 2px 0 var(--bridge-shadow-soft);
}

.bridge-window,
.panel-overlay .bridge-window{
  position:relative;
  box-sizing:border-box;
  color:var(--bridge-text);
  background:var(--bridge-panel);
  border:var(--ub-popup-border);
  border-radius:var(--ub-popup-radius);
  box-shadow:var(--ub-popup-shadow);
}

.bridge-module-title{
  display:flex;
  align-items:center;
  gap:7px;
  min-width:0;
  color:var(--bridge-text);
  font-size:13px;
  font-weight:900;
  letter-spacing:.06em;
}

.bridge-module-title::before{
  content:"";
  width:5px;
  height:13px;
  flex:0 0 5px;
  background:var(--bridge-signal);
  transform:skewX(-14deg);
}

.bridge-grid{
  display:grid;
  grid-template-columns:repeat(12,minmax(0,1fr));
  gap:8px;
  min-width:0;
}

.bridge-status-chip{
  display:inline-flex;
  align-items:center;
  gap:5px;
  min-width:0;
  padding:1px 8px;
  color:var(--bridge-signal);
  background:var(--bridge-signal-soft);
  border:1px solid color-mix(in srgb,var(--bridge-signal) 38%,transparent);
  border-radius:3px;
  font-size:11px;
  font-weight:700;
  line-height:1.55;
}

.bridge-status-chip.is-alert{color:var(--bridge-alert);background:var(--bridge-alert-soft);border-color:color-mix(in srgb,var(--bridge-alert) 40%,transparent)}
.bridge-status-chip.is-danger{color:var(--bridge-danger);background:var(--bridge-danger-soft);border-color:color-mix(in srgb,var(--bridge-danger) 40%,transparent)}

.bridge-btn,
.bridge-container button,
.bridge-window button{
  box-sizing:border-box;
  color:var(--bridge-text);
  background:var(--bridge-panel);
  border:1.5px solid var(--bridge-line);
  border-radius:var(--ub-btn-radius);
  font-family:inherit;
  font-weight:700;
  cursor:pointer;
  box-shadow:2px 2px 0 var(--bridge-shadow-soft);
  transition:background-color .14s ease,border-color .14s ease,color .14s ease,transform .1s ease,box-shadow .1s ease;
}

.bridge-btn:hover,
.bridge-container button:hover,
.bridge-window button:hover{
  color:var(--bridge-signal);
  background:var(--bridge-signal-soft);
  border-color:var(--bridge-signal);
}

.bridge-btn:active,
.bridge-container button:active,
.bridge-window button:active{transform:translate(1px,1px);box-shadow:none}

.bridge-btn:focus-visible,
.bridge-container button:focus-visible,
.bridge-window button:focus-visible{
  outline:2px solid var(--bridge-signal);
  outline-offset:2px;
}

.bridge-btn:disabled,
.bridge-container button:disabled,
.bridge-window button:disabled{
  cursor:not-allowed;
  opacity:.45;
}

.bridge-btn.is-primary{
  color:var(--bridge-screen-text);
  background:var(--bridge-screen);
  border-color:var(--bridge-line-strong);
  box-shadow:2px 2px 0 var(--bridge-offset);
}
.bridge-btn.is-primary:hover{color:var(--bridge-screen-text);background:var(--bridge-signal);border-color:var(--bridge-signal)}

.bridge-btn.is-danger{
  color:var(--bridge-danger);
  background:var(--bridge-danger-soft);
  border-color:color-mix(in srgb,var(--bridge-danger) 55%,transparent);
}

.bridge-window input,
.bridge-window select,
.bridge-window textarea{
  box-sizing:border-box;
  max-width:100%;
  color:var(--bridge-text);
  background:var(--bridge-panel-alt);
  border:1.5px solid var(--bridge-line);
  border-radius:4px;
  font:inherit;
  caret-color:var(--bridge-signal);
}

.bridge-window input:focus,
.bridge-window select:focus,
.bridge-window textarea:focus{
  outline:none;
  border-color:var(--bridge-signal);
  box-shadow:0 0 0 3px var(--bridge-signal-soft);
}

.bridge-empty,
.bridge-stale{
  padding:12px;
  color:var(--bridge-muted);
  background:var(--bridge-panel-alt);
  border:1.5px dashed var(--bridge-line);
  border-radius:var(--bridge-radius);
  font-size:12px;
  text-align:center;
}

.bridge-stale{color:var(--bridge-alert);border-color:var(--bridge-alert)}

.bridge-window-head,
.bridge-window .panel-popup-head{
  display:flex;
  align-items:center;
  gap:8px;
  min-height:40px;
  padding:7px 10px;
  color:var(--bridge-text);
  background:var(--bridge-panel-2);
  border-bottom:2px solid var(--bridge-line-strong);
}
.bridge-window .panel-popup-title{font-weight:900;letter-spacing:.06em}
.bridge-window .panel-popup-title::before{content:"";display:inline-block;width:5px;height:13px;margin-right:7px;vertical-align:-1px;background:var(--bridge-signal);transform:skewX(-14deg)}
.bridge-window .panel-popup-body{color:var(--bridge-text);background:var(--bridge-panel)}
.bridge-window .panel-popup-close,
.bridge-window .panel-popup-back,
.bridge-window .panel-popup-warehouse-toggle{color:var(--bridge-text);background:var(--bridge-panel);border:1.5px solid var(--bridge-line);box-shadow:none}
.bridge-window ::-webkit-scrollbar{width:6px;height:6px}
.bridge-window ::-webkit-scrollbar-thumb{background:var(--bridge-line);border-radius:3px}
.bridge-window ::-webkit-scrollbar-track{background:transparent}
.bridge-window input[type="range"]{accent-color:var(--bridge-signal)}
.bridge-window input[type="checkbox"]{accent-color:var(--bridge-signal)}
.bridge-window select option{color:var(--bridge-text);background:var(--bridge-panel)}

#ac-fixed-toggle{
  color:var(--bridge-text);
  background:var(--bridge-panel-2);
  border-color:var(--bridge-line);
  border:2px solid var(--bridge-line-strong)!important;
  border-radius:8px!important;
  box-shadow:3px 3px 0 var(--bridge-offset),0 6px 16px var(--bridge-shadow);
}
#ac-statusbar-wrapper.ub-collapsed{display:none!important;visibility:hidden!important;pointer-events:none!important;overflow:hidden!important}
#ac-collapse-menu{
  color:var(--bridge-text)!important;
  background:var(--bridge-panel)!important;
  border:2px solid var(--bridge-line-strong)!important;
  border-radius:6px!important;
  box-shadow:3px 3px 0 var(--bridge-offset),0 12px 28px var(--bridge-shadow)!important;
}
#ac-collapse-menu .ac-collapse-menu-item{border-radius:4px!important}
#ac-collapse-menu .ac-collapse-menu-item:hover{color:var(--bridge-signal)!important;background:var(--bridge-signal-soft)!important}

.help-tooltip-global{
  position:fixed;
  z-index:100000;
  max-width:260px;
  padding:10px 14px;
  color:var(--bridge-text)!important;
  background:var(--bridge-panel)!important;
  border:2px solid var(--bridge-line-strong)!important;
  border-radius:6px!important;
  box-shadow:3px 3px 0 var(--bridge-offset)!important;
  font-size:12px;
  line-height:1.7;
  white-space:pre-line;
  pointer-events:none;
}
.archive-export-menu{
  color:var(--bridge-text);
  background:var(--bridge-panel);
  border-color:var(--bridge-line-strong);
  border-radius:6px;
}
.archive-export-menu button:hover{color:var(--bridge-signal);background:var(--bridge-signal-soft)}
.ub-badge-bridge{
  color:var(--bridge-signal-contrast);
  background:var(--bridge-signal);
  border:1.5px solid var(--bridge-panel);
  border-radius:9px;
  box-shadow:1px 1px 0 var(--bridge-line-strong);
  font-family:var(--bridge-font-data);
  font-weight:800;
}

.bridge-reticle{
  position:fixed;
  z-index:100500;
  width:28px;
  height:28px;
  margin:-14px 0 0 -14px;
  pointer-events:none;
  background:var(--bridge-signal);
  clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
  transform:scale(.4) rotate(-12deg);
  opacity:0;
  animation:bridge-reticle-once .45s ease-out 1;
}
@keyframes bridge-reticle-once{
  0%{opacity:0;transform:scale(.4) rotate(-12deg)}
  30%{opacity:.85;transform:scale(1) rotate(0deg)}
  100%{opacity:0;transform:scale(1.3) rotate(10deg)}
}

.panel-popup.bridge-module-memo,
.panel-popup.bridge-module-item,
.panel-popup.bridge-module-warehouse,
.panel-popup.bridge-module-diary,
.panel-popup.bridge-module-mission,
.panel-popup.bridge-module-character,
.panel-popup.bridge-module-guidance,
.panel-popup.bridge-module-options{
  width:min(92%,860px);
  max-width:860px;
  max-height:86vh;
  max-height:86dvh;
}
.panel-popup.bridge-module-database{
  width:min(96%,1180px);
  max-width:1180px;
  max-height:90vh;
  max-height:90dvh;
}
.panel-popup.bridge-module-confirm{
  width:min(92%,520px);
  max-width:520px;
}

.bridge-list-layout{
  display:grid;
  grid-template-columns:minmax(130px,20%) minmax(240px,36%) minmax(0,1fr);
  min-width:0;
  min-height:0;
}

.bridge-window .memo-list-item,
.bridge-window .item-list-item,
.bridge-window .mission-list-item,
.bridge-window .diary-list-item{
  position:relative;
  margin:5px 0;
  padding:8px 10px;
  color:var(--bridge-text);
  background:var(--bridge-panel-alt);
  border:1.5px solid var(--bridge-line);
  border-left:4px solid var(--bridge-line-strong);
  border-radius:4px;
  transition:border-color .14s ease,background-color .14s ease;
}
.bridge-window .memo-list-item:hover,
.bridge-window .item-list-item:hover,
.bridge-window .mission-list-item:hover,
.bridge-window .diary-list-item:hover{
  background:var(--bridge-signal-soft);
  border-color:var(--bridge-signal);
  border-left-color:var(--bridge-signal);
}
.bridge-window .memo-title,
.bridge-window .item-name,
.bridge-window .mission-name{color:var(--bridge-text);font-weight:800}
.bridge-window .memo-type,
.bridge-window .memo-status,
.bridge-window .memo-char,
.bridge-window .memo-time-badge,
.bridge-window .item-type,
.bridge-window .mission-status{color:var(--bridge-muted)}
.item-wardrobe-badge{display:inline-flex;align-items:center;border-radius:3px;background:var(--bridge-signal);color:var(--bridge-signal-contrast);padding:0 7px;font-size:10px;font-weight:800;line-height:1.7;flex-shrink:0;margin-left:4px;font-family:var(--bridge-font-ui)}
.bridge-window .panel-empty{padding:20px 14px;color:var(--bridge-muted);background:var(--bridge-panel-alt);border:1.5px dashed var(--bridge-line);border-radius:var(--bridge-radius)}

.bridge-module-character .char-info-card{color:var(--bridge-text);background:var(--bridge-panel-alt);border:1.5px solid var(--bridge-line);border-radius:var(--bridge-radius)}
.bridge-module-character .char-info-card-name{color:var(--bridge-signal);letter-spacing:.04em}
.bridge-module-character .char-hub-map-link{color:var(--bridge-signal)}

.bridge-module-database .db-tabs{
  display:flex;
  gap:4px;
  max-width:100%;
  overflow-x:auto;
  padding:6px;
  background:var(--bridge-bg);
  border-bottom:2px solid var(--bridge-line-strong);
}
.bridge-module-database .db-tab{flex:0 0 auto;border-radius:4px}
.bridge-module-database .db-tab[data-active="1"]{color:var(--bridge-screen-text);background:var(--bridge-screen);border-color:var(--bridge-line-strong);box-shadow:2px 2px 0 var(--bridge-signal)}
.bridge-module-database .db-toolbar{color:var(--bridge-text);background:var(--bridge-panel-2);border-color:var(--bridge-line)}
.bridge-module-database .db-card{color:var(--bridge-text);background:var(--bridge-panel-alt);border-color:var(--bridge-line);border-radius:4px}
.bridge-module-database .db-card:hover{border-color:var(--bridge-signal)}
.bridge-module-database .db-search{min-width:140px;color:var(--bridge-text);background:var(--bridge-panel-alt);border-color:var(--bridge-line)}

.bridge-module-confirm .db-confirm-body{color:var(--bridge-text);background:var(--bridge-panel);border-color:var(--bridge-line)}
.bridge-module-confirm .db-confirm-actions{background:var(--bridge-panel-2);border-top:2px solid var(--bridge-line-strong)}
.bridge-module-confirm .db-danger,
.bridge-module-confirm .db-del-confirm-warn{color:var(--bridge-danger);border-color:var(--bridge-danger);background:var(--bridge-danger-soft)}

.bridge-module-options .options-bar{padding:0;border:0;background:transparent}
.bridge-module-options .options-bar-items{display:grid;grid-template-columns:1fr;gap:6px}
.bridge-module-options .option-item{display:flex;align-items:flex-start;gap:7px;padding:8px 10px;text-align:left;border-radius:4px;border-left:4px solid var(--bridge-line-strong);background:var(--bridge-panel-alt)}
.bridge-module-options .option-item:nth-child(even){border-left-color:var(--bridge-signal)}
.bridge-module-options .option-number{flex:0 0 auto;padding:0 7px;border-radius:3px;background:var(--bridge-screen);color:var(--bridge-screen-text);font-weight:900;transform:skewX(-8deg);box-shadow:2px 2px 0 var(--bridge-offset)}
.bridge-module-options .option-text{min-width:0;font-size:12.5px;line-height:1.6}

.bridge-module-guidance .play-img-wrap{color:var(--bridge-text);background:var(--bridge-panel-alt);border-color:var(--bridge-line);border-radius:var(--bridge-radius)}
.bridge-module-guidance .portrait-gen-textarea{color:var(--bridge-text);background:var(--bridge-panel-alt);border-color:var(--bridge-line)}
.bridge-module-guidance .play-img{max-width:100%;border:1px solid var(--bridge-line)}

/* 技能树：图例/详情区落在浅色 body 上，须用 bridge 深色文字，不用给深色画布调的 --skill-* */
.bridge-module-skill-tree .sk-legend{color:var(--bridge-muted)}
.bridge-module-skill-tree .sk-legend i{outline:1px solid var(--bridge-line)}
.bridge-module-skill-detail .sk-detail,
.bridge-module-skill-detail .sk-confirm{background:var(--bridge-panel-alt);border-color:var(--bridge-line);border-radius:var(--bridge-radius)}
.bridge-module-skill-detail .sk-d-title,
.bridge-module-skill-detail .sk-d-desc{color:var(--bridge-text)}
.bridge-module-skill-detail .sk-d-line,
.bridge-module-skill-detail .sk-d-stat,
.bridge-module-skill-detail .sk-d-warn{color:var(--bridge-muted)}
.bridge-module-skill-detail .sk-d-desc{background:var(--bridge-panel);border-left-color:var(--bridge-signal)}

.bridge-command-header{
  display:flex;
  flex-direction:column;
  gap:5px;
  padding:9px 10px 8px;
  border:2px solid var(--bridge-line-strong);
  border-top:4px solid var(--bridge-signal);
}

.bridge-head-line,
.bridge-chip-row,
.bridge-system-controls,
.bridge-protagonist-row,
.bridge-personnel-actions,
.bridge-detail-tabs,
.bridge-protocol-controls{
  display:flex;
  align-items:center;
  gap:6px;
  min-width:0;
}
.bridge-chip-row{flex-wrap:wrap}

.bridge-container .bridge-clock,
.bridge-container .bridge-coordinate{
  display:inline-flex;
  align-items:center;
  gap:6px;
  max-width:100%;
  min-width:0;
  padding:0;
  color:var(--bridge-text);
  background:transparent;
  border:0;
  box-shadow:none;
  text-align:left;
}
.bridge-container .bridge-clock:hover,
.bridge-container .bridge-coordinate:hover{background:transparent;color:var(--bridge-signal)}
.bridge-clock strong{font-size:16px;font-weight:900;letter-spacing:.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bridge-clock svg{flex:0 0 auto;opacity:.85}
.bridge-star{color:var(--bridge-signal);font-size:13px}
.bridge-coordinate strong{font-size:13px;font-weight:800;line-height:1.45;overflow-wrap:anywhere}
.bridge-caret{color:var(--bridge-signal);font-size:11px}

.bridge-protagonist-row{align-items:flex-start;margin-top:2px}
.bridge-protagonist-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1 1 auto}
.bridge-container .bridge-protagonist-name,
.bridge-container .bridge-personnel-name{
  display:inline-block;
  padding:1px 11px 1px 9px;
  color:var(--bridge-screen-text);
  background:var(--bridge-screen);
  border:1.5px solid var(--bridge-line-strong);
  border-radius:4px;
  font-size:14px;
  font-weight:900;
  letter-spacing:.04em;
  text-align:left;
  transform:skewX(-6deg);
  box-shadow:2px 2px 0 var(--bridge-offset);
}
.bridge-container .bridge-protagonist-name:hover,
.bridge-container .bridge-personnel-name:hover{color:var(--bridge-screen-text);background:var(--bridge-signal);border-color:var(--bridge-signal)}
.bridge-energy{
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:1px 8px;
  color:var(--bridge-text);
  background:var(--bridge-panel-alt);
  border:1.5px solid var(--bridge-line);
  border-radius:4px;
  font-size:12px;
  line-height:1.6;
}
.bridge-energy strong{font-weight:800}
.bridge-chip-key{color:var(--bridge-muted);font-size:11px;font-weight:700;white-space:nowrap}
.bridge-command-status{color:var(--bridge-muted);font-size:var(--ub-content-font-12,13.2px);line-height:1.5;overflow-wrap:anywhere}

.wardrobe-protagonist-summary{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;max-width:100%;padding:3px 9px;border:1.5px solid var(--bridge-line);border-radius:4px;background:var(--bridge-panel-alt);color:var(--bridge-muted);font-size:11.5px;line-height:1.45;cursor:pointer;text-align:left;overflow:hidden;box-shadow:none}
.wardrobe-protagonist-summary .wr-sum-label{color:var(--bridge-signal);font-weight:800;flex-shrink:0}
.wardrobe-protagonist-summary .wr-sum-items{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--bridge-text)}
.wardrobe-protagonist-summary:hover{border-color:var(--bridge-signal)}

/* 钱包入口：暗金胶囊（数值类强调统一走 --bridge-alert） */
.bridge-container .ub-wallet-entry{display:inline-flex;align-items:center;gap:4px;min-width:0;max-width:100%;padding:1px 9px;color:var(--bridge-alert);background:var(--bridge-alert-soft);border:1.5px solid color-mix(in srgb,var(--bridge-alert) 60%,transparent);border-radius:4px;font-size:12px;font-weight:800;line-height:1.6;cursor:pointer;text-align:left;box-shadow:none}
.bridge-container .ub-wallet-entry:hover{color:var(--bridge-alert);background:var(--bridge-alert-soft);border-color:var(--bridge-alert)}
.ub-wallet-entry strong{display:flex;align-items:center;gap:4px;max-width:100%;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ub-wallet-entry strong b{font-weight:900;color:inherit}
.ub-wallet-entry strong b.neg{color:var(--bridge-danger)}
.ub-wallet-entry.ub-wallet-empty{opacity:.6;border-style:dashed}

.bridge-system-controls{flex-wrap:wrap;justify-content:flex-end;margin-top:2px;padding-top:6px;border-top:1px dashed var(--bridge-line)}
.bridge-system-controls .bridge-btn,
.bridge-system-controls .scene-btn{padding:2px 9px;font-size:11px;line-height:1.6;box-shadow:none}

.bridge-quick-actions{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(62px,1fr));
  gap:5px;
}
.bridge-quick-actions .bridge-btn{padding:5px 4px;font-size:12px;line-height:1.3;white-space:nowrap}

.bridge-role-selector{display:flex;flex-wrap:wrap;gap:6px;padding:1px 3px 3px 1px}
.bridge-container .bridge-role-chip{
  flex:0 0 auto;
  min-width:0;
  padding:4px 12px;
  color:var(--bridge-text);
  background:var(--bridge-panel);
  border:1.5px solid var(--bridge-line);
  font-size:12.5px;
  font-weight:800;
  text-align:center;
  transform:skewX(-6deg);
}
.bridge-container .bridge-role-chip.active{
  color:var(--bridge-screen-text);
  background:var(--bridge-screen);
  border-color:var(--bridge-line-strong);
  box-shadow:3px 3px 0 var(--bridge-signal);
}
.bridge-container .bridge-role-chip.active::before{content:"★ ";color:var(--bridge-signal)}

.bridge-status-layout{display:grid;gap:8px;min-width:0}
.bridge-personnel-portrait,
.bridge-personnel-telemetry{min-width:0}
.bridge-personnel-portrait{display:flex;align-items:flex-start;gap:9px}
.bridge-personnel-portrait>.portrait-box{flex:0 0 88px;width:88px;height:88px;aspect-ratio:1/1}
.bridge-personnel-side{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1 1 auto}
.bridge-personnel-identity{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}
.bridge-basic-info{font-size:11.5px;line-height:1.45;overflow-wrap:anywhere}
.bridge-personnel-actions{flex-wrap:wrap;gap:5px}
.bridge-personnel-actions .bridge-btn,
.bridge-personnel-actions .investigate-btn{margin-left:0!important;padding:3px 10px;font-size:11.5px;line-height:1.5}

.bridge-telemetry-grid{display:grid;grid-template-columns:1fr;gap:6px}
.bridge-telemetry-item{
  display:block;
  min-width:0;
  padding:7px 9px;
  background:var(--bridge-panel-alt);
  border:1.5px solid var(--bridge-line);
  border-left:4px solid var(--bridge-line-strong);
  border-radius:4px;
  box-shadow:2px 2px 0 var(--bridge-shadow-soft);
}
.bridge-telemetry-item:nth-child(even){border-left-color:var(--bridge-signal)}
.bridge-telemetry-item .bridge-tag{margin-right:7px;vertical-align:1px}
.bridge-telemetry-item .bridge-readout{display:inline}
.bridge-train-row{display:grid;grid-template-columns:auto minmax(60px,1fr) auto;gap:8px;align-items:center;margin:8px 0 2px}
.bridge-train-row strong{font-size:12px;font-weight:900;color:var(--bridge-alert)}
.bridge-meter{height:7px;overflow:hidden;background:var(--bridge-panel-inset);border:1px solid var(--bridge-line);border-radius:4px}
.bridge-meter span{display:block;height:100%;background:repeating-linear-gradient(135deg,var(--bridge-signal) 0 5px,color-mix(in srgb,var(--bridge-signal) 78%,#000) 5px 10px)}
.bridge-detail-console{margin-top:8px;padding-top:8px;border-top:1px dashed var(--bridge-line)}
.bridge-detail-tabs{margin-bottom:6px}
.bridge-detail-tabs .bridge-btn{padding:2px 11px;font-size:11.5px;line-height:1.6;box-shadow:none}
.bridge-detail-tabs .active-switch{color:var(--bridge-screen-text);background:var(--bridge-screen);border-color:var(--bridge-line-strong)}
.bridge-detail-tabs .active-switch:hover{color:var(--bridge-screen-text);background:var(--bridge-screen)}
.bridge-detail-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}
.bridge-detail-item{display:flex;gap:8px;min-width:0;padding:4px 0;border-bottom:1px dashed var(--bridge-line-soft)}
.bridge-detail-key{flex:0 0 auto;min-width:3.5em;color:var(--bridge-muted);font-size:11.5px;font-weight:700;line-height:1.6}
.bridge-detail-item .bridge-readout{font-size:12px}
.bridge-detail-list>.bridge-empty{grid-column:1/-1}

.bridge-protocol-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}
.bridge-protocol-controls{flex-wrap:wrap;justify-content:flex-end}
.bridge-protocol-controls .bridge-btn{padding:2px 9px;font-size:11px;line-height:1.6;box-shadow:none}
.bridge-protocol-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}
.bridge-protocol.collapsed .bridge-protocol-grid{display:none}

.bridge-container .options-bar{margin-top:0;padding:8px;background:var(--bridge-panel);border:1.5px solid var(--bridge-line);border-radius:var(--bridge-radius);box-shadow:2px 2px 0 var(--bridge-shadow-soft)}
.bridge-container .options-bar-header{justify-content:flex-start;margin-bottom:6px}
.bridge-container .options-bar-title{display:inline-flex;align-items:center;gap:7px;padding-left:0;color:var(--bridge-text);font-size:13px;font-weight:900;letter-spacing:.06em;opacity:1}
.bridge-container .options-bar-title::before{position:static;width:5px;height:13px;background:var(--bridge-signal);opacity:1;transform:skewX(-14deg)}
.bridge-container .options-bar-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.bridge-container .option-item{display:flex;align-items:flex-start;gap:7px;min-width:0;padding:7px 9px;background:var(--bridge-panel-alt);border-left:4px solid var(--bridge-line-strong);text-align:left}
.bridge-container .option-item:nth-child(even){border-left-color:var(--bridge-signal)}
.bridge-container .option-number{flex:0 0 auto;padding:0 7px;color:var(--bridge-screen-text);background:var(--bridge-screen);border-radius:3px;font-size:11px;font-weight:900;line-height:1.7;transform:skewX(-8deg);box-shadow:2px 2px 0 var(--bridge-offset)}
.bridge-container .option-text{min-width:0;color:var(--bridge-text);font-size:12.5px;font-weight:500;line-height:1.6;overflow-wrap:anywhere}

.bridge-overlay{
  height:100vh;
  height:100dvh;
  width:100%;
  box-sizing:border-box;
  overflow:auto;
  overscroll-behavior:contain;
}



/* 系统控制：设置、决策队列与数据库修复 */
.settings-popup.bridge-module-settings{width:min(94%,760px);max-width:760px;background:var(--bridge-panel)}
.bridge-module-settings .settings-popup-head{background:var(--bridge-panel-2);border-bottom:2px solid var(--bridge-line-strong)}
.bridge-module-settings .group-title{padding:3px 10px;border-left:4px solid var(--bridge-signal);border-radius:3px;background:var(--bridge-panel-alt);color:var(--bridge-text);font-weight:900;letter-spacing:.04em}
.bridge-module-settings .settings-section-summary{border-radius:4px;background:var(--bridge-panel-2)}
.bridge-module-settings input,.bridge-module-settings textarea,.bridge-module-settings select{border-radius:4px!important}
.ub-decision-overlay.bridge-module-decision-queue{background:var(--ub-overlay-bg)}
.ub-decision-dialog.bridge-module-decision-queue{border-radius:var(--ub-popup-radius);border:var(--ub-popup-border);background:var(--bridge-panel);box-shadow:var(--ub-popup-shadow);overflow:hidden}
.ub-decision-dialog.bridge-module-decision-queue .ub-decision-head{background:var(--bridge-screen);color:var(--bridge-screen-text);border-bottom:3px solid var(--bridge-signal)}
.ub-decision-dialog.bridge-module-decision-queue .ub-decision-title::before{content:"★ ";color:var(--bridge-signal)}
.ub-decision-dialog.bridge-module-decision-queue button{min-height:34px;border-radius:4px!important}
.ub-decision-dialog.bridge-module-decision-queue .ub-decision-close{min-height:0;width:28px;height:28px;padding:0;background:none;border:none;box-shadow:none;color:var(--bridge-screen-muted);font-size:15px}
.ub-decision-dialog.bridge-module-decision-queue .ub-decision-close:hover{color:var(--bridge-screen-text);background:rgba(255,255,255,.08)}
#ubDbRepairOverlay.bridge-module-db-repair{max-width:680px!important;border-radius:var(--ub-popup-radius)!important;border:var(--ub-popup-border)!important;background:var(--bridge-panel)!important;box-shadow:var(--ub-popup-shadow)!important;overflow:hidden}
#ubDbRepairOverlay.bridge-module-db-repair .ub-repair-head{background:var(--bridge-screen)!important;color:var(--bridge-screen-text)!important;border-bottom:3px solid var(--bridge-signal)}
#ubDbRepairOverlay.bridge-module-db-repair .ub-repair-warn{border-radius:4px!important;border-color:var(--bridge-danger)!important;color:var(--bridge-danger)!important;background:var(--bridge-danger-soft)!important}
#ubDbRepairOverlay.bridge-module-db-repair .ub-repair-case,#ubDbRepairOverlay.bridge-module-db-repair button{border-radius:4px!important}
#ubDbRepairOverlay.bridge-module-db-repair .ub-repair-case{border-color:var(--bridge-line)!important;background:var(--bridge-panel-alt)}
#ubDbRepairOverlay.bridge-module-db-repair .ub-repair-case summary{font-weight:800}
#ubDbRepairOverlay.bridge-module-db-repair #ubDbRepairConfirm{color:var(--bridge-signal-contrast)!important;background:var(--bridge-danger)!important;border-color:var(--bridge-danger)!important}

.panel-popup.bridge-module-chronicle-merge{width:min(94%,820px);max-width:820px;max-height:88vh;max-height:88dvh}
.bridge-module-chronicle-merge .db-merge-form input,
.bridge-module-chronicle-merge .db-merge-preview,
.bridge-module-chronicle-merge .db-merge-segment-card,
.bridge-module-chronicle-merge .db-merge-segment-preview,
.bridge-module-chronicle-merge .db-merge-resume-hint{border-radius:4px;background:var(--bridge-panel-alt);border-color:var(--bridge-line)}
.bridge-module-chronicle-merge .db-merge-progress-bar-wrap{height:7px;border-radius:4px;background:var(--bridge-panel-inset);border:1px solid var(--bridge-line)}
.bridge-module-chronicle-merge .db-merge-progress-bar{background:repeating-linear-gradient(135deg,var(--bridge-signal) 0 5px,color-mix(in srgb,var(--bridge-signal) 78%,#000) 5px 10px)}
.bridge-module-chronicle-merge .db-merge-segment-card.is-running{border-color:var(--bridge-signal);background:var(--bridge-signal-soft)}
.bridge-module-chronicle-merge .db-merge-segment-card.is-failed{border-color:var(--bridge-danger);background:var(--bridge-danger-soft)}

/* 过往经历：手记时间线 */
.bridge-timeline .pe-intro{padding:9px 11px;border:1.5px solid var(--bridge-line);border-left:4px solid var(--bridge-signal);border-radius:4px;background:var(--bridge-panel-alt)}
.bridge-timeline .pe-intro-label{color:var(--bridge-signal);font-weight:900}
.bridge-timeline .pe-intro-text{color:var(--bridge-text)}
.bridge-timeline .pe-rail::before{width:2px;background:var(--bridge-line-strong)}
.bridge-timeline .pe-date{display:inline-block;padding:0 8px;border-radius:3px;color:var(--bridge-screen-text);background:var(--bridge-screen);font-weight:800;transform:skewX(-8deg)}
.bridge-timeline .pe-dot{left:-21px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--bridge-signal);border:2px solid var(--bridge-panel);box-shadow:0 0 0 1.5px var(--bridge-line-strong)}
.bridge-timeline .pe-card{border-radius:4px;border:1.5px solid var(--bridge-line);border-left:4px solid var(--bridge-signal);background:var(--bridge-panel);color:var(--bridge-text);box-shadow:2px 2px 0 var(--bridge-shadow-soft)}


@media(min-width:900px){
  .bridge-status-layout{grid-template-columns:minmax(200px,30%) minmax(0,1fr)}
  .bridge-status-layout .bridge-personnel-portrait{flex-direction:column}
  .bridge-status-layout .bridge-personnel-portrait>.portrait-box{flex:0 0 auto;width:100%;height:auto}
  .bridge-telemetry-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .bridge-container .options-bar-items{grid-template-columns:repeat(3,minmax(0,1fr))}
}

@media(max-width:599px){
  .bridge-container{padding:6px;gap:6px;border-radius:6px}
  .bridge-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  .bridge-module{padding:7px 8px}
  .bridge-command-header{padding:8px 8px 7px}
  .bridge-clock strong{font-size:15px}
  .bridge-quick-actions{grid-template-columns:repeat(4,minmax(0,1fr))}
  .bridge-personnel-portrait>.portrait-box{flex-basis:76px;width:76px;height:76px}
  .bridge-detail-list{grid-template-columns:1fr}
  .bridge-protocol-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-height:240px;overflow-y:auto}
  .bridge-container .options-bar-items{grid-template-columns:1fr}
  .bridge-window{width:100%;max-width:100%;max-height:92vh;max-height:92dvh}
  .bridge-list-layout{grid-template-columns:1fr}
  .bridge-module-database .panel-popup-head{flex-wrap:wrap}
  .bridge-module-database .db-search{order:3;width:100%}
  .bridge-module-confirm{width:calc(100% - 16px)}
  /* height 抵扣 applyMobileFixes 写入的 overlay 上下 padding 总额 var(--ub-ol-pad-total)（index.ts），
     否则全屏弹窗底部（如确认/操作按钮）被推出视口；decision-queue 在自有 border-box overlay
     （padding:18px+height:100dvh）中恰好满屏无裁切，不抵扣 */
  .bridge-module-settings,
  #ubDbRepairOverlay.bridge-module-db-repair{width:100%!important;height:calc(100vh - var(--ub-ol-pad-total,80px));height:calc(100dvh - var(--ub-ol-pad-total,80px));max-width:none!important;max-height:none!important;border-left:0!important;border-right:0!important}
  .ub-decision-dialog.bridge-module-decision-queue{width:100%!important;height:100vh;height:100dvh;max-width:none!important;max-height:none!important;border-left:0!important;border-right:0!important}
  .panel-popup.bridge-timeline{width:100%;height:calc(100vh - var(--ub-ol-pad-total,80px));height:calc(100dvh - var(--ub-ol-pad-total,80px));max-width:none;max-height:none}
  .panel-popup.bridge-module-options{width:100%;height:calc(100vh - var(--ub-ol-pad-total,80px));height:calc(100dvh - var(--ub-ol-pad-total,80px));max-width:none;max-height:none}
  .panel-popup.bridge-module-chronicle-merge{width:100%;height:calc(100vh - var(--ub-ol-pad-total,80px));height:calc(100dvh - var(--ub-ol-pad-total,80px));max-width:none;max-height:none}
  .bridge-window button,
  .bridge-window [role="button"]{min-height:34px}
}

@media(prefers-reduced-motion:reduce){
  .bridge-container *,
  .bridge-container *::before,
  .bridge-container *::after,
  .bridge-window *,
  .bridge-window *::before,
  .bridge-window *::after{animation:none!important;transition:none!important}
}
` + baseCSS;

export const bridgeCSS = bridgeCoreCSS + /* css */ `
/* 角色中枢 / 剧情回顾：手记档案 */
.char-hub-theme-bridge .char-hub-card,.char-hub-theme-bridge .char-hub-prose-card,.char-hub-theme-bridge .char-hub-logic,.char-hub-theme-bridge .char-hub-trait-column,.char-hub-theme-bridge .char-hub-relation-card,.char-hub-theme-bridge .char-hub-history-background,.char-hub-theme-bridge .char-hub-history-latest,.char-hub-theme-bridge .char-hub-not-equal,.char-hub-theme-bridge .char-hub-vitals-strip,.char-hub-theme-bridge .char-hub-vitals-raw,.char-hub-theme-bridge .char-hub-nsfw-card,.char-hub-theme-bridge .char-hub-dual-stat,.char-hub-theme-bridge .char-hub-speech,.char-hub-theme-bridge .char-hub-lead-banner,.chronicle-reader-theme-bridge .chronicle-timeline-content,.chronicle-reader-theme-bridge .chronicle-detail-text,.chronicle-reader-theme-bridge .chronicle-detail-dialogue,.chronicle-reader-theme-bridge .chronicle-dialogue-line{border-radius:var(--hub-radius)}
.char-hub-theme-bridge,.chronicle-reader-theme-bridge{--hub-bg:var(--bridge-panel);--hub-panel:var(--bridge-panel-2);--hub-line:var(--bridge-line);--hub-ink:var(--bridge-text);--hub-muted:var(--bridge-muted);--hub-accent:var(--bridge-signal);--hub-soft:var(--bridge-signal-soft);--hub-day:var(--bridge-alert-soft);--hub-night:rgba(110,94,128,.1);--hub-night-ink:var(--hub-accent);--hub-pref:#7d6a8f;--hub-radius:var(--bridge-radius)}
.char-hub-theme-bridge .char-hub-gsym.is-female{color:#b55a78}.char-hub-theme-bridge .char-hub-gsym.is-male{color:#56708f}
.char-hub-theme-bridge .char-hub-lead-banner{background:var(--hub-panel)}
.char-hub-theme-bridge .char-hub-action--investigate{color:var(--bridge-text);border-color:var(--bridge-line-strong);background:var(--hub-panel)}
.char-hub-theme-bridge .char-hub-action--interview{color:var(--hub-accent);border-color:color-mix(in srgb,var(--hub-accent) 40%,var(--hub-line));background:var(--hub-soft)}
.char-hub-theme-bridge .char-hub-identity,.chronicle-reader-theme-bridge .chronicle-reader-card{border-color:var(--hub-line);background:var(--hub-panel);box-shadow:inset 3px 0 var(--hub-accent)}
.char-hub-theme-bridge .char-hub-card{background:var(--hub-panel)}
.char-hub-theme-bridge .char-hub-profile-lede{border-inline-start-width:4px;background:repeating-linear-gradient(90deg,var(--hub-soft) 0 1px,transparent 1px 8px)}
.char-hub-theme-bridge .char-hub-prose-card,.char-hub-theme-bridge .char-hub-logic{background:var(--hub-panel)}
.char-hub-theme-bridge .char-hub-logic-index{border-radius:3px;background:var(--hub-soft);}
.char-hub-theme-bridge .char-hub-trait-balance{gap:8px}.char-hub-theme-bridge .char-hub-trait-column{background:var(--hub-panel)}
.char-hub-theme-bridge .char-hub-relation-card{border-inline-start:3px solid var(--hub-accent);background:var(--hub-panel)}.char-hub-theme-bridge .char-hub-relation-avatar{border-radius:4px;background:var(--hub-soft)}
.char-hub-theme-bridge .char-hub-history-preview{gap:8px}.char-hub-theme-bridge .char-hub-history-background,.char-hub-theme-bridge .char-hub-history-latest{background:repeating-linear-gradient(90deg,var(--hub-soft) 0 1px,transparent 1px 12px),var(--hub-panel)}
.char-hub-theme-bridge .char-hub-not-equal{background:var(--hub-panel)}.char-hub-theme-bridge .char-hub-not-equal-label{background:repeating-linear-gradient(90deg,var(--hub-soft) 0 1px,transparent 1px 7px)}
.char-hub-theme-bridge .char-hub-intimacy-slip{border-inline-start:3px solid var(--hub-accent);background:repeating-linear-gradient(90deg,var(--hub-soft) 0 1px,transparent 1px 12px),var(--hub-panel)}
.char-hub-theme-bridge .char-hub-vitals-strip{background:var(--hub-panel)}
.char-hub-theme-bridge .char-hub-vitals-num{color:var(--bridge-alert)}
.char-hub-theme-bridge .char-hub-vitals-raw{background:var(--hub-panel)}
.char-hub-theme-bridge .char-hub-nsfw-card{background:var(--hub-panel)}
.char-hub-theme-bridge .char-hub-dual-stat{background:var(--hub-panel)}
.char-hub-theme-bridge .char-hub-speech{}
.char-hub-theme-bridge .char-hub-ms-list{position:relative;padding-left:16px}
.char-hub-theme-bridge .char-hub-ms-list::before{content:'';position:absolute;left:35px;top:14px;bottom:14px;width:0;border-left:2px dashed color-mix(in srgb,var(--hub-accent) 40%,transparent)}
.char-hub-theme-bridge .char-hub-ms-node{width:36px;height:36px;border:2px solid var(--hub-accent);transform:rotate(45deg);background:var(--hub-bg);font-variant-numeric:tabular-nums}
.char-hub-theme-bridge .char-hub-ms-node span{transform:rotate(-45deg);display:block}
.char-hub-theme-bridge .char-hub-ms-item.is-latest .char-hub-ms-node{background:var(--hub-accent);color:var(--bridge-signal-contrast);box-shadow:2px 2px 0 var(--bridge-line-strong)}
.char-hub-theme-bridge .char-hub-ms-date{color:var(--hub-accent);font-variant-numeric:tabular-nums}
.char-hub-theme-bridge .char-hub-ms-hero{border-left:3px solid var(--hub-accent);padding-left:10px;background:var(--hub-panel);margin-top:0}
.panel-overlay.dark .char-hub-theme-bridge .char-hub-ms-list::before{border-left-color:color-mix(in srgb,var(--hub-accent) 24%,transparent)}
.panel-overlay.dark .char-hub-theme-bridge .char-hub-ms-node{background:transparent}
.panel-overlay.dark .char-hub-theme-bridge .char-hub-ms-item.is-latest .char-hub-ms-node{background:var(--hub-accent);box-shadow:2px 2px 0 var(--bridge-line-strong)}
.char-hub-theme-bridge{--ms-cat-first:#4f7f86;--ms-cat-relation:#97762c;--ms-cat-status:#5f6f8e}
.panel-overlay.dark .char-hub-theme-bridge{--ms-cat-first:#7fa9ae;--ms-cat-relation:#c8a052;--ms-cat-status:#8f9cba}
.chronicle-reader-theme-bridge .chronicle-timeline-node{border-radius:50%;background:var(--hub-accent);box-shadow:0 0 0 3px var(--hub-soft)}
.chronicle-reader-theme-bridge .chronicle-timeline-content{background:var(--hub-panel);box-shadow:inset 3px 0 var(--hub-accent)}
.chronicle-reader-theme-bridge .chronicle-detail-text{border-inline-start:0;background:var(--hub-panel);box-shadow:inset 3px 0 var(--hub-accent)}.chronicle-reader-theme-bridge .chronicle-detail-dialogue{background:var(--hub-panel);box-shadow:inset 3px 0 var(--hub-accent)}
.chronicle-reader-theme-bridge .chronicle-dialogue-line{border-inline-start:3px solid var(--hub-accent);background:var(--hub-panel)}.chronicle-reader-theme-bridge .chronicle-dialogue-speaker{border-radius:3px;background:var(--hub-soft)}
/* ===== ★ 主角立绘摆位：证件照小方框（描边样式由 portrait-base bridge 段提供） ===== */
.bridge-protagonist-row .portrait-box{flex:0 0 52px;width:52px;height:52px}
`;
