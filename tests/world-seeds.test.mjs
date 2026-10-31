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

const ws = await load('world-state.ts');
const store = await load('world-store.ts');
const types = await load('world-types.ts');

const seed = (over = {}) => ({
  id: 'seed-2026-06-01-1', title: '码头罢工', status: 'established', level: 1, visibility: 'hidden',
  catalyst: '工头再扣一次工钱', region: '星海商圈', actorIds: [], expiresAtDay: '', missedOutcome: '',
  createdAtDay: '2026-06-01', revision: 0, ...over,
});
const ctx = (over = {}) => ({ today: '2026-06-05', daysAdvanced: 1, hasCollision: false, ...over });

test('伏线状态只进不退', () => {
  const r = ws.advanceSeed(seed({ status: 'active' }), { status: 'incubating' }, ctx());
  assert.equal(r.changed, false);
  assert.equal(r.seed.status, 'active');
  assert.deepEqual(r.rejected, ['backward']);
});

test('伏线跳级按前进一档算，并记录推进日与修订号', () => {
  const r = ws.advanceSeed(seed(), { status: 'converging' }, ctx());
  assert.equal(r.seed.status, 'incubating');
  assert.equal(r.seed.lastAdvanceDay, '2026-06-05');
  assert.equal(r.seed.revision, 1);
  assert.deepEqual(r.rejected, ['skip-clamped']);
});

test('伏线推进门：正文未过时间、无引信、已到期、已终结都不推进', () => {
  assert.equal(ws.advanceSeed(seed(), { status: 'incubating' }, ctx({ daysAdvanced: 0 })).rejected[0], 'no-time');
  assert.equal(ws.advanceSeed(seed({ catalyst: ' ' }), { status: 'incubating' }, ctx()).rejected[0], 'no-catalyst');
  assert.equal(ws.advanceSeed(seed({ expiresAtDay: '2026-06-04' }), { status: 'incubating' }, ctx()).rejected[0], 'expired');
  const done = ws.advanceSeed(seed({ status: 'resolved' }), { status: 'retired' }, ctx());
  assert.equal(done.seed.status, 'resolved');
  assert.deepEqual(done.rejected, ['terminal']);
});

test('伏线冷却：未撞上看催化频率，撞上只看冷却', () => {
  // hidden=edge 圈：频率 15 天
  const edge = seed({ lastAdvanceDay: '2026-06-01' });
  assert.equal(ws.advanceSeed(edge, { status: 'incubating' }, ctx({ today: '2026-06-10' })).rejected[0], 'cooldown');
  assert.equal(ws.advanceSeed(edge, { status: 'incubating' }, ctx({ today: '2026-06-16' })).seed.status, 'incubating');
  // 撞上即 core 圈：冷却 1 天
  assert.equal(ws.advanceSeed(edge, { status: 'incubating' }, ctx({ today: '2026-06-02', hasCollision: true })).seed.status, 'incubating');
  // limited=medium 圈：频率 3 天
  const mid = seed({ visibility: 'limited', lastAdvanceDay: '2026-06-01' });
  assert.equal(ws.advanceSeed(mid, { status: 'incubating' }, ctx({ today: '2026-06-03' })).rejected[0], 'cooldown');
  assert.equal(ws.advanceSeed(mid, { status: 'incubating' }, ctx({ today: '2026-06-04' })).changed, true);
  assert.equal(ws.seedCircle(seed({ visibility: 'public' }), false), 'core');
});

test('伏线可随时转 retired，缺原因补 invalidated', () => {
  const r = ws.advanceSeed(seed({ lastAdvanceDay: '2026-06-05' }), { status: 'retired' }, ctx({ daysAdvanced: 0 }));
  assert.equal(r.seed.status, 'retired');
  assert.equal(r.seed.retiredReason, 'invalidated');
  assert.equal(ws.advanceSeed(seed(), { status: 'retired', retiredReason: 'merged' }, ctx()).seed.retiredReason, 'merged');
});

test('波及面单轮最多 +1、不超过 4，收缩不受门限制', () => {
  const up = ws.advanceSeed(seed({ level: 1 }), { level: 4 }, ctx());
  assert.equal(up.seed.level, 2);
  assert.deepEqual(up.rejected, ['level-clamped']);
  assert.equal(ws.advanceSeed(seed({ level: 4 }), { level: 9 }, ctx()).changed, false);
  assert.equal(ws.advanceSeed(seed({ level: 1 }), { level: 2 }, ctx({ daysAdvanced: 0 })).seed.level, 1);
  assert.equal(ws.advanceSeed(seed({ level: 3 }), { level: 1 }, ctx({ daysAdvanced: 0 })).seed.level, 1);
});

test('到期伏线结算为错过，期限当天不结算，不改原状态对象', () => {
  const state = {
    ...types.emptyWorldState(),
    seeds: [
      seed({ id: 'a', expiresAtDay: '2026-06-04', missedOutcome: '船队改走南港' }),
      seed({ id: 'b', expiresAtDay: '2026-06-05' }),
      seed({ id: 'c', expiresAtDay: '2026-06-01', status: 'resolved' }),
      seed({ id: 'd', expiresAtDay: '2026-06-02', title: '税吏查账' }),
    ],
  };
  const { state: next, missed } = ws.sweepExpiredSeeds(state, '2026-06-05');
  assert.deepEqual(missed.map(m => m.summary), ['[错过] 船队改走南港', '[错过] 税吏查账不了了之']);
  assert.deepEqual(next.seeds.map(s => s.status), ['retired', 'established', 'resolved', 'retired']);
  assert.equal(next.seeds[0].retiredReason, 'missed');
  assert.equal(next.seeds[0].revision, 1);
  assert.equal(state.seeds[0].status, 'established');
  assert.deepEqual(ws.sweepExpiredSeeds({ ...types.emptyWorldState(), seeds: undefined }, '2026-06-05').missed, []);
});

test('积累型刻度涨幅限速，压力型不限', () => {
  assert.equal(ws.clampDimensionDelta('growth', 20), types.DIM_GROWTH_DELTA_MAX);
  assert.equal(ws.clampDimensionDelta('growth', -30), -30);
  assert.equal(ws.clampDimensionDelta('pressure', 40), 40);
  assert.equal(ws.clampDimensionDelta('pressure', 'x'), 0);
  assert.equal(ws.clampDimensionDelta('growth', 3.6), 4);
});

test('地区取地点首段', () => {
  assert.equal(ws.normalizeRegion('星海商圈-中央广场-喷泉'), '星海商圈');
  assert.equal(ws.normalizeRegion(' 王都 - 下城区'), '王都');
  assert.equal(ws.normalizeRegion('-边境村-酒馆'), '边境村');
  assert.equal(ws.normalizeRegion(''), '');
});

test('旧存档读取补齐新字段且不丢原有字段', () => {
  const legacy = {
    version: types.WORLD_SCHEMA_VERSION, lastEvolveRound: 7, lastEvolveDateKey: '2026-06-03',
    profiles: { 阿青: { name: '阿青', onStage: false, activity: '在码头记账', plans: '', hiddenGoal: '攒钱赎身', goalProgress: 40, updatedAt: '2026-06-03', lastEvolveRound: 7, awareness: 'x' } },
    rumors: [{ id: 'r1', topic: '码头', content: '要涨价', level: 'heard', progress: 10, dissipation: 80, createdAt: '2026-06-01' }],
    chronicle: [{ id: 'c1', dateKey: '2026-06-03', kind: 'small', summary: '平静', changed: { profiles: [], rumors: [], rumorsGone: [] } }],
    frontDigest: '【世界动态 2026-06-03】', pendingIntrusions: [], evolveExcluded: ['路人'],
  };
  const snapshot = structuredClone(legacy);
  const state = store.normalizeWorldState(structuredClone(legacy));
  assert.deepEqual(state.seeds, []);
  assert.deepEqual(state.dimensions, []);
  assert.deepEqual(state.guidance, { signals: [] });
  assert.equal('lastClockDay' in state, false);
  delete snapshot.profiles.阿青.awareness;
  for (const key of Object.keys(snapshot)) assert.deepEqual(state[key], snapshot[key], `字段 ${key} 丢失或被改`);
});

test('新存档 JSON 往返不丢新字段', () => {
  const full = {
    ...types.emptyWorldState(),
    lastClockDay: '2026-06-05',
    seeds: [seed({ lastAdvanceDay: '2026-06-04', retiredReason: undefined })],
    dimensions: [{ id: 'dim-1', name: '码头紧张', kind: 'pressure', value: 62, trend: 'rising', rationale: '工钱被扣', revision: 2 }],
    guidance: { signals: [{ voice: 'encounter', sourceId: 'seed-2026-06-01-1', text: '工头在找人顶班 → 可以引出罢工' }] },
    profiles: { 阿青: { name: '阿青', onStage: false, activity: '', plans: '', updatedAt: '', lastEvolveRound: 0,
      knownFacts: ['知道：工头扣钱'], actionStartedDay: '2026-06-04', actionDuration: '三五天', actionOutcome: '',
      experiences: [{ text: '替人抄账', endedAtDay: '2026-06-03', outcome: '拿到工钱' }] } },
    rumors: [{ id: 'r1', topic: '码头', content: '要涨价', level: 'vague', progress: 1, createdAt: '2026-06-01', region: '星海商圈', earliestRevealDay: '2026-06-06' }],
  };
  const expected = JSON.parse(JSON.stringify(full));
  assert.deepEqual(store.normalizeWorldState(JSON.parse(JSON.stringify(full))), expected);
});

test('版本号不符仍按无存档处理，脏的新字段被剔除', () => {
  assert.deepEqual(store.normalizeWorldState({ version: 999, seeds: [seed()] }), types.emptyWorldState());
  assert.equal(types.WORLD_SCHEMA_VERSION, 1);
  const dirty = store.normalizeWorldState({ version: 1, seeds: [null, 'x', seed()], dimensions: 'bad', guidance: { signals: 'bad' }, lastClockDay: 5 });
  assert.equal(dirty.seeds.length, 1);
  assert.deepEqual(dirty.dimensions, []);
  assert.deepEqual(dirty.guidance, { signals: [] });
  assert.equal('lastClockDay' in dirty, false);
});
