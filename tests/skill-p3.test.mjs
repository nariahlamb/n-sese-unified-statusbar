import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));

async function loadBundle() {
  const out = await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export * as storyStore from './src/unified-statusbar/core/story-floor-store.ts';
        export * as skillStore from './src/unified-statusbar/core/skill-store.ts';
        export * as skillWb from './src/unified-statusbar/core/skill-worldbook.ts';
        export * as dataManager from './src/unified-statusbar/core/data-manager.ts';
      `,
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
}

// 构造轻量模拟宿主要素以驱动真实 skill-worldbook / skill-store / data-manager
const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost:8000' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const sheets = [
  {
    name: '主角技能表',
    content: [
      ['row_id', '技能名称', '技能类别', '技能经验值', '技能描述'],
      ['1', '幽影步', '主动', '120', '在暗影中短暂隐匿身形并快速位移。'],
      ['2', '观察', '被动', '80', '留意周围人群微小的神态与袖口痕迹。'],
      ['3', '九转剑诀', '主动', '300', '凝聚真元挥出连绵剑气。'],
    ],
  },
];

const featureMap = new Map();
const mockChat = [{ is_user: false, mes: '开场白', id: 'm0' }];

// 预置天赋树（含多个强化节点，验证常亮不会泄出长文，selective 才会携带 rebuildSkillDesc）
const treeShadow = {
  version: 1,
  schema: 'skill_talent_tree',
  skillName: '幽影步',
  storyHash: 'h1',
  rootId: 'root',
  nodes: {
    root: { id: 'root', kind: 'base', lineId: '', tier: 0, title: '基础', desc: '在暗影中短暂隐匿身形并快速位移。', cost: 0, parentId: null },
    m1: { id: 'm1', kind: 'main', lineId: 'l1', tier: 1, title: '踏影无声', desc: '长篇天赋强化A：落足不惊落叶、气息收束三息内难以被感知，且能在屋檐阴影之间连续折跃两次。', cost: 20, parentId: 'root' },
    m2: { id: 'm2', kind: 'main', lineId: 'l1', tier: 2, title: '夜行无踪', desc: '主线二阶：月色下移动不留残影。', cost: 40, parentId: 'm1' },
    s1: { id: 's1', kind: 'side', lineId: 'l1', tier: 1, title: '影分身残像', desc: '长篇支线天赋B：在原地留下维持两秒的幻影迷惑追兵。', cost: 30, parentId: 'm1', requires: 'm1' },
  },
  mainLines: [{ id: 'l1', name: '暗影流', nodeIds: ['m1', 'm2'] }],
  editOperationCount: 0,
  activated: ['root', 'm1', 's1'],
  chosenMainLine: 'l1',
  accentColor: '#6688cc',
};

const apiMock = {
  exportTableAsJson: () => ({ sheet_0: sheets[0] }),
};
dom.window.SeseLedgerAPI = {
  realDbPresent: false,
  __legacyFace: apiMock,
};
dom.window.SillyTavern = {
  getContext: () => ({
    chat: mockChat,
    chatId: 'chat_skill_1',
    characterId: 0,
    characters: [{ avatar: 'char.png', name: '角色' }],
    chatMetadata: {},
  }),
};

const { storyStore, skillStore, skillWb, dataManager } = await loadBundle();

// 配置轻量内存 story bundle 以保留真实 skill.tree 读取
const memDomain = {
  replay: () => Object.fromEntries(featureMap.entries()),
  flush: async () => {},
  revision: () => 1,
  append: async () => ({ ok: true }),
  exportJournal: () => ({ entries: [] }),
};
storyStore.configureStoryStorage({
  journal: { readAll: () => Object.fromEntries(featureMap.entries()) },
  portraits: { readAll: () => ({}), replaceAll: async () => true, flush: async () => {}, sync: async () => {}, revision: () => 1 },
  domains: { core: memDomain, map: memDomain },
}, 'chat_skill_1');
featureMap.set('skill.tree:幽影步', treeShadow);

dataManager.invalidateCache();

test('P3：reference 常亮只保留技能名、主动/被动、极简前提，不塞 rebuildSkillDesc 长文', () => {
  const bundle = skillWb.buildSkillWorldbookBundle('reference');
  assert.ok(bundle.catalogContent.includes('幽影步（主动）'));
  assert.ok(bundle.catalogContent.includes('观察（被动）'));
  assert.ok(bundle.catalogContent.includes('九转剑诀（主动）'));
  assert.ok(!bundle.catalogContent.includes('长篇天赋强化A'), '常亮清单不得包含天赋强化长文');
  assert.ok(!bundle.catalogContent.includes('长篇支线天赋B'), '常亮清单不得包含支线天赋长文');
  assert.ok(!bundle.catalogContent.includes('[技能发动：'), 'reference 模式不要求输出发动标签');

  // selective 条目保留完整强化描述
  assert.equal(bundle.detailEntries.length, 3);
  const shadowDetail = bundle.detailEntries.find(d => d.skillName === '幽影步');
  assert.ok(shadowDetail);
  assert.match(shadowDetail.content, /长篇天赋强化A/);
  assert.match(shadowDetail.content, /长篇支线天赋B/);
});

test('P3：避免泛动作误命中，明确行动仅 selective 详述命中的一个技能', () => {
  const bundle = skillWb.buildSkillWorldbookBundle('reference');
  const observeDetail = bundle.detailEntries.find(d => d.skillName === '观察');
  assert.ok(observeDetail);
  assert.equal(observeDetail.keys.includes('观察'), false, '纯泛动作名不得直接作为裸关键词');
  assert.ok(observeDetail.keys.includes('发动观察'));

  // 日常普通对话：不误命中任何技能详述
  assert.equal(skillWb.matchSingleSkillDetailForInput('她坐下来喝了口茶，抬头观察窗外的行人走过。', 'reference'), null);

  // 明确命中单一技能：只返回那一个技能的详述
  const matched = skillWb.matchSingleSkillDetailForInput('我立刻发动幽影步，贴着墙根掠过院落。', 'reference');
  assert.ok(matched);
  assert.equal(matched.skillName, '幽影步');
  assert.match(matched.content, /长篇天赋强化A/);
});

test('P3：tag 模式只标关键施展（日常/被动不标），reconcile 管理常亮与 selective 且 off 不丢数据', () => {
  const tagBundle = skillWb.buildSkillWorldbookBundle('tag');
  assert.match(tagBundle.catalogContent, /关键时刻/);
  assert.match(tagBundle.catalogContent, /被动技能默认不写发动标签/);
  assert.ok(!tagBundle.catalogContent.includes('长篇天赋强化A'), 'tag 模式常亮也不塞天赋强化长文');

  const entries = [];
  assert.equal(skillWb.reconcileSkillWorldbookEntries(entries, tagBundle), true);
  assert.equal(entries.filter(e => e.strategy?.type === 'constant').length, 1);
  const selective = entries.filter(e => e.strategy?.type === 'selective');
  assert.equal(selective.length, 3);
  assert.equal(selective[0].scanDepth, 2);
  assert.equal(selective[0].strategy.scan_depth, undefined);

  // off 模式移除世界书条目，但技能表、经验值与天赋树数据保留不变
  const offBundle = skillWb.buildSkillWorldbookBundle('off');
  assert.equal(offBundle.catalogContent, '');
  assert.equal(offBundle.detailEntries.length, 0);
  assert.equal(skillWb.reconcileSkillWorldbookEntries(entries, ''), true);
  assert.equal(entries.length, 0, 'off 时受管常亮与 selective 条目均撤出世界书');

  // 原有数据完整保留
  assert.equal(dataManager.getCellByHeader('主角技能表', 1, '技能经验值'), '120');
  const treeRead = skillStore.readSkillTree('幽影步');
  assert.ok(treeRead);
  assert.deepEqual(treeRead.activated, ['root', 'm1', 's1']);
});
