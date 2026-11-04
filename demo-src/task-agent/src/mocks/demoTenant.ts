/** 独立演示的租户实体白名单；不读取业务环境或远程配置。 */
export const DEMO_TENANTS = [
  { tenantId: 164316, tenantName: '外卖白领' },
  { tenantId: 164317, tenantName: '连锁业务' },
  { tenantId: 164318, tenantName: '下沉市场' },
];
export const demoTenantId = (value?: unknown): number => DEMO_TENANTS.some(t => t.tenantId === Number(value)) ? Number(value) : 164316;
export function demoObjectTypes(tenant?: unknown) {
  const extra = demoTenantId(tenant) === 164317 ? [{ code: -10, label: '业务品牌' }] : demoTenantId(tenant) === 164318 ? [{ code: -13, label: '拼好饭商品' }] : [];
  return [{ code: -3, label: '外卖门店' }, { code: -1, label: '公海门店' }, { code: -9, label: '商品' }, { code: -12, label: '行业商家' }, { code: -11, label: '行业商品' }, ...extra];
}
export const demoTypeAllowed = (type: number | undefined, tenant?: unknown): boolean => demoObjectTypes(tenant).some(item => item.code === type);
export const demoTabMatches = (type: number | undefined, tab?: unknown): boolean => tab == null ||
  (Number(tab) === 1 ? [-3, -9, -13].includes(type!) : Number(tab) === 2 ? type === -1 : Number(tab) === 3 ? type === -10 : [-11, -12].includes(type!));
