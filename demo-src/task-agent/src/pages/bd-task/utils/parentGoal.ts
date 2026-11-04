import type { ParentTaskGoalSummary, ParentTaskGoalType, ParentTaskOverviewDto, UpdateParentTaskReq } from '@/types/bdTask';

type GoalSource = Pick<ParentTaskOverviewDto, 'targetType' | 'targetPercent' | 'targetCount' | 'emptyPercentBatch'>;

/** 保留原始目标，使用服务端目标项数减去当前已完成项数展示剩余量，不从比例反推目标。 */
export function formatParentGoal(task: GoalSource & Pick<ParentTaskOverviewDto, 'completedCount'>): string {
  const remainingCount = Math.max(0, task.targetCount - task.completedCount);
  const remaining = `（剩余 ${remainingCount} 项）`;
  if (task.targetType == null || task.targetType === 'COUNT') return `${task.targetCount} 项${remaining}`;
  if (task.targetType !== 'PERCENT' || task.targetPercent == null) return '目标暂不可用';
  return `${task.targetPercent}%${remaining}`;
}

/** 校验输入文本本身，避免输入组件先取整或钳制而掩盖非法输入。 */
export function parseParentGoal(type: ParentTaskGoalType, raw: string): number {
  if (raw === '' && (type === 'COUNT' || type === 'PERCENT')) {
    throw new Error(type === 'COUNT' ? '目标数量不能为空' : '目标比例不能为空');
  }
  const value = Number(raw);
  if (type === 'COUNT') {
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value)) throw new Error('数量目标须为非负整数');
  } else if (type !== 'PERCENT' || !/^\d+(\.\d)?$/.test(raw) || !Number.isFinite(value) || value > 100) {
    throw new Error('比例须为0至100，最多一位小数');
  }
  return value;
}

export function parentGoalChanged(original: GoalSource, type: ParentTaskGoalType, raw: string): boolean {
  try {
    const value = parseParentGoal(type, raw);
    return type !== (original.targetType ?? 'COUNT')
      || value !== (type === 'PERCENT' ? original.targetPercent : original.targetCount);
  } catch {
    return true;
  }
}

/** 未发生净变更时省略全部目标字段；COUNT上限只能使用主库摘要的全批次数量。 */
export function buildParentGoalEdit(original: GoalSource, type: ParentTaskGoalType, raw: string, total?: number):
  Pick<UpdateParentTaskReq, 'targetType' | 'targetPercent' | 'targetCount'> {
  const value = parseParentGoal(type, raw);
  if (!parentGoalChanged(original, type, raw)) return {};
  if (type === 'PERCENT') return { targetType: type, targetPercent: value };
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('全批次任务项数暂不可用，请重试');
  if (value > total) throw new Error(`数量目标不能超过整个批次实际任务项数${total}`);
  return { targetType: type, targetCount: value };
}

/** 读取失败或非本批次响应不能伪装为0项，也不能用于解锁目标编辑。 */
export function validateParentGoalSummary(summary: ParentTaskGoalSummary, parentId: number): ParentTaskGoalSummary {
  if (summary?.parentTaskId !== parentId || !Number.isSafeInteger(summary.totalCount) || summary.totalCount < 0) {
    throw new Error('全批次目标信息异常，请重试');
  }
  parseParentGoal(summary.targetType ?? 'COUNT', String(summary.targetType === 'PERCENT'
    ? summary.targetPercent : summary.targetCount));
  return summary;
}
