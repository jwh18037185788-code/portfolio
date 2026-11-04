import { CONTACT_OBJECT_TYPE, ContactObjectType } from '@/types/bdTask';

export const OBJECT_DISPLAY_TYPE = {
  SHOP: 'shop', SKU: 'sku', PHF_SKU: 'phf_sku', BRAND: 'brand',
  INDUSTRY_SHOP: 'industry_shop', INDUSTRY_SKU: 'industry_sku',
} as const;

export interface ObjectTypeMeta {
  label: string;
  displayType: typeof OBJECT_DISPLAY_TYPE[keyof typeof OBJECT_DISPLAY_TYPE];
  listTab: 'wm_shop' | 'wdc_shop' | 'brand' | 'industry_shop';
  aggregated: boolean;
  aggregateSubject: 'shop' | 'industry_shop' | null;
  executable: boolean;
}

export const OBJECT_TYPE_META: Record<ContactObjectType, ObjectTypeMeta> = {
  [-3]: { label: '外卖门店', displayType: 'shop', listTab: 'wm_shop', aggregated: false, aggregateSubject: null, executable: true },
  [-1]: { label: '公海门店', displayType: 'shop', listTab: 'wdc_shop', aggregated: false, aggregateSubject: null, executable: true },
  [-9]: { label: '商品', displayType: 'sku', listTab: 'wm_shop', aggregated: true, aggregateSubject: 'shop', executable: true },
  [-13]: { label: '拼好饭商品', displayType: 'phf_sku', listTab: 'wm_shop', aggregated: true, aggregateSubject: 'shop', executable: true },
  [-10]: { label: '业务品牌', displayType: 'brand', listTab: 'brand', aggregated: false, aggregateSubject: null, executable: false },
  [-12]: { label: '行业商家', displayType: 'industry_shop', listTab: 'industry_shop', aggregated: false, aggregateSubject: null, executable: false },
  [-11]: { label: '行业商品', displayType: 'industry_sku', listTab: 'industry_shop', aggregated: true, aggregateSubject: 'industry_shop', executable: false },
};

export function getObjectTypeMeta(type?: number): ObjectTypeMeta | undefined {
  return type == null ? undefined : OBJECT_TYPE_META[type as ContactObjectType];
}

export const OBJECT_TYPE_FILTER_OPTIONS = [
  CONTACT_OBJECT_TYPE.WM_SHOP, CONTACT_OBJECT_TYPE.WDC_SHOP, CONTACT_OBJECT_TYPE.SKU, CONTACT_OBJECT_TYPE.PHF_SKU,
  CONTACT_OBJECT_TYPE.BRAND, CONTACT_OBJECT_TYPE.TS_POI, CONTACT_OBJECT_TYPE.TS_SKU,
].map(code => ({ code, label: OBJECT_TYPE_META[code].label }));
