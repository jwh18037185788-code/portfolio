import React from 'react';
import type { BdTaskDto, ParentTaskOverviewDto } from '@/types/bdTask';
import { TaskItem } from './taskHelpers';
import { isSelectable } from '../hooks/useTaskSelection';
import GroupedTaskRow from './GroupedTaskRow';
import EntityTaskRow from './EntityTaskRow';
import SkuTaskRow from './SkuTaskRow';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import type { TaskTypeNameMap } from '../utils/taskTypeName';

interface MixedTaskListProps {
  tasks: BdTaskDto[];
  parentTaskMap: Record<number, ParentTaskOverviewDto>;
  taskTypeNameMap: TaskTypeNameMap;
  isShop: boolean;
  selectedIds: number[];
  onSelect: (taskId: number, checked: boolean) => void;
  onFeedback: (tasks: BdTaskDto[], type: 'done' | 'failed') => void;
  onRemove: (tasks: BdTaskDto[]) => void;
  onExecute: (task: BdTaskDto) => void;
  isExecutionHidden: (task: BdTaskDto) => boolean;
  getExecutionDisabledReason: (task: BdTaskDto) => string | undefined;
}

/** Follow the backend's mixed-row order and page boundaries; a group is never merged across parents. */
const MixedTaskList: React.FC<MixedTaskListProps> = ({
  tasks, parentTaskMap, taskTypeNameMap, isShop, selectedIds, onSelect, onFeedback, onRemove, onExecute, isExecutionHidden, getExecutionDisabledReason,
}) => <>
  {tasks.map((task, index) => task.skuTaskAggregation ? (
    <GroupedTaskRow
      key={`group-${task.parentTaskId}-${task.contactObjectType}-${task.tsPoiId ?? task.shopId}-${index}`}
      task={task}
      variant="entity-detail"
      parentTask={parentTaskMap[task.parentTaskId]}
      taskTypeNameMap={taskTypeNameMap}
      selectedIds={selectedIds}
      onSelect={onSelect}
      onFeedback={onFeedback}
      onRemove={onRemove}
      onExecute={onExecute}
      isExecutionHidden={isExecutionHidden}
      getExecutionDisabledReason={getExecutionDisabledReason}
    />
  ) : getObjectTypeMeta(task.contactObjectType)?.aggregated ? (
    <SkuTaskRow
      key={task.taskId}
      task={task}
      showParentTaskName
      parentTask={parentTaskMap[task.parentTaskId]}
      taskTypeNameMap={taskTypeNameMap}
      selected={selectedIds.includes(task.taskId)}
      onSelect={checked => onSelect(task.taskId, checked)}
      onFeedback={onFeedback}
      onExecute={isExecutionHidden(task) ? undefined : () => onExecute(task)}
      executeDisabledReason={getExecutionDisabledReason(task)}
    />
  ) : isShop ? (
    <TaskItem
      key={task.taskId}
      task={task}
      showParentTaskName
      parentTask={parentTaskMap[task.parentTaskId]}
      taskTypeNameMap={taskTypeNameMap}
      selectable={isSelectable(task)}
      selected={selectedIds.includes(task.taskId)}
      onSelectChange={checked => onSelect(task.taskId, checked)}
      onFeedback={(t, type) => onFeedback([t], type)}
      onExecute={isExecutionHidden(task) ? undefined : () => onExecute(task)}
      executeDisabledReason={getExecutionDisabledReason(task)}
      statusVariant="outlined"
    />
  ) : (
    <EntityTaskRow
      key={task.taskId}
      task={task}
      showParentTaskName
      parentTask={parentTaskMap[task.parentTaskId]}
      taskTypeNameMap={taskTypeNameMap}
      selected={selectedIds.includes(task.taskId)}
      onSelect={checked => onSelect(task.taskId, checked)}
      onFeedback={onFeedback}
      onExecute={isExecutionHidden(task) ? undefined : () => onExecute(task)}
      executeDisabledReason={getExecutionDisabledReason(task)}
    />
  ))}
</>;

export default MixedTaskList;
