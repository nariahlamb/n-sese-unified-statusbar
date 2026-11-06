import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = new URL('../src/unified-statusbar/', import.meta.url);
const items = JSON.parse(await readFile(new URL('core/field-contracts.json', base), 'utf8'));
const template = JSON.parse(await readFile(new URL('docs/色色灵感数据库模板V3.3.4.json', base), 'utf8'));
const tables = new Map(Object.entries(template).filter(([key]) => key.startsWith('sheet_')).map(([, sheet]) => [sheet.name, sheet.content[0]]));
const key = (table, column) => JSON.stringify([table, column]);
const pairs = new Set(items.map(item => key(item.table, item.column)));
const optional = new Set([
  ['主角信息表', '年龄'], ['恋爱对象表', '年龄'], ['重要角色表', '年龄'], ['全局数据表', '当前位置'],
  ...['体位', '多人体位', '侍奉', '场景', '附加玩法'].map(column => ['玩法表', column]),
].map(([table, column]) => key(table, column)));

async function sourceFiles(url) {
  const files = [];
  for (const entry of await readdir(url, { withFileTypes: true })) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url);
    if (entry.isDirectory()) files.push(...await sourceFiles(child));
    else if (entry.name.endsWith('.ts') && entry.name !== 'field-contracts.ts') files.push(child);
  }
  return files;
}
const files = await sourceFiles(base);
const astFiles = await Promise.all(files.map(async file => ({ file, ast: ts.createSourceFile(file.pathname, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true) })));
const visit = (node, fn) => { fn(node); ts.forEachChild(node, child => visit(child, fn)); };
const literal = node => node && (ts.isStringLiteralLike(node) || ts.isIdentifier(node)) ? node.text : undefined;

async function load(file) {
  const output = await build({ absWorkingDir: root, entryPoints: [`src/unified-statusbar/core/${file}`], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64'));
}
const contracts = await load('field-contracts.ts');
const manager = await load('data-manager.ts');

function runtime() {
  const registrations = [], missing = [];
  const api = {
    version: 1,
    register(...args) { registrations.push(args); },
    reportMissing(...args) { missing.push(args); },
  };
  globalThis.window = { SeseLedgerAPI: { fieldContracts: api } };
  return { api, registrations, missing };
}

test('全部必需字段存在于仓库内置标准模板，可选表列使用显式清单', () => {
  assert.equal(tables.size, 18);
  assert.equal(new Set(items.map(item => JSON.stringify([item.table, item.column, item.feature]))).size, items.length);
  for (const item of items) {
    assert.ok(item.table && item.column && item.feature);
    assert.equal(typeof item.required, 'boolean');
    if (item.required) assert.ok(tables.get(item.table)?.includes(item.column), JSON.stringify(item));
    else assert.ok(optional.has(key(item.table, item.column)), JSON.stringify(item));
  }
  assert.deepEqual(new Set(items.filter(item => !item.required).map(item => key(item.table, item.column))), optional);
  for (const [table, columns] of tables) for (const column of columns) assert.ok(pairs.has(key(table, column)), `${table}.${column}`);
});

test('扫描全部源码的静态读写表列、列索引及对象字段引用，涵盖中心和分散入口', () => {
  let calls = 0, sources = 0;
  const columnArg = { getCellByHeader: 2, findRowByColumn: 1, readColumnValues: 1, updateCell: 2, incrementCell: 2 };
  const tableCalls = new Set(['getSheetByName', ...Object.keys(columnArg), 'updateRow', 'addRow', 'insertContentRowSqlFirst', 'deleteContentRowSqlFirstDetailed']);
  for (const { file, ast } of astFiles) {
    const literals = new Set();
    visit(ast, node => { if (ts.isStringLiteralLike(node) || ts.isIdentifier(node)) literals.add(node.text); });
    const fileTables = [...tables.keys()].filter(table => literals.has(table));
    for (const table of fileTables) {
      for (const column of tables.get(table)) if (literals.has(column)) assert.ok(pairs.has(key(table, column)), `${file.pathname}: ${table}.${column}`);
    }
    let found = false;
    visit(ast, node => {
      if (!ts.isCallExpression(node)) return;
      const fn = ts.isIdentifier(node.expression) ? node.expression.text : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : '';
      if (ts.isPropertyAccessExpression(node.expression) && ['indexOf', 'includes'].includes(fn)
        && /^(?:headers?|head|headerRow|[a-zA-Z]*Headers?)$|content\[0\]$/.test(node.expression.expression.getText(ast))
        && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        assert.ok(items.some(item => item.column === node.arguments[0].text), `${file.pathname}: header ${node.arguments[0].text}`);
      }
      const tableArg = node.arguments[0];
      const table = tableArg && ts.isStringLiteralLike(tableArg) ? tableArg.text : null;
      if (table && tableCalls.has(fn)) {
        found = true; calls++;
        assert.ok(items.some(item => item.table === table), `${file.pathname}: ${fn} ${table}`);
        const arg = node.arguments[columnArg[fn]];
        if (arg && ts.isStringLiteralLike(arg)) assert.ok(pairs.has(key(table, arg.text)), `${file.pathname}: ${table}.${arg.text}`);
      }
      if (['queryLogicalTableRows', 'queryLogicalTablePage', 'queryTableRows'].includes(fn) && tableArg && ts.isObjectLiteralExpression(tableArg)) {
        const props = new Map(tableArg.properties.filter(ts.isPropertyAssignment).map(prop => [literal(prop.name), prop.initializer]));
        const queryTable = props.get('tableName');
        const columns = props.get('columns');
        if (queryTable && ts.isStringLiteralLike(queryTable) && columns && ts.isArrayLiteralExpression(columns)) {
          for (const col of columns.elements.filter(ts.isStringLiteralLike)) assert.ok(pairs.has(key(queryTable.text, col.text)), `${file.pathname}: ${queryTable.text}.${col.text}`);
        }
      }
    });
    if (found) sources++;
  }
  assert.ok(calls > 180, String(calls));
  assert.ok(sources > 25, String(sources));
  for (const feature of ['立绘表情', '地图角色状态']) assert.ok(items.some(item => item.table === '在场角色表' && item.column === '情绪' && item.feature === feature && item.required));
  const constants = astFiles.find(({ file }) => file.pathname.endsWith('/constants.ts')).ast;
  visit(constants, node => {
    if (ts.isPropertyAssignment(node) && literal(node.name) === 'colName' && ts.isStringLiteralLike(node.initializer)) {
      assert.ok(pairs.has(key('玩法表', node.initializer.text)), node.initializer.text);
    }
  });
});

test('启动登记、同一接口不反复登记，换聊及晚加载新接口会补登记', () => {
  const { registrations } = runtime();
  contracts.ensureStatusbarFieldContracts('chat-a');
  for (let i = 0; i < 30; i++) contracts.ensureStatusbarFieldContracts();
  assert.equal(registrations.length, 1);
  assert.deepEqual(registrations[0].slice(0, 2), ['n-sese-unified-statusbar', '瑟瑟灵感状态栏']);
  assert.deepEqual(registrations[0][2], items);
  contracts.ensureStatusbarFieldContracts('chat-b');
  assert.equal(registrations.length, 2);
  const late = runtime();
  contracts.ensureStatusbarFieldContracts();
  assert.equal(late.registrations.length, 1);
});

test('缺列上报携带功能名，覆盖直接读表的分散入口且同一代缓存去重', () => {
  const { missing } = runtime();
  contracts.ensureStatusbarFieldContracts();
  const sheet = { content: [['row_id', '姓名', '当前状态']] };
  contracts.checkStatusbarSheetFields('在场角色表', sheet, ['情绪']);
  const emotions = missing.filter(args => args[2] === '情绪');
  assert.deepEqual(new Set(emotions.map(args => args[3])), new Set(['在场角色展示', '立绘表情', '地图角色状态']));
  assert.ok(missing.every(args => args[0] === 'n-sese-unified-statusbar' && args.length === 4));
  const count = missing.length;
  contracts.checkStatusbarSheetFields('在场角色表', sheet, ['情绪']);
  contracts.reportStatusbarMissing('在场角色表', '情绪');
  assert.equal(missing.length, count);
  contracts.resetFieldContractChecks();
  contracts.checkStatusbarSheetFields('在场角色表', sheet, ['情绪']);
  assert.equal(missing.length, count * 2);
  contracts.checkStatusbarSheetFields('玩法表', null);
  assert.ok(!missing.some(args => args[1] === '玩法表'));
  contracts.checkStatusbarSheetFields('主角信息表', { content: [['姓名']] }, ['年龄']);
  assert.ok(!missing.some(args => args[2] === '年龄'));
  const before = missing.length;
  contracts.checkStatusbarSheetFields('重要角色表', { content: [['姓名']] });
  assert.equal(missing.length, before);
});

test('旧台账缺接口、未知版本、同步抛错及异步拒绝均不影响取数且可重试', async () => {
  globalThis.window = {};
  assert.doesNotThrow(() => contracts.ensureStatusbarFieldContracts());
  assert.doesNotThrow(() => contracts.reportStatusbarMissing('在场角色表', '情绪'));
  let { api, registrations } = runtime();
  api.version = 2;
  contracts.ensureStatusbarFieldContracts();
  assert.equal(registrations.length, 0);
  delete api.version;
  contracts.ensureStatusbarFieldContracts();
  assert.equal(registrations.length, 1);
  api.version = 1;
  api.register = () => { throw new Error('offline'); };
  assert.doesNotThrow(() => contracts.ensureStatusbarFieldContracts());
  api.register = () => Promise.reject(new Error('offline'));
  contracts.ensureStatusbarFieldContracts();
  api.reportMissing = () => Promise.reject(new Error('offline'));
  contracts.reportStatusbarMissing('在场角色表', '情绪');
  await new Promise(resolve => setImmediate(resolve));
  api.register = (...args) => registrations.push(args);
  contracts.ensureStatusbarFieldContracts();
  assert.equal(registrations.length, 2);
});

test('真实 data-manager 中心读表同时校验直接拿表头的消费者，异常诊断不改变返回值', () => {
  const { api, registrations, missing } = runtime();
  const sheet = { name: '在场角色表', content: [['row_id', '姓名', '当前状态'], ['1', '阿青', '散步']] };
  window.SeseLedgerAPI.__legacyFace = { exportTableAsJson: () => ({ sheet_presence: sheet }) };
  manager.invalidateCache();
  manager.markSheetCacheChatKey('integration-chat');
  assert.equal(manager.getCellByHeader('在场角色表', 1, '姓名'), '阿青');
  assert.equal(manager.getSheetByName('在场角色表').name, '在场角色表');
  assert.equal(manager.getCellByHeader('在场角色表', 1, '情绪'), null);
  assert.equal(manager.findRowByColumn('在场角色表', '未知列', 'a'), -1);
  assert.deepEqual(manager.readColumnValues('在场角色表', '未知列'), []);
  assert.ok(registrations.length >= 1);
  assert.ok(missing.some(args => args[2] === '情绪' && args[3] === '立绘表情'));
  api.reportMissing = () => { throw new Error('offline'); };
  manager.invalidateCache();
  assert.equal(manager.getCellByHeader('在场角色表', 1, '姓名'), '阿青');
  delete window.SeseLedgerAPI.fieldContracts;
  manager.invalidateCache();
  assert.equal(manager.getCellByHeader('在场角色表', 1, '姓名'), '阿青');
});


test('分页与全集逻辑查询不为诊断导出全表，热缓存诊断异常也不影响查询', () => {
  const { api } = runtime();
  let exports = 0;
  const sheet = { name: '纪要表', content: [['概览'], ['片段']] };
  window.SeseLedgerAPI.__legacyFace = {
    exportTableAsJson() { exports++; return { sheet_chronicle: sheet }; },
    queryTableRows() { return { rows: [{ '概览': '片段' }] }; },
  };
  manager.invalidateCache();
  const query = { tableName: '纪要表', columns: ['概览'], limit: 1 };
  assert.deepEqual(manager.queryLogicalTablePage(query), [{ '概览': '片段' }]);
  assert.deepEqual(manager.queryLogicalTableRows(query), [{ '概览': '片段' }]);
  assert.equal(exports, 0);
  manager.getSheetByName('纪要表');
  assert.equal(exports, 1);
  api.reportMissing = () => { throw new Error('诊断失败'); };
  Object.defineProperty(sheet, 'content', { get() { throw new Error('损坏的诊断快照'); } });
  assert.deepEqual(manager.queryLogicalTablePage(query), [{ '概览': '片段' }]);
  manager.invalidateCache();
  window.SeseLedgerAPI.__legacyFace.exportTableAsJson = () => { throw new Error('不能导出全集'); };
  assert.deepEqual(manager.queryLogicalTablePage(query), [{ '概览': '片段' }]);
  assert.equal(exports, 1);
});
