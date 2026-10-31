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

const evo = await load('world-evolution.ts');
const wb = await load('world-worldbook.ts');
const types = await load('world-types.ts');

const profile = (name, over = {}) => ({ name, onStage: false, activity: '', plans: '', updatedAt: '', lastEvolveRound: 0, ...over });
const seed = (over = {}) => ({
  id: 'seed-2026-06-01-1', title: '码头罢工', status: 'incubating', level: 1, visibility: 'limited',
  catalyst: '工头再扣一次工钱', region: '星海商圈', actorIds: ['阿青'], expiresAtDay: '', missedOutcome: '',
  createdAtDay: '2026-06-01', revision: 0, ...over,
});
const baseState = (over = {}) => ({
  ...types.emptyWorldState(),
  lastEvolveDateKey: '2026-06-01', lastClockDay: '2026-06-01',
  profiles: { 阿青: profile('阿青', { activity: '在码头记账' }), 老周: profile('老周') },
  ...over,
});
const ctx = (over = {}) => ({ round: 10, dateKey: '2026-06-05', playerRegion: '星海商圈-中央广场', ...over });

test('解析新块：clock / seeds / dimensions / signals 与 profiles 追加段', () => {
  const raw = `<world>
<clock>4|入夏第四天</clock>
<profiles>
阿青|去南港送账本|攒钱|无|知道：工头扣钱；不知道：船队改道|三五天
</profiles>
<seeds>
|码头罢工|established|1|hidden|工头再扣一次工钱|星海商圈-码头|2026-06-20|船队改走南港|阿青，不存在的人
seed-x||converging|3|public|||||
</seeds>
<dimensions>
码头紧张|pressure|62|rising|工钱被扣
乱写|other|1|stable|x
</dimensions>
<signals>
encounter|seed-x|码头有人在找顶班 → 可引出罢工
whisper|seed-x|未知语态
</signals>
<unknownblock>随便什么</unknownblock>
</world>`;
  const d = evo.parseWorldBlock(raw);
  assert.equal(d.clockDays, 4);
  assert.deepEqual(d.profiles.阿青, {
    activity: '去南港送账本', plans: '攒钱', arrivalCondition: '',
    knownFacts: ['知道：工头扣钱', '不知道：船队改道'], actionDuration: '三五天',
  });
  assert.deepEqual(d.seeds[0], {
    title: '码头罢工', status: 'established', level: 1, visibility: 'hidden', catalyst: '工头再扣一次工钱',
    region: '星海商圈-码头', expiresAtDay: '2026-06-20', missedOutcome: '船队改走南港', actorIds: ['阿青', '不存在的人'],
  });
  assert.deepEqual(d.seeds[1], { id: 'seed-x', status: 'converging', level: 3, visibility: 'public' });
  assert.deepEqual(d.dimensions, [{ name: '码头紧张', kind: 'pressure', value: 62, trend: 'rising', rationale: '工钱被扣' }]);
  assert.deepEqual(d.signals, [{ voice: 'encounter', sourceId: 'seed-x', text: '码头有人在找顶班 → 可引出罢工' }]);
});

test('旧格式 <profiles> 四段与冒号式不受影响；只有新块也算有效输出', () => {
  const d = evo.parseWorldBlock('<world><profiles>阿青|在码头|攒钱|\n老周：喝茶</profiles></world>');
  assert.deepEqual(d.profiles, { 阿青: { activity: '在码头', plans: '攒钱' }, 老周: { activity: '喝茶' } });
  assert.ok(evo.parseWorldBlock('<world><signals>ambient|clock|入夏了 → 可写换季</signals></world>'));
  assert.equal(evo.parseWorldBlock('<world><unknown>x</unknown></world>'), null);
});

test('应用：新建伏线规整字段，过滤不存在的角色，期限无后果则不设期限', () => {
  const d = evo.parseWorldBlock(`<world><seeds>
|码头罢工|active|9|hidden|工头再扣一次工钱|星海商圈-码头|2026-06-20|船队改走南港|阿青，路人甲
|无引信||1|hidden||星海商圈|||
|税吏查账|established|0|hidden|账本对不上|王都-税署|2026-06-30||
</seeds></world>`);
  const next = evo.applyWorldDelta(baseState(), d, ctx());
  assert.equal(next.seeds.length, 2);
  const [a, b] = next.seeds;
  assert.equal(a.status, 'established');
  assert.equal(a.level, 4);
  assert.equal(a.region, '星海商圈');
  assert.deepEqual(a.actorIds, ['阿青']);
  assert.equal(a.expiresAtDay, '2026-06-20');
  assert.equal(a.createdAtDay, '2026-06-05');
  assert.match(a.id, /^seed-2026-06-05-\d+$/);
  assert.equal(b.expiresAtDay, '');
  assert.equal(b.missedOutcome, '');
  assert.equal(next.lastClockDay, '2026-06-05');
});

test('应用：越权推进被拒——倒退、跳级、同日推进、冷却内', () => {
  const state = baseState({ seeds: [seed({ id: 's1' }), seed({ id: 's2', status: 'active' }), seed({ id: 's3', visibility: 'hidden', region: '王都', lastAdvanceDay: '2026-06-01' })] });
  const d = { seeds: [{ id: 's1', status: 'resolved', level: 4 }, { id: 's2', status: 'established' }, { id: 's3', status: 'active' }] };
  const next = evo.applyWorldDelta(state, d, ctx());
  const by = Object.fromEntries(next.seeds.map(s => [s.id, s]));
  assert.equal(by.s1.status, 'active');
  assert.equal(by.s1.level, 2);
  assert.equal(by.s2.status, 'active');
  assert.equal(by.s3.status, 'incubating');
  const sameDay = evo.applyWorldDelta(state, { seeds: [{ id: 's1', status: 'active' }] }, ctx({ dateKey: '2026-06-01' }));
  assert.equal(sameDay.seeds[0].status, 'incubating');
});

test('应用：知情面只扩不缩，标题不可改，已终结伏线不再变化', () => {
  const state = baseState({ seeds: [seed({ id: 's1', visibility: 'public' }), seed({ id: 's2', status: 'resolved' })] });
  const next = evo.applyWorldDelta(state, { seeds: [
    { id: 's1', title: '改名', visibility: 'hidden', catalyst: '新引信' },
    { id: 's2', status: 'retired', catalyst: '改不了' },
  ] }, ctx());
  assert.equal(next.seeds[0].visibility, 'public');
  assert.equal(next.seeds[0].title, '码头罢工');
  assert.equal(next.seeds[0].catalyst, '新引信');
  assert.equal(next.seeds[0].revision, 1);
  assert.deepEqual(next.seeds[1], state.seeds[1]);
});

test('应用：到期伏线结算为错过并写入纪事摘要与差分', () => {
  const state = baseState({ seeds: [seed({ id: 's1', expiresAtDay: '2026-06-03', missedOutcome: '船队改走南港' })] });
  const next = evo.applyWorldDelta(state, {}, ctx());
  assert.equal(next.seeds[0].status, 'retired');
  assert.equal(next.seeds[0].retiredReason, 'missed');
  const entry = evo.generateChronicle(state, next, 'big', '2026-06-05');
  assert.match(entry.summary, /\[错过\] 船队改走南港/);
  assert.deepEqual(entry.deltas.seeds, [{ title: '码头罢工', from: 'incubating', to: 'retired', reason: 'missed' }]);
});

test('应用：刻度——积累限速、压力不限、类型锁定、新建上限', () => {
  const state = baseState({ dimensions: [
    { id: 'dim-1', name: '名望', kind: 'growth', value: 20, trend: 'stable', rationale: '初来乍到', revision: 0 },
    { id: 'dim-2', name: '码头紧张', kind: 'pressure', value: 30, trend: 'stable', rationale: '平静', revision: 0 },
  ] });
  const next = evo.applyWorldDelta(state, { dimensions: [
    { name: '名望', kind: 'pressure', value: 90, rationale: '救了人' },
    { name: '码头紧张', kind: 'pressure', value: 85, rationale: '罢工' },
    { name: '新刻度', kind: 'growth', value: 140, trend: 'rising', rationale: '依据' },
  ] }, ctx());
  const [fame, tension, fresh] = next.dimensions;
  assert.deepEqual([fame.kind, fame.value, fame.trend], ['growth', 28, 'rising']);
  assert.deepEqual([tension.value, tension.trend, tension.revision], [85, 'rising', 1]);
  assert.deepEqual([fresh.id, fresh.value], ['dim-3', 100]);
  const many = Array.from({ length: 12 }, (_, i) => ({ name: `d${i}`, kind: 'pressure', value: 10, rationale: 'x' }));
  assert.equal(evo.applyWorldDelta(baseState(), { dimensions: many }, ctx()).dimensions.length, types.DIMENSION_MAX);
});

test('应用：信号来源校验，未输出则清空，撞上的伏线补 encounter', () => {
  const state = baseState({
    seeds: [seed({ id: 's1', status: 'active' }), seed({ id: 's2', status: 'active', region: '王都' })],
    rumors: [
      { id: 'r1', topic: '码头', content: '要涨价', level: 'heard', progress: 10, dissipation: 80, createdAt: '2026-06-01' },
      { id: 'r2', topic: '暗', content: '没传开', level: 'vague', progress: 10, createdAt: '2026-06-01' },
    ],
    guidance: { signals: [{ voice: 'ambient', sourceId: 'clock', text: '旧信号' }] },
  });
  const d = { signals: [
    { voice: 'rumor', sourceId: 'r1', text: '茶馆里有人提涨价 → 可引出码头' },
    { voice: 'rumor', sourceId: 'r2', text: '未传开不能用' },
    { voice: 'ambient', sourceId: 'rumors:1', text: '伪造来源' },
    { voice: 'encounter', sourceId: 's2', text: '王都的线' },
  ] };
  const next = evo.applyWorldDelta(state, d, ctx());
  const sigs = next.guidance.signals;
  assert.equal(sigs[0].voice, 'encounter');
  assert.equal(sigs[0].sourceId, 's1');
  assert.deepEqual(sigs.slice(1).map(s => s.sourceId), ['r1', 's2']);
  assert.deepEqual(evo.applyWorldDelta(baseState({ guidance: state.guidance }), {}, ctx()).guidance.signals, []);
  // AI 自己给了指向撞上伏线的 encounter：保留原文、不重复补
  const own = evo.applyWorldDelta(state, { signals: [{ voice: 'encounter', sourceId: 's1', text: '码头有人在找顶班 → 可引出罢工' }] }, ctx());
  assert.deepEqual(own.guidance.signals.map(s => s.text), ['码头有人在找顶班 → 可引出罢工']);
});

test('应用：动向换事归档经历，认知按段写入与清空', () => {
  const state = baseState();
  state.profiles.阿青.actionOutcome = '账记清了';
  const d1 = evo.parseWorldBlock('<world><profiles>阿青|去南港送账本||||三五天\n老周|||||</profiles></world>');
  const n1 = evo.applyWorldDelta(state, d1, ctx());
  const p = n1.profiles.阿青;
  assert.equal(p.activity, '去南港送账本');
  assert.equal(p.actionStartedDay, '2026-06-05');
  assert.equal(p.actionDuration, '三五天');
  assert.equal(p.actionOutcome, undefined);
  assert.deepEqual(p.experiences, [{ text: '在码头记账', endedAtDay: '2026-06-05', outcome: '账记清了' }]);
  const n2 = evo.applyWorldDelta(n1, evo.parseWorldBlock('<world><profiles>阿青||||知道：船队改道|</profiles></world>'), ctx());
  assert.deepEqual(n2.profiles.阿青.knownFacts, ['知道：船队改道']);
  assert.equal(n2.profiles.阿青.experiences.length, 1);
  const n3 = evo.applyWorldDelta(n2, evo.parseWorldBlock('<world><profiles>阿青||||无|</profiles></world>'), ctx());
  assert.equal(n3.profiles.阿青.knownFacts, undefined);
});

test('台前摘要分三段；注入条目剔除入镜行并封顶总长', () => {
  const state = baseState({
    seeds: [seed({ id: 's1', status: 'active', visibility: 'public' }), seed({ id: 's2', visibility: 'hidden', title: '暗线' })],
    rumors: [{ id: 'r1', topic: '码头', content: '要涨价', level: 'heard', progress: 10, dissipation: 80, createdAt: '2026-06-01' }],
    guidance: { signals: [
      { voice: 'encounter', sourceId: 's1', text: '码头有人在找顶班 → 可引出罢工' },
      { voice: 'ambient', sourceId: 'clock', text: '入夏 → 可写换季' },
    ] },
    pendingIntrusions: [{ id: 'i1', kind: 'character_arrival', refId: '阿青', title: '来送账本', hook: '敲门', desc: 'x', dateKey: '2026-06-05', status: 'pending', aiTriggered: true }],
  });
  const front = evo.applyWorldDelta(state, { signals: state.guidance.signals }, ctx()).frontDigest;
  assert.deepEqual(front.split('\n'), [
    '【世界动态 2026-06-05】',
    '〔此地此刻〕', '- 码头有人在找顶班 → 可引出罢工',
    '〔风闻轶事〕', '【传闻·码头】要涨价',
    '〔世界暗流〕', '- 入夏 → 可写换季', '- 码头罢工（正在发生）',
    '【阿青 入镜】来送账本　敲门',
  ]);
  const content = wb.buildWorldDigestContent(front);
  assert.ok(!content.includes('入镜】'));
  assert.ok(!content.includes('暗线'));
  assert.ok(content.includes('〔此地此刻〕\n- 码头有人在找顶班'));
  // 旧格式（无分段）摘要仍可注入
  assert.match(wb.buildWorldDigestContent('【世界动态 2026-06-01】\n【传闻·码头】要涨价'), /【传闻·码头】要涨价$/);
  // 总长封顶：最长的一段先被截
  const longRumors = Array.from({ length: 40 }, (_, i) => ({ id: `r${i}`, topic: `话题${i}`, content: '这是一条很长的传闻内容'.repeat(4), level: 'heard', progress: 10, dissipation: 80, createdAt: '2026-06-01' }));
  const big = evo.applyWorldDelta(baseState({ rumors: longRumors }), { signals: state.guidance.signals.slice(1) }, ctx());
  const capped = wb.buildWorldDigestContent(big.frontDigest);
  const bodyLen = capped.slice(capped.indexOf('\n\n') + 2).length;
  assert.ok(bodyLen <= types.WORLD_DIGEST_CHARS_MAX + 10, `正文 ${bodyLen} 超限`);
  assert.ok(capped.includes('〔世界暗流〕\n- 入夏 → 可写换季'));
});

test('请求侧：伏线按主角地区优先、只带未终结，最多 12 条', () => {
  const seeds = [
    seed({ id: 'far', region: '王都', status: 'converging' }),
    seed({ id: 'near', region: '星海商圈', status: 'established' }),
    seed({ id: 'done', status: 'resolved' }),
    ...Array.from({ length: 15 }, (_, i) => seed({ id: `x${i}`, region: '边境' })),
  ];
  const block = evo.buildSeedsPromptBlock({ ...types.emptyWorldState(), seeds }, '星海商圈');
  const ids = block.split('\n').map(l => l.split(' ')[1]);
  assert.equal(ids[0], 'near');
  assert.equal(ids[1], 'far');
  assert.ok(!ids.includes('done'));
  assert.equal(ids.length, 12);
  const parts = evo.buildEvolutionInstructionParts('big', baseState({ seeds }), [], { evolveEveryTurns: 1, focusMax: 6, rotationBatch: 4 }, 3, '2026-06-05', '', { chronicleBlocks: '', recentChat: '' }, [], undefined, '星海商圈');
  assert.match(parts.dossier, /主角所在地区：星海商圈；距上次演化 4 天/);
  assert.match(parts.userInput, /<seeds> 每行/);
});
