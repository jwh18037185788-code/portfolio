import type { BdTaskDto, ShopDimensionItemDto } from '@/types/bdTask';

export function getEntityIdentity(item: BdTaskDto | ShopDimensionItemDto) {
  const subject = item as ShopDimensionItemDto;
  return {
    id: item.objectId ?? subject.outerId ?? item.shopId,
    name: item.objectName ?? subject.outerName ?? item.shopName,
  };
}

/** 展示行不能提交给操作接口；只返回去重后的真实任务。 */
export function flattenRealTasks(items: BdTaskDto[]): BdTaskDto[] {
  const tasks = new Map<number, BdTaskDto>();
  const visit = (item: BdTaskDto) => {
    if (item.skuTaskAggregation) {
      (item.skuTaskAggregation.subTasks || []).forEach(visit);
    } else if (typeof item.taskId === 'number' && Number.isFinite(item.taskId) && item.taskId > 0) {
      tasks.set(item.taskId, item);
    }
  };
  items.forEach(visit);
  return [...tasks.values()];
}
