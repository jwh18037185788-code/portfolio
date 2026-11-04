import { trackTaskAction } from '@/lib/taskAnalytics';
import { formatParentGoal } from '../utils/parentGoal';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import React from 'react';
import { Checkbox, Progress, Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  CalendarOutlined,
  BellOutlined,
  FireOutlined,
  AlertOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
  RobotOutlined,
  DownOutlined,
  EditOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ParentTaskOverviewDto } from '@/types/bdTask';
import { PARENT_TASK_DERIVED_STATUS } from '@/types/bdTask';
import { MT, MT_FILLED_TAG_STYLE } from '../theme';
import PersonName from './PersonName';
import CardTitleRow from './CardTitleRow';

// 优先级配置：颜色对齐 NoCode PRIORITY_HEX_COLOR（柔和胭脂红/温润琥珀橙/靛蓝紫同色系/中性灰紫），
// 仅用于关键标识，不作大面积饱和底色
export const PRIORITY_CONFIG: Record<number, {
  label: string; short: string; color: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  0: { label: 'P0 · 紧急', short: 'P0', color: MT.dangerText, bg: MT.dangerBg, border: MT.dangerBorder, icon: <FireOutlined /> },
  1: { label: 'P1 · 重要', short: 'P1', color: MT.warningText, bg: MT.warningBg, border: MT.warningBorder, icon: <AlertOutlined /> },
  2: { label: 'P2 · 常规', short: 'P2', color: MT.infoText, bg: MT.infoBg, border: MT.infoBorder, icon: <InfoCircleOutlined /> },
  3: { label: 'P3 · 较低', short: 'P3', color: MT.priorityP3, bg: MT.pageBg, border: MT.cardBorder, icon: <MinusCircleOutlined /> },
};

/** 任务批次标题后的标签统一排版：常规字重、同字号/行高/内边距。 */
export const TASK_TITLE_TAG_STYLE: React.CSSProperties = {
  ...MT_FILLED_TAG_STYLE,
};

/** 优先级徽标：对齐 NoCode PriorityBadge —— 浅底 10% 透明度 + 同色文字，圆角小标签 */
export const PriorityBadge: React.FC<{ priority: number }> = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG[3];
  return (
    <span
      style={{
        ...TASK_TITLE_TAG_STYLE,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
};

/** AI 直接执行标签：沿用项目既有 AI 强调色和标题标签尺寸。 */
export const AiDirectExecuteTag: React.FC = () => (
  <span style={{ ...TASK_TITLE_TAG_STYLE, background: MT.aiAccentBg, color: MT.aiAccent }}>
    AI直接执行
  </span>
);

/** 任务批次状态标签：列表页与详情页共用同一份状态、文案和颜色计算。 */
export const getParentTaskStatusBadge = (task: ParentTaskOverviewDto) => {
  const daysLeft = task.expireDate
    ? dayjs(task.expireDate).startOf('day').diff(dayjs().startOf('day'), 'day')
    : null;
  const status = task.achieved
    ? PARENT_TASK_DERIVED_STATUS.COMPLETED
    : daysLeft !== null && daysLeft < 0
      ? PARENT_TASK_DERIVED_STATUS.EXPIRED
      : daysLeft !== null && daysLeft <= 7
        ? PARENT_TASK_DERIVED_STATUS.SOON_EXPIRE
        : task.derivedStatus ?? PARENT_TASK_DERIVED_STATUS.IN_PROGRESS;

  if (status === PARENT_TASK_DERIVED_STATUS.COMPLETED) {
    return { status, label: '已完成', color: MT.successText, background: MT.successBg };
  }
  if (status === PARENT_TASK_DERIVED_STATUS.EXPIRED) {
    return { status, label: `过期${Math.abs(daysLeft ?? 0)}天`, color: MT.dangerText, background: MT.dangerBg };
  }
  if (status === PARENT_TASK_DERIVED_STATUS.SOON_EXPIRE) {
    return { status, label: `剩余${Math.max(daysLeft ?? 0, 0)}天`, color: MT.warningText, background: MT.warningBg };
  }
  return { status, label: '进行中', color: MT.infoText, background: MT.infoBg };
};

/** 标题后的实体类型、业务类型、优先级、任务状态标签，供列表卡片和详情页顶部卡片直接复用。 */
export const TaskTitleBadges: React.FC<{
  task: ParentTaskOverviewDto;
  taskTypeName: string;
  objectTypeLabel?: string;
  aiDirectExecute?: boolean;
  additionalTags?: React.ReactNode;
}> = ({ task, taskTypeName, objectTypeLabel, aiDirectExecute = task.aiDirectExecute, additionalTags }) => {
  const statusBadge = getParentTaskStatusBadge(task);
  return (
    <>
      {objectTypeLabel && (
        <span style={{ ...TASK_TITLE_TAG_STYLE, background: MT.pageBg, color: MT.textMuted }}>
          {objectTypeLabel}
        </span>
      )}
      <span style={{ ...TASK_TITLE_TAG_STYLE, background: MT.pageBg, color: MT.textMuted }}>
        {taskTypeName}
      </span>
      <PriorityBadge priority={task.priority} />
      <span style={{ ...TASK_TITLE_TAG_STYLE, background: statusBadge.background, color: statusBadge.color }}>
        {statusBadge.label}
      </span>
      {additionalTags}
      {aiDirectExecute && <AiDirectExecuteTag />}
    </>
  );
};

export interface TaskCardProps {
  task: ParentTaskOverviewDto;
  taskTypeName: string;
  onClick: () => void;
  canDelete: boolean;
  onDeleteClick: (task: ParentTaskOverviewDto) => void;
  /** 执行回调（拉出批量整改执行 Drawer），传入时展示「全部执行」按钮 */
  onExecute?: (task: ParentTaskOverviewDto) => void;
  /** 执行按钮自定义文案，默认“全部执行”。 */
  executeLabel?: string;
  /** 「修改基础信息」回调，传入时「更多」下拉菜单含「修改基础信息」选项 */
  onEditBasicInfo?: (task: ParentTaskOverviewDto) => void;
  /** 「修改任务项」回调（虾蜜任务抽屉），传入时「更多」下拉菜单含「修改任务项」选项 */
  onEditSubTask?: (task: ParentTaskOverviewDto) => void;
  /** @deprecated 兼容旧用法：未传 onEditBasicInfo/onEditSubTask 时退化为单一「修改」菜单项的 CatX 占位回调 */
  onEdit?: (task: ParentTaskOverviewDto) => void;
  /** 详情态展示：字段/布局与列表态保持一致，仅去除点击跳转态与选中框 */
  variant?: 'list' | 'detail';
  /** 「全部执行」按钮 loading 态（拉取该任务批次全部商家 ID 期间展示） */
  executeLoading?: boolean;
  executeDisabledReason?: string;
  /** 是否展示批量选中框（对齐 NoCode 选中框整合进卡片内部，而非外部单独渲染） */
  selectable?: boolean;
  /** 选中框当前选中状态 */
  selected?: boolean;
  /** 切换选中态回调 */
  onToggleSelect?: (id: number, checked: boolean) => void;
}

export interface TaskEditDropdownButtonProps {
  items: MenuProps['items'];
  onMenuClick: MenuProps['onClick'];
  compact?: boolean;
  showIcon?: boolean;
}

/** 任务批次编辑菜单：整颗按钮 hover 即展开；列表与详情页共用同一交互。 */
export const TaskEditDropdownButton: React.FC<TaskEditDropdownButtonProps> = ({
  items,
  onMenuClick,
  compact = false,
  showIcon = true,
}) => (
  <Dropdown menu={{ items, onClick: onMenuClick }} trigger={['hover']}>
    <Button
      icon={showIcon ? <EditOutlined /> : undefined}
      style={compact ? { height: 32, paddingInline: 12, fontSize: 13 } : undefined}
      onClick={e => { e.stopPropagation(); trackTaskAction('batch.edit_menu'); }}
    >
      编辑 <DownOutlined style={{ fontSize: 10 }} />
    </Button>
  </Dropdown>
);

/**
 * 任务卡片：1:1 对齐 NoCode TaskCard.jsx 的纵向堆叠布局 —— 标题行（名称+优先级+过期标签）
 * → 信息行（ID/截止/创建人）→ 进度行（当前可见范围进度+完成数+独立批次目标），右侧竖排操作按钮。
 * 新增 AI 执行能力（agentInfos）字段展示；不展示"检核指标"字段（无真实数据来源）。
 */
const TaskCard: React.FC<TaskCardProps> = ({
  task, taskTypeName, onClick, canDelete, onDeleteClick, onExecute, onEditBasicInfo, onEditSubTask, onEdit, variant = 'list', executeLoading, executeDisabledReason, executeLabel = '全部执行',
  selectable = false, selected = false, onToggleSelect,
}) => {
  // 「编辑」下拉菜单：修改基础信息 / 修改任务项 / 删除，列表页与详情页复用同一 hover 交互。
  const hasEditMenu = !!(onEditBasicInfo || onEditSubTask);
  const menuItems: MenuProps['items'] = [
    ...(onEditBasicInfo ? [{ key: 'basic-info', label: '修改基础信息' }] : []),
    ...(onEditSubTask ? [{ key: 'sub-task', label: '修改任务项' }] : []),
    ...(!hasEditMenu && onEdit ? [{ key: 'edit', label: '修改' }] : []),
    ...(canDelete ? [{ key: 'delete', label: '删除', danger: true }] : []),
  ];
  const handleMenuClick: MenuProps['onClick'] = ({ key, domEvent }) => {
    domEvent.stopPropagation();
    if (key === 'basic-info') { trackTaskAction('batch.edit_basic'); onEditBasicInfo?.(task); }
    if (key === 'sub-task') { trackTaskAction('batch.edit_items'); onEditSubTask?.(task); }
    if (key === 'edit') { trackTaskAction('batch.edit_basic'); onEdit?.(task); }
    if (key === 'delete') { trackTaskAction('batch.delete_one'); onDeleteClick(task); }
  };
  const hasMoreMenu = menuItems.length > 0;

  const percent = task.totalCount > 0 ? Math.round((task.completedCount / task.totalCount) * 100) : 0;
  const isDetail = variant === 'detail';

  const statusBadge = getParentTaskStatusBadge(task);
  const isExpired = statusBadge.status === PARENT_TASK_DERIVED_STATUS.EXPIRED;

  const hasAgents = Array.isArray(task.agentInfos) && task.agentInfos.length > 0;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 规避选中框/按钮/下拉菜单区域（data-no-navigate 标记）触发跳转
    if ((e.target as HTMLElement).closest('[data-no-navigate]')) return;
    if (!isDetail) onClick();
  };

  return (
    <div onClick={handleCardClick} style={{ cursor: isDetail ? 'default' : 'pointer' }}>
      <div
        style={{
          background: MT.cardBg,
          borderRadius: MT.cardRadius,
          border: '1px solid transparent',
          boxShadow: MT.cardShadow,
          padding: 20,
          transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
        }}
        onMouseEnter={e => {
          if (isDetail) return;
          (e.currentTarget as HTMLDivElement).style.boxShadow = MT.cardShadowHover;
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = MT.cardShadow;
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* 批量选中框：对齐 NoCode selectable 整合进卡片内部 */}
          {selectable && (
            <div data-no-navigate style={{ display: 'flex', height: 24, alignItems: 'center', paddingTop: 2 }}>
              <Checkbox
                checked={selected}
                onChange={e => { trackTaskAction('selection.batch'); onToggleSelect?.(task.parentTaskId, e.target.checked); }}
              />
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <CardTitleRow
              title={<span style={{ minWidth: 0, fontSize: 15, fontWeight: 600, color: MT.textPrimary }}>{task.name}</span>}
              id={task.parentTaskId}
              tags={(
                <TaskTitleBadges
                  task={task}
                  taskTypeName={taskTypeName}
                  objectTypeLabel={getObjectTypeMeta(task.contactObjectType)?.label}
                />
              )}
            />

            {/* 信息行：截止日期 / 创建人 / AI执行能力；
                【全面排查修复】icon 与紧邻文字间距统一为 6px（此前 4px 偏拥挤），字段间距统一为 16px（此前 20px），
                与全站其余卡片元信息行（SubTaskList.tsx/ShopTaskListPage.tsx 等）保持一致 */}
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px 16px',
                fontSize: 12,
                color: MT.textMuted,
              }}
            >
              {task.creatorId && (
                <span data-no-navigate style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'text' }}>
                  <UserOutlined style={{ fontSize: 12 }} />
                  <span>创建人：<PersonName name={task.creatorName} mis={task.creatorId} /></span>
                </span>
              )}
              {task.createdTime != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CalendarOutlined style={{ fontSize: 12 }} />
                  <span>创建：{dayjs(task.createdTime).format('YYYY.MM.DD')}</span>
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <BellOutlined style={{ fontSize: 12, color: isExpired ? MT.danger : MT.textMuted }} />
                <span style={{ color: isExpired ? MT.danger : MT.textMuted }}>截止：{dayjs(task.expireDate).format('YYYY.MM.DD')}</span>
              </span>
              {hasAgents && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MT.textMuted }}>
                  <RobotOutlined style={{ fontSize: 12 }} />
                  <span>相关 Agent：{task.agentInfos!.map(a => a.agentName).join('、')}</span>
                </span>
              )}
            </div>

            {/* 进度行：当前可见范围进度条 + 完成数/占比 + 独立目标 */}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', maxWidth: 280, flex: 1, lineHeight: 0 }}>
                <Progress
                  aria-label="当前可见范围任务完成进度"
                  percent={percent}
                  strokeColor={task.achieved ? MT.success : MT.warning}
                  trailColor="#EEEEEE"
                  showInfo={false}
                  size="small"
                  style={{ lineHeight: 0 }}
                />
              </div>
              <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 500, color: MT.textPrimary }}>
                {task.completedCount}/{task.totalCount}
                <span style={{ marginLeft: 4, color: MT.textPrimary }}>({percent}%)</span>
              </span>
              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: MT.textMuted }}>
                <CheckCircleOutlined style={{ fontSize: 12 }} />
                目标 {formatParentGoal(task)}
              </span>
            </div>
          </div>

          {/* 右侧操作按钮：编辑下拉菜单 + 全部执行 */}
          <div data-no-navigate style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 8 }}>
            {hasMoreMenu && (
              <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['hover']} placement="bottomRight">
                <Button
                  style={{ height: 32, paddingInline: 12, fontSize: 13 }}
                  onClick={e => { e.stopPropagation(); trackTaskAction('batch.edit_menu'); }}
                >
                  编辑 <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            )}
            {onExecute && (
              <Button
                type="primary"
                loading={executeLoading}
                disabled={!!executeDisabledReason}
                title={executeDisabledReason}
                style={{ height: 32, paddingInline: 12, fontSize: 13 }}
                onClick={() => onExecute(task)}
              >
                {executeLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
