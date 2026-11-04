import React from 'react';
import { MT } from '../theme';

export interface StatCardProps {
  /** 统计数量 */
  count: number | string;
  showCount?: boolean;
  disabled?: boolean;
  /** 显示文案 */
  label: string;
  /** 图标（可选） */
  icon?: React.ReactNode;
  /** 是否为当前选中态 */
  active: boolean;
  /** 主色（用于文字/图标/激活态描边+背景，均由该色派生） */
  color?: string;
  /** @deprecated 不再使用，激活态背景统一由 color 派生（对齐 NoCode StatFilterCard 的 ${accent}14 透明度叠色） */
  activeBg?: string;
  /** @deprecated 不再使用，激活态描边统一使用 color 本身（对齐 NoCode StatFilterCard 的 1px solid ${accent}） */
  activeBorder?: string;
  onClick: () => void;
}

/**
 * 通用统计筛选卡片：从 ParentTaskList 原 PriorityStatCard 抽取泛化，
 * 支持任意统计维度（优先级/任务状态/业务类型）+ 点击筛选交互。
 * 视觉 1:1 对齐 NoCode StatFilterCard（src/components/shared/StatFilterCard.jsx）：
 * - 文字标签在前、数字在后（数字加粗更突出，tabular-nums 对齐数位）
 * - 未激活态统一使用中性灰底白卡 + 灰字，激活态切换为该维度语义色描边/背景/文字
 * - 激活态仅保留单层语义色描边，不再叠加浅色外圈
 */
const StatCard: React.FC<StatCardProps> = ({
  count, label, icon, active, color = MT.brandPrimary, onClick, showCount = true, disabled = false,
}) => {
  return (
    <div
      className="bd-task-outline-hover"
      data-selected={active}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={active}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onKeyDown={event => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        userSelect: 'none',
        borderRadius: MT.cardRadiusSmall,
        border: `1px solid ${active ? color : MT.cardBorder}`,
        background: active ? `${color}14` : MT.cardBg,
        padding: '5px 12px',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxShadow: 'none',
      }}
    >
      {/* 【走查修复】icon 与紧邻文字高度对齐：统一 lineHeight:1 + verticalAlign:middle，
          避免图标行盒与文字默认行高不一致导致的视觉错位 */}
      {icon && (
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, lineHeight: 1, color: active ? color : MT.textMuted, opacity: active ? 1 : 0.8 }}>
          {icon}
        </span>
      )}
      <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1, color: active ? color : '#595959', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {showCount && <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1, color: active ? color : MT.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>}
    </div>
  );
};

export default StatCard;
