import { useCallback, useEffect, useState } from 'react';
import type { ParentTaskOverviewDto } from '@/types/bdTask';
import { bdTaskApi } from '@/services/bdTaskApi';
import { useTaskQuery } from './useTaskQuery';
import { resolveParentTaskOverview, ParentTaskOverviewResult } from './parentTaskOverview';

/** 路由快照不授予操作权限；始终以当前租户、本次请求确认的批次信息为准。 */
export function useParentTaskOverview(parentId: number, tenantId: number | string | null) {
  const scope = JSON.stringify([tenantId, parentId]);
  const query = useTaskQuery<ParentTaskOverviewResult>(scope);
  const { run } = query;
  const [saved, setSaved] = useState<{ source: ParentTaskOverviewResult; value: ParentTaskOverviewDto }>();
  const refreshParentTask = useCallback(() => {
    if (tenantId == null) return;
    return run(async () => {
      if (!Number.isSafeInteger(parentId) || parentId <= 0) throw new Error('任务批次 ID 无效');
      const result = await bdTaskApi.queryParentTaskList({ tenantId, parentTaskIdList: [parentId], page: 1, pageSize: 1 });
      return resolveParentTaskOverview(result, parentId);
    });
  }, [parentId, tenantId, run]);
  useEffect(() => { void refreshParentTask(); }, [refreshParentTask]);
  const source = query.data;
  const parentTask = source?.status === 'ready'
    ? saved?.source === source ? saved.value : source.parentTask
    : undefined;
  // 编辑成功回填只作用于当前已确认的快照；后续刷新会自动撤销该覆盖值。
  const updateParentTask = useCallback((fields: Partial<ParentTaskOverviewDto>) => {
    if (source?.status === 'ready') setSaved({ source, value: { ...parentTask, ...fields } });
  }, [source, parentTask]);
  const status = query.loading ? 'loading' : query.error ? 'error' : source?.status ?? 'loading';
  return { parentTask, status, refreshParentTask, updateParentTask };
}
