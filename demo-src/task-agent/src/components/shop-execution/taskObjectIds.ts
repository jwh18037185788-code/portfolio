import { collectExecutionShopIds } from './shopIds';

type ExecutionTask = { objectId?: string | null; status?: number };

/** 执行实体只取 objectId，缺失时不能回退为关联商家 shopId。 */
export const collectTaskExecutionObjectIds = (tasks: readonly ExecutionTask[]) => {
  const { shopIds, invalidCount } = collectExecutionShopIds(tasks.map(task => task.objectId));
  return { objectIds: shopIds, invalidCount };
};

/** 商家详情入口读取全部任务页，避免执行范围被当前页截断。 */
export async function loadTaskExecutionObjectIds(
  queryPage: (page: number, pageSize: number) => Promise<{ data: ExecutionTask[]; total: number }>,
) {
  const tasks: ExecutionTask[] = [];
  let fetched = 0;
  for (let page = 1; ; page += 1) {
    const result = await queryPage(page, 200);
    if (!result || !Array.isArray(result.data) || !Number.isSafeInteger(result.total) || result.total < 0
      || (!result.data.length && fetched < result.total)) {
      throw new Error('执行实体列表不完整，请重试');
    }
    tasks.push(...result.data.filter(task => task.status === 0));
    fetched += result.data.length;
    if (fetched >= result.total) break;
  }
  return collectTaskExecutionObjectIds(tasks);
}
