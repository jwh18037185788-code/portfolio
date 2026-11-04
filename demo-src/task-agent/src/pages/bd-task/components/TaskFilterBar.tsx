import React from 'react';
import { Input, Segmented, Button } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import StatCard, { StatCardProps } from './StatCard';
import StatGroup, { StatGroupStack } from './StatGroup';
import { MT } from '../theme';

/** 任务详情页与任务列表页共用的筛选区布局骨架。 */
export const TASK_FILTER_CARD_STYLE: React.CSSProperties = {
  background: MT.cardBg,
  borderRadius: MT.cardRadius,
  border: '1px solid transparent',
  boxShadow: MT.cardShadow,
  padding: '20px 24px',
  marginBottom: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

export const TASK_FILTER_SEARCH_ROW_STYLE: React.CSSProperties = {
  // 卡片区域 gap 为20px；搜索区再补4px，使标签到输入框为24px。
  marginTop: 4,
  display: 'flex',
  gap: 12,
  alignItems: 'flex-end',
  flexWrap: 'wrap',
};

export const TASK_FILTER_FIELDS_STYLE: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minWidth: 0,
  gap: 12,
  alignItems: 'flex-end',
  flexWrap: 'wrap',
};

export const TASK_FILTER_ACTIONS_STYLE: React.CSSProperties = {
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  gap: 12,
};

/** 筛选卡片左下角结果统计的统一尺寸与垂直对齐基准。 */
export const TASK_FILTER_RESULT_COUNT_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  minHeight: 32,
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  lineHeight: 1,
  color: MT.textMuted,
};

export interface TaskFilterStatItem extends Omit<StatCardProps, 'onClick' | 'active'> {
  key: string;
}

export type SortMode = 'priority' | 'expireDate';

export interface TaskFilterBarProps {
  /** 页面局部卡片样式，如业务类型页签的顶部内边距。 */
  cardStyle?: React.CSSProperties;
  /** 统计卡片配置（优先级/完成状态/业务类型等，由调用方基于当前已加载数据计算好数量后传入） */
  stats: TaskFilterStatItem[];
  activeStatKey: string | null;
  onStatClick: (key: string | null) => void;
  /** 【全面排查修复】统计分组左侧 icon + 标题，与任务列表页 ParentTaskList.tsx / 商家详情页
   * ShopTaskListPage.tsx 的 StatGroup 视觉风格统一；不传则不展示 icon+标题前缀（保持旧版纯 chips 平铺，兼容历史调用方） */
  statsIcon?: React.ReactNode;
  statsTitle?: string;
  statsNotice?: React.ReactNode;
  /** 多组统计筛选的完整内容；传入时替代单组 stats 渲染，但继续复用同一筛选卡片骨架。 */
  statsContent?: React.ReactNode;
  /** 搜索框：草稿值，仅点击「查询」按钮或回车才会真正生效（对齐 NoCode 查询按钮交互）；
   * TC-110：任务详情页下全部任务项本就同属一个任务批次，任务名称唯一，该搜索框无实际意义，故改为可选，
   * 不传时不渲染该输入框（其余真实字段搜索框通过 extra 插入） */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** 点击「查询」按钮 / 回车：将所有草稿值同步为生效值，统一触发一次真实查询 */
  onSearch?: () => void;
  /** 排序：优先级 / 截止时间 */
  sortMode?: SortMode;
  onSortModeChange?: (mode: SortMode) => void;
  /** 是否展示"统计基于当前已加载数据"提示 */
  showLocalDataHint?: boolean;
  /** 额外的搜索/筛选控件（如责任人、门店ID等真实服务端参数搜索框），插入到搜索框之后 */
  extra?: React.ReactNode;
  /** 重置筛选：清空全部草稿值与生效值，恢复初始状态 */
  onReset?: () => void;
  /** 重置按钮是否可用（存在任一生效中的筛选/搜索条件时才可点击） */
  hasActiveFilters?: boolean;
  /** 重置按钮文案，默认“重置筛选” */
  resetLabel?: string;
  /** 筛选卡片操作行左侧的结果数量，如“共 8 个任务项”。 */
  resultCountLabel?: React.ReactNode;
  /** 结果行右侧的页面特有控件，如排序与“仅看未过期”。 */
  actionsExtra?: React.ReactNode;
}

/**
 * 通用筛选/排序/搜索工具条：供商家详情页（ShopTaskListPage）与任务详情页（SubTaskList）共同复用。
 * 统计卡片默认基于调用方已加载的当前页数据本地聚合计算（非全量数据库聚合）。
 */
const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  cardStyle,
  stats,
  activeStatKey,
  onStatClick,
  statsIcon,
  statsTitle,
  statsNotice,
  statsContent,
  searchValue,
  onSearchChange,
  searchPlaceholder = '输入任务名称',
  onSearch,
  sortMode,
  onSortModeChange,
  showLocalDataHint,
  extra,
  onReset,
  hasActiveFilters,
  resetLabel = '重置筛选',
  resultCountLabel,
  actionsExtra,
}) => {
  return (
    <div style={{ ...TASK_FILTER_CARD_STYLE, ...cardStyle }}>
      <div>
        {statsContent ?? (statsIcon && statsTitle ? (
          <StatGroupStack>
            <StatGroup icon={statsIcon} title={statsTitle}>
              {stats.map(stat => (
                <StatCard
                  key={stat.key}
                  {...stat}
                  active={activeStatKey === stat.key}
                  onClick={() => onStatClick(activeStatKey === stat.key ? null : stat.key)}
                />
              ))}
            </StatGroup>
          </StatGroupStack>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {stats.map(stat => (
              <StatCard
                key={stat.key}
                {...stat}
                active={activeStatKey === stat.key}
                onClick={() => onStatClick(activeStatKey === stat.key ? null : stat.key)}
              />
            ))}
          </div>
        ))}
        {statsNotice}
      </div>

      {/* 搜索字段独占一行，避免操作按钮与输入框挤在一起。 */}
      <div style={TASK_FILTER_SEARCH_ROW_STYLE}>
        {/* 搜索字段区：任务名称搜索框（可选）+ extra 插入的其余筛选字段，flex:1 占满行内剩余空间 */}
        <div style={TASK_FILTER_FIELDS_STYLE}>
          {/* 搜索区：草稿值 + 查询按钮触发，回车同样生效，对齐 NoCode handleSearch 交互；
              TC-110：onSearchChange 未传入时不渲染任务名称搜索框，「查询」按钮独立渲染以便驱动 extra 中的其余搜索字段 */}
          {onSearchChange && (
            <div style={{ display: 'flex', flex: 1, minWidth: 200, maxWidth: 320, alignItems: 'center', gap: 8 }}>
              <Input
                placeholder={searchPlaceholder}
                prefix={<SearchOutlined style={{ color: MT.textMuted }} />}
                value={searchValue}
                onChange={e => onSearchChange(e.target.value)}
                onPressEnter={onSearch}
                allowClear
                style={{ borderRadius: MT.inputRadius }}
              />
            </div>
          )}

          {extra}
        </div>

      </div>

      {/* 结果数量与操作按钮单独成行，复用商家列表筛选卡片的左右分布结构。 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={TASK_FILTER_RESULT_COUNT_STYLE}>{resultCountLabel}</div>
        <div style={TASK_FILTER_ACTIONS_STYLE}>
          {actionsExtra}
          {sortMode && onSortModeChange && (
            <Segmented
              className="bd-task-sort-segmented"
              value={sortMode}
              onChange={v => onSortModeChange(v as SortMode)}
              options={[
                { label: '按优先级', value: 'priority' },
                { label: '按截止时间', value: 'expireDate' },
              ]}
            />
          )}

          {onReset && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onReset}
              disabled={!hasActiveFilters}
            >
              {resetLabel}
            </Button>
          )}

          {/* 查询保持为筛选操作区的主按钮，并放在重置筛选右侧。 */}
          {onSearch && (
            <Button type="primary" icon={<SearchOutlined />} onClick={onSearch} style={{ flexShrink: 0 }}>
              查询
            </Button>
          )}
        </div>
      </div>

      {showLocalDataHint && (
        <div style={{ fontSize: 12, color: MT.textMuted }}>
          统计基于当前已加载数据，非全量统计
        </div>
      )}
    </div>
  );
};

export default TaskFilterBar;
