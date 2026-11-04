import type { BdTaskDto } from '@/types/bdTask';
import { collectTaskExecutionObjectIds } from './taskObjectIds';

/** 执行资格统一为待处理(0)、AI执行中(5)、AI已完成(6)；能力适配与权限另行校验。 */
export function canEnterExecution(task: Pick<BdTaskDto, 'status' | 'contactObjectType'>) {
  return task.status === 0 || task.status === 5 || task.status === 6;
}

export function executableTaskScope(tasks: readonly BdTaskDto[]) {
  const executable = tasks.filter(canEnterExecution);
  return {
    ordinaryTaskIds: executable.map(task => task.taskId),
    ordinaryShopIds: collectTaskExecutionObjectIds(executable).objectIds,
  };
}
