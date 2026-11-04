import type { BatchMatrix, BatchMatrixCell, BatchMatrixRow, BatchPeriod, BatchTarget, MatrixOrgType } from '../../../../types/batchExecution';

export const BATCH_PERIODS: { value: BatchPeriod; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'month', label: '本月' },
  { value: 'week', label: '本周' },
  { value: 'yesterday', label: '昨日' },
];

export interface MatrixRowOption {
  value: string;
  label: string;
  dimension: 1 | 2;
  orgTypeList?: number[];
}

/** 行维度以服务端允许范围为准；展示分类仅用于合并同名业务层级，不推断层级关系。 */
export function getMatrixRowOptions(orgType: number, types: MatrixOrgType[]): MatrixRowOption[] {
  const current = types.find((type) => type.orgType === orgType);
  if (!current) return [];
  const options: MatrixRowOption[] = [];
  if (current.entityTypes.includes('org')) {
    if (current.toOrgTypes.includes(orgType)) {
      // 本节点不传 orgTypeList，避免查询同类型的下级节点。
      options.push({ value: 'current', label: current.displayName, dimension: 2 });
    }
    const groups = new Map<string, MatrixRowOption>();
    for (const targetId of current.toOrgTypes) {
      if (targetId === orgType) continue;
      const target = types.find((type) => type.orgType === targetId);
      if (!target) continue;
      const existing = groups.get(target.displayCode);
      if (existing) {
        if (!existing.orgTypeList!.includes(targetId)) existing.orgTypeList!.push(targetId);
      } else {
        groups.set(target.displayCode, {
          value: target.displayCode, label: target.displayName, dimension: 2, orgTypeList: [targetId],
        });
      }
    }
    options.push(...groups.values());
  }
  if (current.entityTypes.includes('bd')) {
    options.push({ value: 'bd', label: 'BD', dimension: 1 });
  }
  return options;
}

export function formatMatrixRate(rate: number): string {
  return Number.isFinite(rate) ? `${(rate * 100).toFixed(2)}%` : '—';
}

export function getMatrixMetric(cell: BatchMatrixCell | undefined, period: BatchPeriod) {
  const source = cell;
  if (!source) return undefined;
  const count = period === 'yesterday' ? source.yesterdayCompletedCount : period === 'month' ? source.monthCompletedCount : period === 'week' ? source.weekCompletedCount : source.completedTaskCount;
  const rate = period === 'yesterday' ? source.yesterdayCompletionRate : period === 'month' ? source.monthCompletionRate : period === 'week' ? source.weekCompletionRate : source.completionRate;
  const total = source.totalTaskCount;
  // 无任务或当前周期无有效完成率时，不展示 null，也不把缺失数据当成 0%。
  if (total == null || total <= 0 || !Number.isFinite(total) || rate == null || !Number.isFinite(rate)) return undefined;
  return { count, total, rate };
}

export function indexMatrixCells(matrix?: BatchMatrix): Map<string, Map<number, BatchMatrixCell>> {
  return new Map((matrix?.rows ?? []).map((row) => [row.rowKey, new Map(row.cells.map((cell) => [cell.parentTaskId, cell]))]));
}

/** 只判断当前展示列及周期；有效的 0% 也保留该行。 */
export function hasVisibleMatrixValue(row: BatchMatrixRow, columnIds: number[], period: BatchPeriod): boolean {
  const cells = new Map(row.cells.map((cell) => [cell.parentTaskId, cell]));
  return columnIds.some((id) => getMatrixMetric(cells.get(id), period) !== undefined);
}

export function describeMatrixMetric(metric: ReturnType<typeof getMatrixMetric>): string {
  return metric ? `${formatMatrixRate(metric.rate)}（${metric.count ?? '-'}/${metric.total}）` : '-';
}

export function isValidBatchTarget(target: BatchTarget | undefined): target is BatchTarget {
  return target != null && Number.isFinite(target.rate) && target.rate >= 0 && target.rate <= 1;
}

export function describeBatchTarget(target: BatchTarget | undefined): string {
  if (!isValidBatchTarget(target)) return '—';
  const { rate, count, total } = target;
  const hasCounts = Number.isSafeInteger(count) && count! >= 0 && Number.isSafeInteger(total) && total! > 0 && count! <= total!;
  return `${formatMatrixRate(rate)}${hasCounts ? `（${count}/${total}）` : ''}`;
}

/** 只比较全部周期，使用原始比例判断达标，不使用展示时四舍五入后的百分比。 */
export function getMatrixTargetStatus(target: BatchTarget | undefined, metric: ReturnType<typeof getMatrixMetric>, period: BatchPeriod) {
  if (period !== 'all' || !isValidBatchTarget(target) || !metric || !Number.isFinite(metric.rate) || metric.rate < 0 || metric.rate > 1) return undefined;
  const gap = target.rate - metric.rate;
  // 消除减法浮点误差；正差距不足 0.01% 时不能显示成 0.00% 或误判已完成。
  const achieved = gap <= Number.EPSILON;
  return {
    achieved,
    text: achieved ? '已完成' : gap < 0.0001 ? '距离目标还有：<0.01%' : `距离目标还有：${formatMatrixRate(gap)}`,
  };
}

function csvCell(value: string): string {
  // 导出包含后端任务名和人员名，防止被表格软件当作公式执行。
  const safe = /^[\s]*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** 导出全部返回行（非仅当前分页），按当前各批次时间口径和显示顺序。 */
export function buildMatrixCsv(matrix: BatchMatrix, periods: Record<number, BatchPeriod>, rowLabel: string): string {
  const columnPeriods = matrix.columns.map((column) => periods[column.parentTaskId] ?? 'all');
  const hasTargets = columnPeriods.includes('all');
  // CSV 不支持合并：批次名后的两个空格对应其下方的目标值和差值列。
  const heading = [hasTargets ? '' : rowLabel, ...matrix.columns.flatMap((column, index) =>
    columnPeriods[index] === 'all' ? [column.parentTaskName, '', ''] : [column.parentTaskName],
  )];
  const metricHeading = [rowLabel, ...columnPeriods.flatMap((period) => period === 'all'
    ? ['全部完成率', '目标值', '距离目标的差值']
    : [`${BATCH_PERIODS.find((item) => item.value === period)!.label}完成率`],
  )];
  const rows = matrix.rows.map((row: BatchMatrixRow) => {
    const cells = new Map(row.cells.map((cell) => [cell.parentTaskId, cell]));
    return [row.bdMis ? `${row.displayName || row.bdMis}（${row.bdMis}）` : row.displayName, ...matrix.columns.flatMap((column) => {
      const period = periods[column.parentTaskId] ?? 'all';
      const metric = getMatrixMetric(cells.get(column.parentTaskId), period);
      const status = getMatrixTargetStatus(column.target, metric, period);
      const gap = status ? status.achieved ? 0 : column.target!.rate - metric!.rate : undefined;
      const gapText = gap === undefined ? '—' : gap > 0 && gap < 0.0001 ? '<0.01%' : formatMatrixRate(gap);
      return [describeMatrixMetric(metric), ...(period === 'all'
        ? [describeBatchTarget(column.target), gapText] : [])];
    })];
  });
  const distinctPeriods = [...new Set(columnPeriods)];
  const periodLabel = (period: BatchPeriod) => BATCH_PERIODS.find((item) => item.value === period)!.label;
  const periodNote = distinctPeriods.length === 1 ? periodLabel(distinctPeriods[0])
    : matrix.columns.map((column, index) => `${column.parentTaskName}：${periodLabel(columnPeriods[index])}`).join('；');
  const emptyRow = Array<string>(heading.length).fill('');
  const noteRow = [...emptyRow];
  noteRow[0] = `注：任务完成周期：${periodNote}`;
  return '\uFEFF' + [heading, ...(hasTargets ? [metricHeading] : []), ...rows, emptyRow, noteRow]
    .map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** 按当前完成率排序，缺失值始终置后；相同完成率保留后端原始顺序。 */
export function compareMatrixRates(a: number | undefined, b: number | undefined, order: 'ascend' | 'descend'): number {
  const validA = typeof a === 'number' && Number.isFinite(a);
  const validB = typeof b === 'number' && Number.isFinite(b);
  if (!validA || !validB) return validA ? -1 : validB ? 1 : 0;
  return order === 'ascend' ? a! - b! : b! - a!;
}
