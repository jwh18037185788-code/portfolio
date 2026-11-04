import React from 'react';
import { Typography } from 'antd';
import type { ParentTaskOverviewDto, SubTaskOverviewDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import { MT } from '../theme';
import { AiDirectExecuteTag, PriorityBadge, TASK_TITLE_TAG_STYLE, TaskTitleBadges } from './TaskCard';
import { resolveStatusTagConfig } from './taskHelpers';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import { resolveTaskTypeName, type TaskTypeNameMap } from '../utils/taskTypeName';
import PersonName from './PersonName';
import { formatOverviewDate } from '../utils/entityOverviews';

const getTaskCount = (task: SubTaskOverviewDto) => task.taskCount ?? task.subTasks?.length ?? 0;

const getAggregatedObjectTypeLabel = (task: SubTaskOverviewDto) => {
  const label = getObjectTypeMeta(task.contactObjectType)?.label ?? '商品';
  if (task.contactObjectType === CONTACT_OBJECT_TYPE.SKU || task.contactObjectType === CONTACT_OBJECT_TYPE.PHF_SKU) {
    return label + ' · ' + getTaskCount(task) + '条SKU任务';
  }
  return label;
};

const AggregatedOverviewRow: React.FC<{
  task: SubTaskOverviewDto;
  parentTask?: ParentTaskOverviewDto;
  taskTypeNameMap?: TaskTypeNameMap;
  onClick?: () => void;
}> = ({ task, parentTask, taskTypeNameMap = {}, onClick }) => (
  <div
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 16px', minWidth: 0, fontSize: 12, lineHeight: 1.5, padding: '8px 10px', borderRadius: MT.cardRadiusSmall, background: MT.taskStripBg, cursor: onClick ? 'pointer' : 'default', transition: 'background 0.15s ease' }}
    onMouseEnter={event => { if (onClick) event.currentTarget.style.background = MT.pageBg; }}
    onMouseLeave={event => { event.currentTarget.style.background = MT.taskStripBg; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, minWidth: 0, flex: '1 1 280px' }}>
      <Typography.Text ellipsis={{ tooltip: task.parentTaskName || task.name }} style={{ fontSize: 13, fontWeight: 600, color: MT.textPrimary, minWidth: 0, maxWidth: '100%' }}>{task.parentTaskName || task.name}</Typography.Text>
      {parentTask ? (
        <TaskTitleBadges
          task={parentTask}
          aiDirectExecute={task.aiDirectExecute ?? parentTask.aiDirectExecute}
          taskTypeName={resolveTaskTypeName(parentTask.taskType, taskTypeNameMap)}
          objectTypeLabel={getAggregatedObjectTypeLabel({ ...task, contactObjectType: parentTask.contactObjectType ?? task.contactObjectType })}
        />
      ) : (
        <>
          <span style={{ ...TASK_TITLE_TAG_STYLE, background: MT.pageBg, color: MT.textMuted }}>{getAggregatedObjectTypeLabel(task)}</span>
          {typeof task.priority === 'number' && <PriorityBadge priority={task.priority} />}
        </>
      )}
      {task.contactObjectType === CONTACT_OBJECT_TYPE.TS_SKU && (
        <span style={{ color: MT.textMuted, whiteSpace: 'nowrap' }}>{getTaskCount(task)} 条行业商品任务</span>
      )}
      {Object.entries(task.statusCounts ?? {}).map(([status, count]) => {
        if (!count) return null;
        const config = resolveStatusTagConfig(Number(status), undefined);
        return <span key={status} style={{ ...TASK_TITLE_TAG_STYLE, background: config.background, color: config.color }}>{config.text} {count}</span>;
      })}
      {!parentTask && task.aiDirectExecute && <AiDirectExecuteTag />}
    </div>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, flexShrink: 0, marginLeft: 'auto', color: MT.textMuted, whiteSpace: 'nowrap' }}>
      <span>
        创建人：{(task.creatorId ?? parentTask?.creatorId)
          ? <PersonName name={task.creatorName ?? parentTask?.creatorName} mis={task.creatorId ?? parentTask?.creatorId} />
          : '--'}
      </span>
      <span>时间限制：{formatOverviewDate(task.createdTime ?? task.createdDate ?? parentTask?.createdTime)}-{formatOverviewDate(task.expireDate ?? parentTask?.expireDate)}</span>
    </div>
  </div>
);

export default AggregatedOverviewRow;
