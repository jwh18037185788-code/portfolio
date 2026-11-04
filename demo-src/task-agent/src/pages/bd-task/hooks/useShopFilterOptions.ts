import { useState, useEffect } from 'react';
import { bdTaskApi } from '@/services/bdTaskApi';
import type { ContactObjectType, ShopFilterOptionsDto } from '@/types/bdTask';

/** 按实体类型获取真实筛选字典，切换期间不保留上一个类型的选项。 */
export function useShopFilterOptions(contactObjectType: ContactObjectType) {
  const [options, setOptions] = useState<ShopFilterOptionsDto>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOptions({});
    setLoading(true);
    bdTaskApi.getShopFilterOptions({ contactObjectType }).then(result => {
      if (!cancelled) setOptions(result || {});
    }).catch(() => {
      if (!cancelled) setOptions({});
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [contactObjectType]);

  return { options, loading };
}
