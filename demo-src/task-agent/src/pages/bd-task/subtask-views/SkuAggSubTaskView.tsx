import React from 'react';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import GroupedTaskRow from '../components/GroupedTaskRow';
import SkuTaskRow from '../components/SkuTaskRow';
import type { SubTaskViewProps } from './ShopSubTaskView';

const SkuAggSubTaskView: React.FC<SubTaskViewProps> = props => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {props.tasks.map((row, index) => {
            const task = {
                ...row,
                contactObjectType:
                    row.contactObjectType ?? props.contactObjectType,
            };
            const subjectId =
                task.contactObjectType === CONTACT_OBJECT_TYPE.TS_SKU
                    ? task.tsPoiId
                    : task.shopId;
            const onSubjectClick =
                subjectId == null || subjectId === ''
                    ? undefined
                    : () => props.onSubjectClick(task);
            // 缺少主体键时保留真实 SKU 行、反馈与选择，移除统一由批量工具条处理。
            return task.skuTaskAggregation ? (
                <GroupedTaskRow
                    key={`${task.parentTaskId}:${subjectId}:${index}`}
                    task={task}
                    selectedIds={props.selectedIds}
                    onSelect={props.onSelect}
                    onFeedback={props.onFeedback}
                    onRemove={props.onRemove}
                    onExecute={props.onExecute}
                    executeDisabledReason={props.executeDisabledReason}
                    onSubjectClick={onSubjectClick}
                />
            ) : (
                <SkuTaskRow
                    key={task.taskId}
                    task={task}
                    selected={props.selectedIds.includes(task.taskId)}
                    onSelect={checked => props.onSelect(task.taskId, checked)}
                    onFeedback={props.onFeedback}
                    onExecute={props.onExecute ? () => props.onExecute(task) : undefined}
                    executeDisabledReason={props.executeDisabledReason}
                    onSubjectClick={onSubjectClick}
                />
            );
        })}
    </div>
);
export default SkuAggSubTaskView;
