import { isRowIdColumn } from './db-crud';
import { getAutoCardAPI, getSheetByName, getSheetCacheChatKey, flushDbWrites, invalidateCache, emitDbWriteCommitted, sqlEscape } from './data-manager';
import { sqlColumnName, sqlTableName, normalizeRowKeys } from './db-schema-map';
import { getLedgerCanonical } from './ledger-takeover';
import { getCurrentStoryChatKey } from './story-floor-store';

export interface DbRowEditSnapshot {
  tableName: string;
  rowId: number;
  chatKey: string;
  api: any;
  sheetKey?: string;
  original: Readonly<Record<string, string>>;
}

export function captureDbRowEdit(tableName: string, headers: string[], row: string[], sheetKey?: string, chatKey?: string): DbRowEditSnapshot {
  const rowIdIndex = headers.findIndex(isRowIdColumn);
  return {
    tableName,
    rowId: rowIdIndex < 0 ? NaN : Number(row[rowIdIndex]),
    chatKey: chatKey ?? (getSheetCacheChatKey() || getCurrentStoryChatKey()),
    sheetKey,
    api: getAutoCardAPI(),
    original: Object.fromEntries(headers.map((column, i) => [column, String(row[i] ?? '')])),
  };
}

export type DbRowEditResult = { ok: true } | { ok: false; message: string };

export async function saveDbRowEdit(snapshot: DbRowEditSnapshot, edited: Record<string, string>): Promise<DbRowEditResult> {
  const fail = (message: string): DbRowEditResult => ({ ok: false, message });
  const ownsChat = (): boolean => !!snapshot.chatKey && snapshot.chatKey === getCurrentStoryChatKey()
    && snapshot.api === getAutoCardAPI();
  if (!ownsChat()) return fail('聊天或数据库已切换，请关闭详情后重新打开');
  if (!Number.isInteger(snapshot.rowId) || snapshot.rowId <= 0) return fail('该记录没有有效 row_id，请刷新后重试');
  const changes = Object.entries(edited).filter(([column, value]) => !isRowIdColumn(column)
    && Object.prototype.hasOwnProperty.call(snapshot.original, column) && value !== snapshot.original[column]);
  if (!await flushDbWrites()) return fail('待保存的数据尚未写入，请稍后重试');
  if (!ownsChat()) return fail('聊天或数据库已切换，请关闭详情后重新打开');
  const columns = changes.map(([column]) => column);
  const readCurrent = (): Record<string, unknown>[] | null => {
    try {
      const result = snapshot.api?.queryTableRows?.({ tableName: snapshot.tableName, columns: ['row_id', ...columns], where: { row_id: snapshot.rowId }, limit: 2 });
      if (!Array.isArray(result?.rows) || result.rows.length > 2) return null;
      return normalizeRowKeys(result.rows, ['row_id', ...columns]);
    } catch (_error) { return null; }
  };
  const rows = readCurrent();
  if (!rows) return fail('无法重新读取原记录，请刷新后重试');
  if (rows.length !== 1) return fail('原记录已删除或身份不唯一，请关闭详情后刷新');
  if (columns.some(column => !(column in rows[0]) || String(rows[0][column] ?? '') !== snapshot.original[column])) {
    return fail('你修改的字段已被外部更新，请关闭详情后重新编辑');
  }
  if (changes.length === 0) return { ok: true };
  const api = snapshot.api;
  if (!api || (typeof api.executeSqlMutation !== 'function' && typeof api.executeSqlBatch !== 'function')) {
    return fail('当前数据库不支持按 row_id 安全保存，请更新数据库后重试');
  }
  const sheet = getSheetByName(snapshot.tableName);
  const ddl = sheet?.sourceData?.ddl || '';
  const physicalColumns = [...ddl.matchAll(/^\s*([一-鿿A-Za-z_][一-鿿A-Za-z0-9_]*)\s+(?:INTEGER|TEXT|REAL|NUMERIC|BLOB|INT|VARCHAR)\b/gim)].map(match => match[1]);
  const ledger = getLedgerCanonical();
  const table = ledger ? snapshot.tableName : ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([一-鿿A-Za-z_][一-鿿A-Za-z0-9_]*)/i)?.[1] || sqlTableName(snapshot.tableName);
  const quoteIdentifier = (name: string): string => '"' + name.replace(/"/g, '""') + '"';
  const names = columns.map(column => ledger ? column : sqlColumnName(snapshot.tableName, column)
    || (physicalColumns.length === sheet?.content[0]?.length ? physicalColumns[sheet.content[0].indexOf(column)] : null));
  if (!table || names.some(name => !name)) return fail('无法确认数据库字段映射，请刷新后重试');
  const sqlNames = names.map(name => quoteIdentifier(name!));
  const quote = (value: unknown): string => "'" + sqlEscape(String(value ?? '')) + "'";
  const predicates = sqlNames.map((name, i) => rows[0][columns[i]] == null ? `${name} IS NULL` : `${name} = ${quote(rows[0][columns[i]])}`);
  const where = `row_id = ${snapshot.rowId} AND ${predicates.join(' AND ')}`;
  const targetSheetKeys = snapshot.sheetKey || sheet?.key || sheet?.uid;
  if (!ownsChat()) return fail('聊天或数据库已切换，请关闭详情后重新打开');
  try {
    let response: any;
    if (typeof api.executeSqlMutation === 'function') {
      response = await api.executeSqlMutation(`UPDATE ${quoteIdentifier(table)} SET ${sqlNames.map(name => `${name} = ?`).join(', ')} WHERE ${where}`, changes.map(([, value]) => value), targetSheetKeys ? { targetSheetKeys: [targetSheetKeys] } : undefined);
    } else {
      response = await api.executeSqlBatch({ sql: `UPDATE ${quoteIdentifier(table)} SET ${sqlNames.map((name, i) => `${name} = ${quote(changes[i][1])}`).join(', ')} WHERE ${where}`, ...(targetSheetKeys ? { targetSheetKeys: [targetSheetKeys] } : {}) });
    }
    if (!ownsChat()) return fail('聊天或数据库已切换，请重新打开详情确认保存结果');
    if (!response || response.success === false || response.saved === false || response.error || response.errors?.length
      || (response.changes != null && Number(response.changes) !== 1)) return fail('保存被拒绝：记录已变化或数据库写入失败，请刷新后重试');
    const after = readCurrent();
    if (!after || after.length !== 1 || changes.some(([column, value]) => String(after[0][column] ?? '') !== value)) {
      return fail('保存未确认：原记录已删除或字段发生冲突，请刷新后重试');
    }
    invalidateCache();
    emitDbWriteCommitted();
    return { ok: true };
  } catch (_error) {
    return fail('保存失败，请刷新后重试');
  }
}
