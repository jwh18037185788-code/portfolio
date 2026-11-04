import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, '../../demos/task-agent');
const cache = new Map();
function load(relative) {
  const filename = resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const js = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = vm.createContext({ module, exports: module.exports, console, Date, URL, URLSearchParams, setTimeout, clearTimeout,
    require: spec => {
      const path = spec.startsWith('@/') ? resolve(root, 'src', spec.slice(2)) : resolve(dirname(filename), spec);
      if (/\.(png|jpg|jpeg|svg)$/.test(path)) return { default: path };
      return load(path + '.ts');
    },
  });
  vm.runInContext(js, context, { filename });
  return module.exports;
}
const { getBdTaskBaselinePreview: preview, isBdTaskBaselinePreview: enabled } = load('src/mocks/bdTaskBaselinePreview.ts');
assert.equal(enabled(), true, 'static build must not require DEV, URL query or session storage');
const base = '/xianfu/api-v2/dove/bd_task';
const data = (path, params = {}) => { const response = preview(path, params); assert.equal(response.handled, true, path); return response.data; };
const progress = data(base + '/workbench/queryTaskProgress', { orgIds: [88000] });
assert.equal(progress.parentTaskCount, 24);
assert.equal(progress.totalTaskCount, 3452);
assert.equal(progress.taskTypeDistribution.length, 6);
assert.equal(data(base + '/workbench/queryTaskProgress', { orgIds: [88001] }).parentTaskCount, 6);
const all = data(base + '/parent_task/list', { pageSize: 100 });
assert.equal(all.total, 28);
for (const item of progress.detailList) {
  const parent = data(base + '/parent_task/list', { id: item.id });
  assert.equal(parent.total, 1, 'each popup detail URL must have a matching batch');
  assert.equal(parent.data[0].name, item.name);
  const tasks = data(base + '/detail', { parentTaskId: item.id, pageSize: 1000 });
  const real = tasks.data.flatMap(task => task.skuTaskAggregation?.subTasks ?? [task]);
  assert.equal(real.length, item.subTaskTotalCount);
  assert.equal(real.filter(task => [1, 4, 6].includes(task.status)).length, item.subTaskAchievedCount);
}
const filtered = data(base + '/parent_task/list', { taskType: 9102, priority: 0, pageSize: 100 });
assert.ok(filtered.total > 0 && filtered.total < all.total);
assert.ok(filtered.data.every(item => item.taskType === 9102 && item.priority === 0));
assert.equal(data(base + '/parent_task/list', { name: 'does-not-exist' }).total, 0);
const stats = data(base + '/parent_task/stats', { taskType: 9102, statsFields: [{ field: 'priority', codes: [0, 1, 2] }] });
assert.equal(stats.priorityStats.items.reduce((sum, item) => sum + item.count, 0), stats.totalCount);
assert.equal(data(base + '/task_type/list').length, 9);
assert.equal(data(base + '/query_user_tenants').map(t => t.tenantName).join(','), '外卖白领,连锁业务,下沉市场');
const merchants = data(base + '/shop_dimension/list', { tab: 1, pageSize: 1000 });
assert.ok(merchants.total > 0);
for (const row of merchants.data) {
  assert.ok(new Set(row.subTaskOverviews.map(t => t.parentTaskId)).size >= 3, `merchant ${row.shopId} needs 3 batches`);
  assert.ok(row.logo && existsSync(row.logo));
}
assert.ok(merchants.data.some(row => row.subTaskOverviews.some(t => t.contactObjectType === -9 && t.subTasks?.length >= 3)));
for (const row of data(base + '/shop_dimension/list', { tab: 2, pageSize: 1000 }).data) {
  assert.ok(new Set(row.subTaskOverviews.map(t => t.parentTaskId)).size >= 3, `public merchant ${row.shopId} needs 3 batches`);
}
// The default list and detail ranges must expose the same parent batches, including expired ones.
for (const row of merchants.data) {
  const visible = data(base + '/detail', { tenantId: 164316, tab: 1, shopId: row.shopId, pageSize: 1000 }).data;
  assert.equal([...new Set(visible.map(t => t.parentTaskId))].sort().join(','), [...new Set(row.subTaskOverviews.map(t => t.parentTaskId))].sort().join(','), `list/detail mismatch for ${row.shopName}`);
}
const daziran = merchants.data.find(row => row.shopName === '大自然农庄');
const daziranDetail = data(base + '/detail', { tab: 1, shopId: daziran.shopId, pageSize: 1000 }).data;
assert.ok(daziranDetail.some(t => t.parentTaskName === '11月次新神抢手覆盖'));
assert.ok(daziranDetail.some(t => t.parentTaskName === '11月重点商品价格治理'));
const unexpired = data(base + '/detail', { tab: 1, shopId: daziran.shopId, pageSize: 1000, expireDateFrom: new Date().toLocaleDateString('sv-SE') }).data;
assert.ok(!unexpired.some(t => t.parentTaskName === '11月重点商品价格治理'));
const objectCodes = tenantId => data(base + '/object_type/visible_tabs', { tenantId }).objectTypes.map(t => t.code);
assert.ok(!objectCodes(164316).includes(-10) && !objectCodes(164316).includes(-13));
assert.ok(objectCodes(164317).includes(-10) && !objectCodes(164317).includes(-13));
assert.ok(objectCodes(164318).includes(-13) && !objectCodes(164318).includes(-10));
const brandBatches = data(base + '/parent_task/list', { tenantId: 164317, contactObjectType: -10 });
assert.ok(brandBatches.total > 0);
assert.equal(data(base + '/parent_task/list', { tenantId: 164316, contactObjectType: -10 }).total, 0);
const brands = data(base + '/shop_dimension/list', { tenantId: 164317, tab: 3 });
assert.equal(brands.total, 4);
assert.ok(data(base + '/detail', { tenantId: 164317, tab: 3, objectId: brands.data[0].objectId }).total > 0);
assert.equal(data(base + '/shop_dimension/list', { tenantId: 164316, tab: 3 }).total, 0);
const phf = data(base + '/parent_task/list', { tenantId: 164318, contactObjectType: -13 });
assert.ok(phf.total > 0);
assert.ok(data(base + '/detail', { tenantId: 164318, parentTaskId: phf.data[0].parentTaskId }).data.every(t => t.skuTaskAggregation?.subTasks.every(s => s.contactObjectType === -13)));
assert.equal(data(base + '/parent_task/list', { tenantId: 164317, contactObjectType: -13 }).total, 0);
const detail = data(base + '/detail', { parentTaskId: 201996411723, pageSize: 100 });
assert.ok(new Set(detail.data.map(t => t.status)).size >= 5);
assert.ok(detail.data.every(t => t.canDelete));
assert.ok(detail.data.some(t => t.aiExecutionResultContactTypes?.length));
assert.ok(detail.data.some(t => t.aiExecutionResultUnavailableReason));
assert.ok(detail.data.some(t => t.status === 2 && t.remark));
assert.ok(all.data.every(t => !/（第\d+批）/.test(t.name)));
assert.equal(data(base + '/shop_dimension/list', { experienceScoreFrom: 5 }).total, 0);
const sorted = data(base + '/parent_task/list', { pageSize: 100, sortList: [{ field: 'priority', asc: true }] }).data;
assert.ok(sorted.every((item, index) => index === 0 || item.priority >= sorted[index - 1].priority));
assert.equal(data(base + '/workbench/queryExecutionGuard').agentBreakdown.length, 6);
assert.equal(data(base + '/workbench/querySourceDiagnosis').sourceList.length, 4);
assert.equal(data(base + '/workbench/querySupervisionBdList').bdCount, 8);
assert.equal(data(base + '/workbench/sendSupervision').submitted, true);
assert.equal(preview('/not-supported').handled, false);
const columns = data('/xianfu/api-v3/bdtask/stats/detail_summary').availableColumns;
const matrix = data('/xianfu/api-v3/bdtask/stats/parent_task_matrix', { dimension: 1, parentTaskIds: columns.map(c => c.parentTaskId) });
assert.equal(matrix.rows.length, 24); assert.equal(matrix.columns.length, 6);
const detailStats = data(base + '/stats/summary', { orgNodeIds: [88000], createdTimeFrom: '2026-10-01', createdTimeTo: '2026-11-03' });
const detailBds = data(base + '/stats/bd', { orgNodeIds: [88000] });
assert.equal(detailStats.typeStats.length, 9);
assert.equal(detailStats.typeStats.reduce((sum, item) => sum + item.totalCount, 0), detailStats.totalTaskCount);
assert.equal(detailStats.typeStats.reduce((sum, item) => sum + item.completedCount, 0), detailStats.completedCount);
assert.equal(detailBds.reduce((sum, item) => sum + item.totalCount, 0), detailStats.totalTaskCount);
assert.ok(detailBds.every(row => row.totalCount === row.completedCount + row.inProgressCount + row.expiredCount));
assert.ok(detailStats.typeStats.every(row => row.completedCount <= row.totalCount));
assert.equal(detailStats.completionTrend.length, 7);
assert.equal(detailStats.completionTrend.at(-1).date, '2026-11-03');
assert.ok(detailStats.completionTrend.every(point => [point.parentRate, point.taskRate].every(rate => rate >= 0 && rate <= 100)));
assert.ok(Math.abs(detailStats.completionTrend.at(-1).taskRate - Number.parseFloat(detailStats.completionRate)) < 0.1);
assert.equal(data(base + '/stats/summary', { createdTimeFrom: '2026-11-02', createdTimeTo: '2026-11-03' }).completionTrend.length, 2);
assert.equal(data(base + '/stats/summary', { orgNodeIds: [99999] }).completionTrend.length, 0);
assert.equal(data(base + '/stats/summary', { orgNodeIds: [88001] }).totalTaskCount,
  data(base + '/stats/bd', { orgNodeIds: [88001] }).reduce((sum, row) => sum + row.totalCount, 0));
if (process.argv.includes('--data-only')) { console.log('PASS: sample data, business filters, merchant logos, varied states, selection, SKU groups and popup linkage'); process.exit(0); }
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
assert.match(html, /connect-src 'none'/);
assert.ok(!html.includes('/src/main.tsx'));
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert.ok(match[1].startsWith('./'), `non-relative asset: ${match[1]}`);
  assert.ok(existsSync(resolve(dist, match[1])), `missing asset: ${match[1]}`);
}
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(resolve(dir, entry.name)) : [resolve(dir, entry.name)]);
for (const file of [...walk(resolve(root, 'src')), ...walk(dist)]) {
  if (!['.js', '.ts', '.tsx', '.css', '.html'].includes(extname(file))) continue;
  const text = readFileSync(file, 'utf8');
  assert.ok(!/https?:\/\/[^\s"'<>)]*(?:sankuai\.com|meituan\.(?:com|net))/.test(text), `corporate destination: ${file}`);
  assert.ok(!/@mfe\/|@mtfe\/|@roo\//.test(text), `private dependency: ${file}`);
  assert.ok(!/127\.0\.0\.1:|localhost:/.test(text), `hardcoded local address: ${file}`);
}
for (const file of walk(dist).filter(file => file.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8');
  for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
    const asset = match[1].replace(/^["']|["']$/g, '');
    if (asset.startsWith('data:') || asset.startsWith('#')) continue;
    assert.ok(!asset.startsWith('/') && !asset.includes('://'), `non-relative CSS asset: ${asset}`);
    assert.ok(existsSync(resolve(dirname(file), asset)), `missing CSS asset: ${asset}`);
  }
}
const lock = readFileSync(resolve(root, 'package-lock.json'), 'utf8');
assert.ok(!/sankuai|meituan|file:|link:/.test(lock));
console.log('PASS: production demo data, cross-page details, filters, stats, matrix, relative assets and offline boundaries');
