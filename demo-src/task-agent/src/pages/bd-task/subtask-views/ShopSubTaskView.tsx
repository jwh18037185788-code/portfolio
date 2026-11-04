import React from 'react';
import type { BdTaskDto, ContactObjectType } from '@/types/bdTask';
import { TaskItem } from '../components/taskHelpers';
import { isSelectable } from '../hooks/useTaskSelection';

export interface SubTaskViewProps {
    tasks: BdTaskDto[];
    contactObjectType?: ContactObjectType;
    selectedIds: number[];
    onSelect: (taskId: number, checked: boolean) => void;
    onFeedback: (tasks: BdTaskDto[], type: 'done' | 'failed') => void;
    onRemove: (tasks: BdTaskDto[]) => void;
    onExecute?: (task: BdTaskDto) => void;
    executeDisabledReason?: string;
    onSubjectClick: (task: BdTaskDto) => void;
}

/** 执行传递真实任务项，保留 objectId、推荐上下文和执行记录所需的 taskId。 */
const ShopSubTaskView: React.FC<SubTaskViewProps> = ({
    tasks,
    contactObjectType,
    selectedIds,
    onSelect,
    onFeedback,
    onExecute,
    executeDisabledReason,
    onSubjectClick,
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tasks.map(task => (
            <TaskItem
                key={task.taskId}
                task={task}
                contactObjectType={contactObjectType}
                selectable={isSelectable(task)}
                selected={selectedIds.includes(task.taskId)}
                onSelectChange={checked => onSelect(task.taskId, checked)}
                onFeedback={(t, type) => onFeedback([t], type)}
                onExecute={onExecute ? () => onExecute(task) : undefined}
                executeDisabledReason={executeDisabledReason}
                statusVariant="outlined"
                onShopClick={() => onSubjectClick(task)}
            />
        ))}
    </div>
);
export default ShopSubTaskView;
