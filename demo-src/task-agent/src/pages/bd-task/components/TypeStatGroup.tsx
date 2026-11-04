import { trackTaskAction } from '@/lib/taskAnalytics';
import React from 'react';
import { Tabs } from 'antd';
import './type-stat-tabs.css';

export interface TypeStatOption {
  code: number;
  label: string;
  count: number | null;
}

export interface TypeStatGroupProps {
  options: TypeStatOption[];
  activeCode: number;
  onChange: (code: number) => void;
  allCount: number | null;
  allActive?: boolean;
  showAll?: boolean;
}

/** 业务类型沿用字典顺序与首次进入时的统计，切换筛选不重排、不禁用零值页签。 */
const TypeStatGroup: React.FC<TypeStatGroupProps> = ({ options, activeCode, onChange, allCount, showAll = true }) => {
  const items = showAll ? [{ code: -1, label: '全部', count: allCount }, ...options] : options;
  return (
    <Tabs
      className="bd-task-type-tabs"
      size="small"
      activeKey={String(activeCode)}
      onTabClick={key => { trackTaskAction('filter.task_type'); onChange(Number(key)); }}
      items={items.map(option => ({
        key: String(option.code),
        label: <span>{option.label}<span className="bd-task-type-tabs-count">{option.count ?? '—'}</span></span>,
      }))}
    />
  );
};

export default TypeStatGroup;
