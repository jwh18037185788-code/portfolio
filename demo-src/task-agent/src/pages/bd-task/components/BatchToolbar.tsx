import React from 'react';
import { Button } from 'antd';
import { MT } from '../theme';

export interface BatchToolbarAction {
  key: string;
  label: string;
  danger?: boolean;
  color?: string;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}

export interface BatchToolbarProps {
  count: number;
  actions: BatchToolbarAction[];
  /** 组内批量操作使用更紧凑的字号和按钮间距，与当前页批量操作拉开层级。 */
  compact?: boolean;
}

/**
 * 通用批量操作条：1:1 对齐 NoCode BatchActionBar —— 内联展示在"全选"行内，
 * 已选数量文字 + 一组无图标文字按钮，无独立卡片背景、分隔线或额外取消入口。
 */
const BatchToolbar: React.FC<BatchToolbarProps> = ({ count, actions, compact = false }) => {
  if (count === 0) return null;

  return (
    <div style={{ display: 'flex', height: compact ? 16 : undefined, alignItems: 'center', gap: compact ? 8 : 10 }}>
      <span style={{ fontSize: compact ? 11 : 12, fontWeight: 500, lineHeight: compact ? '16px' : undefined, color: MT.brandPrimary }}>已选 {count} 项</span>
      <div style={{ display: 'flex', height: compact ? 16 : undefined, alignItems: 'center', gap: compact ? 4 : 8 }}>
        {actions.map(action => (
          <Button
            key={action.key}
            size="small"
            type="text"
            disabled={action.disabled}
            title={action.title}
            onClick={action.onClick}
            style={{
              ...(compact ? { height: 16, paddingInline: 4, fontSize: 12, lineHeight: '16px' } : {}),
              color: action.disabled ? undefined : action.color ?? (action.danger ? MT.danger : MT.textMuted),
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default BatchToolbar;
