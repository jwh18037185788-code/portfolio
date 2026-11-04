import type { BdTaskDto, TaskConditionDto } from '@/types/bdTask';

/** 有列表时按列表展示，兼容仅返回顶层字段的服务版本；不跨条件拼接。 */
export function getTaskConditions(task: Pick<BdTaskDto, 'conditions' | 'conditionDesc' | 'conditionDetail' | 'completedDetail'>): TaskConditionDto[] {
  const conditions: TaskConditionDto[] = Array.isArray(task.conditions) ? task.conditions : [task];
  return conditions.filter(condition =>
    typeof condition?.conditionDesc === 'string' && condition.conditionDesc.trim().length > 0
    && typeof condition?.conditionDetail === 'string' && condition.conditionDetail.trim().length > 0,
  );
}

/** 将简单JSON列表转为顿号分隔的展示文本，普通文本和复杂结构保留原样。 */
function formatConditionDetail(value?: string | null): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const items: unknown = JSON.parse(value);
    if (Array.isArray(items) && items.every(item => typeof item === 'string' || typeof item === 'number')) {
      return items.join('、');
    }
  } catch {
    // 非JSON条件明细继续按原文展示。
  }
  return value;
}

/** 目标与完成明细使用相同列表格式，无完成明细（含空数组）时不追加文案。 */
export function getTaskConditionDetail(condition: TaskConditionDto): string {
  const target = formatConditionDetail(condition.conditionDetail);
  const completed = formatConditionDetail(condition.completedDetail);
  return `${target}${completed.trim() ? `，已完成：${completed}` : ''}`;
}
