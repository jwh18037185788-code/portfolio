import React from 'react';
import { Radio } from 'antd';

export type TaskSortMode = 'createdTime' | 'priority' | 'expireDate';

const SORT_OPTIONS: { label: string; value: TaskSortMode }[] = [
  { label: '创建时间', value: 'createdTime' },
  { label: '优先级', value: 'priority' },
  { label: '截止时间', value: 'expireDate' },
];

/** 任务列表与商家详情共用的无间隔描边式排序切换。 */
function SortTabs<T extends string = TaskSortMode>({ value, onChange, options = SORT_OPTIONS as { label: string; value: T }[] }: {
  value: T;
  onChange: (value: T) => void;
  options?: { label: string; value: T }[];
}) {
  return (
  <Radio.Group
    className="bd-task-sort-tabs"
    size="small"
    value={value}
    onChange={event => onChange(event.target.value)}
    style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}
  >
    {options.map(option => (
      <Radio.Button key={option.value} value={option.value} style={{ fontSize: 12, paddingInline: 10 }}>
        {option.label}
      </Radio.Button>
    ))}
  </Radio.Group>
  );
}

export default SortTabs;
