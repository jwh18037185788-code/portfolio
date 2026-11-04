import React from 'react';
import { MT } from '../../theme';

let styleInjected = false;
const FOCUS_CLASS = 'wb-clickable-stat';

/**
 * 全局注入一次可点击统计项的键盘可见焦点环样式（`:focus-visible`），仅通过键盘 Tab 聚焦时显示，
 * 鼠标点击聚焦不显示，避免视觉噪音。对应 01 需求文档 Requirement 11.1 / 04 任务文档任务 4.0：
 * "键盘 Tab 聚焦时具备可见焦点环（outline/box-shadow）"。
 */
function injectFocusStyle() {
  if (styleInjected || typeof document === 'undefined') return;
  styleInjected = true;
  const style = document.createElement('style');
  style.id = 'wb-clickable-stat-style';
  style.textContent = `
.${FOCUS_CLASS} {
  outline: none;
}
.${FOCUS_CLASS}:focus-visible {
  outline: 2px solid ${MT.brandPrimary};
  outline-offset: 2px;
  box-shadow: 0 0 0 4px ${MT.brandPrimaryLight};
}
`;
  document.head.appendChild(style);
}

interface ClickableStatProps {
  onClick: () => void;
  title?: string;
  style?: React.CSSProperties;
  className?: string;
  /** 根元素标签，默认 'span'；容器类布局（如 flex 分组行）建议传 'div' */
  as?: 'span' | 'div';
  children: React.ReactNode;
}

/**
 * 通用可点击统计数字/分组包裹组件：统一 role="button"/tabIndex/键盘 Enter 触发/Hover 提示，
 * 并具备明确的键盘可见焦点环样式（不仅依赖颜色/下划线），供到期风险、推进情况、任务来源三张卡片的
 * 可点击入口复用，避免各卡片重复实现且遗漏无障碍焦点样式。
 */
const ClickableStat: React.FC<ClickableStatProps> = ({
  onClick,
  title = '查看对应任务',
  style,
  className,
  as = 'span',
  children,
}) => {
  injectFocusStyle();
  const Tag = as;
  return (
    <Tag
      role="button"
      tabIndex={0}
      title={title}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={className ? `${FOCUS_CLASS} ${className}` : FOCUS_CLASS}
      style={{ cursor: 'pointer', ...style }}
    >
      {children}
    </Tag>
  );
};

export default ClickableStat;
