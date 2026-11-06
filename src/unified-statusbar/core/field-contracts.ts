import items from './field-contracts.json';
import { getLedgerCanonical } from './ledger-takeover';

export interface FieldContractItem {
  table: string;
  column?: string;
  feature: string;
  required?: boolean;
}

export const STATUSBAR_FIELD_CONTRACTS: readonly FieldContractItem[] = items;
export const STATUSBAR_PLUGIN_ID = 'n-sese-unified-statusbar';
let registered: { api: any; register: any; chatKey: string } | null = null;
let chatKey = '';
let checked = new WeakMap<object, string>();
let reported = new Set<string>();
const byTable = new Map<string, FieldContractItem[]>();
for (const item of items) byTable.set(item.table, [...(byTable.get(item.table) || []), item]);

function contractsApi(): any {
  try {
    const api = getLedgerCanonical()?.fieldContracts;
    return api && (api.version == null || api.version === 1) ? api : null;
  } catch (_error) { return null; }
}

export function ensureStatusbarFieldContracts(currentChatKey?: string): void {
  if (currentChatKey !== undefined) chatKey = currentChatKey;
  const api = contractsApi();
  if (!api || typeof api.register !== 'function') return;
  if (registered?.api === api && registered.register === api.register && registered.chatKey === chatKey) return;
  const receipt = { api, register: api.register, chatKey };
  try {
    const result = api.register(STATUSBAR_PLUGIN_ID, '瑟瑟灵感状态栏', items);
    registered = receipt;
    reported.clear();
    checked = new WeakMap();
    if (result && typeof result.catch === 'function') result.catch(() => { if (registered === receipt) registered = null; });
  } catch (_error) { registered = null; }
}

export function resetFieldContractChecks(): void {
  checked = new WeakMap();
  reported.clear();
}

export function reportStatusbarMissing(table: string, column?: string, feature?: string): void {
  const api = contractsApi();
  if (!api || typeof api.reportMissing !== 'function') return;
  const matches = feature ? [{ feature }] : (byTable.get(table) || []).filter(item => !column || item.column === column);
  const features = matches.length ? matches.map(item => item.feature) : ['表格读取'];
  for (const name of new Set(features)) {
    const key = JSON.stringify([table, column || '', name]);
    if (reported.has(key)) continue;
    try {
      const result = api.reportMissing(STATUSBAR_PLUGIN_ID, table, column, name);
      reported.add(key);
      if (result && typeof result.catch === 'function') result.catch(() => reported.delete(key));
    } catch (_error) { /* optional diagnostics must not affect data reads */ }
  }
}

export function checkStatusbarSheetFields(table: string, sheet: { content: string[][] } | null): void {
  if (!sheet) { reportStatusbarMissing(table); return; }
  const headers = sheet.content?.[0] || [];
  if (checked.get(sheet) === JSON.stringify(headers)) return;
  checked.set(sheet, JSON.stringify(headers));
  for (const item of byTable.get(table) || []) {
    if (item.column && !headers.includes(item.column)) reportStatusbarMissing(table, item.column, item.feature);
  }
}
