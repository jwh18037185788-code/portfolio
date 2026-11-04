import { useCallback, useEffect, useMemo } from 'react';
import { bdTaskApi } from '@/services/bdTaskApi';
import { useTenantStore } from '@/stores/tenantStore';
import type { BdTaskTypeConfigDto } from '@/types/bdTask';
import { buildTaskTypeNameMap, resolveTaskTypeName } from '../utils/taskTypeName';
import { useTaskQuery } from './useTaskQuery';

/** 只按租户获取完整展示字典，实体筛选选项由各页面单独维护。 */
export function useTaskTypeDictionary() {
  const tenantId = useTenantStore(state => state.currentTenantId);
  const query = useTaskQuery<BdTaskTypeConfigDto[]>(JSON.stringify(['task-type-names', tenantId]));
  const { run } = query;
  const reload = useCallback(() => {
    if (tenantId == null) return;
    void run(async () => {
      const types = await bdTaskApi.listTaskTypes({ tenantId });
      if (!Array.isArray(types)) throw new Error('业务类型数据不完整');
      return types;
    });
  }, [tenantId, run]);
  useEffect(() => { reload(); }, [reload]);

  const taskTypes = useMemo(() => query.data ?? [], [query.data]);
  const taskTypeNameMap = useMemo(() => buildTaskTypeNameMap(taskTypes), [taskTypes]);
  const getTaskTypeName = useCallback(
    (code: number | null | undefined, suppliedName?: string | null) => resolveTaskTypeName(code, taskTypeNameMap, suppliedName),
    [taskTypeNameMap],
  );
  return { ...query, taskTypes, taskTypeNameMap, getTaskTypeName, reload };
}
