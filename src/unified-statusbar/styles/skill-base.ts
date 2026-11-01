// styles/skill-base.ts
// 5 主题 5 风格天赋树 CSS（CSS 变量驱动），镜像 map-base.ts。
// 风格：古风 层岩 / 云海仙踪 星轨 / 瑟瑟 流光 / 甜恋 糖果宝石 / 萦绕 墨痕。
import type { StyleType } from '../core/constants';

export const SKILL_THEME_VARS: Record<StyleType, Record<string, string>> = {
  ancient: {
    '--skill-bg': '#f3e8d0', '--skill-bg2': '#e6d3ad',
    '--skill-accent': '#8b2e2e', '--skill-gold': '#c9a96e',
    '--skill-act': '#f3e8d0', '--skill-act-bg': '#8b2e2e',
    '--skill-lock': '#ddd0b8', '--skill-lock-text': '#8a7a6a',
    '--skill-text': '#3a2a1a', '--skill-muted': '#6a5a3a',
    '--skill-edge': '#cdb990', '--skill-shape': 'rect', '--skill-conn': 'ortho', '--skill-font': 'var(--ub-font-ui,"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif)',
  },
  xianxia: {
    '--skill-bg': '#1a3a52', '--skill-bg2': '#08182a',
    '--skill-accent': '#9ef0ff', '--skill-gold': '#7fe3f5',
    '--skill-act': '#0a2030', '--skill-act-bg': '#9ef0ff',
    '--skill-lock': '#16304a', '--skill-lock-text': '#5a7a92',
    '--skill-text': '#dffbff', '--skill-muted': '#9fc4d8',
    '--skill-edge': '#2c4458', '--skill-shape': 'circle', '--skill-conn': 'bezier', '--skill-font': 'sans',
  },
  flirtatious: {
    '--skill-bg': '#2a0f3e', '--skill-bg2': '#160627',
    '--skill-accent': '#ff5ec4', '--skill-gold': '#a040ff',
    '--skill-act': '#fff', '--skill-act-bg': '#ff5ec4',
    '--skill-lock': '#2a1438', '--skill-lock-text': '#7a5a8a',
    '--skill-text': '#ffd9f4', '--skill-muted': '#c89ad8',
    '--skill-edge': '#4a2858', '--skill-shape': 'capsule', '--skill-conn': 'bezier', '--skill-font': 'sans',
  },
  sweet: {
    '--skill-bg': '#fff3fa', '--skill-bg2': '#ffd9ec',
    '--skill-accent': '#ff5e9c', '--skill-gold': '#ffd28a',
    '--skill-act': '#fff', '--skill-act-bg': '#ff5e9c',
    '--skill-lock': '#fce4f0', '--skill-lock-text': '#d8a0c0',
    '--skill-text': '#3a2a1a', '--skill-muted': '#a0426a',
    '--skill-edge': '#f0c4d8', '--skill-shape': 'gem', '--skill-conn': 'bezier', '--skill-font': 'sans',
  },
  minimal: {
    '--skill-bg': 'var(--mn-paper)', '--skill-bg2': 'var(--mn-card-2)',
    '--skill-accent': 'var(--mn-sakura)', '--skill-gold': 'var(--mn-honey-ink)',
    '--skill-act': 'var(--accent-ink)', '--skill-act-bg': 'var(--mn-sakura)',
    '--skill-lock': 'var(--mn-card-2)', '--skill-lock-text': 'var(--secondary-text)',
    '--skill-text': 'var(--text-color)', '--skill-muted': 'var(--secondary-text)',
    '--skill-edge': 'var(--border-color)', '--skill-shape': 'capsule', '--skill-conn': 'ortho', '--skill-font': 'var(--mn-font-body)',
  },
  bridge: {
    '--skill-bg': 'var(--bridge-panel)', '--skill-bg2': 'var(--bridge-panel-2)',
    '--skill-accent': 'var(--bridge-signal)', '--skill-gold': 'var(--bridge-alert)',
    '--skill-act': 'var(--bridge-signal-contrast)', '--skill-act-bg': 'var(--bridge-signal)',
    '--skill-lock': 'var(--bridge-panel-inset)', '--skill-lock-text': 'var(--bridge-muted)',
    '--skill-text': 'var(--bridge-text)', '--skill-muted': 'var(--bridge-muted)',
    '--skill-edge': 'var(--bridge-line)', '--skill-shape': 'rect', '--skill-conn': 'ortho', '--skill-font': 'var(--bridge-font-ui)',
  },
  ios: {
    '--skill-bg': '#f2f2f7', '--skill-bg2': '#e8e8ed',
    '--skill-accent': '#007aff', '--skill-gold': '#ff9500',
    '--skill-act': '#ffffff', '--skill-act-bg': '#007aff',
    '--skill-lock': 'rgba(120,120,128,.14)', '--skill-lock-text': 'rgba(60,60,67,.45)',
    '--skill-text': '#1c1c1e', '--skill-muted': 'rgba(60,60,67,.62)',
    '--skill-edge': 'rgba(60,60,67,.14)', '--skill-shape': 'capsule', '--skill-conn': 'bezier', '--skill-font': 'var(--ios-font,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei UI",sans-serif)',
  },
};

// 浅色主题（ancient/sweet/minimal）的 --skill-* 在深色 overlay 内仍是浅底，需深色覆盖。
// xianxia/flirtatious 本即深色调；bridge 的画布与弹窗均通过 --bridge-* 跟随主题浅深。
export const SKILL_DARK_VARS: Partial<Record<StyleType, Record<string, string>>> = {
  ancient: {
    '--skill-bg': '#2a2018', '--skill-bg2': '#1e1610',
    '--skill-text': '#e0d4b8', '--skill-muted': '#a8987b',
    '--skill-edge': '#5a4a30', '--skill-lock': '#3a2e1a', '--skill-lock-text': '#8a7a6a',
    '--skill-act': '#e0d4b8', '--skill-act-bg': '#d4564e',
  },
  sweet: {
    '--skill-bg': '#241c28', '--skill-bg2': '#1a141c',
    '--skill-text': '#e8d8e0', '--skill-muted': '#b898a0',
    '--skill-edge': '#3a2a38', '--skill-lock': '#2a1c28', '--skill-lock-text': '#a08090',
    '--skill-act': '#e8d8e0', '--skill-act-bg': '#ff8fab',
  },
  minimal: {
    '--skill-bg': 'var(--mn-paper)', '--skill-bg2': 'var(--mn-card-2)',
    '--skill-text': 'var(--text-color)', '--skill-muted': 'var(--secondary-text)',
    '--skill-edge': 'var(--border-color)', '--skill-lock': 'var(--mn-card-2)', '--skill-lock-text': 'var(--secondary-text)',
    '--skill-accent': 'var(--mn-sakura)', '--skill-act': 'var(--accent-ink)', '--skill-act-bg': 'var(--mn-sakura)',
    '--skill-gold': 'var(--mn-honey-ink)',
  },
  ios: {
    '--skill-bg': '#1c1c1e', '--skill-bg2': '#2c2c2e',
    '--skill-text': '#f2f2f7', '--skill-muted': 'rgba(235,235,245,.62)',
    '--skill-edge': 'rgba(235,235,245,.14)', '--skill-lock': '#2c2c2e', '--skill-lock-text': 'rgba(235,235,245,.4)',
    '--skill-accent': '#0a84ff', '--skill-gold': '#ff9f0a', '--skill-act': '#f2f2f7', '--skill-act-bg': '#0a84ff',
  },
};

/**
 * 灵动玻璃：技能弹窗头部与其余窗口统一为玻璃头。
 * .sk-head/.sk-detail .hd 基底用 --skill-accent 当纯色块（iOS 下=#007aff 纯蓝条），
 * 与其他窗口的 surface+hairline 头部语言不符；此处按 iOS 面板头重写。
 * 经 injectSkillCSS 仅在 style==='ios' 时拼接（置于 SKILL_BASE_CSS 之后赢级联）。
 */
export const SKILL_IOS_CSS = `
.sk-popup .sk-head{background:var(--ios-surface,#f2f2f7);color:var(--ios-label,#1c1c1e);border-bottom:1px solid var(--ios-sep,rgba(60,60,67,.12));padding:12px 14px;-webkit-backdrop-filter:var(--ios-blur,blur(22px) saturate(1.8));backdrop-filter:var(--ios-blur,blur(22px) saturate(1.8))}
.sk-popup .sk-title{font-weight:700;letter-spacing:-.2px}
.sk-popup .sk-head .sk-btn{min-width:28px;height:28px;border:none;border-radius:999px;background:var(--ios-fill,rgba(120,120,128,.10));color:var(--ios-label-2,rgba(60,60,67,.62))}
.sk-popup .sk-head .sk-btn:hover{background:var(--ios-fill-2,rgba(120,120,128,.16));color:var(--ios-label,#1c1c1e)}
.sk-popup .sk-head .sk-btn:active{transform:scale(.92)}
.sk-detail .hd,.sk-confirm .hd{background:var(--ios-tint,rgba(0,122,255,.10));color:var(--ios-accent,#007aff)}
`;

export function buildSkillThemeVarsCss(style: string): string {
  const vars = (SKILL_THEME_VARS as Record<string, Record<string, string>>)[style] || SKILL_THEME_VARS.ancient;
  const decls = Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join('\n  ');
  return `:root {\n  ${decls}\n}`;
}

/** 浅色主题的深色 --skill-* 覆盖（scoped 到深色 overlay），非浅色主题返回空串。 */
export function buildSkillDarkVarsCss(style: string): string {
  const vars = (SKILL_DARK_VARS as Record<string, Record<string, string>>)[style];
  if (!vars) return '';
  const decls = Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join('\n  ');
  return `.panel-overlay.dark,.settings-overlay.dark,.nsfw-overlay.dark,#ac-content.dark,body.dark-mode{\n  ${decls}\n}`;
}

/** 怪盗手记：技能弹窗与画布共用随主题浅深切换的纸面变量。 */
export const SKILL_BRIDGE_LIGHT_VARS: Record<string, string> = {
  '--skill-text': 'var(--bridge-text)',
  '--skill-muted': 'var(--bridge-muted)',
  '--skill-edge': 'var(--bridge-line)',
  '--skill-bg': 'var(--bridge-panel)',
  '--skill-bg2': 'var(--bridge-panel-2)',
  '--skill-lock-text': 'var(--bridge-muted)',
};

/** 浅色技能弹窗的局部主题变量。 */
export function buildSkillBridgeLightVarsCss(): string {
  const decls = Object.entries(SKILL_BRIDGE_LIGHT_VARS).map(([k, v]) => `${k}: ${v};`).join('\n  ');
  return `body:not(.dark-mode) #panelOverlay:not(.dark) .sk-popup,\nbody:not(.dark-mode) #panelOverlay:not(.dark) .bridge-module-skill-tree,\nbody:not(.dark-mode) #panelOverlay:not(.dark) .bridge-module-skill-detail{\n  ${decls}\n}`;
}

export const SKILL_BASE_CSS = `
.panel-popup.skill-tree-popup{width:94vw;max-width:680px;height:74vh;height:74dvh;max-height:74vh;max-height:74dvh;min-height:0}
.skill-tree-popup>.panel-popup-body{display:flex;flex-direction:column;overflow:hidden}
.skill-tree-popup .skill-tree-container{flex:1 1 auto;height:auto;min-height:0}
.skill-tree-popup .sk-legend{flex:0 0 auto}
@media(max-width:720px){.panel-popup.skill-tree-popup{width:94vw;max-width:94vw;height:82vh;height:82dvh;max-height:82vh;max-height:82dvh}}
.skill-tree-container{position:relative;width:100%;height:55vh;height:55dvh;overflow:hidden;background:linear-gradient(var(--skill-bg),var(--skill-bg2));border-radius:8px;touch-action:none;user-select:none;-webkit-user-select:none}
.skill-tree-viewport{width:100%;height:100%;transform-origin:0 0}
/* 注：不要加 will-change:transform——会强制合成层栅格化，SVG 放大后文字模糊（地图 map-base.ts 已踩过此坑）。矢量内容随 transform 缩放保持清晰。 */
.skill-tree-svg{width:100%;height:100%;display:block}
.skill-main-line-theme{fill:var(--skill-accent);font-size:12px;font-weight:700;letter-spacing:1px;paint-order:stroke;stroke:var(--skill-bg);stroke-width:3px;stroke-linejoin:round;pointer-events:none}
.skill-tree-zoom-controls{position:absolute;right:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px;z-index:5}
.sk-btn.sk-zoom-btn{min-width:30px;height:30px;padding:0;border:1px solid var(--skill-gold);border-radius:6px;background:color-mix(in srgb,var(--skill-text) 14%,transparent);color:var(--skill-text);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.sk-zoom-btn:active{background:rgba(255,255,255,.3)}
.skill-node{cursor:pointer}
.skill-node:hover{filter:drop-shadow(0 0 2.5px var(--skill-accent))}
/* 激活成功后回树视图时高亮的「下一个可激活节点」 */
.skill-node.sk-n-next{filter:drop-shadow(0 0 5px var(--skill-accent))}
.sk-legend{display:flex;gap:12px;justify-content:center;padding:6px;font-size:11px;color:var(--skill-muted);flex-wrap:wrap}
/* F29 变体 A：树头风味标签挂签（AI 生成时随树存档），取技能自身主题色 --skill-accent。
   颜色两段声明=渐进增强：旧引擎不认识 color-mix 时，前一段实色描边仍保证「有签可见」。 */
.sk-flavor{display:inline-block;margin-left:9px;padding:2px 10px;border-radius:999px;font-size:var(--ub-ui-font-11,11px);font-style:normal;font-weight:600;letter-spacing:.5px;vertical-align:2px;white-space:nowrap;color:var(--skill-accent,#7aa2c8);border:1px solid var(--skill-accent,#7aa2c8);background:transparent;border-color:color-mix(in srgb,var(--skill-accent,#7aa2c8) 45%,transparent);background:color-mix(in srgb,var(--skill-accent,#7aa2c8) 12%,transparent)}
/* 窄屏（手机 94vw）：挂签收一档，避免它把本就多行的树头再顶高一行（产品宽 680px 下实测头栏零增高） */
@media(max-width:560px){.sk-flavor{margin-left:6px;padding:1px 7px;font-size:var(--ub-ui-font-10,10px);letter-spacing:0}}
.sk-legend i{width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:4px}
.sk-n-act text{fill:var(--skill-act)!important}
.sk-n-can text{fill:var(--skill-accent)!important}
.sk-n-lock text{fill:var(--skill-lock-text)!important}
/* 技能列表弹窗（响应式 A） */
.sk-popup{border:1px solid var(--skill-edge);border-radius:10px;overflow:hidden;background:var(--skill-bg);font-family:var(--skill-font,inherit)}
.sk-head{display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--skill-accent);color:var(--skill-act)}
.sk-title{font-size:15px;font-weight:600}
.sk-head .sp{flex:1}
.sk-btn{min-width:28px;min-height:var(--ub-touch-min,32px);padding:0 8px;border:1px solid var(--skill-gold);border-radius:6px;background:rgba(255,255,255,.12);color:var(--skill-act);font-size:13px;cursor:pointer;display:flex;align-items:center}
.sk-btn.close{font-size:16px}
/* 天赋树弹窗头部是主题浅色 panel-popup-head，.sk-btn 的 --skill-act 亮字是为深色强调头设计的，需换自适配配色 */
.skill-tree-popup:not(.bridge-window) .panel-popup-head .sk-btn{color:var(--skill-text);background:var(--skill-bg2);border-color:var(--skill-gold)}
.skill-tree-popup.bridge-window .panel-popup-head .sk-btn{color:var(--bridge-text);background:var(--bridge-panel-2);border-color:var(--bridge-line-strong)}
.sk-body{padding:8px;max-height:72vh;max-height:72dvh;overflow:auto}
.sk-tip{font-size:10px;color:var(--skill-muted);padding:0 4px 6px;border-bottom:1px dashed var(--skill-edge);margin-bottom:4px}
.sk-row{display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--skill-edge);flex-wrap:wrap}
.sk-row:last-child{border-bottom:none}
.sk-name{font-size: var(--ub-ui-font-14,14px);font-weight:600;color:var(--skill-text);white-space:nowrap}
.sk-badge{font-size:10px;padding:1px 6px;border-radius:10px;border:1px solid;white-space:nowrap}
.sk-badge.active{background:var(--skill-accent);color:var(--skill-act);border-color:var(--skill-accent)}
.sk-badge.passive{background:transparent;color:var(--skill-gold);border-color:var(--skill-gold)}
.sk-exp{font-size:var(--ub-ui-font-11,11px);color:var(--skill-muted);background:var(--skill-bg2);padding:1px 5px;border-radius:8px;white-space:nowrap}
.sk-desc{flex:1 1 0;min-width:120px;font-size:var(--ub-ui-font-11,11px);color:var(--skill-muted);white-space:normal;word-break:break-word;line-height:1.45}
.sk-status{font-size:10px;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;color:var(--skill-muted)}
.sk-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.sk-dot.on{background:#5a8a4a}.sk-dot.off{background:none;border:1px solid var(--skill-edge)}
.sk-tree-btn{font-size:11px;min-height:var(--ub-touch-min,32px);padding:3px 8px;border:1px solid var(--skill-accent);border-radius:6px;background:var(--skill-bg2);color:var(--skill-accent);cursor:pointer;white-space:nowrap;margin-left:auto}
.sk-del-btn{font-size:11px;min-height:var(--ub-touch-min,32px);padding:3px 7px;margin-left:10px;border:1px solid var(--skill-lock-text);border-radius:6px;background:transparent;color:var(--skill-lock-text);cursor:pointer;white-space:nowrap}
.sk-del-btn:hover{border-color:#b04040;color:#b04040}
@media(max-width:420px){.sk-desc{flex-basis:100%;order:99;margin-top:3px;white-space:normal;word-break:break-word}.sk-tree-btn{margin-left:auto}}
/* 节点详情 + 激活确认 */
.sk-detail,.sk-confirm{border:1px solid var(--skill-edge);border-radius:10px;background:var(--skill-bg);overflow:hidden;font-family:var(--skill-font,inherit);margin:8px 0}
.sk-detail .hd,.sk-confirm .hd{padding:8px 12px;background:var(--skill-accent);color:var(--skill-act);font-weight:600;display:flex;align-items:center;gap:6px}
.sk-detail .hd .sp,.sk-confirm .hd .sp{flex:1}
.sk-detail .bd,.sk-confirm .bd{padding:10px 12px}
.sk-d-title{font-size:15px;font-weight:600;color:var(--skill-text);display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.sk-d-line{font-size:var(--ub-ui-font-11-5,11.5px);color:var(--skill-muted);margin-top:5px}
.sk-d-desc{font-size:var(--ub-ui-font-12,12px);color:var(--skill-text);line-height:1.5;margin:7px 0;padding:7px 9px;background:var(--skill-bg2);border-left:3px solid var(--skill-accent);border-radius:0 5px 5px 0}
.sk-d-stat{display:flex;justify-content:space-between;gap:8px;font-size:var(--ub-ui-font-11,11px);color:var(--skill-muted);border-top:1px dashed var(--skill-edge);padding-top:6px;flex-wrap:wrap}
/* F81：经验芯片标签/数字分家（数字 tabular 加重） */
.sk-exp em{font-style:normal;opacity:.62;font-size:10px}
.sk-exp b.num{font-variant-numeric:tabular-nums;font-size:12px;margin-left:2px}
/* F82：前置激活状态签（已激活=success / 未激活=danger，语义对齐 sk-d-state）+ 持有资源签 */
.sk-d-pre{display:inline-flex;align-items:center;gap:3px;margin-left:6px;padding:0 6px;border-radius:99px;font-size:10px;border:1px solid currentColor}
.sk-d-pre.on{color:var(--ub-success,#3F6A52)}
.sk-d-pre.off{color:var(--ub-danger,#A13B34)}
.sk-have{display:inline-flex;align-items:center;gap:3px;font-variant-numeric:tabular-nums}
.sk-have .ub-ic{width:12px;height:12px;color:var(--skill-accent);opacity:.8}
.sk-have b.num{font-weight:700}
b.num,.num{font-variant-numeric:tabular-nums}
.sk-d-warn{font-size:10px;color:var(--skill-muted);background:var(--skill-bg2);border:1px solid var(--skill-edge);border-radius:5px;padding:5px 8px;margin-top:7px}
.sk-d-state{font-size:var(--ub-ui-font-12,12px);font-weight:600;text-align:center;padding:6px}
.sk-d-state.activated{color:#5a8a4a}.sk-d-state.lock{color:var(--skill-lock-text)}
.sk-act-btn{font-size:13px;padding:6px 18px;border:1px solid var(--skill-accent);border-radius:7px;background:var(--skill-accent);color:var(--skill-act);cursor:pointer;font-weight:600}
.sk-act-btn.ghost{background:var(--skill-bg2);color:var(--skill-accent)}
.sk-act-btn[disabled]{opacity:.5;cursor:not-allowed}
.sk-edit-summary{margin:4px 0 10px;color:var(--skill-muted);font-size:12px}.sk-edit-actions{margin-bottom:10px}.sk-edit-node-list{display:flex;flex-wrap:wrap;gap:6px}.sk-edit-node-list .sk-btn{color:var(--skill-text);background:var(--skill-bg2);border-color:var(--skill-gold)}.sk-edit-node-list{display:flex;flex-wrap:wrap;gap:6px}.sk-edit-form{display:grid;gap:10px}.sk-edit-form label{display:grid;gap:4px;color:var(--skill-muted);font-size:12px}.sk-edit-form input,.sk-edit-form textarea{box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--skill-edge);border-radius:6px;background:var(--skill-bg2);color:var(--skill-text);font:inherit}.sk-edit-form textarea{min-height:84px;resize:vertical}.sk-edit-form select{box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--skill-edge);border-radius:6px;background:var(--skill-bg2);color:var(--skill-text);font:inherit}
.sk-seg{display:flex;border:1px solid var(--skill-edge);border-radius:7px;overflow:hidden}
.sk-seg button{flex:1;border:none;background:var(--skill-bg2);color:var(--skill-muted);padding:7px 0;font-size:12px;cursor:pointer;font-family:inherit}
.sk-seg button.seg-active{background:var(--skill-accent);color:var(--skill-act)}
.sk-field-hint{font-size:10px;color:var(--skill-muted);margin-top:2px;line-height:1.4}
.sk-form-actions{display:flex;gap:8px;margin-top:4px}.sk-form-actions .sk-act-btn{flex:1;padding:8px 0}
/* 长按额外要求弹窗 */
.sk-extra-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10001;display:flex;align-items:center;justify-content:center}
.sk-extra-dialog{background:var(--skill-bg);border:1px solid var(--skill-edge);border-radius:10px;width:90%;max-width:360px;padding:14px}
.sk-extra-dialog textarea{width:100%;min-height:80px;box-sizing:border-box;font-family:inherit;font-size:var(--ub-ui-font-12,12px);padding:8px;border:1px solid var(--skill-edge);border-radius:6px;background:var(--skill-bg2);color:var(--skill-text)}
.sk-extra-dialog .acts{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
/* 怪盗手记：技能手册 */
.bridge-module-skill-tree,.bridge-module-skill-detail{
  --skill-bg:var(--bridge-panel);--skill-bg2:var(--bridge-panel-2);
  --skill-accent:var(--bridge-signal);--skill-gold:var(--bridge-alert);
  --skill-act:var(--bridge-signal-contrast);--skill-act-bg:var(--bridge-signal);
  --skill-lock:var(--bridge-panel-inset);--skill-lock-text:var(--bridge-muted);
  --skill-text:var(--bridge-text);--skill-muted:var(--bridge-muted);--skill-edge:var(--bridge-line);--skill-font:var(--bridge-font-ui);
  --ub-touch-min:32px;
  border-radius:var(--ub-popup-radius)!important;border:var(--ub-popup-border)!important;background:var(--bridge-panel)!important;
  color:var(--bridge-text);box-shadow:var(--ub-popup-shadow);font-family:var(--bridge-font-ui)
}
.bridge-module-skill-tree .panel-popup-head,.bridge-module-skill-detail .panel-popup-head{background:var(--bridge-screen);color:var(--bridge-screen-text);border-bottom:4px solid var(--bridge-signal)}
.bridge-module-skill-tree .skill-tree-container{border-radius:0;border:2px solid var(--bridge-line-strong);background:var(--bridge-panel-alt)}
.bridge-module-skill-tree .skill-node rect{rx:0;ry:0}
.bridge-module-skill-tree .skill-tree-svg{font-family:var(--bridge-font-ui)}
.bridge-module-skill-tree .skill-node:hover{filter:none}
.bridge-module-skill-tree .skill-node.sk-n-next{filter:none}
.bridge-module-skill-tree .sk-zoom-btn,.bridge-module-skill-detail .sk-act-btn{border-radius:0;min-height:32px;box-shadow:3px 3px 0 var(--bridge-offset)}
.bridge-module-skill-tree .sk-zoom-btn{background:var(--bridge-panel);border:2px solid var(--bridge-line-strong);color:var(--bridge-text)}
.bridge-module-skill-tree .sk-zoom-btn:active{background:var(--bridge-screen);color:var(--bridge-screen-text)}
.bridge-module-skill-tree .sk-legend{font-family:var(--bridge-font-ui);letter-spacing:.4px}
.bridge-module-skill-tree .sk-flavor{background:var(--bridge-screen);color:var(--bridge-screen-text);border-color:var(--bridge-line-strong);border-radius:0;box-shadow:3px 3px 0 var(--bridge-offset)}
.bridge-module-skill-detail .sk-detail,.bridge-module-skill-detail .sk-confirm{border:2px solid var(--bridge-line-strong);border-radius:0;background:var(--bridge-panel-alt)}
.bridge-module-skill-detail .sk-detail .hd,.bridge-module-skill-detail .sk-confirm .hd{background:var(--bridge-screen);color:var(--bridge-screen-text);border-bottom:4px solid var(--bridge-signal)}
.bridge-module-skill-detail .sk-d-desc,.bridge-module-skill-detail .sk-d-warn{border-radius:0;background:var(--bridge-panel-inset)}
.sk-popup.bridge-module-skill-detail .sk-head{background:var(--bridge-screen);color:var(--bridge-screen-text);border-bottom:4px solid var(--bridge-signal)}
.bridge-module-skill-detail .sk-head .sk-btn,.bridge-module-skill-detail .hd .sk-btn{background:var(--bridge-screen);color:var(--bridge-screen-text);border-color:var(--bridge-screen-muted)}
.sk-popup.bridge-module-skill-detail .sk-row{border:2px solid var(--bridge-line-strong);border-left:5px solid var(--bridge-line-strong);border-radius:0;background:var(--bridge-panel-alt);margin-bottom:6px;padding:7px}
.sk-popup.bridge-module-skill-detail .sk-row:nth-child(even){border-left-color:var(--bridge-signal)}
.sk-popup.bridge-module-skill-detail .sk-badge{background:var(--bridge-screen);color:var(--bridge-screen-text);border-color:var(--bridge-line-strong);border-radius:0}
.sk-popup.bridge-module-skill-detail .sk-exp,.sk-popup.bridge-module-skill-detail .sk-tree-btn,.sk-popup.bridge-module-skill-detail .sk-del-btn{border-radius:0}
.bridge-module-skill-detail .sk-exp b.num,.bridge-module-skill-detail .sk-have b.num{font-family:var(--bridge-font-data);color:var(--bridge-alert)}
.bridge-module-skill-detail .sk-dot.on{background:var(--bridge-signal)}
.bridge-module-skill-detail .sk-d-state.activated,.bridge-module-skill-detail .sk-d-pre.on{color:var(--bridge-signal)}
.bridge-module-skill-detail .sk-d-pre.off,.bridge-module-skill-detail .sk-del-btn:hover{color:var(--bridge-danger);border-color:var(--bridge-danger)}
.bridge-module-skill-detail .sk-seg{border-radius:0;overflow:visible}
.bridge-module-skill-detail .sk-seg button{border-radius:0}
.bridge-module-skill-detail .sk-seg button.seg-active{background:var(--bridge-screen);color:var(--bridge-screen-text);box-shadow:3px 3px 0 var(--bridge-signal)}
@media(max-width:599px){.panel-popup.bridge-module-skill-tree,.panel-popup.bridge-module-skill-detail{width:100%;height:calc(100vh - var(--ub-ol-pad-total,80px));height:calc(100dvh - var(--ub-ol-pad-total,80px));max-width:none;max-height:none;border-left:0!important;border-right:0!important}}
`;

let _cssCacheStyle: string | null = null;
let _cssCacheText = '';

/** 按 enabled + 当前主题注入/移除技能 CSS。关时 remove（真零开销）。镜像 injectMapCSS。 */
export function injectSkillCSS(enabled: boolean, currentStyle: string): void {
  const existing = document.getElementById('statusbar-skill-style');
  if (!enabled) { if (existing) existing.remove(); _cssCacheStyle = null; return; }
  if (_cssCacheStyle !== currentStyle) {
    _cssCacheStyle = currentStyle;
    _cssCacheText = buildSkillThemeVarsCss(currentStyle) + '\n' + buildSkillDarkVarsCss(currentStyle)
      + (currentStyle === 'bridge' ? '\n' + buildSkillBridgeLightVarsCss() : '')
      + '\n' + SKILL_BASE_CSS
      + (currentStyle === 'ios' ? '\n' + SKILL_IOS_CSS : '');
  }
  if (existing) { if (existing.textContent !== _cssCacheText) existing.textContent = _cssCacheText; return; }
  const el = document.createElement('style');
  el.id = 'statusbar-skill-style';
  el.textContent = _cssCacheText;
  document.head.appendChild(el);
}
