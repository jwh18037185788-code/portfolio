import type { BatchColumn, BatchMatrix, BatchTarget } from '../types/batchExecution';

/**
 * parent_task_matrix.columns[] 的目标字段统一映射为前端模型。
 * targetRate 已是 0~1 比例；比例目标的 targetCount 由后端向上取整，仅用于数量展示，
 * 不使用 targetCount / totalTaskCount 重算比例，避免取整改变目标口径。
 * 缺失目标不回退为 0；有效的 0 目标保留。
 */
function readBatchTarget(column: BatchColumn): BatchTarget | undefined {
  const { targetRate, targetCount, totalTaskCount } = column;
  if (typeof targetRate !== 'number' || !Number.isFinite(targetRate) || targetRate < 0 || targetRate > 1) return undefined;
  return { rate: targetRate, count: targetCount, total: totalTaskCount };
}

export function adaptBatchMatrixTargets(matrix: BatchMatrix): BatchMatrix {
  // 保留原有响应校验路径，异常结构由调用方显示错误/重试。
  if (!Array.isArray(matrix.columns)) return matrix;
  return {
    ...matrix,
    columns: matrix.columns.map((column) => ({ ...column, target: readBatchTarget(column) })),
  };
}
