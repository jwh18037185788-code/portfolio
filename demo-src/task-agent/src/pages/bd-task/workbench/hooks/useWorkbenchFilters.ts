import { useCallback, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import type { WorkbenchStatsReq } from '@/types/workbench';
import { useTenantStore } from '@/stores/tenantStore';

/** 顶部筛选状态：创建日期区间 + 组织架构选中集合 */
export interface WorkbenchFilters {
  dateRange: [Dayjs, Dayjs];
  orgIds: number[];
}

/** 默认日期区间：近一个月 */
export function getDefaultDateRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(1, 'month'), dayjs()];
}

function getDefaultFilters(): WorkbenchFilters {
  return { dateRange: getDefaultDateRange(), orgIds: [] };
}

/**
 * 统一请求参数构造函数：tenantId 显式从 useTenantStore 读取塞入，不复用 bdTaskApi.ts 的
 * TENANT_REQUIRED_URLS 白名单机制（见设计文档 3.1/3.2 节决策）。
 * @param filters 顶部筛选状态
 * @param overrideOrgIds 可选，BD 卡片二级城市筛选器传入单一节点 orgId 数组，覆盖 filters.orgIds
 */
export function buildWorkbenchStatsReq(
  filters: WorkbenchFilters,
  overrideOrgIds?: number[],
): WorkbenchStatsReq {
  const rawTenantId = useTenantStore.getState().currentTenantId;
  const tenantId = rawTenantId !== null && rawTenantId !== undefined ? Number(rawTenantId) : undefined;
  return {
    tenantId: Number.isFinite(tenantId) ? tenantId : undefined,
    createTimeFrom: filters.dateRange?.[0] ? Number(dayjs(filters.dateRange[0]).format('YYYYMMDD')) : undefined,
    createTimeTo: filters.dateRange?.[1] ? Number(dayjs(filters.dateRange[1]).format('YYYYMMDD')) : undefined,
    orgIds: overrideOrgIds ?? filters.orgIds,
  };
}

/** 管理顶部筛选状态（日期区间 + orgIds），并提供重置方法 */
export function useWorkbenchFilters() {
  const [filters, setFilters] = useState<WorkbenchFilters>(getDefaultFilters);

  const setDateRange = useCallback((dateRange: [Dayjs, Dayjs]) => {
    setFilters((prev) => ({ ...prev, dateRange }));
  }, []);

  const setOrgIds = useCallback((orgIds: number[]) => {
    setFilters((prev) => ({ ...prev, orgIds }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  const req = useMemo(() => buildWorkbenchStatsReq(filters), [filters]);

  return { filters, setDateRange, setOrgIds, resetFilters, req };
}
