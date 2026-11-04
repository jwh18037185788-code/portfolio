import { getBdTaskBaselinePreview, isBdTaskBaselinePreview } from '@/mocks/bdTaskBaselinePreview';
import type {
  WorkbenchStatsReq,
  WorkbenchConclusionDto,
  TaskProgressPageDto,
  ExpireRiskPageDto,
  ExecutionGuardDto,
  SourceDiagnosisDto,
  WorkbenchBdCardDto,
  SupervisionPreviewDto,
  SupervisionSendResultDto,
} from '@/types/workbench';

const BASE = '/xianfu/api-v2/dove/bd_task/workbench';
const call = <TReq, TResp>(url: string) => async (req: TReq): Promise<TResp> => {
  const preview = getBdTaskBaselinePreview(url, req as Record<string, unknown>);
  if (preview.handled) return preview.data as TResp;
  throw new Error('演示暂未包含此操作');
};

export const workbenchApi = {
  /** AI 总结/规则化经营结论 */
  queryConclusionStats: call<WorkbenchStatsReq, WorkbenchConclusionDto>(`${BASE}/queryConclusionStats`),
  /** 推进情况卡片 */
  queryTaskProgress: call<WorkbenchStatsReq, TaskProgressPageDto>(`${BASE}/queryTaskProgress`),
  /** 到期风险卡片 */
  queryExpireRisk: call<WorkbenchStatsReq, ExpireRiskPageDto>(`${BASE}/queryExpireRisk`),
  /** AI 执行进展卡片 */
  queryExecutionGuard: call<WorkbenchStatsReq, ExecutionGuardDto>(`${BASE}/queryExecutionGuard`),
  /** 任务来源卡片 */
  querySourceDiagnosis: call<WorkbenchStatsReq, SourceDiagnosisDto>(`${BASE}/querySourceDiagnosis`),
  /** 需关注 BD 卡片（含四象限） */
  queryBdStats: call<WorkbenchStatsReq, WorkbenchBdCardDto>(`${BASE}/queryBdStats`),
  /** 督办预览 */
  querySupervisionBdList: call<WorkbenchStatsReq, SupervisionPreviewDto>(`${BASE}/querySupervisionBdList`),
  /** 督办发送 */
  sendSupervision: call<WorkbenchStatsReq, SupervisionSendResultDto>(`${BASE}/sendSupervision`),
};
