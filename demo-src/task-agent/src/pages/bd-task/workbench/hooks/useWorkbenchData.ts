import { useCallback, useEffect, useRef, useState } from 'react';
import { workbenchApi } from '@/services/workbenchApi';
import type {
  WorkbenchConclusionDto,
  TaskProgressPageDto,
  ExpireRiskPageDto,
  ExecutionGuardDto,
  SourceDiagnosisDto,
} from '@/types/workbench';
import type { WorkbenchStatsReq } from '@/types/workbench';
import { useAsyncCard } from './useAsyncCard';

/**
 * 判定某个工作台 DTO 是否为"全字段为0/空"的默认空 DTO（对应后端"静默吞异常返回默认空 DTO"契约，
 * 见 02 现状文档 3.2.2 节 / 03 设计文档 4.7 节）。按各 DTO 的核心数量字段是否均为 0 判定。
 */
export function isEmptyWorkbenchData(
  data:
    | WorkbenchConclusionDto
    | TaskProgressPageDto
    | ExpireRiskPageDto
    | ExecutionGuardDto
    | SourceDiagnosisDto
    | undefined,
): boolean {
  if (!data) return true;
  if ('parentTaskCount' in data && 'summary' in data) {
    // WorkbenchConclusionDto
    const d = data as WorkbenchConclusionDto;
    return d.parentTaskCount === 0 && d.totalTaskCount === 0 && d.shopCount === 0;
  }
  if ('taskTypeDistribution' in data) {
    // TaskProgressPageDto
    const d = data as TaskProgressPageDto;
    return d.parentTaskCount === 0 && d.totalTaskCount === 0;
  }
  if ('expiredParentCount' in data && 'normalParentCount' in data) {
    // ExpireRiskPageDto
    const d = data as ExpireRiskPageDto;
    return (
      d.expiredParentCount === 0 &&
      d.soonExpireParentCount === 0 &&
      d.normalParentCount === 0 &&
      d.achievedParentCount === 0
    );
  }
  if ('aiUsageRate' in data) {
    // ExecutionGuardDto
    const d = data as ExecutionGuardDto;
    return d.aiInProgressCount === 0 && d.aiCompletedCount === 0 && d.aiCoveredParentTaskCount === 0;
  }
  if ('sourceList' in data) {
    // SourceDiagnosisDto
    const d = data as SourceDiagnosisDto;
    return !d.sourceList || d.sourceList.every((s) => s.parentTaskCount === 0);
  }
  return false;
}

/**
 * 统一编排 5 个共用顶部筛选的统计接口请求（AI总结/推进情况/到期风险/AI执行进展/任务来源）。
 * BD 卡片使用独立的 orgIds（二级城市筛选器），不在此处编排，详见 BdQuadrantCard.tsx。
 */
export function useWorkbenchData(req: WorkbenchStatsReq) {
  const enabled = req.orgIds.length > 0;
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const requestKey = JSON.stringify(req);

  const conclusion = useAsyncCard(() => workbenchApi.queryConclusionStats(req), [requestKey], enabled);
  const progress = useAsyncCard(() => workbenchApi.queryTaskProgress(req), [requestKey], enabled);
  const expireRisk = useAsyncCard(() => workbenchApi.queryExpireRisk(req), [requestKey], enabled);
  const execution = useAsyncCard(() => workbenchApi.queryExecutionGuard(req), [requestKey], enabled);
  const source = useAsyncCard(() => workbenchApi.querySourceDiagnosis(req), [requestKey], enabled);

  const refetchAll = useCallback(() => {
    conclusion.refetch();
    progress.refetch();
    expireRisk.refetch();
    execution.refetch();
    source.refetch();
    setLastRefreshedAt(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conclusion.refetch, progress.refetch, expireRisk.refetch, execution.refetch, source.refetch]);

  // 首次选择组织、或筛选条件变化而自动刷新时，立即恢复并更新顶部时间文案。
  // 不依赖多个卡片 loading 状态的交错时序，避免首次加载后文案仍为空。
  const lastRequestKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (enabled && lastRequestKeyRef.current !== requestKey) {
      lastRequestKeyRef.current = requestKey;
      setLastRefreshedAt(Date.now());
    }
  }, [enabled, requestKey]);

  return {
    conclusion,
    progress,
    expireRisk,
    execution,
    source,
    lastRefreshedAt,
    refetchAll,
    enabled,
  };
}
