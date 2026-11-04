import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { BdTaskDto } from '@/types/bdTask';
import { getTaskConditions, getTaskConditionDetail } from '../utils/taskConditions';
import { DetailMetaItem, DETAIL_META_ROW_STYLE, TASK_DETAIL_META_ROW_GAP } from './TaskDetailLayout';

/** 条件明细独占一行，沿用任务元信息样式和超长内容浮层。 */
const TaskConditionInfo: React.FC<{ task: BdTaskDto; color?: string }> = ({ task, color }) => {
  const conditions = getTaskConditions(task);
  if (conditions.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: TASK_DETAIL_META_ROW_GAP }}>
      {conditions.map((condition, index) => (
        <div key={index} style={DETAIL_META_ROW_STYLE}>
          <DetailMetaItem
            icon={<InfoCircleOutlined />}
            label={condition.conditionDesc!}
            color={color}
            tooltip={`${condition.conditionDesc}：${getTaskConditionDetail(condition)}`}
          >
            {getTaskConditionDetail(condition)}
          </DetailMetaItem>
        </div>
      ))}
    </div>
  );
};

export default TaskConditionInfo;
