import { useTaskAnalyticsView } from '@/lib/useTaskAnalyticsView';
import { trackTaskAction, trackTaskView } from '@/lib/taskAnalytics';
import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Tag, Button, Modal, Input, Typography, Checkbox, Avatar, Tooltip, Popover } from 'antd';
import {
  UserOutlined,
  ShopOutlined,
  RobotOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { BdTaskDto, ContactObjectType, ParentTaskOverviewDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import { MT, MT_FILLED_TAG_STYLE, TASK_DETAIL_ITEM_AVATAR_SIZE } from '../theme';
import ProfileFields from './ProfileFields';
import AiExecutionResults from './AiExecutionResults';
import { canEnterExecution } from '@/components/shop-execution/executionScope';
import SqsProductInfo from './SqsProductInfo';
import TaskConditionInfo from './TaskConditionInfo';
import CardTitleRow from './CardTitleRow';
import { TaskTitleBadges } from './TaskCard';
import { resolveTaskTypeName, type TaskTypeNameMap } from '../utils/taskTypeName';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import TaskDetailLayout, {
  DETAIL_META_ROW_STYLE,
  DetailMetaItem,
  TASK_DETAIL_META_ROW_GAP,
  TASK_DETAIL_META_TOP_GAP,
  TASK_DETAIL_STATUS_TAG_WIDTH,
  TASK_DETAIL_TITLE_ROW_HEIGHT,
} from './TaskDetailLayout';

const { Text } = Typography;
const { TextArea } = Input;

// ==================== 枚举常量 ====================
export const STATUS = {
  PENDING: 0,
  DONE: 1,
  FAILED: 2,
  EXPIRED: 3,
  CHECK_PASSED: 4,
  AI_DOING: 5,
  AI_DONE: 6,
} as const;

export const EXECUTOR = { HUMAN: 0, AI: 1 } as const;

// 任务项状态统计配置：抽取为公共常量供 SubTaskList.tsx / ShopTaskListPage.tsx 共同复用，
// 此前两处各自复制一份完全相同的定义，属于重复代码，任一处新增/调整状态项容易遗漏另一处未同步；
// TC-105 修复：需包含「检核通过」（STATUS.CHECK_PASSED=4）状态项
// 【全面排查修复】统一补充各状态 icon：此前仅 ParentTaskList.tsx 任务批次派生状态（已完成/进行中/已超时）
// 统计卡片带 icon，本处任务项状态统计卡片缺失 icon，视觉不统一；现按语义对齐全站已有图标口径——
// 已完成/AI已完成沿用 CheckCircleOutlined（与任务批次「已完成」一致），无法完成沿用 CloseCircleOutlined
// （与任务批次「已超时」危险语义一致），AI执行中沿用 RobotOutlined（全站 AI 标识统一图标），
// 待处理用 ClockCircleOutlined（等待中语义），检核通过用 SafetyCertificateOutlined（区别于普通已完成，
// 强调"检核"属性），已过期用 FieldTimeOutlined（区别于"无法完成"，强调时间超期属性）
export const STATUS_STAT_CONFIG: { key: number; label: string; color: string; icon: React.ReactNode }[] = [
  { key: STATUS.PENDING,       label: '待处理',   color: MT.warningText, icon: <ClockCircleOutlined /> },
  { key: STATUS.DONE,          label: '已完成',   color: MT.successText, icon: <CheckCircleOutlined /> },
  { key: STATUS.CHECK_PASSED,  label: '检核通过', color: MT.successText, icon: <SafetyCertificateOutlined /> },
  { key: STATUS.FAILED,        label: '无法完成', color: MT.dangerText,  icon: <CloseCircleOutlined /> },
  { key: STATUS.AI_DOING,      label: 'AI 执行中', color: MT.infoText,    icon: <RobotOutlined /> },
  { key: STATUS.AI_DONE,       label: 'AI 已完成', color: MT.successText, icon: <RobotOutlined /> },
  { key: STATUS.EXPIRED,       label: '已过期',   color: MT.textMuted,   icon: <FieldTimeOutlined /> },
];

// ==================== 状态 Tag ====================
// 卡片标签组统一样式（与 ProfileFields size="small" 画像标签保持一致的字号/内边距/圆角/行高），
// 确保任务项状态标签与其余画像标签在视觉尺寸上完全对齐，不会因组件不同而大小不一
const STATUS_TAG_BASE_STYLE: React.CSSProperties = {
  ...MT_FILLED_TAG_STYLE,
};

/**
 * 任务项状态 → 文案/颜色 通用映射（不依赖具体 DTO 类型，仅需 status/executorType 两个基础字段）。
 * 抽出此纯函数供 statusTag（任务项卡片，BdTaskDto）与商家列表任务概览（ShopCard.tsx，SubTaskOverviewDto.status，
 * executorType 该结构未透出、固定传 undefined 走兜底分支）两处复用，保证同一状态码在全站展示口径完全一致。
 *
 * 【文案对齐修复】此前 CHECK_PASSED(4) 被与 DONE(1) 合并展示为「已完成」，导致线上 case（taskId:122067,
 * status:4）页面误显示"已完成"而非"检核通过"；PENDING(0) 此前无独立分支，落入兜底展示"人工执行中"/
 * "AI执行中"。现统一对齐「任务列表-任务详情页」顶部「任务状态统计筛选」（STATUS_STAT_CONFIG）的文案口径：
 * PENDING→待处理、DONE→已完成、CHECK_PASSED→检核通过（不再与已完成合并），其余状态文案本就一致，保持不变。
 * 颜色沿用本文件原有 Tag 配色体系（全站统一的语义色/AI强调色），仅修正文案，不改变视觉风格。
 */
export function resolveStatusTagConfig(status: number | undefined, executorType: number | undefined) {
  if (status === STATUS.PENDING) {
    return { text: '待处理', background: MT.warningBg, color: MT.warningText };
  }
  if (status === STATUS.DONE) {
    return { text: '已完成', background: MT.successBg, color: MT.successText };
  }
  if (status === STATUS.CHECK_PASSED) {
    return { text: '检核通过', background: MT.successBg, color: MT.successText };
  }
  if (status === STATUS.FAILED) {
    return { text: '无法完成', background: MT.dangerBg, color: MT.dangerText };
  }
  if (status === STATUS.AI_DOING) {
    return { text: 'AI 执行中', background: MT.aiAccentBg, color: MT.aiAccent };
  }
  if (status === STATUS.AI_DONE) {
    return { text: 'AI 已完成', background: MT.successBg, color: MT.successText };
  }
  if (status === STATUS.EXPIRED) {
    return { text: '已过期', background: MT.pageBg, color: MT.textMuted };
  }
  if (executorType === EXECUTOR.AI) {
    return { text: 'AI 执行中', background: MT.aiAccentBg, color: MT.aiAccent };
  }
  return { text: '人工执行中', background: MT.yellowSubtle, color: MT.textMuted };
}

export function statusTag(task: BdTaskDto, variant: 'filled' | 'solid' | 'outlined' = 'filled') {
  const cfg = resolveStatusTagConfig(task.status, task.executorType);
  const colorStyle = variant === 'solid'
    ? { background: cfg.color, color: '#FFFFFF' }
    : variant === 'outlined'
      ? { background: cfg.background, color: cfg.color, border: `1px solid ${cfg.color}` }
    : { background: cfg.background, color: cfg.color };
  return <Tag bordered={false} style={{ ...STATUS_TAG_BASE_STYLE, ...colorStyle }}>{cfg.text}</Tag>;
}

export function canFeedback(task: BdTaskDto) {
  return task.status === STATUS.PENDING || task.status === STATUS.AI_DOING || task.status === STATUS.AI_DONE;
}

/** 所有适用能力统一允许待处理、AI执行中和AI已完成；对象/批量支持及权限另行校验。 */
export function canStartExecution(task: BdTaskDto) {
  return canEnterExecution(task);
}

/** AI 执行中的任务仍可打开 AI 执行入口。 */
export function canStartAiExecution(task: BdTaskDto) {
  return task.status === STATUS.PENDING || task.status === STATUS.AI_DOING;
}

/** remark只承载人工备注／反馈，不再据AI状态把它解释成AI结果。 */
export function resolveTaskRemark(task: Pick<BdTaskDto, 'remark' | 'status' | 'feedbackResult'>) {
  const remark = task.remark?.trim();
  const failedReason = task.feedbackResult === 2 || task.status === STATUS.FAILED ? remark : undefined;
  return {
    metadataRemark: remark && !failedReason ? remark : undefined,
    resultRemark: failedReason ? { label: '无法完成原因', value: failedReason } : undefined,
  };
}

export const TaskRemarkMetadata: React.FC<{ remark: string; color?: string }> = ({ remark, color = MT.textMuted }) => (
  <DetailMetaItem icon={<InfoCircleOutlined />} label="备注" color={color} tooltip={remark}>
    <Text style={{ fontSize: 12, color, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{remark}</Text>
  </DetailMetaItem>
);

export const TaskRemarkResult: React.FC<{
  remark: ReturnType<typeof resolveTaskRemark>['resultRemark'];
  color?: string;
}> = ({ remark, color = MT.textMuted }) => remark ? (
  <div style={{ display: 'inline-flex', alignItems: 'flex-start', maxWidth: 320, whiteSpace: 'normal' }}>
    <span style={{ flexShrink: 0 }}>{remark.label}：</span>
    <span style={{ minWidth: 0, color, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{remark.value}</span>
  </div>
) : null;

/** 是否配置了检核指标；优先读取结构化 checkInfo，兼容动态画像字段。 */
export function hasCheckIndicator(task: BdTaskDto) {
  return !!task.checkInfo?.bizIndicatorId || !!task.profileFields?.some(field => field.key === 'targetValue' && field.value);
}

/**
 * 业务最终态判断。“已完成”带检核指标时仍需等待检核结果，因此可以继续变为“检核通过”；
 * 但前端不会依据截止时间把“已完成”转换为“已过期”，过期规则由后端返回的真实状态决定。
 */
export function isFinalTaskStatus(task: BdTaskDto) {
  if (task.status === STATUS.FAILED || task.status === STATUS.CHECK_PASSED || task.status === STATUS.EXPIRED) return true;
  return task.status === STATUS.DONE && !hasCheckIndicator(task);
}

/**
 * 组装任务项卡片「检核结果」字段：前端根据任务项状态自行判断，后端无接口返回该字段本身——
 * 状态为「检核通过」（STATUS.CHECK_PASSED）展示"通过"，其余任意状态一律展示"未通过"（与用户确认口径一致，
 * 不区分"进行中"等中间态，均归入"未通过"展示）。
 * 【兼容】并非所有任务都关联检核指标：优先通过结构化 checkInfo 判断，同时兼容 profileFields 中
 * key=targetValue（"检核指标目标"）的历史数据。两处均不存在时，展示"无检核指标"这一独立第三态，
 * 避免将未配置检核指标的任务误判为"未通过"。
 */
export function resolveCheckResult(
  task: BdTaskDto,
  targetValueField: { label: string; value?: string } | undefined,
): { text: '通过' | '未通过' | '无检核指标'; color: string; background: string } {
  if (!hasCheckIndicator(task) || !targetValueField?.value) {
    return { text: '无检核指标', color: MT.textMuted, background: MT.pageBg };
  }
  if (task.status === STATUS.CHECK_PASSED) {
    return { text: '通过', color: MT.successText, background: MT.successBg };
  }
  return { text: '未通过', color: MT.dangerText, background: MT.dangerBg };
}

/**
 * 组装「检核结果」hover 浮层内容（两行）：第一行「检核指标当前值」取 profileFields 中 key=actualValue 的 label/value，
 * 第二行「检核指标目标」取 key=targetValue 的 label/value，均来自 /xianfu/api-v2/dove/bd_task/detail 接口
 * （BdTaskDto.profileFields，后端已下发）。两个字段均缺失时返回 null，前端据此不展示 hover 浮层。
 */
export function resolveCheckResultTooltip(
  actualValueField: { label: string; value?: string } | undefined,
  targetValueField: { label: string; value?: string } | undefined,
): React.ReactNode | null {
  if (!actualValueField?.value && !targetValueField?.value) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {actualValueField?.value && (
        <span>{actualValueField.label}：{actualValueField.value}</span>
      )}
      {targetValueField?.value && (
        <span>{targetValueField.label}：{targetValueField.value}</span>
      )}
    </div>
  );
}

// ==================== TaskItem ====================
export interface TaskItemProps {
  task: BdTaskDto;
  /** 所在任务批次的实体类型；用于任务详情页在任务项字段缺失时确定标题标签规则。 */
  contactObjectType?: ContactObjectType;
  showParentTaskName?: boolean;
  /** 商家详情页补查到的任务批次信息，用于复用任务列表的业务类型/优先级/批次状态标签。 */
  parentTask?: ParentTaskOverviewDto;
  taskTypeNameMap?: TaskTypeNameMap;
  onFeedback: (task: BdTaskDto, type: 'done' | 'failed') => void;
  /** 去执行回调（拉出批量整改执行 Drawer），传入时展示「去执行」按钮 */
  onExecute?: () => void;
  executeDisabledReason?: string;
  /** 是否展示批量选中复选框（商家详情页/任务详情页批量操作场景传入；不传则不展示，向后兼容） */
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  /** TC-118-5：点击商家名/logo 跳转商家详情页回调，传入时商家名/logo 可点击（任务详情页场景传入；商家详情页自身场景不传） */
  onShopClick?: () => void;
  /** 任务状态标签色彩模式；任务列表详情页使用 outlined，其他复用场景默认保持 filled。 */
  statusVariant?: 'filled' | 'solid' | 'outlined';
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task, contactObjectType, showParentTaskName, parentTask, taskTypeNameMap = {}, onFeedback, onExecute, executeDisabledReason,
  selectable, selected, onSelectChange, onShopClick, statusVariant = 'filled',
}) => {
  const feedbackable = canFeedback(task);
  const executable = canStartExecution(task);
  // 任务详情页（展示商家卡片）普通元信息统一使用同一层级色；状态、标签和检核结果仍保留语义色。
  const metadataColor = showParentTaskName ? MT.textMuted : '#666666';

  // 参考信息（纯文本）与参考指标（数组）：/xianfu/api-v2/dove/bd_task/detail 接口新增字段。
  // 二者为空时均不展示对应标签；参考信息超长单行省略号截断，参考指标行内展示数量 + 查看详情逐行展开。
  const description = task.description?.trim();
  const monitorIndicatorValues = Array.isArray(task.monitorIndicatorValues) ? task.monitorIndicatorValues : [];
  const referenceOpened = useRef(false);
  const trackReferenceOpen = (open: boolean) => {
    if (open && !referenceOpened.current) trackTaskView('task.reference_details', undefined, { parentTaskId: task.parentTaskId, taskIds: [task.taskId] });
    referenceOpened.current = open;
  };

  // 任务列表详情页卡片内容排列规则：
  // 第一行：商家名称、商家ID + 全部标签类（valueType=TAG）字段——businessStatus/onlineStatus/categoryName/
  //        deliveryType/poiTags/claimStatus 共 6 个，与原有 AI 小标/执行状态/体验分同行展示；
  // 基础元信息按任务描述 / 跟进人 / 经营地址 / 参考信息 / 参考指标 / 普通备注顺序排列，每行最多两项；
  // 检核结果与 AI 结果属于动态状态信息，在卡片右侧分两行展示，并与左侧前两行元信息对齐；
  // 无法完成原因不参与左侧元信息排版，并在没有 AI 结果时占用右侧 AI 结果的位置。
  // 画像字段统一按 valueType 拆分，不再按具体 key 白名单枚举，后端新增同类型字段时前端自动归位。
  // 商家详情页（showParentTaskName=true）场景下，logo/体验分/画像字段（营业状态/上单状态/品类/配送方式/
  // 商家标签/认领状态/经营地址等）均为门店维度共性信息，页面顶部商家信息头已统一展示过，同一商家下所有
  // 任务项卡片重复展示无意义，故此场景下不再取用 profileFields/experienceScore，仅保留任务维度信息
  const effectiveObjectType = contactObjectType ?? task.contactObjectType ?? parentTask?.contactObjectType;
  const isWdcShopTask = effectiveObjectType === CONTACT_OBJECT_TYPE.WDC_SHOP;
  const deliveryField = isWdcShopTask ? undefined : task.profileFields?.find(field => field.key === 'deliveryType');
  const deliveryLabel = deliveryField?.value ?? deliveryField?.tagList?.[0];
  const experienceField = isWdcShopTask ? undefined : task.profileFields?.find(field => field.key === 'experienceScore');
  const experienceScore = isWdcShopTask ? undefined : (task.experienceScore ?? experienceField?.value);
  const rawTagFields = showParentTaskName
    ? []
    : (task.profileFields?.filter(f => f.valueType === 'TAG' && f.key !== 'deliveryType' && f.key !== 'experienceScore') ?? []);
  // 公海门店任务卡片只展示三类画像标签，并固定顺序：认领上单状态 → 门店品类 → 商家标签。
  // 不依赖后端 profileFields 数组顺序，避免画像回填顺序变化导致标题标签漂移。
  const tagFields = isWdcShopTask
    ? ['claimStatus', 'categoryName', 'poiTags'].flatMap(key => {
      const field = rawTagFields.find(item => item.key === key);
      return field ? [field] : [];
    })
    : rawTagFields;
  const categoryIndex = tagFields.findIndex(field => field.key === 'categoryName');
  const tagFieldsThroughCategory = categoryIndex >= 0 ? tagFields.slice(0, categoryIndex + 1) : tagFields;
  const tagFieldsAfterCategory = categoryIndex >= 0 ? tagFields.slice(categoryIndex + 1) : [];
  const hasTaskTitleTags = tagFields.length > 0 || !!deliveryLabel || (experienceScore !== undefined && experienceScore !== '');
  // 检核指标当前值/目标值：后端技术方案 §3.8（KM 2778373947 表格 168-169 行）明确 actualValue/targetValue
  // 这两个 key 本身就在 profileFields 动态数组里（valueType=TEXT），而非只存在于 BdTaskDto 顶层同名字段——
  // 顶层字段是"平铺保留过渡期"的历史兼容字段，取值应统一以 profileFields 为准，避免与顶层字段来源不一致、
  // 或后续过渡期结束顶层字段下线后此处失效。且需与其余 TEXT 字段分开单独取，避免被下方 ProfileFields 通用
  // 渲染器重复渲染一遍导致同一信息展示两次；label 直接取后端下发文案（当前"检核指标当前值/目标值"），
  // 不再由前端硬编码"检核指标"前缀，后端文案变更时前端无需改代码。
  // 检核指标当前值/目标值本身不再单独展示（原「检核指标当前值 XX / 目标 YY」整行含检核口径 hover 已删除，
  // 由下方「检核结果」字段承载同一份信息的更优展示——hover 即可查看当前值/目标值，避免同一信息展示两遍），
  // 但仍需读取这两个字段的原始值用于组装「检核结果」的 hover 浮层内容
  const actualValueField = task.profileFields?.find(f => f.key === 'actualValue')
    ?? (task.actualValue ? { label: '检核指标当前值', value: task.actualValue } : undefined);
  const fallbackTargetValue = task.checkInfo?.targetValue || task.targetValue;
  const targetValueField = task.profileFields?.find(f => f.key === 'targetValue')
    ?? (task.checkInfo?.bizIndicatorId && fallbackTargetValue
      ? { label: '检核指标目标', value: fallbackTargetValue }
      : undefined);
  const addressField = task.profileFields?.find(f => f.key === 'address' && f.value);
  // 检核结果：字段名"检核结果"，值"通过/未通过/无检核指标"，前端根据任务项状态自行判断（状态=检核通过展示
  // "通过"，其余一律展示"未通过"），后端无接口返回该字段本身；并非所有任务都关联检核指标，targetValue
  // （检核指标目标）为空时该任务本就未关联检核指标，展示"无检核指标"而非误判为"未通过"；
  // hover 浮层两行内容取自 actualValueField/targetValueField（与上方检核指标当前值/目标同一份数据源，
  // 均来自 profileFields，避免重复请求或口径不一致）
  const checkResult = resolveCheckResult(task, targetValueField);
  const checkResultTooltip = resolveCheckResultTooltip(actualValueField, targetValueField);
  const { metadataRemark, resultRemark } = resolveTaskRemark(task);
  const statusConfig = resolveStatusTagConfig(task.status, task.executorType);
  const statusIcon = STATUS_STAT_CONFIG.find(item => item.key === task.status)?.icon
    ?? (task.executorType === EXECUTOR.AI ? <RobotOutlined /> : <ClockCircleOutlined />);
  const statusColorStyle = statusVariant === 'solid'
    ? { background: statusConfig.color, color: '#FFFFFF' }
    : statusVariant === 'outlined'
      ? { background: statusConfig.background, color: statusConfig.color, border: `1px solid ${statusConfig.color}40` }
    : { background: statusConfig.background, color: statusConfig.color };
  const taskMetaItems: React.ReactNode[] = !showParentTaskName ? [
    <DetailMetaItem key="task-content" icon={<FileTextOutlined />} label="任务描述" color={metadataColor} tooltip={task.taskContent || '-'}>
      <Text style={{ fontSize: 12, color: metadataColor }}>{task.taskContent || '-'}</Text>
    </DetailMetaItem>,
    <DetailMetaItem key="follower" icon={<UserOutlined />} label="跟进人" color={metadataColor} tooltip={task.bdName || task.bdId || 'AI 助手'}>
      <Tooltip title={task.bdId ? (task.bdName ? `${task.bdName} / ${task.bdId}` : task.bdId) : 'AI 助手'} placement="top">
        <span style={{ cursor: 'help' }}>{task.bdName || task.bdId || 'AI 助手'}</span>
      </Tooltip>
    </DetailMetaItem>,
    ...(task.createdTime != null ? [
      <DetailMetaItem key="created-time" icon={<CalendarOutlined />} label="创建时间" color={metadataColor}>
        <Text style={{ fontSize: 12, color: metadataColor }}>{dayjs(task.createdTime).format('YYYY-MM-DD')}</Text>
      </DetailMetaItem>,
    ] : []),
    ...(addressField?.value ? [
      <DetailMetaItem key="address" icon={<EnvironmentOutlined />} label="经营地址" color={metadataColor} tooltip={addressField.value}>
        <Text style={{ fontSize: 12, color: metadataColor }}>{addressField.value}</Text>
      </DetailMetaItem>,
    ] : []),
    ...(description ? [
      <DetailMetaItem key="reference-info" icon={<InfoCircleOutlined />} label="参考信息" color={metadataColor} tooltip={description}>
        <Text style={{ fontSize: 12, color: metadataColor }}>{description}</Text>
      </DetailMetaItem>,
    ] : []),
    ...(monitorIndicatorValues.length > 0 ? [
      <DetailMetaItem key="reference-metrics" icon={<BarChartOutlined />} label="参考指标" color={metadataColor}>
        <span>共{monitorIndicatorValues.length}个</span>
        <Popover
          trigger="click"
          onOpenChange={trackReferenceOpen}
          placement="topLeft"
          color="#1f1f1f"
          overlayInnerStyle={{ background: '#1f1f1f', color: '#fff', padding: 12 }}
          content={
            <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 4, color: '#fff' }}>
              {monitorIndicatorValues.map((value, index) => (
                <div key={index} style={{ lineHeight: 1.6, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{value}</div>
              ))}
            </div>
          }
        >
          <button
            type="button"
            style={{ marginLeft: 6, padding: 0, border: 0, background: 'none', color: MT.brandPrimary, cursor: 'pointer', fontSize: 12 }}
          >
            查看详情
          </button>
        </Popover>
      </DetailMetaItem>,
    ] : []),
    ...(metadataRemark ? [
      <TaskRemarkMetadata key="remark" remark={metadataRemark} color={metadataColor} />,
    ] : []),
  ] : [
    <DetailMetaItem key="task-content" icon={<FileTextOutlined />} label="任务描述" color={metadataColor} tooltip={task.taskContent || '-'}>
      <Text style={{ fontSize: 12, color: metadataColor }}>{task.taskContent || '-'}</Text>
    </DetailMetaItem>,
    <DetailMetaItem key="follower" icon={<UserOutlined />} label="跟进人" color={metadataColor}>
      <Tooltip title={task.bdId ? (task.bdName ? `${task.bdName} / ${task.bdId}` : task.bdId) : 'AI助手'} placement="top">
        <span style={{ cursor: 'help' }}>{task.bdName || task.bdId || 'AI助手'}</span>
      </Tooltip>
    </DetailMetaItem>,
    ...(task.createdTime != null ? [
      <DetailMetaItem key="created-time" icon={<CalendarOutlined />} label="创建时间" color={metadataColor}>
        <Text style={{ fontSize: 12, color: metadataColor }}>{dayjs(task.createdTime).format('YYYY-MM-DD')}</Text>
      </DetailMetaItem>,
    ] : []),
    ...(description ? [
      <DetailMetaItem key="reference-info" icon={<InfoCircleOutlined />} label="参考信息" color={metadataColor} tooltip={description}>
        <Text style={{ fontSize: 12, color: metadataColor }}>{description}</Text>
      </DetailMetaItem>,
    ] : []),
    ...(monitorIndicatorValues.length > 0 ? [
      <DetailMetaItem key="reference-metrics" icon={<BarChartOutlined />} label="参考指标" color={metadataColor}>
        <span>共{monitorIndicatorValues.length}个</span>
        <Popover
          trigger="click"
          onOpenChange={trackReferenceOpen}
          placement="topLeft"
          color="#1f1f1f"
          overlayInnerStyle={{ background: '#1f1f1f', color: '#fff', padding: 12 }}
          content={
            <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 4, color: '#fff' }}>
              {monitorIndicatorValues.map((value, index) => (
                <div key={index} style={{ lineHeight: 1.6, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{value}</div>
              ))}
            </div>
          }
        >
          <button
            type="button"
            style={{ marginLeft: 6, padding: 0, border: 0, background: 'none', color: MT.brandPrimary, cursor: 'pointer', fontSize: 12 }}
          >
            查看详情
          </button>
        </Popover>
      </DetailMetaItem>,
    ] : []),
    ...(metadataRemark ? [
      <TaskRemarkMetadata key="remark" remark={metadataRemark} color={metadataColor} />,
    ] : []),
  ];
  const taskDetailMetaRows = Array.from(
    { length: Math.ceil(taskMetaItems.length / 2) },
    (_, index) => taskMetaItems.slice(index * 2, index * 2 + 2),
  );
  const hasExecutionActions = executable && !!onExecute;
  const usePrimaryConfirmButton = feedbackable && !hasExecutionActions;
  const hasVisibleActions = showParentTaskName
    ? hasExecutionActions
    : feedbackable || hasExecutionActions;
  const actionArea = hasVisibleActions ? (
    <div style={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
      {!showParentTaskName ? (
        <>
          {feedbackable && (
            <Button style={{ height: 32, paddingInline: 12, fontSize: 13 }} onClick={() => { trackTaskAction('feedback.failed_one'); onFeedback(task, 'failed'); }}>
              无法完成
            </Button>
          )}
          {feedbackable && (
            <Button
              type={usePrimaryConfirmButton ? 'primary' : 'default'}
              style={{ height: 32, paddingInline: 12, fontSize: 13 }}
              onClick={() => { trackTaskAction('feedback.done_one'); onFeedback(task, 'done'); }}
            >
              确认完成
            </Button>
          )}
          {executable && onExecute && (
            <Button type="primary" style={{ height: 32, paddingInline: 12, fontSize: 13 }} onClick={onExecute}
              disabled={!!executeDisabledReason} title={executeDisabledReason}>
              去执行
            </Button>
          )}
        </>
      ) : (
        <>
          {executable && onExecute && (
            <Button type="primary" style={{ height: 32, paddingInline: 12, fontSize: 13 }} onClick={onExecute}
              disabled={!!executeDisabledReason} title={executeDisabledReason}>
              去执行
            </Button>
          )}
        </>
      )}
    </div>
  ) : null;

  return (
    <div
      style={{
        background: MT.cardBg,
        borderRadius: MT.cardRadius,
        border: `1px solid ${MT.cardBorder}`,
        boxShadow: MT.cardShadow,
        padding: '18px 20px',
        position: 'relative',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = MT.cardShadowHover;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = MT.cardShadow;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ display: 'flex', width: 16, height: 24, flexShrink: 0, alignItems: 'center', paddingTop: 2 }}>
          {selectable && (
            <Checkbox
              checked={!!selected}
              onChange={e => { trackTaskAction('selection.task'); onSelectChange?.(e.target.checked); }}
            />
          )}
        </div>

        {/* 商家 logo：任务详情卡片使用独立的小尺寸，使头像底部对齐第一行元信息顶部；
            TC-118-5：onShopClick 传入时可点击跳转商家详情页；
            商家详情页（showParentTaskName=true）场景下同一商家所有任务项 logo 均相同，无区分意义，隐藏该 logo，
            其余内容随 flex 布局自动左移，无需额外样式调整 */}
        {!showParentTaskName && (
          <Avatar
            shape="square"
            size={TASK_DETAIL_ITEM_AVATAR_SIZE}
            src={task.logo}
            icon={!task.logo ? <ShopOutlined /> : undefined}
            onClick={onShopClick ? () => { trackTaskAction('entity.detail.avatar'); onShopClick(); } : undefined}
            style={{
              borderRadius: MT.cardRadiusSmall,
              flexShrink: 0,
              background: task.logo ? undefined : `linear-gradient(135deg, ${MT.brandPrimaryLight}, #F5F5F7)`,
              color: MT.brandPrimary,
              cursor: onShopClick ? 'pointer' : 'default',
            }}
          />
        )}

        <TaskDetailLayout
          title={(
            <>
              {/* 两个详情页任务卡片均复用公共标题层级：标题/ID 8px，名称组/标签组 16px，标签间 8px。 */}
              <CardTitleRow
                style={{ minHeight: TASK_DETAIL_TITLE_ROW_HEIGHT }}
                title={(
                  <Text
                    strong
                    onClick={onShopClick ? () => { trackTaskAction('entity.detail.name'); onShopClick(); } : undefined}
                    style={{
                      minWidth: 0,
                      fontSize: 15,
                      color: MT.textPrimary,
                      cursor: onShopClick ? 'pointer' : 'default',
                    }}
                  >
                    {showParentTaskName ? (task.parentTaskName || task.shopName) : task.shopName}
                  </Text>
                )}
                id={showParentTaskName ? task.parentTaskId : task.shopId}
                tags={showParentTaskName && parentTask ? (
                  <TaskTitleBadges
                    task={parentTask}
                    taskTypeName={resolveTaskTypeName(parentTask.taskType, taskTypeNameMap, task.taskTypeDesc)}
                    objectTypeLabel={getObjectTypeMeta(parentTask.contactObjectType ?? task.contactObjectType)?.label}
                    aiDirectExecute={task.aiDirectExecute ?? parentTask.aiDirectExecute}
                  />
                ) : !showParentTaskName && hasTaskTitleTags ? (
                  <>
                    {tagFieldsThroughCategory.length > 0 && <ProfileFields fields={tagFieldsThroughCategory} size="small" gap={8} />}
                    {deliveryLabel && (
                      <Tag
                        bordered={false}
                        style={{ ...MT_FILLED_TAG_STYLE, background: MT.pageBg, color: MT.textMuted }}
                      >
                        {deliveryLabel}
                      </Tag>
                    )}
                    {experienceScore !== undefined && experienceScore !== '' && (
                      <Tag
                        bordered={false}
                        style={{ ...MT_FILLED_TAG_STYLE, background: MT.pageBg, color: MT.textMuted }}
                      >
                        体验分 {experienceScore}
                      </Tag>
                    )}
                    {tagFieldsAfterCategory.length > 0 && <ProfileFields fields={tagFieldsAfterCategory} size="small" gap={8} />}
                  </>
                ) : undefined}
              />
            </>
          )}
          metadata={(
            <>
              <div style={{ display: 'flex', flexDirection: 'column', rowGap: TASK_DETAIL_META_ROW_GAP, marginTop: TASK_DETAIL_META_TOP_GAP }}>
                {/* 两个详情页统一为每行最多两项；缺失的可选字段由后续字段自动前移补位。 */}
                {taskDetailMetaRows.map((row, index) => (
                  <React.Fragment key={index}>
                    <div style={DETAIL_META_ROW_STYLE}>{row}</div>
                    {row.some(item => React.isValidElement(item) && item.key === 'reference-info') && (
                      <TaskConditionInfo task={task} color={metadataColor} />
                    )}
                  </React.Fragment>
                ))}
                {!description && <TaskConditionInfo task={task} color={metadataColor} />}
              </div>

              {/* 神抢手商品信息展示组件：内部会在未命中目标字段时返回 null。 */}
              <SqsProductInfo fields={task.profileFields} textColor={metadataColor} />
            </>
          )}
          status={(
            <Tag
              bordered={false}
              style={{
                ...statusColorStyle,
                display: 'inline-flex',
                width: TASK_DETAIL_STATUS_TAG_WIDTH,
                boxSizing: 'border-box',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
                borderRadius: 4,
                paddingInline: 8,
                height: 27,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: '25px',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                {statusIcon}
                <span>{statusConfig.text}</span>
              </span>
            </Tag>
          )}
          results={(
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, auto)', justifyContent: 'end', justifyItems: 'end', gap: TASK_DETAIL_META_ROW_GAP, fontSize: 12, fontWeight: 400, lineHeight: '18px', color: metadataColor }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' }}>
                <span>检核结果：</span>
                <Tooltip title={checkResultTooltip} placement="top">
                  <span style={{ color: checkResult.color, cursor: checkResultTooltip ? 'help' : 'default' }}>{checkResult.text}</span>
                </Tooltip>
              </div>
              <AiExecutionResults task={task} contactObjectType={effectiveObjectType} />
              {resultRemark && <div style={{ gridColumn: '1 / -1' }}><TaskRemarkResult remark={resultRemark} color={metadataColor} /></div>}
            </div>
          )}
          actions={actionArea}
        />

      </div>
    </div>
  );
};

// ==================== FeedbackModal ====================
const MAX_REMARK = 100;

// 信息行组件
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: `1px solid ${MT.cardBorder}`,
  }}>
    <Text style={{ color: MT.textMuted, fontSize: 13 }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: 500, color: MT.textPrimary }}>{value}</Text>
  </div>
);

export interface FeedbackModalProps {
  open: boolean;
  type: 'done' | 'failed';
  /**
   * 待反馈的任务列表：单个操作场景传入长度为 1 的数组，批量操作场景传入全部选中任务。
   * 提交时统一按数组内全部 taskId 发起同一次 feedback 调用（同一个原因应用到全部选中任务）。
   */
  tasks: BdTaskDto[];
  loading: boolean;
  resultNotice?: React.ReactNode;
  confirmDisabled?: boolean;
  onConfirm: (feedbackResult: 1 | 2, remark?: string) => void;
  onCancel: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open, type, tasks, loading, resultNotice, confirmDisabled, onConfirm, onCancel,
}) => {
  const [remark, setRemark] = useState('');
  useTaskAnalyticsView(open, 'feedback.dialog');

  useEffect(() => {
    if (open) setRemark('');
  }, [open]);

  const isDone = type === 'done';
  const isBatch = tasks.length > 1;
  const singleTask = tasks[0];
  // 门店任务保持存量“商家”展示口径；新实体任务使用实体自身名称，避免品牌/商品因 shopName 为空显示“商家 -”。
  const isShopTask = singleTask?.contactObjectType === CONTACT_OBJECT_TYPE.WM_SHOP
    || singleTask?.contactObjectType === CONTACT_OBJECT_TYPE.WDC_SHOP
    || singleTask?.contactObjectType == null;
  const entityInfo = (() => {
    if (!singleTask || isShopTask) return { label: '商家', value: singleTask?.shopName || '-' };
    const value = singleTask.objectName || singleTask.objectId || singleTask.tsPoiId || '-';
    switch (singleTask.contactObjectType) {
      case CONTACT_OBJECT_TYPE.BRAND:
        return { label: '品牌', value };
      case CONTACT_OBJECT_TYPE.TS_POI:
        return { label: '行业门店', value: singleTask.tsPoiName || value };
      case CONTACT_OBJECT_TYPE.SKU:
        return { label: '商品', value };
      case CONTACT_OBJECT_TYPE.PHF_SKU:
        return { label: '拼好饭商品', value };
      case CONTACT_OBJECT_TYPE.TS_SKU:
        return { label: '行业商品', value };
      default:
        return { label: '实体', value };
    }
  })();
  const reasonPlaceholder = isShopTask
    ? '例如：商家拒绝、联系不上、商家暂时没有需求...'
    : '例如：对方拒绝、联系不上、暂时没有需求...';

  return (
    <Modal
      open={open}
      footer={null}
      onCancel={loading ? undefined : () => { trackTaskAction('feedback.close'); onCancel(); }}
      maskClosable={!loading}
      width={520}
      centered
      styles={{ body: { padding: '32px 32px 24px' } }}
      closable={!loading}
    >
      {/* 图标 */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        {isDone
          ? <CheckCircleFilled style={{ fontSize: 40, color: MT.success }} />
          : <ExclamationCircleFilled style={{ fontSize: 40, color: MT.danger }} />
        }
      </div>

      {/* 标题 + 副标题 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: MT.textPrimary, marginBottom: 6 }}>
          {isDone ? '确认标记为已完成' : '登记无法完成'}
        </div>
        <div style={{ fontSize: 13, color: MT.textMuted }}>
          {isDone ? '请确认完成该任务' : '请说明本次任务无法完成的原因'}
        </div>
      </div>

      {resultNotice && <div style={{ marginBottom: 20 }}>{resultNotice}</div>}

      {/* 信息区 */}
      <div style={{ marginBottom: 20 }}>
        {isBatch ? (
          <InfoRow label="任务项" value={`共 ${tasks.length} 个任务项`} />
        ) : (
          <>
            <InfoRow label={entityInfo.label} value={entityInfo.value} />
            <InfoRow label="任务" value={singleTask?.parentTaskName ?? '-'} />
          </>
        )}
        {isDone && (
          <InfoRow
            label="操作"
            value={<span style={{ color: MT.success, fontWeight: 600 }}>标记已完成</span>}
          />
        )}
      </div>

      {/* 无法完成原因输入 */}
      {!isDone && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: MT.textPrimary, marginBottom: 8, fontWeight: 500 }}>
            无法完成原因<span style={{ color: MT.textMuted, fontWeight: 400 }}>（选填{isBatch ? '，将应用到全部选中任务项' : ''}）</span>
          </div>
          <TextArea
            rows={4}
            maxLength={MAX_REMARK}
            placeholder={reasonPlaceholder}
            value={remark}
            onChange={e => setRemark(e.target.value)}
            showCount
            style={{ borderRadius: 8, resize: 'none' }}
          />
        </div>
      )}

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: 12 }}>
        <Button
          size="large"
          style={{ flex: 1, borderRadius: 8, height: 44 }}
          disabled={loading}
          onClick={() => { trackTaskAction('feedback.cancel'); onCancel(); }}
        >
          取消
        </Button>
        <Button
          size="large"
          type="primary"
          danger={!isDone}
          loading={loading}
          disabled={confirmDisabled}
          style={{
            flex: 1, borderRadius: 8, height: 44, fontWeight: 600,
            ...(isDone ? { background: MT.success, borderColor: MT.success } : {}),
          }}
          onClick={() => {
            trackTaskAction(isDone ? 'feedback.done' : 'feedback.failed');
            onConfirm(isDone ? 1 : 2, remark || undefined);
          }}
        >
          {isDone ? '确认完成' : '确认提交'}
        </Button>
      </div>
    </Modal>
  );
};
