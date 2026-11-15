import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));

async function load(file) {
  const out = await build({
    absWorkingDir: root,
    entryPoints: [`src/unified-statusbar/core/world-engine/${file}`],
    bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
}

const ev = await load('world-evolution.ts');
const types = await load('world-types.ts');

function makeState(over = {}) {
  const base = types.emptyWorldState();
  return {
    ...base,
    profiles: {
      小美: { name: '小美', onStage: false, activity: '看书', plans: '', updatedAt: '2026-11-15', lastEvolveRound: 1 },
      阿强: { name: '阿强', onStage: true, activity: '坐在旁边', plans: '', updatedAt: '2026-11-15', lastEvolveRound: 1 },
      小绿: { name: '小绿', onStage: false, activity: '打工', plans: '', updatedAt: '2026-11-15', lastEvolveRound: 1 },
    },
    ...over,
  };
}

test('小手机联动提示词解除强制产出，明确没事留空与冷却限制', () => {
  for (const style of ['', 'xianxia', 'wuxia', 'fantasy']) {
    const rule = ev.PHONE_LINK_RULES[style];
    assert.equal(rule.includes('禁止全部缺席'), false, `style=${style} 仍含禁止缺席`);
    assert.equal(rule.includes('本轮至少产出'), false, `style=${style} 仍含强制最低产出`);
    assert.equal(rule.includes('默认留空'), true);
  }
  const parts = ev.buildEvolutionInstructionParts(
    'small',
    makeState({ lastPhoneContactRound: 9 }),
    [makeState().profiles['小美'], makeState().profiles['阿强']],
    { evolveEveryTurns: 1, focusMax: 4, rotationBatch: 2, worldPhoneLink: true },
    10,
    '2026-11-15',
    '数小时',
    { blue: [], green: [], chronicleBlocks: '', recentChat: '' },
  );
  assert.equal(parts.userInput.includes('近期刚有角色主动私聊/来电过'), true);
});

test('applyPhoneContactPolicy 拦掉在场角色、超条数连发、全局与单人冷却；允许社媒正常透传', () => {
  const s0 = makeState();
  const res1 = ev.applyPhoneContactPolicy(s0, [
    { kind: 'message', name: '阿强', text: '我在你旁边也发微信' }, // 在场拦截
    { kind: 'message', name: '小美', text: '晚上顺路带份煎饼？' },
    { kind: 'message', name: '小美', text: '不用太辣' },
    { kind: 'message', name: '小美', text: '第三条多余凑数' }, // 超过单轮 2 条上限
    { kind: 'message', name: '小绿', text: '第二位角色抢发' }, // 同轮只放 1 位
    { kind: 'social', name: '路人甲', platform: 'weibo', text: '天气不错' },
  ], { round: 10, focusNames: ['小美', '阿强', '小绿'], onStageNames: ['阿强'] });

  assert.deepEqual(res1.events.map(e => `${e.kind}:${e.name}:${e.text}`), [
    'message:小美:晚上顺路带份煎饼？',
    'message:小美:不用太辣',
    'social:路人甲:天气不错',
  ]);
  assert.equal(res1.state.lastPhoneContactRound, 10);
  assert.equal(res1.state.profiles['小美'].lastPhoneContactRound, 10);

  // 第 11 轮处于全局冷却期（<2 轮）：即使小绿未冷却，也不准紧接着下一轮独立发私聊
  const res2 = ev.applyPhoneContactPolicy(res1.state, [
    { kind: 'message', name: '小绿', text: '才隔一轮又来一条' },
    { kind: 'social', name: '小绿', platform: 'moments', text: '发个朋友圈' },
  ], { round: 11, focusNames: ['小美', '小绿'] });
  assert.deepEqual(res2.events.map(e => e.kind), ['social']);

  // 第 12 轮：全局冷却已过（>=2），小美仍在单人冷却期（<4），小绿允许按需触发
  const res3 = ev.applyPhoneContactPolicy(res1.state, [
    { kind: 'message', name: '小美', text: '刚过2轮我又要发' },
    { kind: 'message', name: '小绿', text: '刚收到通知，明天停电' },
  ], { round: 12, focusNames: ['小美', '小绿'] });
  assert.deepEqual(res3.events.map(e => `${e.name}:${e.text}`), ['小绿:刚收到通知，明天停电']);

  // 删楼回退至 round=5 (<10)：旧冷却自动失效不卡死
  const resRewind = ev.applyPhoneContactPolicy(res1.state, [
    { kind: 'message', name: '小美', text: '回退后恢复正常' },
  ], { round: 5, focusNames: ['小美'] });
  assert.equal(resRewind.events.length, 1);
});
