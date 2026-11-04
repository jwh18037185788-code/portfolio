import React from 'react';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import EntityTaskRow from '../components/EntityTaskRow';
import type { SubTaskViewProps } from './ShopSubTaskView';

const BrandSubTaskView: React.FC<SubTaskViewProps> = props => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {props.tasks.map(task => {
            const contactObjectType =
                task.contactObjectType ?? props.contactObjectType;
            // 品牌任务卡片不展示截止时间或创建时间；行业商家仍保留截止时间。
            const isBrand = contactObjectType === CONTACT_OBJECT_TYPE.BRAND;
            return (
                <EntityTaskRow
                    key={task.taskId}
                    task={{ ...task, contactObjectType }}
                    selected={props.selectedIds.includes(task.taskId)}
                    onSelect={checked => props.onSelect(task.taskId, checked)}
                    onFeedback={props.onFeedback}
                    onExecute={props.onExecute ? () => props.onExecute(task) : undefined}
                    executeDisabledReason={props.executeDisabledReason}
                    hideExpire={isBrand}
                    onSubjectClick={() => props.onSubjectClick(task)}
                />
            );
        })}
    </div>
);
export default BrandSubTaskView;
