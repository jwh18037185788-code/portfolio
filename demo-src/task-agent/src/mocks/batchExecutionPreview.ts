import type { BatchColumn, BatchMatrix, BatchMatrixCell, BatchMatrixRow, MatrixOrgOptions } from '@/types/batchExecution';
import type { BdStatsDto, TaskStatsSummaryDto } from '@/types/bdTask';
import type { OrgNode } from '@/pages/bd-task/workbench/hooks/useOrgTree';
import { demoBusinessNames } from './demoBusinessCatalog';

const CITY_ID = 88000;
const teamNames = ['望京团队', '朝阳团队', '海淀团队', '丰台团队'];
const people = ['张明', '李婷', '王磊', '赵敏', '陈晨', '刘洋', '周颖', '吴昊', '徐悦', '孙宁', '马骏', '郑琳',
  '杨帆', '何静', '高远', '林晓', '罗宇', '唐悦', '宋佳', '谢峰', '韩雪', '曹睿', '许诺', '沈然'];
const orgNodes: OrgNode[] = [
  { id: CITY_ID, name: '北京市', parentId: 0, orgType: 3, level: 1, isLeaf: false },
  ...teamNames.map((name, index) => ({ id: CITY_ID + index + 1, name, parentId: CITY_ID, orgType: 21, level: 2, isLeaf: true })),
];
const definitions = [
  ['重点商家经营提升跟进', 1, '业务下发', 0.8],
  ['秋季活动报名与物料更新专项', 1, '业务下发', 0.6],
  ['低单量门店经营诊断与复访', 2, '自主创建', 0.75],
  ['新商家首次经营沟通', 2, '自主创建', 1],
  ['配送体验提升专项', 3, '系统策略', 0.5],
  ['重点连锁品牌门店服务质量与履约改善跟进专项', 3, '系统策略', 0.8],
] as const;
const baseColumns = definitions.map(([name, group, groupName, rate], index) => ({
  parentTaskId: 202610290101 + index, parentTaskName: name,
  taskSource: group, taskSourceName: groupName, sourceGroup: group, sourceGroupName: groupName,
  contactObjectType: -3, contactObjectTypeName: '外卖门店', targetRate: rate,
})) satisfies BatchColumn[];

function makeCell(person: number, column: number): BatchMatrixCell {
  const noTasks = person % 7 === 6 && column % 3 === 1;
  const total = noTasks ? 0 : 10 + (person * 7 + column * 11) % 31;
  const rates = [1, 0.82, 0.64, 0.95, 0, 0.42, 0.76, 0.12, 0.88];
  const completed = Math.floor(total * rates[(person + column * 2) % rates.length]);
  const month = Math.floor(completed * 0.8);
  const week = Math.floor(completed * 0.35);
  const yesterday = Math.floor(completed * 0.1);
  return { parentTaskId: baseColumns[column].parentTaskId, totalTaskCount: total, completedTaskCount: completed,
    completionRate: total ? completed / total : null,
    monthCompletedCount: month, monthCompletionRate: total ? month / total : null,
    weekCompletedCount: week, weekCompletionRate: total ? week / total : null,
    yesterdayCompletedCount: yesterday, yesterdayCompletionRate: total ? yesterday / total : null,
    todayCompletedCount: 0, todayCompletionRate: total ? 0 : null };
}
const bdRows: BatchMatrixRow[] = people.map((name, index) => ({
  rowKey: `preview-bd-${index + 1}`, rowKind: 0, displayName: name, bdMis: `preview.bd${index + 1}`,
  uid: 89001 + index, orgNodeId: CITY_ID + 1 + Math.floor(index / 6), orgType: 21, parentOrgNodeId: CITY_ID,
  cells: baseColumns.map((_, column) => makeCell(index, column)),
}));
const columns = baseColumns.map((column, index) => {
  const total = bdRows.reduce((sum, row) => sum + (row.cells[index].totalTaskCount ?? 0), 0);
  return { ...column, totalTaskCount: total, targetCount: Math.ceil(total * column.targetRate) };
});

function aggregateCells(rows: BatchMatrixRow[], ids: number[]): BatchMatrixCell[] {
  return ids.map(id => {
    const cells = rows.flatMap(row => row.cells.filter(cell => cell.parentTaskId === id));
    const sum = (key: keyof BatchMatrixCell) => cells.reduce((total, cell) => total + (cell[key] ?? 0), 0);
    const total = sum('totalTaskCount');
    const completed = sum('completedTaskCount'), month = sum('monthCompletedCount'), week = sum('weekCompletedCount');
    const yesterday = sum('yesterdayCompletedCount'), today = sum('todayCompletedCount');
    return { parentTaskId: id, totalTaskCount: total, completedTaskCount: completed, completionRate: total ? completed / total : null,
      monthCompletedCount: month, monthCompletionRate: total ? month / total : null,
      weekCompletedCount: week, weekCompletionRate: total ? week / total : null,
      yesterdayCompletedCount: yesterday, yesterdayCompletionRate: total ? yesterday / total : null,
      todayCompletedCount: today, todayCompletionRate: total ? today / total : null };
  });
}
function scopeRows(params: Record<string, unknown>): BatchMatrixRow[] {
  const ids = (Array.isArray(params.orgNodeIds) ? params.orgNodeIds : Array.isArray(params.orgIds) ? params.orgIds : [CITY_ID]).map(Number);
  return bdRows.filter(row => ids.includes(CITY_ID) || ids.includes(row.orgNodeId!));
}
function matrix(params: Record<string, unknown>): BatchMatrix {
  const ids = Array.isArray(params.parentTaskIds) ? params.parentTaskIds.map(Number) : [];
  const selectedColumns = columns.filter(column => ids.includes(column.parentTaskId));
  const rows = scopeRows(params);
  const dimension = params.dimension === 1 ? 1 : 2;
  const groups = orgNodes.filter(node => node.orgType === 21 && rows.some(row => row.orgNodeId === node.id));
  return {
    tenantId: Number(params.tenantId), dimension, generatedAt: Date.now(), businessDate: new Date().toLocaleDateString('sv-SE'),
    columns: selectedColumns,
    rows: dimension === 1 ? rows.map(row => ({ ...row, cells: row.cells.filter(cell => ids.includes(cell.parentTaskId)) }))
      : groups.map(node => ({ rowKey: `org-${node.id}`, rowKind: 0, displayName: node.name, bdMis: null, uid: null,
        orgNodeId: node.id, orgType: node.orgType, parentOrgNodeId: node.parentId,
        cells: aggregateCells(rows.filter(row => row.orgNodeId === node.id), ids) })),
  };
}
function bdStats(params: Record<string, unknown>): BdStatsDto[] {
  return scopeRows(params).map((row, index) => {
    const total = row.cells.reduce((sum, cell) => sum + (cell.totalTaskCount ?? 0), 0);
    const completed = row.cells.reduce((sum, cell) => sum + (cell.completedTaskCount ?? 0), 0);
    const expired = Math.floor((total - completed) * (0.08 + index % 4 * 0.04));
    return { bdMis: row.bdMis!, bdName: row.displayName, totalCount: total, completedCount: completed,
      inProgressCount: total - completed - expired, expiredCount: expired, completionRate: `${(completed / total * 100).toFixed(2)}%` };
  });
}
function summary(params: Record<string, unknown>): TaskStatsSummaryDto {
  const rows = bdStats(params);
  const total = rows.reduce((sum, row) => sum + row.totalCount, 0);
  const completed = rows.reduce((sum, row) => sum + row.completedCount, 0);
  const completionRate = `${(total ? completed / total * 100 : 0).toFixed(2)}%`;
  const expired = rows.reduce((sum, row) => sum + row.expiredCount, 0);
  // 业务结构示例保留大类与小类的体量对比，并与当前范围的任务总量、完成量对账。
  const businessWeights = [190, 62, 104, 432, 166, 2, 2, 42, 1];
  const weightTotal = businessWeights.reduce((sum, weight) => sum + weight, 0);
  const counts = businessWeights.map(weight => Math.floor(total * weight / weightTotal));
  let missing = total - counts.reduce((sum, count) => sum + count, 0);
  const remainders = businessWeights.map((weight, index) => ({ index, remainder: total * weight / weightTotal - counts[index] }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of remainders) { if (missing-- > 0) counts[index]++; }
  const doneCounts = counts.map(count => Math.floor(total ? completed * count / total : 0));
  let missingDone = completed - doneCounts.reduce((sum, count) => sum + count, 0);
  for (let index = 0; index < counts.length && missingDone > 0; index++) {
    if (doneCounts[index] < counts[index]) { doneCounts[index]++; missingDone--; }
  }
  const typeStats = counts.map((count, index) => ({ taskType: 9101 + index, taskTypeName: demoBusinessNames[index],
    totalCount: count, completedCount: doneCounts[index],
    completionRate: `${(count ? doneCounts[index] / count * 100 : 0).toFixed(2)}%` }));
  // 固定波动节奏的演示快照；日期跟随查询区间，末日与概览一致，不调用历史统计服务。
  const end = new Date(`${params.createdTimeTo ?? new Date().toLocaleDateString('sv-SE')}T00:00:00`);
  const start = params.createdTimeFrom ? new Date(`${params.createdTimeFrom}T00:00:00`).getTime() : -Infinity;
  const parentOffsets = [10, 0, 4, 12, -18, 9, 0], taskOffsets = [6, 2, 5, 14, -20, 8, 0];
  const completionTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end); date.setDate(date.getDate() - 6 + index);
    const clamp = (rate: number) => Number(Math.max(0, Math.min(100, rate)).toFixed(1));
    return { date: date.toLocaleDateString('sv-SE'), parentRate: clamp(100 / 3 + parentOffsets[index]),
      taskRate: clamp(Number.parseFloat(completionRate) + taskOffsets[index]) };
  }).filter(point => new Date(`${point.date}T00:00:00`).getTime() >= start && total > 0);
  return { parentTaskCount: columns.length, parentCompletedTaskCount: 2, parentCompletionRate: '33.33%',
    aiUsageRate: '42.86%', aiCompletedCount: 168, soonDueParentTaskCount: 2, todayDueParentTaskCount: 1,
    totalTaskCount: total, shopCount: 420, completionRate, timeoutRate: `${(total ? expired / total * 100 : 0).toFixed(2)}%`, completedCount: completed, expiredCount: expired,
    typeStats, completionTrend };
}

/** 独立演示数据适配，开发与静态构建使用同一份示例。 */
export function getBatchExecutionPreview(url: string, params: Record<string, unknown>): { handled: true; data: unknown } | { handled: false } {
  switch (url) {
    case '/xianfu/api/common/wm/org/shepherd/box/org-box-org-search':
      return { handled: true, data: orgNodes.filter(node => node.parentId === Number(params.parentId ?? 0)) };
    case '/xianfu/api-v3/bdtask/stats/matrix_org_options': {
      const data: MatrixOrgOptions = { tenantId: Number(params.tenantId), source: 1, orgTypes: [
        { orgType: 3, orgTypeName: '城市', displayCode: 'city', displayName: '城市', entityTypes: ['org', 'bd'], toOrgTypes: [21] },
        { orgType: 21, orgTypeName: '团队', displayCode: 'team', displayName: '团队', entityTypes: ['bd'], toOrgTypes: [] },
      ] };
      return { handled: true, data };
    }
    case '/xianfu/api-v3/bdtask/stats/detail_summary':
      return { handled: true, data: { tenantId: Number(params.tenantId), generatedAt: Date.now(), availableColumns: columns } };
    case '/xianfu/api-v3/bdtask/stats/parent_task_matrix':
      return { handled: true, data: matrix(params) };
    case '/xianfu/api-v2/dove/bd_task/stats/summary':
      return { handled: true, data: summary(params) };
    case '/xianfu/api-v2/dove/bd_task/stats/bd':
      return { handled: true, data: bdStats(params) };
    default:
      return { handled: false };
  }
}
