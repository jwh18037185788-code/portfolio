import { useEffect, useRef, useState } from 'react';
import { useTenantStore } from '@/stores/tenantStore';
import type { OrgNode } from './useOrgTree';

/**
 * 顶部全局组织架构筛选器默认选中逻辑：默认选中「当前用户有权限的最高组织节点」。
 *
 * 实现依据：`org-box-org-search` 接口以 `parentId=0` 查询时，后端天然按当前登录用户的组织权限
 * 返回其可见的顶级节点集合（即该用户权限范围内层级最高的节点），因此无需前端自行判断"最高节点"
 * 的业务含义——直接取 `parentId=0` 的返回结果全部节点 id 作为默认 `orgIds` 即可：
 * - 用户只有一个顶级权限节点（常见场景，如城市经理/区域负责人）：该节点即为其权限范围内的最高节点，
 *   直接默认选中，工作台无需用户手动选择即可展示数据；
 * - 用户拥有多个平级顶级权限节点：均属于其权限范围内"最高"的一层，全部默认选中，
 *   与 `OrganizationSelector` 多选模式的语义一致。
 *
 * 仅在租户信息就绪（`currentTenantId` 非空，`fetchOrgChildren` 依赖其拼装 `authCode`）后发起一次请求，
 * 且仅在调用方尚未有已选中值（含用户手动选择、或此前已计算过默认值）时回填，不会覆盖用户的手动操作。
 * 请求失败时静默忽略，保留"未选中组织架构"的现状交互（用户仍可手动选择，或点击筛选器重试触发正常加载）。
 */
export function useDefaultOrgIds(
  fetchOrgChildren: (parentId: number) => Promise<OrgNode[]>,
  hasSelected: boolean,
  onResolved: (orgIds: number[]) => void,
) {
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const [loading, setLoading] = useState(false);
  // 每次会话仅尝试计算一次默认值：避免用户手动清空选择后又被自动回填，
  // 也避免因 fetchOrgChildren 引用变化重复触发请求。
  const attemptedRef = useRef(false);

  useEffect(() => {
    const tenantPending = currentTenantId === null || currentTenantId === undefined;
    if (tenantPending || attemptedRef.current || hasSelected) return;
    attemptedRef.current = true;
    setLoading(true);
    fetchOrgChildren(0)
      .then((topNodes) => {
        if (topNodes.length > 0) {
          onResolved(topNodes.map((n) => n.id));
        }
      })
      .catch(() => {
        // 静默失败：保持 orgIds 为空，沿用现有"请先选择组织架构"提示与手动重试路径
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenantId, hasSelected]);

  return { loading };
}
