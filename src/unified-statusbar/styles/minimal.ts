// ===== 奶油手账（代码键沿用 minimal，旧配置与各弹窗 style === 'minimal' 分支不失效）=====
// 浅色：奶油纸底 + 暖棕字 + 樱粉/抹茶/蜂蜜点缀；深色：Catppuccin Mocha 深灰底 + 粉色系。
// 旧变量名（--bg-color/--text-color/--border-color…）保留，全库弹窗沿用；手账专属 token 统一 --mn-* 前缀。
import { baseCSS } from './base';
export const minimalCSS = /* css */ `
.minimal-container{position:relative;font-family:var(--mn-font-body);background-color:var(--mn-paper);background-image:linear-gradient(var(--mn-grid) 1px,transparent 1px),linear-gradient(90deg,var(--mn-grid) 1px,transparent 1px);background-size:18px 18px;color:var(--text-color);padding:12px 12px 14px;border:1.5px solid var(--border-color);border-radius:var(--mn-radius-lg);box-shadow:var(--mn-shadow);font-size:13px;line-height:1.6;max-width:100%;box-sizing:border-box;letter-spacing:0.3px;transition:background-color 0.3s ease,color 0.3s ease,border-color 0.3s ease}

.dark-mode{--ub-success:#a6e3a1;--ub-warning:#f9e2af;--ub-danger:#f38ba8;--bg-color:#1e1e2e;--text-color:#cdd6f4;--border-color:#45475a;--secondary-text:#a6adc8;--tag-border:#45475a;--btn-hover-bg:#f5c2e7;--btn-hover-text:#1e1e2e;--card-border:#585b70;--tab-border-alpha:0.3;--lust:#f5c2e7;--lust-glow:rgba(245,194,231,0.12);--lust-border-soft:rgba(245,194,231,0.3);--lust-bg-faint:rgba(245,194,231,0.06);--lust-bg-hover:rgba(245,194,231,0.12);--divider:#45475a;--text-muted:#a6adc8;--divider-light:#313244;--card:#181825;--text:#cdd6f4;
  --mn-paper:#1e1e2e;--mn-card:#181825;--mn-card-2:#313244;--mn-grid:rgba(205,214,244,0.035);
  --mn-sakura:#f5c2e7;--mn-sakura-soft:rgba(245,194,231,0.14);--mn-sakura-ink:#f5c2e7;
  --mn-matcha:#a6e3a1;--mn-matcha-soft:rgba(166,227,161,0.12);--mn-matcha-ink:#a6e3a1;
  --mn-honey:#f9e2af;--mn-honey-soft:rgba(249,226,175,0.12);--mn-honey-ink:#f9e2af;
  --mn-tape:rgba(245,194,231,0.28);--mn-note:#2a2a3c;--mn-note-line:rgba(180,190,254,0.12);
  --mn-shadow:0 2px 0 rgba(0,0,0,0.25);--mn-shadow-soft:0 1px 0 rgba(0,0,0,0.2);
  --mn-knob:#cdd6f4;--mn-toggle-off:#45475a;
  --ub-overlay-bg:rgba(17,17,27,0.6);
  --ub-scrollbar-thumb:var(--border-color,#45475a);
  --ub-scrollbar-thumb-hover:var(--secondary-text,#a6adc8);
  --ub-text-muted:var(--secondary-text,#a6adc8);
  --ub-bg-card:var(--mn-card,#181825);
  /* 日历兄弟弹窗（长按额外要求 / 事件编辑）挂在 #panelOverlay 直下、不在 .cal-theme-* 内，
     够不到 calendar-base.ts 的弹窗级桥接 → 主题级补同一组变量（浅/深各一套，值取本主题 token） */
  --ub-text:var(--text-color);--ub-divider:var(--border-color);--ub-accent:var(--mn-sakura);--ub-hover-bg:var(--mn-sakura-soft);
  --ub-popup-radius:14px;
  --ub-popup-shadow:0 10px 32px rgba(0,0,0,0.45);
  --ub-popup-border:1.5px solid var(--card-border);
  --ub-popup-bg:var(--bg-color);
  --ub-popup-head-bg:var(--mn-card);
  --ub-popup-head-border:1.5px dashed var(--border-color);
  /* === 立绘主题变量（深色覆盖） === */
  --portrait-bg:#181825;
  --portrait-empty-color:#a6adc8;
  --portrait-border:#585b70;
  --accent:#f5c2e7;
  /* 深色下 --accent 为浅粉，accent 底需配深色字 */
  --accent-ink:#1e1e2e;
  --card-bg:#181825;
}

:root{--ub-success:#5f8f5a;--ub-warning:#a8782a;--ub-danger:#c0565a;--bg-color:#f7f1e6;--text-color:#4a3f36;--border-color:#e2d5c0;--secondary-text:#8a7a6a;--tag-border:#e8dcc8;--btn-hover-bg:#e8a5b0;--btn-hover-text:#ffffff;--card-border:#d9c8ad;--tab-border-alpha:1;--lust:#e07b98;--lust-glow:rgba(224,123,152,0.12);--lust-border-soft:rgba(224,123,152,0.3);--lust-bg-faint:rgba(224,123,152,0.06);--lust-bg-hover:rgba(224,123,152,0.12);--divider:#e2d5c0;--text-muted:#8a7a6a;--divider-light:#efe5d4;--card:#fffaf1;--text:#4a3f36;
  --mn-paper:#f7f1e6;--mn-card:#fffaf1;--mn-card-2:#f3ead9;--mn-grid:rgba(180,150,110,0.07);
  --mn-sakura:#e8a5b0;--mn-sakura-soft:rgba(232,165,176,0.18);--mn-sakura-ink:#b9586c;
  --mn-matcha:#a8c3a0;--mn-matcha-soft:rgba(168,195,160,0.22);--mn-matcha-ink:#5f7f57;
  --mn-honey:#e9c77b;--mn-honey-soft:rgba(233,199,123,0.24);--mn-honey-ink:#8f6a1f;
  --mn-tape:rgba(232,165,176,0.42);--mn-note:#fff6dc;--mn-note-line:rgba(190,160,120,0.22);
  --mn-shadow:0 2px 0 rgba(160,130,90,0.14);--mn-shadow-soft:0 1px 0 rgba(160,130,90,0.12);
  --mn-knob:#ffffff;--mn-toggle-off:#e2d5c0;
  --mn-radius-lg:14px;--mn-radius:10px;--mn-radius-sm:7px;
  --mn-font-body:"HarmonyOS Sans SC","PingFang SC","Noto Sans SC","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;
  --mn-font-hand:"LXGW WenKai","Kaiti SC","STKaiti","KaiTi","楷体","Noto Serif CJK SC",serif;
  /* === 统一变量别名 === */
  --ub-overlay-bg:rgba(74,63,54,0.32);
  --ub-scrollbar-thumb:var(--border-color,#e2d5c0);
  --ub-scrollbar-thumb-hover:var(--secondary-text,#8a7a6a);
  --ub-text-muted:var(--secondary-text,#8a7a6a);
  --ub-bg-card:var(--mn-card,#fffaf1);
  /* 日历兄弟弹窗变量·浅色（深色侧在 .dark-mode 块重声明；:root 处已完成替换，表达式带不动深色） */
  --ub-text:var(--text-color);--ub-divider:var(--border-color);--ub-accent:var(--mn-sakura-ink);--ub-hover-bg:var(--mn-sakura-soft);
  --ub-popup-radius:14px;
  --ub-popup-shadow:0 10px 30px rgba(120,90,60,0.18);
  --ub-popup-border:1.5px solid var(--card-border);
  --ub-popup-bg:var(--bg-color);
  --ub-popup-head-bg:var(--mn-card);
  --ub-popup-head-border:1.5px dashed var(--border-color);
  --ub-btn-radius:8px;
  --ub-toggle-width:40px;--ub-toggle-height:22px;--ub-toggle-knob:16px;
  --ub-ft-ring-start:#f3c6cf;--ub-ft-ring-end:#e8a5b0;--ub-ft-ring-glow:rgba(232,165,176,.32);
  /* === 立绘主题变量 === */
  --portrait-empty-color:#a8968a;
  --portrait-bg:#f3ead9;
  --portrait-border:#d9c8ad;
  --portrait-radius:12px;
  --accent:#b9586c;
  --accent-ink:#ffffff;
  --card-bg:#fffaf1;
}

.en-font{font-family:var(--mn-font-body)}

.top-actions{position:relative;display:flex;justify-content:flex-end;gap:5px;align-items:center;z-index:10;margin-bottom:4px;flex-wrap:wrap}
.theme-toggle{background:var(--mn-card);border:1.5px solid var(--border-color);color:var(--text-color);padding:2px 10px;min-height:26px;border-radius:13px;font-size:11px;cursor:pointer;font-family:var(--mn-font-body);letter-spacing:1px;transition:background-color 0.3s ease,color 0.3s ease,border-color 0.3s ease}
.theme-toggle:hover{background:var(--mn-sakura-soft);border-color:var(--mn-sakura)}

.sys-header{position:relative;margin:6px 0 10px;padding:14px 12px 10px;text-align:center;background:var(--mn-card);border:1.5px solid var(--border-color);border-radius:var(--mn-radius);box-shadow:var(--mn-shadow-soft)}
.sys-header::before{content:'';position:absolute;top:-8px;left:50%;width:68px;height:16px;transform:translateX(-50%) rotate(-2deg);background:var(--mn-tape);border-radius:2px;opacity:.9}
.sys-char-name{font-family:var(--mn-font-hand);font-size:19px;font-weight:700;letter-spacing:2px;color:var(--text-color);margin-bottom:2px;display:inline-block;cursor:pointer;padding:0 6px;background:linear-gradient(transparent 62%,var(--mn-sakura-soft) 62%);transition:opacity 0.15s ease,transform 0.1s ease;user-select:none}
.sys-char-name:hover{opacity:0.8}
.sys-char-name:active{transform:scale(0.96);opacity:0.65}
.sys-location{font-size:14px;font-weight:700;letter-spacing:.5px;margin:2px 0 2px;color:var(--text-color);overflow-wrap:anywhere}
.sys-location::before{content:'✿ ';color:var(--mn-sakura)}
.sys-status{font-family:var(--mn-font-hand);font-size:13px;color:var(--secondary-text);margin-bottom:6px;line-height:1.5}
.sys-status:empty{display:none}
.sys-meta{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:6px;font-size:11.5px;color:var(--secondary-text)}
#sys-time{display:inline-flex;align-items:center;gap:4px;padding:1px 9px;border-radius:11px;background:var(--mn-honey-soft);color:var(--mn-honey-ink);cursor:pointer}
#sys-time:hover{opacity:0.75}

.section-title{display:flex;align-items:center;gap:6px;font-family:var(--mn-font-hand);font-size:15px;font-weight:700;letter-spacing:2px;margin:12px 0 8px 0;color:var(--text-color)}
.section-title::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--mn-sakura);flex:0 0 auto}
.present-header .section-title{margin:0}
.present-actions{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:5px;margin:0;padding:0}
.present-actions .btn-line{padding:5px 4px;text-align:center;white-space:nowrap}

.info-list{display:flex;flex-direction:column;gap:6px}
.info-row{display:flex;font-size:12px;align-items:flex-start;line-height:1.6}
.panel-popup-body .info-row{font-size:var(--ub-ui-font-12,12px)}
.info-label{color:var(--mn-matcha-ink);width:62px;flex-shrink:0;letter-spacing:.5px}
.info-value{color:var(--text-color);flex-grow:1;line-height:1.6}
.status-content .info-row{padding:2px 0}

.status-toggle{cursor:pointer;align-items:center}
.status-toggle:hover .info-value{opacity:0.8}
.status-value-box{display:flex;align-items:center;justify-content:space-between;width:100%}
.status-arrow{transition:transform 0.3s ease;color:var(--secondary-text)}
.status-toggle.active .status-arrow{transform:rotate(180deg);color:var(--mn-sakura-ink)}
.status-content{display:none;margin-top:2px;padding-left:10px;border-left:2px dashed var(--border-color)}

.detail-content{display:none;margin-top:12px;padding-top:12px;border-top:1.5px dashed var(--tag-border)}

.btn-line{background:var(--mn-card);color:var(--text-color);border:1.5px solid var(--border-color);border-radius:var(--ub-btn-radius);padding:4px 11px;font-size:12px;letter-spacing:.5px;cursor:pointer;box-shadow:var(--mn-shadow-soft);transition:background-color 0.2s ease,color 0.2s ease,border-color 0.2s ease;font-family:var(--mn-font-body)}
.btn-line:hover:not(:disabled){border-color:var(--mn-sakura);background:var(--mn-sakura-soft);color:var(--mn-sakura-ink)}
.btn-line:disabled{color:var(--secondary-text);cursor:not-allowed;border-color:var(--tag-border);opacity:0.5}
.wardrobe-protagonist-summary{display:inline-flex;align-items:center;gap:6px;max-width:100%;margin-top:6px;padding:3px 10px;border:1.5px dashed var(--border-color);border-radius:12px;background:transparent;color:var(--text-muted);font-family:var(--mn-font-body);font-size:11px;line-height:1.4;cursor:pointer;text-align:left;overflow:hidden;transition:background-color .2s ease,border-color .2s ease}
.wardrobe-protagonist-summary .wr-sum-label{color:var(--mn-matcha-ink);font-weight:700;flex-shrink:0}
.wardrobe-protagonist-summary .wr-sum-items{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-color)}
.wardrobe-protagonist-summary:hover{border-color:var(--mn-sakura);background:var(--mn-sakura-soft)}
.empty-state{padding:16px 0;text-align:center;font-family:var(--mn-font-hand);font-size:13px;color:var(--secondary-text);letter-spacing:2px;border:1.5px dashed var(--border-color);border-radius:var(--mn-radius);background:var(--mn-card)}

.present-header{display:flex;align-items:center;justify-content:flex-start;flex-wrap:wrap;gap:6px 10px;margin:12px 0 8px;position:relative}

.char-selector-buttons{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-left:0}
.char-select-btn{padding:3px 13px;font-size:13px;font-weight:600;border:1.5px solid var(--border-color);background:var(--mn-card);color:var(--text-color);cursor:pointer;transition:background-color 0.2s ease,color 0.2s ease,border-color 0.2s ease;font-family:var(--mn-font-body);letter-spacing:.5px;border-radius:14px;position:relative}
.char-select-btn:hover{border-color:var(--mn-sakura);background:var(--mn-sakura-soft)}
.char-select-btn.active{background:var(--mn-sakura);border-color:var(--mn-sakura);color:var(--accent-ink)}

.char-card{position:relative;border:1.5px solid var(--border-color);padding:12px;margin-bottom:10px;background:var(--mn-card);border-radius:var(--mn-radius);box-shadow:var(--mn-shadow-soft)}
.char-card-top-row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;align-items:stretch}
.char-card-top-row .portrait-box{flex:0 0 96px;width:96px;height:96px}
@media(min-width:577px){
  .char-card-top-row .portrait-box{flex:0 0 160px;width:160px;height:160px}
}

.diary-preview{flex:1 1 140px;min-width:0;box-sizing:border-box;background:var(--mn-card);background-image:repeating-linear-gradient(transparent 0 23px,var(--mn-note-line) 23px 24px);border:1.5px solid var(--border-color);border-left:4px solid var(--mn-matcha);padding:9px 11px;border-radius:var(--mn-radius-sm);display:flex;flex-direction:column;cursor:pointer;transition:opacity 0.2s,border-color 0.2s;position:relative;min-height:84px}
.diary-preview:hover{opacity:0.85;border-color:var(--mn-matcha)}
.diary-preview-title{font-family:var(--mn-font-hand);font-size:13px;font-weight:700;letter-spacing:2px;color:var(--mn-matcha-ink);margin-bottom:6px;padding-bottom:4px;border-bottom:1.5px dashed var(--tag-border)}
.diary-preview-content{font-size:12.5px;line-height:1.7;color:var(--text-color);flex:1;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;text-overflow:ellipsis;font-family:var(--mn-font-hand);letter-spacing:0.3px}
.diary-preview-empty{color:var(--secondary-text);font-family:var(--mn-font-hand);font-size:12px}
.diary-preview-time{font-size:10.5px;color:var(--secondary-text);margin-top:4px}
.diary-preview-ellipsis{font-size:11px;color:var(--secondary-text);margin-top:2px}

.sticky-note{flex:1 1 200px;min-width:0;box-sizing:border-box;background:var(--mn-note);padding:12px 13px 10px;border-radius:var(--mn-radius-sm);box-shadow:0 2px 6px rgba(120,90,50,0.12);transform:rotate(-0.5deg);position:relative;display:flex;flex-direction:column;font-family:var(--mn-font-hand);min-height:96px}
.sticky-note::after{content:'';position:absolute;top:-7px;left:50%;transform:translateX(-50%) rotate(2deg);width:52px;height:15px;background:var(--mn-tape);border-radius:2px}
.sticky-note-lines{position:absolute;top:40px;left:0;right:0;bottom:0;background:repeating-linear-gradient(transparent,transparent 25px,var(--mn-note-line) 25px,var(--mn-note-line) 26px);pointer-events:none}
.note-content{font-size:15px;line-height:26px;color:var(--text-color);flex-grow:1;word-wrap:break-word;position:relative;z-index:1;letter-spacing:0.3px;margin-top:2px}
.note-emotion{position:relative;top:auto;right:auto;font-size:12px;display:flex;align-items:center;gap:4px;z-index:2}
/* 顶行：情绪块与操作簇。便签宽是**容器宽**（非视口宽），故换行能力必须无条件写在基类里，
   禁用 @media 断点修（MEMORY 铁律 #19）。行可换行 ⇒ 操作簇在窄屏整行下移，不再被挤成
   「簇吃满整行 + 情绪块顶出右端」；操作簇自身也允许换行且不外扩，超长时内部折行。 */
.note-top-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;margin-bottom:6px;padding-bottom:6px;border-bottom:1.5px dashed var(--mn-note-line);position:relative;z-index:1}
.note-top-actions{display:flex;align-items:center;gap:4px;margin-left:auto;flex-wrap:wrap;max-width:100%;min-width:0}

.char-tooltip{position:fixed;z-index:10000;background:var(--mn-card);color:var(--text-color);border:1.5px solid var(--border-color);border-radius:var(--mn-radius-sm);padding:8px 12px;font-size:12px;line-height:1.6;max-width:240px;box-shadow:0 4px 14px rgba(120,90,60,0.16);pointer-events:none;opacity:0;transition:opacity 0.2s ease;font-family:var(--mn-font-body);letter-spacing:0.3px}
.char-tooltip.visible{opacity:1}
.char-tooltip-age{color:var(--secondary-text);font-size:11px;margin-bottom:2px;letter-spacing:1px}
.char-tooltip-intro{color:var(--text-color);font-size:12px;font-family:var(--mn-font-hand)}

.nsfw-overlay{position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;background:var(--ub-overlay-bg);z-index:10001;display:none;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.nsfw-overlay.show{display:flex}
@keyframes nsfw-popup-in{from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
.name-hoverable{position:relative}
.train-value-clickable{cursor:pointer;transition:opacity 0.2s;border-bottom:1.5px dashed var(--mn-sakura);padding-bottom:1px}
.train-value-clickable:hover{opacity:0.7}

.panel-overlay{position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;background:var(--ub-overlay-bg);z-index:10000;display:none;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.panel-overlay.show{display:flex}
.panel-popup{background:var(--bg-color);border:var(--ub-popup-border);border-radius:var(--ub-popup-radius);overflow:hidden;max-width:380px;width:90%;max-height:70vh;min-height:200px;display:flex;flex-direction:column;box-shadow:var(--ub-popup-shadow);animation:nsfw-popup-in 0.3s ease}
.panel-popup-head{display:flex;align-items:center;padding:10px 12px;background:var(--mn-card);border-bottom:1.5px dashed var(--border-color);flex-shrink:0}
.panel-popup-title{font-family:var(--mn-font-hand);font-size:var(--ub-popup-font-title,16px);font-weight:700;letter-spacing:1px;color:var(--text-color);flex:1}
.panel-popup-close,.panel-popup-back{background:var(--bg-color);border:1.5px solid var(--border-color);border-radius:50%;color:var(--secondary-text);width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all 0.2s;font-family:var(--mn-font-body);flex-shrink:0}
.panel-popup-back{width:auto;padding:0 10px;font-size:11px;letter-spacing:.5px;border-radius:13px;margin-right:8px}
.panel-popup-warehouse-toggle{font-size:10px;width:auto;padding:0 10px;height:26px;border:1.5px solid var(--border-color);border-radius:13px;background:var(--bg-color);color:var(--secondary-text);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;font-family:var(--mn-font-body);margin-right:8px;letter-spacing:.5px}
.panel-popup-warehouse-toggle:hover{border-color:var(--mn-sakura);color:var(--mn-sakura-ink)}
.panel-popup-close:hover,.panel-popup-back:hover{border-color:var(--mn-sakura);color:var(--mn-sakura-ink)}
.panel-popup-body{padding:10px 12px;flex:1 1 auto;min-height:0;overflow-y:auto}
.panel-popup-body::-webkit-scrollbar{width:4px}
.panel-popup-body::-webkit-scrollbar-track{background:transparent}
.panel-popup-body::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:2px}
/* 角色信息弹窗 */
.char-info-popup{max-width:420px;width:90%;max-height:80vh;display:flex;flex-direction:column}
.char-info-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:10px 12px}
.char-info-body::-webkit-scrollbar{width:4px}
.char-info-body::-webkit-scrollbar-track{background:transparent}
.char-info-body::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:2px}
.char-info-panel{display:none}
.char-info-panel.active{display:flex;flex-direction:column;gap:0}
.char-info-card{border:1.5px solid var(--border-color);border-radius:var(--mn-radius);background:var(--mn-card);padding:12px}
.char-info-card-name{font-family:var(--mn-font-hand);font-size:16px;font-weight:700;letter-spacing:1px;color:var(--text-color);margin-bottom:8px;padding-bottom:6px;border-bottom:1.5px dashed var(--border-color)}
.char-info-card-rows{display:flex;flex-direction:column;gap:6px}
.char-info-card-rows .info-row{font-size:var(--ub-ui-font-12,12px);align-items:flex-start}
.char-info-card-rows .info-label{width:55px;flex-shrink:0;color:var(--mn-matcha-ink);letter-spacing:.5px}
.panel-empty{text-align:center;padding:20px 0;font-family:var(--mn-font-hand);font-size:13px;color:var(--secondary-text);letter-spacing:1px}

.memo-list-item,.item-list-item,.mission-list-item,.diary-list-item{margin:0 0 6px;padding:9px 11px;background:var(--mn-card);border:1.5px solid var(--border-color);border-radius:var(--mn-radius);cursor:pointer;transition:border-color 0.2s,background-color 0.2s}
.memo-list-item:hover,.item-list-item:hover,.mission-list-item:hover,.diary-list-item:hover{border-color:var(--mn-sakura);background:var(--mn-sakura-soft)}
.memo-list-item:last-child,.item-list-item:last-child,.mission-list-item:last-child,.diary-list-item:last-child{margin-bottom:0}
.memo-item-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.memo-title{font-size:var(--ub-ui-font-13,13px);font-weight:600;color:var(--text-color);letter-spacing:0.5px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.memo-type{font-family:var(--mn-font-body);font-size:10px;color:var(--mn-matcha-ink);background:var(--mn-matcha-soft);padding:1px 8px;border:0;border-radius:10px;letter-spacing:.5px;flex-shrink:0}
.memo-item-sub{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;font-family:var(--mn-font-body);font-size:var(--ub-ui-font-10,10px);color:var(--secondary-text)}
.memo-status,.memo-char,.memo-time-badge{padding:1px 6px;border-radius:9px;background:var(--mn-card-2);letter-spacing:0.3px;font-size:10px}
.item-top{display:flex;align-items:center;gap:8px}
.item-name{font-size:var(--ub-ui-font-13,13px);font-weight:600;color:var(--text-color);letter-spacing:0.5px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item-qty{font-family:var(--mn-font-body);font-size:10.5px;font-weight:700;color:var(--mn-honey-ink);background:var(--mn-honey-soft);padding:1px 8px;border:0;border-radius:10px;flex-shrink:0;letter-spacing:.5px}
.item-type{font-family:var(--mn-font-body);font-size:10px;color:var(--mn-matcha-ink);background:var(--mn-matcha-soft);padding:1px 8px;border:0;border-radius:10px;letter-spacing:.5px;flex-shrink:0}
.item-wardrobe-badge{display:inline-flex;align-items:center;border:0;color:var(--mn-sakura-ink);background:var(--mn-sakura-soft);border-radius:10px;padding:1px 8px;font-size:10px;font-weight:700;letter-spacing:.5px;flex-shrink:0;margin-left:4px;font-family:var(--mn-font-body)}
.item-desc{font-size:var(--ub-ui-font-11,11px);color:var(--secondary-text);margin-top:4px;letter-spacing:0.3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.mission-list-item{position:relative}
.mission-list-item.completed{opacity:0.7}
.mission-list-item .mission-delete{position:absolute;top:8px;right:8px;background:transparent;border:none;color:var(--secondary-text);font-size:14px;cursor:pointer;transition:color 0.2s;font-family:var(--mn-font-body);padding:2px}
.mission-list-item .mission-delete:hover{color:var(--ub-danger)}
.mission-name{font-size:var(--ub-ui-font-13,13px);font-weight:600;color:var(--text-color);letter-spacing:0.5px;margin-bottom:4px;padding-right:24px}
.mission-desc{font-size:var(--ub-ui-font-11,11px);color:var(--secondary-text);margin-bottom:6px;line-height:1.5}
.mission-desc-clickable{cursor:pointer;transition:opacity 0.2s}
.mission-desc-clickable:hover{opacity:0.7}
.mission-objective{font-size:var(--ub-ui-font-11,11px);color:var(--secondary-text);padding:7px 10px;background:var(--bg-color);border:1.5px dashed var(--tag-border);border-left:4px solid var(--mn-honey);line-height:1.6;border-radius:var(--mn-radius-sm)}
.mission-status{display:inline-block;font-family:var(--mn-font-body);font-size:10.5px;padding:1px 9px;border:1.5px solid var(--tag-border);border-radius:10px;margin-top:6px;letter-spacing:.5px;cursor:pointer;transition:all 0.2s}
.mission-status:hover{opacity:0.8}
.mission-status.pending{color:var(--secondary-text);background:transparent}
.mission-status.completed{color:var(--mn-matcha-ink);background:var(--mn-matcha-soft);border-color:var(--mn-matcha)}

.diary-item-top{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--secondary-text);margin-bottom:4px}
.diary-time{flex-shrink:0}
.diary-item-content{font-size:var(--ub-ui-font-12,12px);color:var(--secondary-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;letter-spacing:0.3px}


.panel-popup-body .detail-content{display:block;margin-top:10px;padding-top:10px;border-top:1.5px dashed var(--tag-border)}
.panel-popup-body .detail-content .dc-label{color:var(--mn-matcha-ink);font-size:12px;font-weight:700;letter-spacing:1px;font-family:var(--mn-font-hand);margin-bottom:4px;display:block}
.panel-popup-body .detail-content .dc-text{color:var(--text-color);font-size:var(--ub-ui-font-12,12px);line-height:1.8}
.item-detail-actions{display:flex;gap:8px;margin-top:12px;padding-top:10px;border-top:1.5px dashed var(--tag-border)}
.item-detail-actions .btn-line{flex:1;text-align:center}
.item-discard-btn{color:var(--ub-danger);border-color:var(--ub-danger)}
.item-warehouse-btn{color:var(--secondary-text);border-color:var(--border-color)}
.item-warehouse-btn:hover{border-color:var(--mn-sakura);color:var(--mn-sakura-ink)}
.diary-detail-writer{display:flex;align-items:center;justify-content:center;gap:10px;text-align:center;font-family:var(--mn-font-hand);font-size:13px;color:var(--text-color);letter-spacing:1px;margin-bottom:10px}
.diary-nav-btn{flex:0 0 auto;width:26px;height:26px;line-height:22px;text-align:center;border:1.5px solid var(--border-color);border-radius:50%;background:var(--mn-card);color:var(--text-color);cursor:pointer;font-size:var(--ub-ui-font-10,10px);padding:0;transition:opacity .2s,border-color .2s}
.diary-nav-btn:hover:not(:disabled){border-color:var(--mn-sakura);color:var(--mn-sakura-ink)}
.diary-nav-btn:disabled{opacity:.3;cursor:default}
.diary-nav-indicator{text-align:center;font-size:var(--ub-ui-font-10,10px);color:var(--secondary-text);margin-top:8px;letter-spacing:1px}
.diary-content{padding:10px 0}
.diary-content .dc{color:var(--secondary-text);font-size:12.5px;line-height:1.9;font-family:var(--mn-font-hand)}

/* ===== 日记本背景 ===== */
.diary-notebook{position:relative;padding:16px 16px 16px 30px;margin:8px 0;background:var(--mn-note);border:1.5px solid var(--border-color);border-radius:var(--mn-radius);box-shadow:var(--mn-shadow-soft)}
.diary-notebook::before{content:'';position:absolute;top:0;left:20px;bottom:0;width:1.5px;background:var(--mn-sakura);opacity:.45;pointer-events:none;z-index:1}
.diary-notebook::after{content:'';position:absolute;top:-7px;right:18px;width:54px;height:15px;transform:rotate(3deg);background:var(--mn-tape);border-radius:2px;pointer-events:none;z-index:2}
.diary-notebook-lines{position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(transparent,transparent 27px,var(--mn-note-line) 27px,var(--mn-note-line) 28px);pointer-events:none;z-index:0}
.diary-notebook .diary-content{position:relative;z-index:1;padding:0}
.diary-notebook .diary-content .dc{font-family:"LXGW WenKai","Kaiti SC","STKaiti","KaiTi","楷体","Noto Serif CJK SC",var(--mn-font-hand);font-size:14px;line-height:28px;color:var(--text-color);font-style:normal;letter-spacing:0.5px}
/* 铅笔划掉线 — 粗线，石墨色 */
.diary-notebook .diary-content .dc .strikethrough{text-decoration:line-through;text-decoration-thickness:0.12em;text-decoration-color:var(--secondary-text);opacity:0.7}
/* 水彩笔标记 — 半透明藤黄色块 */
.diary-notebook .diary-content .dc .highlight{background:linear-gradient(180deg,rgba(255,235,160,0.5) 0%,rgba(250,220,140,0.58) 100%);padding:2px 6px;border-radius:3px 7px 4px 5px;box-shadow:0 0 0 1px rgba(220,200,130,0.16),inset 0 -1px 2px rgba(200,180,120,0.1)}
/* 蜡笔波浪下划线 — 灰蓝色 */
.diary-notebook .diary-content .dc .underline{text-decoration:underline;text-decoration-style:wavy;text-decoration-thickness:from-font;text-underline-offset:4px;text-decoration-color:var(--mn-matcha)}
/* 圆珠笔圈圈标注 */
.diary-notebook .diary-content .dc .emphasis{display:inline-block;border:2px solid var(--mn-sakura);border-radius:42% 58% 55% 45% / 48% 45% 55% 52%;padding:0 5px;transform:rotate(-0.5deg);color:inherit;font-weight:600}
/* 铅笔手写体 */
.diary-notebook .diary-content .dc .handwritten{font-family:var(--mn-font-hand);font-size:15px;color:var(--text-color);letter-spacing:0.3px}
/* 潦草字迹 */
.diary-notebook .diary-content .dc .messy{display:inline-block;transform:rotate(-1.2deg) translateY(1px);font-family:var(--mn-font-hand);font-size:14px;color:var(--text-color);letter-spacing:-0.2px}
/* 铅笔涂改遮盖 — 石墨色柔和斜线 */
.diary-notebook .diary-content .dc .censored{position:relative;color:rgba(0,0,0,0.25);padding:0 4px;border-radius:2px;cursor:pointer;transition:all 0.3s;background-color:rgba(0,0,0,0.04);background-image:repeating-linear-gradient(-5deg,transparent,transparent 2.5px,rgba(120,120,120,0.32) 2.5px,rgba(120,120,120,0.32) 3.5px),repeating-linear-gradient(12deg,transparent,transparent 3px,rgba(140,140,140,0.25) 3px,rgba(140,140,140,0.25) 4px),repeating-linear-gradient(-18deg,transparent,transparent 3.5px,rgba(100,100,100,0.28) 3.5px,rgba(100,100,100,0.28) 4.5px);background-repeat:repeat;background-size:24px 24px}
.diary-notebook .diary-content .dc .censored:hover{background-image:none;background-color:transparent;color:inherit;padding:0 4px}
/* 深色：日记本底与线色随 --mn-note/--mn-note-line；仅补深色专属的标记色 */
.dark-mode .diary-notebook .diary-content .dc .highlight{background:rgba(249,226,175,0.22);box-shadow:none}
.dark-mode .diary-notebook .diary-content .dc .censored{color:rgba(205,214,244,0.22);background-color:rgba(205,214,244,0.05);background-image:repeating-linear-gradient(-5deg,transparent,transparent 2.5px,rgba(205,214,244,0.28) 2.5px,rgba(205,214,244,0.28) 3.5px),repeating-linear-gradient(12deg,transparent,transparent 3px,rgba(205,214,244,0.22) 3px,rgba(205,214,244,0.22) 4px)}
.dark-mode .diary-notebook .diary-content .dc .censored:hover{background-image:none;background-color:transparent;color:inherit}
.diary-detail-popup{max-width:520px !important}

.train-bar-wrap{display:flex;align-items:center;gap:8px;width:100%}
.train-bar{flex:1;height:6px;background:var(--mn-card-2);border-radius:3px;overflow:hidden}
.train-fill{height:100%;background:var(--mn-sakura);border-radius:3px;transition:width 0.5s ease}
.train-value{font-family:var(--mn-font-body);font-size:11px;font-weight:700;color:var(--mn-honey-ink);letter-spacing:0.3px;min-width:48px;text-align:right;flex-shrink:0}

.click-heart{position:fixed;pointer-events:none;z-index:9999;font-size:14px;color:var(--mn-sakura);opacity:0.6;animation:heart-rise 1.5s ease-out forwards}
.click-text{position:fixed;pointer-events:none;z-index:9999;font-size:11px;color:var(--secondary-text);white-space:nowrap;animation:text-drift 1.8s ease-out forwards;opacity:0.6;letter-spacing:0.5px}
@keyframes heart-rise{0%{opacity:0.5;transform:translateY(0) scale(0.5)}30%{opacity:0.5;transform:translateY(-20px) scale(1)}100%{opacity:0;transform:translateY(-60px) scale(0.3)}}
@keyframes text-drift{0%{opacity:0;transform:translateY(0) scale(0.8)}15%{opacity:0.6;transform:translateY(-10px) scale(1)}100%{opacity:0;transform:translateY(-50px) translateX(var(--drift-x,20px)) scale(0.6)}}

.play-section{margin-top:12px;padding-top:10px;border-top:1.5px dashed var(--border-color)}
.play-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:6px;flex-wrap:wrap}
.play-section.collapsed .play-grid{display:none}
.play-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.play-select{flex:1;width:100%;max-width:160px;background:var(--bg-color);background-color:var(--bg-color)!important;color:var(--text-color)!important;border:1.5px solid var(--border-color)!important;padding:4px 8px;font-size:11px;font-family:var(--mn-font-body);outline:none;cursor:pointer;transition:border-color 0.2s;appearance:none;border-radius:var(--mn-radius-sm);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center}
.play-select:focus{border-color:var(--mn-sakura)}
.play-select option{background:var(--bg-color)!important;color:var(--text-color)!important}
.play-collapse-btn{background:var(--mn-card);border:1.5px solid var(--border-color);color:var(--secondary-text);width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;transition:all 0.2s;font-family:var(--mn-font-body);margin-right:8px;border-radius:50%}
.play-collapse-btn:hover{border-color:var(--mn-sakura);color:var(--mn-sakura-ink)}
.energy-badge{display:inline-flex;align-items:center;gap:3px;font-family:var(--mn-font-body);font-size:11.5px;font-weight:700;color:var(--mn-sakura-ink);letter-spacing:.3px;padding:1px 9px;border:0;border-radius:11px;background:var(--mn-sakura-soft)}
/* 钱包入口（F35）：紧贴 ⚡ 徽章，取 .energy-badge 同几何（等宽小徽章）；此排最挤故只显「图标+余额」，
   币名在 title；深色由 .minimal-container.dark-mode 变量块自动覆盖（单色系）。 */
.ub-wallet-entry{font-family:var(--mn-font-body);font-size:11.5px;font-weight:700;color:var(--mn-matcha-ink);letter-spacing:.3px;padding:1px 9px;border:0;border-radius:11px;background:var(--mn-matcha-soft);display:inline-flex;align-items:center;gap:4px;white-space:nowrap;cursor:pointer}
.ub-wallet-entry:hover{box-shadow:0 0 0 1.5px var(--mn-matcha)}
.ub-wallet-entry b{font-weight:700;font-variant-numeric:tabular-nums}
.ub-wallet-entry b.neg{color:var(--ub-danger)}
.ub-wallet-entry.ub-wallet-empty{opacity:.55;box-shadow:inset 0 0 0 1.5px var(--mn-matcha);background:transparent}
.item-use-toggle{background:var(--mn-card);color:var(--text-color);border:1.5px solid var(--border-color);padding:3px 10px;font-size:11px;letter-spacing:.5px;cursor:pointer;font-family:var(--mn-font-body);transition:background-color 0.3s ease,color 0.3s ease,border-color 0.3s ease;border-radius:var(--ub-btn-radius)}
.item-use-toggle:hover{background:var(--mn-sakura-soft);border-color:var(--mn-sakura)}
.item-use-toggle.active{background:var(--mn-matcha);color:var(--accent-ink);border-color:var(--mn-matcha)}
.nsfw-guidance-btn{background:var(--mn-sakura);color:var(--accent-ink);border:1.5px solid var(--mn-sakura);padding:3px 10px;font-size:11px;letter-spacing:.5px;cursor:pointer;font-family:var(--mn-font-body);transition:all .3s ease;border-radius:var(--ub-btn-radius);white-space:nowrap}
.nsfw-guidance-btn:hover{filter:brightness(1.05)}
.nsfw-guidance-btn:disabled{opacity:.5;cursor:wait}

.settings-btn{background:var(--mn-card);border:1.5px solid var(--border-color);color:var(--secondary-text);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s ease;flex-shrink:0;width:26px;height:26px;padding:0;border-radius:50%;font-family:var(--mn-font-body)}
.settings-btn:hover{border-color:var(--mn-sakura);background:var(--mn-sakura-soft)}
/* 场景一键切换按钮 */
.scene-btn{background:var(--mn-card);border:1.5px solid var(--border-color);color:var(--secondary-text);font-size:11px;letter-spacing:.5px;cursor:pointer;font-family:var(--mn-font-body);transition:all .3s ease;border-radius:13px;padding:2px 10px;min-height:26px;flex-shrink:0}
.scene-btn:hover{border-color:var(--mn-sakura);background:var(--mn-sakura-soft)}
.scene-btn:disabled{opacity:0.5;cursor:not-allowed}
.scene-btn.scene-active-daily{border-color:var(--mn-matcha);color:var(--mn-matcha-ink);background:var(--mn-matcha-soft)}
.scene-btn.scene-active-nsfw{border-color:var(--mn-sakura);color:var(--accent-ink);background:var(--mn-sakura)}
.settings-overlay{position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;background:var(--ub-overlay-bg);z-index:10002;display:none;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.settings-overlay.show{display:flex}
.settings-popup{background:var(--bg-color);border:var(--ub-popup-border);border-radius:var(--ub-popup-radius);overflow:hidden;max-width:320px;width:90%;height:85vh;display:flex;flex-direction:column;box-shadow:var(--ub-popup-shadow);animation:nsfw-popup-in 0.3s ease}
.settings-popup-head{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--mn-card);border-bottom:1.5px dashed var(--border-color);flex-shrink:0}
.settings-popup-title{font-family:var(--mn-font-hand);font-size:var(--ub-popup-font-title,15px);font-weight:700;letter-spacing:1px;color:var(--text-color);flex:1}
.settings-popup-close{background:var(--bg-color);border:1.5px solid var(--border-color);color:var(--secondary-text);width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .2s;font-family:var(--mn-font-body);border-radius:50%}
.settings-popup-close:hover{border-color:var(--mn-sakura);color:var(--mn-sakura-ink)}
.settings-tabs{display:flex;align-items:stretch;flex:0 0 auto;gap:5px;border-bottom:1.5px dashed var(--border-color);padding:7px 10px;background:var(--bg-color);overflow-x:auto}
.settings-tabs::-webkit-scrollbar{display:none}
.settings-tab{display:flex;align-items:center;justify-content:center;flex:1 1 0;min-width:0;height:32px;flex-shrink:0;padding:4px 10px;border:1.5px solid var(--border-color);border-radius:16px;background:var(--mn-card);color:var(--secondary-text);font-size:13px;line-height:1.2;white-space:nowrap;text-align:center;font-family:var(--mn-font-hand);letter-spacing:.5px;cursor:pointer;transition:background-color .2s,border-color .2s,color .2s;position:relative;font-weight:600}
.settings-tab:hover{color:var(--text-color);border-color:var(--mn-sakura)}
.settings-tab.active{color:var(--accent-ink);background:var(--mn-sakura);border-color:var(--mn-sakura)}
.settings-popup-body{padding:10px 12px;min-height:120px;overflow-y:auto;flex:1}
.settings-tab-content{display:none}
.settings-tab-content.active{display:block;animation:fade-in .2s ease}
.settings-section{margin:10px 0;padding:8px 12px;border-radius:var(--mn-radius);background:var(--mn-card);border:1.5px solid var(--tag-border)}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
.settings-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1.5px dashed var(--tag-border)}
.settings-row:last-child{border-bottom:none}
.settings-label{font-size:var(--ub-ui-font-13,13px);color:var(--text-color);letter-spacing:.3px}
.settings-toggle{flex:0 0 40px;width:40px;height:22px;min-height:0;border-radius:11px;background:var(--mn-toggle-off);cursor:pointer;position:relative;transition:background .2s;border:none;padding:0}
.settings-toggle.on{background:var(--mn-sakura)}
.settings-toggle::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--mn-knob);transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,0.2)}
.settings-toggle.on::after{transform:translateX(18px)}
/* 深色：ON 轨道为浅粉，旋钮改深色才看得清 */
.dark-mode .settings-toggle.on::after{background:#1e1e2e}

.investigate-btn{font-size:10px;font-family:var(--mn-font-body);cursor:pointer;padding:1px 9px;border:1.5px solid var(--border-color);background:var(--mn-card);color:var(--secondary-text);letter-spacing:.5px;transition:all .2s;white-space:nowrap;border-radius:11px;flex-shrink:0}
.investigate-btn:hover{border-color:var(--mn-sakura);background:var(--mn-sakura-soft);color:var(--mn-sakura-ink)}
@keyframes popup-in{from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}

@media(max-width:576px){
  .minimal-container{padding:10px 10px 12px;border-radius:12px}
  .char-card{padding:10px}
  .char-card-top-row .portrait-box{flex-basis:84px;width:84px;height:84px}
  .sticky-note{flex-basis:100%;transform:none}
  .diary-preview{flex-basis:100%}
  .play-grid{grid-template-columns:repeat(2,1fr);gap:6px}
  .present-actions{grid-template-columns:repeat(4,minmax(0,1fr))}
  .settings-btn,.play-collapse-btn{min-width:28px;min-height:28px}
  .char-select-btn{min-height:30px;padding:3px 13px;font-size:12.5px}
  .btn-line{min-height:30px;padding:4px 8px;font-size:12px}
}

/* ===== 固定模式折叠状态 ===== */
#ac-statusbar-wrapper.ub-collapsed{display:none!important;visibility:hidden!important;pointer-events:none!important;overflow:hidden!important}

/* 新手帮助提示按钮 */
.help-tip-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border-color);background:transparent;color:var(--secondary-text);font-size:10px;font-weight:bold;cursor:help;flex-shrink:0;line-height:1;font-family:var(--mn-font-body);transition:all .2s}
.help-tip-btn:hover{border-color:var(--mn-sakura);color:var(--mn-sakura-ink)}

.help-tooltip-global{position:fixed;z-index:100000;max-width:260px;padding:9px 12px;border-radius:var(--mn-radius);background:var(--mn-card);border:1.5px solid var(--border-color);color:var(--text-color);font-size:12px;line-height:1.7;letter-spacing:0.3px;white-space:pre-line;pointer-events:none;box-shadow:0 4px 14px rgba(120,90,60,0.16)}
/* === 过往经历时间轴 · 萦绕（极简，变量驱动，含 dark-mode 继承） === */
.pe-intro{border-left:4px solid var(--mn-matcha);border-radius:var(--mn-radius-sm);padding:6px 10px;background:var(--mn-card)}
.pe-intro-label{color:var(--mn-matcha-ink);font-family:var(--mn-font-hand);font-weight:700}
.pe-intro-text{color:var(--text-color)}
.pe-rail::before{background:var(--border-color)}
.pe-dot{background:var(--mn-sakura);border:2px solid var(--bg-color);box-shadow:0 0 0 1.5px var(--mn-sakura);width:11px;height:11px;top:5px}
.pe-date{display:inline-block;padding:0 8px;border-radius:10px;background:var(--mn-honey-soft);color:var(--mn-honey-ink);font-family:var(--mn-font-body);letter-spacing:.3px;font-weight:700}
.pe-card{color:var(--text-color);background:var(--mn-card);border:1.5px solid var(--border-color);border-radius:var(--mn-radius);padding:8px 10px}
/* === db 弹窗 token 桥接：minimal :root 定义 --card 非 --card-light，补 --card-light（text/divider/accent 已定义） === */
.db-viewer-popup,.db-row-detail-popup,.db-confirm-popup{--card-light:var(--card)}
` + baseCSS + /* css */ `
/* 角色中枢 / 剧情回顾：手账档案 */
.char-hub-theme-minimal,.chronicle-reader-theme-minimal{--hub-bg:var(--mn-card);--hub-panel:var(--bg-color);--hub-line:var(--border-color);--hub-ink:var(--text-color);--hub-muted:var(--secondary-text);--hub-accent:var(--mn-sakura-ink);--hub-soft:var(--mn-sakura-soft);--hub-day:var(--mn-honey-soft);--hub-night:var(--mn-card-2);--hub-night-ink:var(--hub-ink);--hub-pref:var(--mn-matcha-ink)}
.char-hub-theme-minimal .char-hub-gsym.is-female{color:var(--mn-sakura-ink)}.char-hub-theme-minimal .char-hub-gsym.is-male{color:#7a96b8}
.char-hub-theme-minimal .char-hub-lead-banner{background:var(--hub-soft);border-inline-start:4px solid var(--mn-sakura);border-radius:var(--mn-radius-sm)}
.char-hub-theme-minimal .char-hub-action--investigate{color:var(--mn-honey-ink);border-color:var(--hub-line);background:var(--mn-honey-soft)}
.char-hub-theme-minimal .char-hub-action--interview{color:var(--mn-matcha-ink);border-color:var(--hub-line);background:var(--mn-matcha-soft)}
.char-hub-theme-minimal .char-hub-identity,.chronicle-reader-theme-minimal .chronicle-reader-card{border-color:var(--hub-line);background:var(--hub-bg);border-radius:var(--mn-radius);box-shadow:var(--mn-shadow-soft)}
.char-hub-theme-minimal .char-hub-card{border-width:1.5px;border-style:solid;border-radius:var(--mn-radius);background:var(--hub-bg)}.char-hub-theme-minimal .char-hub-card:hover{transform:none}
.char-hub-theme-minimal .char-hub-profile-lede{border-width:0 0 0 4px;border-color:var(--mn-matcha);border-radius:var(--mn-radius-sm);background:var(--mn-matcha-soft)}.char-hub-theme-minimal .char-hub-profile-lede>span{display:none}
.char-hub-theme-minimal .char-hub-prose-card,.char-hub-theme-minimal .char-hub-logic{border-width:1.5px;border-style:dashed;border-radius:var(--mn-radius);background:var(--hub-bg)}.char-hub-theme-minimal .char-hub-section-kicker{font-family:var(--mn-font-hand);letter-spacing:.06em}
.char-hub-theme-minimal .char-hub-logic-index{border:0;border-radius:50%;background:var(--hub-soft);color:var(--hub-accent)}
.char-hub-theme-minimal .char-hub-trait-balance{gap:8px}.char-hub-theme-minimal .char-hub-trait-column{border:1.5px solid var(--hub-line);border-radius:var(--mn-radius);background:var(--hub-bg)}
.char-hub-theme-minimal .char-hub-relation-card{border-width:1.5px;border-style:solid;border-radius:var(--mn-radius);background:var(--hub-bg)}.char-hub-theme-minimal .char-hub-relation-avatar{border-radius:50%;background:var(--hub-soft)}
.char-hub-theme-minimal .char-hub-history-preview{gap:8px}.char-hub-theme-minimal .char-hub-history-background,.char-hub-theme-minimal .char-hub-history-latest{border:1.5px solid var(--hub-line);border-radius:var(--mn-radius);background:var(--hub-bg)}
.char-hub-theme-minimal .char-hub-not-equal{border-width:1.5px;border-style:dashed;border-radius:var(--mn-radius);background:var(--hub-bg)}.char-hub-theme-minimal .char-hub-not-equal-label{background:var(--hub-soft)}
.char-hub-theme-minimal .char-hub-intimacy-slip{border-width:1.5px;border-style:dashed;border-radius:var(--mn-radius);background:var(--hub-soft)}.char-hub-theme-minimal .char-hub-intimacy-slip header span{letter-spacing:.06em}
.char-hub-theme-minimal .char-hub-vitals-strip,.char-hub-theme-minimal .char-hub-vitals-raw,.char-hub-theme-minimal .char-hub-nsfw-card,.char-hub-theme-minimal .char-hub-dual-stat{border-radius:var(--mn-radius);background:var(--hub-bg);box-shadow:var(--mn-shadow-soft);border-width:1.5px}
.char-hub-theme-minimal .char-hub-speech{border-radius:var(--mn-radius);box-shadow:none}
.char-hub-theme-minimal .char-hub-speech-day{background:var(--hub-day)}
.panel-overlay.dark .char-hub-theme-minimal{--hub-day:var(--mn-honey-soft);--hub-night:var(--mn-card-2);--hub-night-ink:var(--hub-ink)}
.char-hub-theme-minimal .char-hub-ms-hero{border-top:2px dashed var(--mn-sakura);border-bottom:1.5px dashed var(--hub-line);padding:8px 2px;margin:0 0 6px;justify-content:space-between}
.char-hub-theme-minimal .char-hub-ms-hero b{font-size:22px}
.char-hub-theme-minimal .char-hub-ms-node{width:auto;height:auto;border:0;background:none;font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.5px;min-width:64px;text-align:left;cursor:pointer;padding:0}
.char-hub-theme-minimal .char-hub-ms-item.is-latest .char-hub-ms-node{color:var(--hub-accent);font-weight:700}
.char-hub-theme-minimal .char-hub-ms-item.is-latest .char-hub-ms-desc{font-weight:600}
body.dark-mode .char-hub-theme-minimal .char-hub-ms-node{color:var(--hub-muted)}
body.dark-mode .char-hub-theme-minimal .char-hub-ms-item.is-latest .char-hub-ms-node{color:var(--hub-accent)}
.char-hub-theme-minimal{--ms-cat-first:var(--mn-honey-ink);--ms-cat-relation:var(--mn-sakura-ink);--ms-cat-status:var(--mn-matcha-ink)}
.chronicle-reader-theme-minimal .chronicle-timeline-node{width:9px;height:9px;border-radius:50%;background:var(--mn-sakura);box-shadow:0 0 0 2px var(--hub-bg),0 0 0 3.5px var(--mn-sakura)}
.chronicle-reader-theme-minimal .chronicle-timeline-content{border-width:1.5px;border-radius:var(--mn-radius);background:var(--hub-bg);box-shadow:var(--mn-shadow-soft)}.chronicle-reader-theme-minimal .chronicle-timeline-content:hover{transform:none}
.chronicle-reader-theme-minimal .chronicle-detail-text{border-width:1.5px;border-inline-start:4px solid var(--mn-matcha);border-radius:var(--mn-radius);background:var(--hub-bg);box-shadow:none}.chronicle-reader-theme-minimal .chronicle-detail-dialogue{border-width:1.5px;border-style:dashed;border-radius:var(--mn-radius);background:var(--hub-soft);box-shadow:none}
.chronicle-reader-theme-minimal .chronicle-dialogue-line{border-width:0 0 0 3px;border-color:var(--mn-sakura);border-radius:var(--mn-radius-sm);background:var(--hub-bg)}.chronicle-reader-theme-minimal .chronicle-dialogue-speaker{border:0;border-radius:9px;background:var(--hub-soft);color:var(--hub-accent)}
/* ===== ★ 主角立绘摆位：身份栏顶部居中（拍立得小照） ===== */
.sys-header .portrait-box{flex:0 0 84px;width:84px;height:84px;margin:0 auto 8px;display:block;padding:4px;background:var(--mn-card);border:1.5px solid var(--border-color);border-radius:var(--mn-radius-sm);transform:rotate(-1.5deg);box-shadow:var(--mn-shadow-soft)}
@media (max-width:576px){
  .sys-header .portrait-box{flex-basis:68px;width:68px;height:68px;margin-bottom:6px}
}
/* ===== 通用弹窗深色（数据库/确认框/设置子面板等共享骨架）：仅本主题注入，避免 .dark-mode 规则串到 bridge/ios ===== */
.dark-mode .option-item{background:var(--mn-card);border-color:var(--border-color);color:var(--text-color)}
.dark-mode .option-item:hover{background:var(--mn-sakura-soft);border-color:var(--mn-sakura)}
.dark-mode .image-provider-btn{background:var(--mn-card);color:var(--text-color);}
.dark-mode .image-provider-btn.active{background:var(--mn-sakura);color:var(--accent-ink);}
.dark-mode .ub-preset-panel{background:var(--mn-note);border-left-color:var(--mn-honey);border-radius:var(--mn-radius-sm);}
.dark-mode .db-tab{background:var(--mn-card);border-color:var(--border-color);color:var(--secondary-text);border-radius:var(--mn-radius-sm)}
.dark-mode .db-tab[data-active="1"]{background:var(--mn-sakura);color:var(--accent-ink);border-color:var(--mn-sakura)}
.dark-mode .db-card{background:var(--mn-card);border:1.5px solid var(--border-color);border-radius:var(--mn-radius);box-shadow:var(--mn-shadow-soft)}
.dark-mode .db-card:hover{border-color:var(--mn-sakura)}
.dark-mode .db-card-title{color:var(--text-color);border-color:var(--border-color);font-family:var(--mn-font-hand)}
.dark-mode .db-row-field textarea,.dark-mode .db-edit-btn{background:var(--mn-card-2);color:var(--text-color);border-color:var(--border-color);border-radius:var(--mn-radius-sm)}
.dark-mode .db-row-field textarea:focus,.dark-mode .db-edit-btn:hover{border-color:var(--mn-sakura);color:var(--text-color)}
.dark-mode .db-edit-btn.primary,.dark-mode .db-edit-btn.primary:hover{background:var(--mn-sakura);color:var(--accent-ink);border-color:var(--mn-sakura)}
.dark-mode .db-merge-mark{background:var(--mn-matcha-soft);border-color:var(--border-color);color:var(--mn-matcha-ink)}
.dark-mode .db-search,.dark-mode .db-sort-select{background:var(--mn-card-2);color:var(--text-color);border-color:var(--border-color);border-radius:var(--mn-radius-sm)}
.dark-mode .db-search:focus,.dark-mode .db-sort-select:focus{border-color:var(--mn-sakura)}
.dark-mode .db-add-btn,.dark-mode .db-sort-dir{background:var(--mn-sakura-soft);border-color:var(--border-color);color:var(--mn-sakura-ink);border-radius:var(--ub-btn-radius)}
.dark-mode .db-add-btn:hover,.dark-mode .db-sort-dir:hover{background:var(--mn-sakura);color:var(--accent-ink);border-color:var(--mn-sakura)}
.dark-mode .db-hit{background:var(--mn-honey-soft);color:var(--mn-honey-ink);border-radius:var(--mn-radius-sm)}
.dark-mode .db-lock-icon.is-locked{color:var(--mn-sakura-ink)}
.dark-mode .db-card-lock:hover,.dark-mode .db-cell-lock-btn:hover{background:var(--mn-sakura-soft)}
.dark-mode .db-row-field.is-cell-locked textarea{background:var(--mn-card-2);color:var(--secondary-text)}
.dark-mode .db-merge-form input,.dark-mode .db-merge-preview,.dark-mode .db-merge-segment-preview{background:var(--mn-card-2);border-color:var(--border-color);color:var(--text-color);border-radius:var(--mn-radius-sm)}
.dark-mode .db-merge-form input:focus{border-color:var(--mn-sakura)}
.dark-mode .db-merge-progress-bar-wrap{background:var(--mn-card-2);border-radius:var(--mn-radius-sm)}
.dark-mode .db-merge-progress-bar{background:var(--mn-sakura);border-radius:inherit}
.dark-mode .db-merge-segment-card{background:var(--mn-card);border:1.5px solid var(--border-color);border-radius:var(--mn-radius);box-shadow:var(--mn-shadow-soft)}
.dark-mode .cm-am-grid,.dark-mode .cm-am-detail{background:var(--mn-card-2);border-color:var(--border-color);color:var(--text-color);border-radius:var(--mn-radius)}
.dark-mode .cm-am-btn{background:var(--mn-card);border-color:var(--border-color);color:var(--secondary-text);border-radius:var(--ub-btn-radius)}
.dark-mode .cm-am-btn:hover{background:var(--mn-sakura-soft);border-color:var(--mn-sakura);color:var(--mn-sakura-ink)}
.dark-mode .cm-am-btn.is-in-range{background:var(--mn-sakura);border-color:var(--mn-sakura);color:var(--accent-ink)}
.dark-mode .cm-am-btn.is-merged{background:var(--mn-matcha-soft);border-color:var(--mn-matcha);color:var(--mn-matcha-ink)}
.dark-mode .cm-am-detail-head{color:var(--mn-sakura-ink)}
.dark-mode .ub-confirm-dialog{background:var(--mn-card);border:var(--ub-popup-border);border-radius:var(--ub-popup-radius);box-shadow:var(--ub-popup-shadow)}
.dark-mode .ub-confirm-title{color:var(--text-color);border-bottom:1.5px dashed var(--border-color);font-family:var(--mn-font-hand)}
.dark-mode .ub-confirm-input,.dark-mode .ub-confirm-btn{background:var(--mn-card-2);color:var(--text-color);border-color:var(--border-color);border-radius:var(--mn-radius-sm)}
.dark-mode .ub-confirm-btn-ok,.dark-mode .ub-confirm-btn-ok:hover{background:var(--mn-sakura);color:var(--accent-ink);border-color:var(--mn-sakura)}
.dark-mode .ub-nsfw-extra-dialog{background:var(--mn-card);border:var(--ub-popup-border);border-radius:var(--ub-popup-radius);box-shadow:var(--ub-popup-shadow)}
.dark-mode .ub-nsfw-extra-title{color:var(--text-color);font-family:var(--mn-font-hand)}
.dark-mode .ub-nsfw-extra-preset-btn{background:var(--mn-honey-soft);color:var(--mn-honey-ink);border-color:var(--border-color)}
.dark-mode .ub-nsfw-extra-textarea,.dark-mode .ub-nsfw-extra-btn{background:var(--mn-card-2);color:var(--text-color);border-color:var(--border-color);border-radius:var(--mn-radius-sm)}
.dark-mode .ub-nsfw-extra-btn-primary,.dark-mode .ub-nsfw-extra-btn-primary:hover{background:var(--mn-sakura);color:var(--accent-ink);border-color:var(--mn-sakura)}
.dark-mode .ub-batch-bar{background:var(--mn-card);color:var(--text-color);border-top:1.5px dashed var(--border-color)}
.dark-mode .settings-section-summary > .summary-desc,.dark-mode .settings-section-summary::-webkit-details-marker{color:var(--secondary-text);}
.dark-mode .ub-ai-bar,.dark-mode .ub-ai-list{
  --ai-bg:var(--mn-card-2);
  --ai-text:var(--text-color);
}
.dark-mode .ub-api-subsection-desc{color:var(--secondary-text);}
.dark-mode .ub-preset-panel-title,.dark-mode .ub-adv-check{color:var(--text-color);}
.dark-mode .ub-preset-panel-desc{color:var(--secondary-text);}
.dark-mode .db-card-value,.dark-mode .db-row-field-value,.dark-mode .db-confirm-body{color:var(--text-color)}
.dark-mode .db-card-label,.dark-mode .db-row-field-label{color:var(--secondary-text)}
.dark-mode .db-card-del{color:var(--secondary-text)}
.dark-mode .db-lock-icon{color:var(--secondary-text)}
.dark-mode .db-merge-warning-list,.dark-mode .db-merge-form label,.dark-mode .db-merge-segment-head,.dark-mode .db-merge-segment-am,.dark-mode .db-merge-resume-hint{color:var(--text-color)}
.dark-mode .cm-mode-row,.dark-mode .cm-cond{color:var(--text-color)}
.dark-mode .cm-seg-line{color:var(--secondary-text)}
.dark-mode .ub-confirm-message{color:var(--text-color)}
.dark-mode .ub-confirm-btn-danger,.dark-mode .ub-confirm-btn-danger:hover{background:var(--ub-danger);border-color:var(--ub-danger);color:var(--accent-ink)}
.dark-mode .ub-nsfw-extra-sub,.dark-mode .ub-nsfw-extra-close{color:var(--secondary-text)}
.dark-mode .ub-batch-action{border-color:var(--border-color);color:var(--text-color);border-radius:var(--ub-btn-radius)}
.dark-mode .ub-batch-action[data-batch-action="delete"],.dark-mode .ub-batch-action[data-batch-action="discard"]{color:var(--ub-danger);border-color:var(--ub-danger)}
/* ===== 选项栏 / AI 条（覆盖 baseCSS 的通用极简规则） ===== */
.minimal-container .options-bar{margin-top:10px;padding-top:8px;border-top:1.5px dashed var(--border-color)}
.minimal-container .options-bar-header{justify-content:flex-start}
.minimal-container .options-bar-title{padding-left:0;display:inline-flex;align-items:center;gap:6px;font-family:var(--mn-font-hand);font-size:14px;font-weight:700;letter-spacing:1px;opacity:1;text-transform:none;color:var(--text-color)}
.minimal-container .options-bar-title::before{position:static;transform:none;width:8px;height:8px;border-radius:50%;background:var(--mn-sakura);opacity:1}
.minimal-container .options-bar-items{display:flex;flex-direction:column;gap:6px}
.minimal-container .option-item{display:flex;align-items:center;gap:8px;padding:7px 10px;text-align:left;border:1.5px solid var(--border-color);border-radius:var(--mn-radius);background:var(--mn-card);color:var(--text-color);box-shadow:var(--mn-shadow-soft)}
.minimal-container .option-item:last-child{border-bottom:1.5px solid var(--border-color)}
.minimal-container .option-item:hover{border-color:var(--mn-sakura);border-left:1.5px solid var(--mn-sakura);padding-left:10px;background:var(--mn-sakura-soft)}
.minimal-container .option-number{flex:0 0 auto;min-width:1.2em;padding:0;background:none;border:0;border-radius:0;text-align:center;line-height:1.6;color:var(--mn-sakura-ink);font-weight:700;font-size:13px;font-family:var(--mn-font-body)}
.minimal-container .option-text{min-width:0;flex:1;align-self:center;font-size:12.5px;line-height:1.6;overflow-wrap:anywhere}
.minimal-container > .ub-ai-bar{margin:-12px -12px 10px;border-radius:var(--mn-radius-lg) var(--mn-radius-lg) 0 0}
@media(max-width:600px){.minimal-container > .ub-ai-bar{margin:-10px -10px 8px}}
`;
