import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { MT } from '../../theme';

interface InfoTooltipProps {
  /** 说明文案，不超过三句 */
  content: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * 通用问号说明图标组件：Hover/点击展示说明文案，不触发任何弹窗打开逻辑。
 * 用于关键指标标题旁的口径说明（Requirement 11 第2条）。
 */
const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, style }) => {
  return (
    <Tooltip title={content} trigger={['hover', 'click']}>
      <QuestionCircleOutlined
        style={{ color: MT.textTertiary, fontSize: 13, cursor: 'help', ...style }}
        onClick={(e) => e.stopPropagation()}
      />
    </Tooltip>
  );
};

export default InfoTooltip;
