import React from 'react';
import { Tooltip } from 'antd';

export const TASK_DETAIL_TITLE_ROW_HEIGHT = 24;
export const TASK_DETAIL_META_TOP_GAP = 12;
export const TASK_DETAIL_META_ROW_GAP = 8;
export const TASK_DETAIL_STATUS_TAG_WIDTH = 84;

export const DETAIL_META_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'nowrap',
  columnGap: 16,
  rowGap: 8,
  alignItems: 'center',
};

export const DetailMetaItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  color?: string;
  /** 超长值使用黑色浮层展示完整内容。 */
  tooltip?: React.ReactNode;
}> = ({ icon, label, children, color = '#666666', tooltip }) => {
  const value = (
    <span style={{ display: 'block', minWidth: 0, maxWidth: '30em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
  return (
  <div style={{ display: 'inline-flex', width: 'auto', maxWidth: '100%', minWidth: 0, flex: '0 1 auto', alignItems: 'center', overflow: 'hidden', fontSize: 12, lineHeight: 1.5, color }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, marginRight: 6, fontSize: 12, color }}>
      {icon}
    </span>
    <span style={{ flexShrink: 0 }}>{label}：</span>
    <span style={{ minWidth: 0, maxWidth: '30em', flex: '0 1 auto', overflow: 'hidden' }}>
      {tooltip ? <Tooltip title={tooltip} placement="top" color="#1f1f1f">{value}</Tooltip> : value}
    </span>
  </div>
  );
};

interface TaskDetailLayoutProps {
  title: React.ReactNode;
  metadata: React.ReactNode;
  status: React.ReactNode;
  results: React.ReactNode;
  actions?: React.ReactNode;
  /** 画像信息较多时，窄卡片将结果整列下移，避免挤压主体信息。 */
  wrapContent?: boolean;
}

/** 任务明细共用排布：左侧基础信息，右侧动态结果，操作区独占下一行。 */
const TaskDetailLayout: React.FC<TaskDetailLayoutProps> = ({
  title, metadata, status, results, actions, wrapContent,
}) => (
  <div style={{ minWidth: 0, flex: 1 }}>
    <div style={{ display: 'flex', flexWrap: wrapContent ? 'wrap' : undefined, alignItems: 'stretch', gap: 20 }}>
      <div style={{ minWidth: 0, flex: wrapContent ? '1 1 320px' : 1 }}>
        {title}
        {metadata}
      </div>
      <aside
        style={{
          display: 'flex',
          width: 'auto',
          minWidth: TASK_DETAIL_STATUS_TAG_WIDTH,
          flexShrink: 0,
          maxWidth: wrapContent ? '100%' : undefined,
          marginLeft: wrapContent ? 'auto' : undefined,
          overflowWrap: wrapContent ? 'anywhere' : undefined,
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', minHeight: TASK_DETAIL_TITLE_ROW_HEIGHT, alignItems: 'center', justifyContent: 'flex-end' }}>
          {status}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: wrapContent ? '100%' : undefined, gap: TASK_DETAIL_META_ROW_GAP, marginTop: TASK_DETAIL_META_TOP_GAP }}>
          {results}
        </div>
      </aside>
    </div>
    {actions && (
      <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', marginTop: 20 }}>
        {actions}
      </div>
    )}
  </div>
);

export default TaskDetailLayout;
