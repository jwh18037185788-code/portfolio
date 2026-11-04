import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenantStore } from '@/stores/tenantStore';
import { queryExecutionAbilities } from './api';
import { resolveExecutionAbilities } from './abilities';
import { SHOP_EXECUTION_ABILITIES } from './config';
import { normalizeCouponCatalog } from './couponCatalog';

/** 内部页面将实体类型去重后批量预查能力，切换租户或类型后立即禁用旧结果。 */
export function useExecutionAvailability(contactObjectTypes: (number | undefined)[], batchExecution: boolean) {
  const tenantId = useTenantStore(state => state.currentTenantId);
  const typesKey = JSON.stringify([...new Set(contactObjectTypes.filter(Number.isInteger))].sort((a, b) => a - b));
  const types = useMemo<number[]>(() => JSON.parse(typesKey), [typesKey]);
  const scope = JSON.stringify([tenantId, typesKey, batchExecution]);
  const [result, setResult] = useState<{
    scope: string;
    reasons: Record<number, string | undefined>;
    emptyTypes: number[];
  }>();

  useEffect(() => {
    if (tenantId == null || types.length === 0) return;
    let cancelled = false;
    queryExecutionAbilities(types, tenantId, batchExecution).then(response => {
      const catalog = normalizeCouponCatalog(response);
      const entries = types.map(type => {
        const available = resolveExecutionAbilities([...catalog.recommendedAbilities, ...catalog.abilityGroups.flatMap(group => group.abilities)]
          .filter(ability => !batchExecution || ability.supportsBatchExecution), SHOP_EXECUTION_ABILITIES, type);
        return [type, available.length ? undefined : '当前实体类型暂无可用执行能力'] as const;
      });
      if (!cancelled) setResult({
        scope,
        reasons: Object.fromEntries(entries),
        emptyTypes: entries.filter(([, reason]) => reason !== undefined).map(([type]) => type),
      });
    }).catch(() => {
      if (!cancelled) setResult({ scope, reasons: Object.fromEntries(
        types.map(type => [type, '执行能力加载失败，请刷新页面重试']),
      ), emptyTypes: [] });
    });
    return () => { cancelled = true; };
  }, [tenantId, types, scope, batchExecution]);

  const getExecutionDisabledReason = useCallback((type: number | undefined): string | undefined => {
    if (tenantId == null) return '请先选择租户';
    if (!Number.isInteger(type)) return '当前任务缺少实体类型';
    if (result?.scope !== scope || !Object.prototype.hasOwnProperty.call(result.reasons, type)) {
      return '正在加载执行能力';
    }
    return result.reasons[type];
  }, [tenantId, result, scope]);

  // 仅在当前查询成功且没有前端已实现能力时隐藏；加载中或失败仍保留禁用提示。
  const isExecutionHidden = useCallback((type: number | undefined): boolean => (
    type != null && result?.scope === scope && result.emptyTypes.includes(type)
  ), [result, scope]);

  return { getExecutionDisabledReason, isExecutionHidden };
}
