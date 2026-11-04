import type { BdTaskDto, ShopDimensionItemDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';

/** 行业详情和聚合头直接使用本次查询返回的主体字段；商品名不作门店名兜底。 */
export function getIndustryTaskProfile(task: BdTaskDto): Partial<ShopDimensionItemDto> {
  const isProduct = task.contactObjectType === CONTACT_OBJECT_TYPE.TS_SKU;
  return {
    outerId: isProduct ? task.tsPoiId : task.objectId || task.tsPoiId,
    outerName: task.tsPoiName || (isProduct ? undefined : task.objectName),
    matchType: task.matchType,
    outerAddress: task.outerAddress,
    outerPic: task.outerPic,
    outerLongitude: task.outerLongitude,
    outerLatitude: task.outerLatitude,
    shopId: task.shopId,
    wdcId: task.industryWdcId,
    executorMis: task.bdId || null,
    executorName: task.bdName,
  };
}
