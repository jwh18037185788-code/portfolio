import { useCallback, useEffect, useMemo } from 'react';
import { bdTaskApi } from '@/services/bdTaskApi';
import { useTenantStore } from '@/stores/tenantStore';
import type { VisibleObjectTypeItem, VisibleObjectTypesDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import { useTaskQuery } from './useTaskQuery';

const BATCH_OBJECT_TYPE_CODES = new Set([-3, -1, -9, -10, -11, -12, -13]);
const REQUIRED_SHOP_OBJECT_TYPES = [CONTACT_OBJECT_TYPE.WM_SHOP, CONTACT_OBJECT_TYPE.WDC_SHOP] as const;

export function useVisibleObjectTypes() {
  const tenantId = useTenantStore(state => state.currentTenantId);
  const query = useTaskQuery<VisibleObjectTypesDto>(String(tenantId));
  const { run } = query;
  const reload = useCallback(() => {
    if (tenantId == null) return;
    void run(async () => {
      const result = await bdTaskApi.queryVisibleObjectTypes({ tenantId });
      if (!Array.isArray(result?.tabs)) throw new Error('任务项类型数据格式错误');
      const seen = new Set<number>();
      return {
        ...result,
        tabs: result.tabs.filter(item => {
          if (![1, 2, 3, 4].includes(item.tab) || seen.has(item.tab)) return false;
          seen.add(item.tab);
          return true;
        }),
      };
    });
  }, [tenantId, run]);
  useEffect(() => { reload(); }, [reload]);

  const tabs = useMemo(() => query.data?.tabs ?? [], [query.data]);
  const error = useMemo(() => query.error ? new Error('任务项类型加载失败') : null, [query.error]);
  // tabs 与批次实体编码相互独立。旧服务缺少 objectTypes 时仅提示批次实体不可用，
  // 既不影响已有任务项 tab，也不根据 tab 或静态枚举猜测租户可见实体。
  const objectTypeResult = useMemo(() => {
    if (!query.data) return { objectTypes: undefined, error: null };
    const objectTypes = query.data.objectTypes;
    const seen = new Set<number>();
    if (!Array.isArray(objectTypes) || objectTypes.some(item => {
      if (!item || !BATCH_OBJECT_TYPE_CODES.has(item.code) || seen.has(item.code)
        || typeof item.label !== 'string' || !item.label.trim()) return true;
      seen.add(item.code);
      return false;
    })) {
      return { objectTypes: undefined, error: new Error('批次实体类型数据不完整') };
    }
    // 外卖门店/公海门店按后端契约全租户固定可见；兼容联调环境仍返回旧版或不完整
    // objectTypes 的情况，前端仅补齐这两个固定类型。其他实体仍完全遵循后端白名单与返回顺序。
    const optionByCode = new Map(objectTypes.map(item => [item.code, item]));
    const requiredShopOptions: VisibleObjectTypeItem[] = REQUIRED_SHOP_OBJECT_TYPES.map(code => ({
      code,
      label: getObjectTypeMeta(code)!.label,
    }));
    const tenantOptions = objectTypes
      .filter(item => !REQUIRED_SHOP_OBJECT_TYPES.some(code => code === item.code))
      .map(item => ({
        ...item,
        label: getObjectTypeMeta(item.code)?.label ?? item.label.trim(),
      }));
    return {
      objectTypes: [
        ...requiredShopOptions.map(option => ({ ...option, ...optionByCode.get(option.code), label: option.label })),
        ...tenantOptions,
      ],
      error: null,
    };
  }, [query.data]);

  return { tabs, loading: query.loading, error, reload,
    objectTypes: objectTypeResult.objectTypes, objectTypesError: error ?? objectTypeResult.error };
}
