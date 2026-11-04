import { useState, useMemo, useCallback } from 'react';
import type { BdTaskDto } from '@/types/bdTask';
import { canFeedback } from '../components/taskHelpers';

/**
 * 判断某任务项是否可被批量选中：只要存在删除或人工反馈能力即可。
 * 已完成/无法完成/检核通过/已过期等不可反馈状态，只有后端明确授予 canDelete 时才保留复选框。
 */
export function isSelectable(task: BdTaskDto): boolean {
  return !!task.canDelete || canFeedback(task);
}

/**
 * 通用批量选中 Hook，供商家详情页/任务详情页复用。
 */
export function useTaskSelection<T extends { taskId: number | string }>(
  items: T[],
  selectableOf: (item: T) => boolean = () => true,
) {
  const [selectedIds, setSelectedIds] = useState<T['taskId'][]>([]);

  const selectableItems = useMemo(() => items.filter(selectableOf), [items, selectableOf]);

  const selectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? selectableItems.map(i => i.taskId) : []);
  }, [selectableItems]);

  const selectOne = useCallback((id: T['taskId'], checked: boolean) => {
    setSelectedIds(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);

  const allSelected = selectedIds.length === selectableItems.length && selectableItems.length > 0;

  return { selectedIds, selectAll, selectOne, clear, allSelected, selectableItems };
}
