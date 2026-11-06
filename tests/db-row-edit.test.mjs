import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = await build({
  absWorkingDir: root, entryPoints: ['src/unified-statusbar/core/db-row-edit.ts'],
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
  plugins: [{ name: 'edit-runtime', setup(builder) {
    builder.onLoad({ filter: /\/data-manager\.ts$/ }, () => ({ contents: `
      export const getAutoCardAPI = () => globalThis.editRuntime.api;
      export const getSheetByName = () => globalThis.editRuntime.sheet;
      export const getSheetCacheChatKey = () => globalThis.editRuntime.cacheChatKey;
      export const flushDbWrites = async () => { await globalThis.editRuntime.flush?.(); return true; };
      export const invalidateCache = () => { globalThis.editRuntime.invalidated++; };
      export const emitDbWriteCommitted = () => { globalThis.editRuntime.notified++; };
      export const sqlEscape = value => String(value ?? '').replace(/'/g, "''");
    `, loader: 'ts' }));
    builder.onLoad({ filter: /\/story-floor-store\.ts$/ }, () => ({ contents: 'export const getCurrentStoryChatKey = () => globalThis.editRuntime.chatKey;', loader: 'ts' }));
  } }],
});
const editor = await import('data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64'));
const sqlite = `import json,sqlite3,sys
x=json.load(sys.stdin)
c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row
q=lambda s:'"'+s.replace('"','""')+'"'
c.execute('CREATE TABLE '+q(x['table'])+' ('+', '.join(q(k)+(' INTEGER PRIMARY KEY' if k=='row_id' else ' TEXT') for k in x['columns'])+')')
for row in x['rows']:
 c.execute('INSERT INTO '+q(x['table'])+' VALUES ('+','.join('?' for k in x['columns'])+')',[row.get(k) for k in x['columns']])
r=c.execute(x['sql'],x.get('params',[]))
result=[dict(row) for row in r.fetchall()]
print(json.dumps({'changes':c.execute('SELECT changes()').fetchone()[0],'result':result,'rows':[dict(row) for row in c.execute('SELECT * FROM '+q(x['table'])+' ORDER BY row_id')]},ensure_ascii=False))`;

function setup({ realDb = false, batch = false, special = false } = {}) {
  const headers = ['row_id', '物品名称', special ? '身高/体重' : '数量', '描述'];
  const physical = realDb ? ['row_id', 'item_name', special ? 'measurements' : 'quantity', 'description'] : headers;
  const table = realDb ? 'wupinbiao' : '物品表';
  const rt = globalThis.editRuntime = {
    chatKey: 'chat-a', cacheChatKey: 'chat-a', invalidated: 0, notified: 0, writes: [],
    rows: [{ row_id: 10, [physical[1]]: '药水', [physical[2]]: '2', [physical[3]]: '旧描述' }],
    sheet: { key: 'sheet_inventory', content: [headers, ['10', '药水', '2', '旧描述']], sourceData: {
      ddl: 'CREATE TABLE wupinbiao (\nrow_id INTEGER PRIMARY KEY,\nitem_name TEXT,\n' + physical[2] + ' TEXT,\ndescription TEXT\n);',
    } },
  };
  const execute = (sql, params = []) => {
    const process = spawnSync('python3', ['-c', sqlite], { input: JSON.stringify({ table, columns: physical, rows: rt.rows, sql, params }), encoding: 'utf8' });
    assert.equal(process.status, 0, process.stderr);
    const result = JSON.parse(process.stdout);
    rt.rows = result.rows;
    return result;
  };
  const mutation = (sql, params = []) => {
    rt.beforeWrite?.();
    rt.writes.push({ sql, params });
    const result = execute(sql, params);
    return { success: true, changes: result.changes };
  };
  rt.api = {
    queryTableRows({ columns, where }) {
      rt.beforeRead?.();
      const sqlColumns = columns.map(col => '"' + physical[headers.indexOf(col)] + '"').join(',');
      return { rows: execute(`SELECT ${sqlColumns} FROM "${table}" WHERE row_id = ? LIMIT 2`, [where.row_id]).result };
    },
    executeSqlMutation: batch ? undefined : mutation,
    executeSqlBatch: ({ sql, targetSheetKeys }) => {
      assert.deepEqual(targetSheetKeys, ['sheet_inventory']);
      mutation(sql);
      return { success: true };
    },
    updateRow() { assert.fail('must never write by position'); },
  };
  globalThis.window = realDb ? {} : { SeseLedgerAPI: { __legacyFace: rt.api } };
  const snapshot = editor.captureDbRowEdit('物品表', headers, ['10', '药水', '2', '旧描述'], 'sheet_inventory');
  return { rt, snapshot, physical, headers };
}

test('前置插入和删除后仍写原 row_id，只提交脏字段并保留外部更新', async () => {
  const { rt, snapshot } = setup();
  rt.rows.unshift({ row_id: 2, 物品名称: '其他物品', 数量: '9', 描述: '不能改' });
  rt.rows[1].描述 = '外部新描述';
  assert.deepEqual(await editor.saveDbRowEdit(snapshot, { 数量: '3', 描述: '旧描述' }), { ok: true });
  assert.equal(rt.rows.find(row => row.row_id === 10).数量, '3');
  assert.equal(rt.rows.find(row => row.row_id === 10).描述, '外部新描述');
  assert.equal(rt.rows[0].数量, '9');
  assert.doesNotMatch(rt.writes[0].sql, /SET[^]*描述/);
  rt.rows.shift();
  snapshot.original = { ...snapshot.original, 数量: '3' };
  assert.deepEqual(await editor.saveDbRowEdit(snapshot, { 数量: '4' }), { ok: true });
  assert.equal(rt.rows[0].数量, '4');
});

test('原行删除、身份无效、切聊及后端切换拒绝，绝不回退位置写', async () => {
  for (const change of [
    (rt) => { rt.rows = []; },
    (_rt, snapshot) => { snapshot.rowId = NaN; },
    (rt) => { rt.chatKey = 'chat-b'; },
    (rt) => { rt.api = { ...rt.api }; },
    (rt) => { rt.flush = () => { rt.chatKey = 'chat-b'; }; },
    (rt) => { rt.beforeRead = () => { rt.chatKey = 'chat-b'; }; },
  ]) {
    const { rt, snapshot } = setup();
    change(rt, snapshot);
    const result = await editor.saveDbRowEdit(snapshot, { 数量: '3' });
    assert.equal(result.ok, false);
    assert.ok(result.message);
    assert.equal(rt.writes.length, 0);
  }
});

test('缓存仍属于上个聊天时，打开详情也不能误认新聊天里的同号行', async () => {
  const { rt, headers } = setup();
  rt.chatKey = 'chat-b';
  const snapshot = editor.captureDbRowEdit('物品表', headers, ['10', '药水', '2', '旧描述']);
  assert.equal((await editor.saveDbRowEdit(snapshot, { 数量: '3' })).ok, false);
  assert.equal(rt.writes.length, 0);
});

test('用户改过的字段外部冲突时拒绝，即使其他字段没有变化', async () => {
  const { rt, snapshot } = setup();
  rt.rows[0].数量 = '7';
  const result = await editor.saveDbRowEdit(snapshot, { 数量: '3' });
  assert.equal(result.ok, false);
  assert.match(result.message, /外部更新/);
  assert.equal(rt.writes.length, 0);
  assert.equal(rt.rows[0].数量, '7');
});

test('查询后发生竞争修改由 SQL 条件阻止，mutation 和 batch 两种 API 都拒绝', async () => {
  for (const batch of [false, true]) {
    const { rt, snapshot } = setup({ batch });
    rt.beforeWrite = () => { rt.rows[0].数量 = '8'; };
    assert.equal((await editor.saveDbRowEdit(snapshot, { 数量: '3' })).ok, false);
    assert.equal(rt.rows[0].数量, '8');
  }
});

test('真数据库使用物理表列，兼容只提供 batch 的数据库', async () => {
  for (const batch of [false, true]) {
    const { rt, snapshot } = setup({ realDb: true, batch });
    assert.deepEqual(await editor.saveDbRowEdit(snapshot, { 数量: "3'4" }), { ok: true });
    assert.equal(rt.rows[0].quantity, "3'4");
    assert.match(rt.writes[0].sql, /UPDATE "wupinbiao" SET "quantity"/);
    assert.equal(rt.invalidated, 1);
  }
});

test('带斜杠列名和 SQL 字符内容安全写入，未映射真实字段通过本表 DDL 解析', async () => {
  for (const realDb of [false, true]) {
    const { rt, snapshot, physical } = setup({ realDb, special: true });
    assert.deepEqual(await editor.saveDbRowEdit(snapshot, { '身高/体重': "新'值;--" }), { ok: true });
    assert.equal(rt.rows[0][physical[2]], "新'值;--");
  }
});

test('无改动不写、无安全 API 不回退、有失败响应不宣告成功', async () => {
  let { rt, snapshot } = setup();
  assert.deepEqual(await editor.saveDbRowEdit(snapshot, { 数量: '2', row_id: '900' }), { ok: true });
  assert.equal(rt.writes.length, 0);
  ({ rt, snapshot } = setup());
  rt.api.executeSqlMutation = undefined;
  rt.api.executeSqlBatch = undefined;
  assert.equal((await editor.saveDbRowEdit(snapshot, { 数量: '3' })).ok, false);
  assert.equal(rt.writes.length, 0);
  ({ rt, snapshot } = setup());
  rt.api.executeSqlMutation = () => ({ success: true, saved: false });
  assert.equal((await editor.saveDbRowEdit(snapshot, { 数量: '3' })).ok, false);
  assert.equal(rt.notified, 0);
});

test('弹窗打开时捕获身份，保存使用快照与差量，不再调用按位置 updateRow', async () => {
  const source = await readFile(new URL('../src/unified-statusbar/renderers/popup-manager.ts', import.meta.url), 'utf8');
  const detail = source.slice(source.indexOf('function showDbRowDetail('), source.indexOf('/** 关闭详情（含脏检查） */'));
  assert.match(detail, /captureDbRowEdit\(table.name, headers, original, table.sheetKey, table.chatKey\)/);
  assert.match(detail, /cur\[c\] !== original\[c\]/);
  assert.match(detail, /saveDbRowEdit\(editSnapshot!, data\)/);
  assert.doesNotMatch(detail, /await updateRow\(/);
});

test('列表来自旧聊天时，即使中心缓存已切换也拒绝同号记录', async () => {
  const { rt, headers } = setup();
  rt.chatKey = rt.cacheChatKey = 'chat-b';
  const snapshot = editor.captureDbRowEdit('物品表', headers, ['10', '药水', '2', '旧描述'], 'sheet_inventory', 'chat-a');
  assert.equal((await editor.saveDbRowEdit(snapshot, { 数量: '3' })).ok, false);
  assert.equal(rt.writes.length, 0);
});
