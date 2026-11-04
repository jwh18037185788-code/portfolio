import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tenant {
  tenantId: number | string;
  tenantName: string;
}

interface TenantState {
  /** 当前用户可用租户列表 */
  tenants: Tenant[];
  /** 当前选中的租户 id，须来自已加载的可用租户列表 */
  currentTenantId: number | string | null;
  /** 历史选择仅作为偏好，待接口确认该租户仍可用后再恢复 */
  preferredTenantId: number | string | null;
  setTenants: (tenants: Tenant[]) => void;
  setCurrentTenantId: (tenantId: number | string) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenants: [],
      currentTenantId: null,
      preferredTenantId: null,
      setTenants: (tenants) => set((state) => {
        const preferredId = state.currentTenantId ?? state.preferredTenantId;
        const selected = tenants.find((tenant) => String(tenant.tenantId) === String(preferredId)) ?? tenants[0];
        return {
          tenants,
          currentTenantId: selected?.tenantId ?? null,
          preferredTenantId: selected?.tenantId ?? state.preferredTenantId,
        };
      }),
      setCurrentTenantId: (tenantId) => set((state) => {
        const selected = state.tenants.find((tenant) => String(tenant.tenantId) === String(tenantId));
        return selected ? { currentTenantId: selected.tenantId, preferredTenantId: selected.tenantId } : {};
      }),
    }),
    {
      name: 'portfolio-task-agent-tenant-v1',
      // 沿用已有存储字段，读取时只恢复偏好，避免未经接口确认就使用历史租户。
      partialize: (state) => ({ currentTenantId: state.preferredTenantId }),
      merge: (persistedState, currentState) => {
        const saved = (persistedState as { currentTenantId?: unknown } | undefined)?.currentTenantId;
        return {
          ...currentState,
          preferredTenantId: typeof saved === 'number' || typeof saved === 'string' ? saved : null,
        };
      },
    },
  ),
);
