import { getBdTaskBaselinePreview, isBdTaskBaselinePreview } from '@/mocks/bdTaskBaselinePreview';
import type { BatchScope, BatchSummary, BatchMatrixReq, BatchMatrix, MatrixOrgOptions } from '@/types/batchExecution';
import { adaptBatchMatrixTargets } from './batchExecutionTargetAdapter';

const BASE = '/xianfu/api-v3/bdtask/stats';

// 新接口成功直接返回 DTO；业务错误可能为 HTTP 200 + 非零 code。
// 不回退 mock，不把请求失败当成空数据或零完成率。
async function post<T>(path: string, request: object): Promise<T> {
  const preview = getBdTaskBaselinePreview(`${BASE}/${path}`, request as Record<string, unknown>);
  if (preview.handled) return preview.data as T;
  throw new Error('演示暂未包含此操作');
}

export const batchExecutionApi = {
  queryOrgOptions: (tenantId: number) => post<MatrixOrgOptions>('matrix_org_options', { tenantId }),
  // 仅使用候选批次，不改动详细数据页首现有统计展示。
  queryColumns: (scope: BatchScope, orgIds?: number[]) =>
    post<BatchSummary>('detail_summary', { ...scope, ...(orgIds === undefined ? {} : { orgIds }) }),
  queryMatrix: async (request: BatchMatrixReq) => adaptBatchMatrixTargets(await post<BatchMatrix>('parent_task_matrix', request)),
};
