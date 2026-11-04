import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useState } from 'react';
import { Checkbox, Typography, Button, Avatar, Tag } from 'antd';
import { CheckCircleOutlined, DownOutlined, UpOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import type { ParentTaskOverviewDto, ShopDimensionItemDto, SubTaskOverviewDto } from '@/types/bdTask';
import { MT, MT_FILLED_TAG_STYLE, SHOP_AVATAR_SIZE } from '../theme';
import ProfileFields from './ProfileFields';
import { resolveStatusTagConfig } from './taskHelpers';
import { AiDirectExecuteTag, PriorityBadge, TASK_TITLE_TAG_STYLE, TaskTitleBadges } from './TaskCard';
import PersonName from './PersonName';
import CardTitleRow from './CardTitleRow';
import AggregatedOverviewRow from './AggregatedOverviewRow';
import { formatOverviewDate, isAggregatedOverview, normalizeEntityOverviews } from '../utils/entityOverviews';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import { resolveTaskTypeName, type TaskTypeNameMap } from '../utils/taskTypeName';

const { Text } = Typography;

const OVERVIEW_PREVIEW_COUNT = 3;

export interface ShopCardProps {
  shop: ShopDimensionItemDto;
  /** 是否展示复选框（列表页批量选中场景传入；详情页顶部不传） */
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  /** 点击卡片主体（跳转详情页）；未传则不绑定点击 */
  onClick?: () => void;
  /** 点击底部任务概览中的某一条任务项（跳转其所属任务批次详情页）；未传则该行不可点击 */
  onOverviewClick?: (task: SubTaskOverviewDto) => void;
  /** 当前页关联任务批次，用于复用任务列表标题标签；由任务项列表一次性批量补查。 */
  parentTaskMap?: Record<number, ParentTaskOverviewDto>;
  taskTypeNameMap?: TaskTypeNameMap;
}

/**
 * 商家卡片共享组件：纵向堆叠布局，1:1 对齐 NoCode StoreCard.jsx（src/components/shared/StoreCard.jsx）：
 * Logo方块 + 标题行（商家名+ID+体验分等InfoTag）+ 信息行（画像字段）+ 任务概览行。
 * 真实字段：shopId / shopName / taskCount / executorMis / logo / experienceScore / experienceReachTarget / profileFields / subTaskOverviews。
 */
const ShopCard: React.FC<ShopCardProps> = ({
  shop, selected, onSelectChange, onClick, onOverviewClick,
  parentTaskMap = {}, taskTypeNameMap = {},
}) => {
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const showCheckbox = typeof onSelectChange === 'function';
  // 商家名称起点 = 可选复选框列（16 + 16 间距）+ 商家头像（统一尺寸 + 16 间距）。
  // 任务概览条沿用该偏移，保证左端与商家名称对齐，而不是与头像或多选框对齐。
  const overviewLeftOffset = SHOP_AVATAR_SIZE + 16 + (showCheckbox ? 16 + 16 : 0);

  const overviews = normalizeEntityOverviews(shop);
  const visibleOverviews = overviewExpanded ? overviews : overviews.slice(0, OVERVIEW_PREVIEW_COUNT);
  const hasMoreOverviews = overviews.length > OVERVIEW_PREVIEW_COUNT;

  const hasExperience = typeof shop.experienceScore === 'number';
  const completedTaskCount = Math.min(
    shop.taskCount,
    overviews.reduce((count, task) => count + (isAggregatedOverview(task)
      ? [1, 4, 6].reduce((sum, status) => sum + (task.statusCounts?.[status] ?? 0), 0)
      : Number([1, 4, 6].includes(task.status))), 0),
  );

  // TC-040 修复：画像字段按 valueType 拆分，与任务详情页任务项卡片（taskHelpers.tsx TaskItem）保持同一套排布规则——
  // TAG 类字段集中到商家名称同一行；配送方式即使由接口按 TEXT 下发，也转为灰色标签放在售卖类型之后。
  // 其余 TEXT 类字段（如经营地址）保留在下方信息行。
  const tagFields = shop.profileFields?.filter(f => f.valueType === 'TAG' && f.key !== 'deliveryType') ?? [];
  const textFields = shop.profileFields?.filter(f => f.valueType !== 'TAG' && f.key !== 'experienceScore' && f.key !== 'deliveryType') ?? [];
  const deliveryField = shop.profileFields?.find(field => field.key === 'deliveryType');
  const deliveryLabel = deliveryField?.value ?? deliveryField?.tagList?.[0];
  const onlineStatusIndex = tagFields.findIndex(field => field.key === 'onlineStatus');
  const tagFieldsBeforeExperience = onlineStatusIndex >= 0 ? tagFields.slice(0, onlineStatusIndex + 1) : [];
  const tagFieldsAfterExperience = onlineStatusIndex >= 0 ? tagFields.slice(onlineStatusIndex + 1) : tagFields;
  const categoryFields = tagFieldsAfterExperience.filter(field => field.key === 'categoryName');
  const remainingTagFields = tagFieldsAfterExperience.filter(field => field.key !== 'categoryName');
  const hasTitleTags = tagFields.length > 0 || !!deliveryLabel || hasExperience;

  return (
    <div
      onClick={onClick}
      style={{
        background: MT.cardBg,
        borderRadius: MT.cardRadius,
        border: '1px solid transparent',
        boxShadow: MT.cardShadow,
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
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
        {showCheckbox && (
          <div style={{ display: 'flex', width: 16, height: SHOP_AVATAR_SIZE, flexShrink: 0, alignItems: 'center', paddingTop: 2 }} onClick={e => e.stopPropagation()}>
            <Checkbox checked={selected} onChange={e => onSelectChange?.(e.target.checked)} />
          </div>
        )}

        {/* 商家 logo：与 NoCode 一致展示紫色渐变底图标块，有真实 logo 时展示图片 */}
        <Avatar
          shape="square"
          size={SHOP_AVATAR_SIZE}
          src={shop.logo}
          icon={!shop.logo ? <ShopOutlined /> : undefined}
          style={{
            borderRadius: MT.cardRadiusSmall,
            flexShrink: 0,
            background: shop.logo ? undefined : `linear-gradient(135deg, ${MT.brandPrimaryLight}, #F5F5F7)`,
            color: MT.brandPrimary,
          }}
        />

        <div style={{ minWidth: 0, flex: 1 }}>
          {/* 标题行：商家名 + ID + 全部标签类（TAG）画像字段 + 体验分，同一行 flexWrap；
              TC-040 修复：TAG 字段（businessStatus/onlineStatus/categoryName/deliveryType/poiTags/claimStatus）
              此前放在下方信息行，现按任务详情页任务项卡片（TaskItem）同款规则集中到标题行展示 */}
          <CardTitleRow
            title={<Text strong ellipsis={{ tooltip: shop.shopName }} style={{ minWidth: 0, fontSize: 15, color: MT.textPrimary }}>{shop.shopName}</Text>}
            id={shop.shopId}
            tags={hasTitleTags ? (
              <>
              {tagFieldsBeforeExperience.length > 0 && <ProfileFields fields={tagFieldsBeforeExperience} size="small" gap={8} />}
              {categoryFields.length > 0 && <ProfileFields fields={categoryFields} size="small" gap={8} />}
              {deliveryLabel && (
                <Tag
                  bordered={false}
                  style={{
                    ...MT_FILLED_TAG_STYLE,
                    background: MT.pageBg,
                    color: MT.textMuted,
                  }}
                >
                  {deliveryLabel}
                </Tag>
              )}
              {hasExperience && (
                <Tag
                  bordered={false}
                  style={{
                    ...MT_FILLED_TAG_STYLE,
                    background: MT.pageBg,
                    color: MT.textMuted,
                  }}
                >
                  体验分 {shop.experienceScore}
                </Tag>
              )}
              {remainingTagFields.length > 0 && <ProfileFields fields={remainingTagFields} size="small" gap={8} />}
              </>
            ) : undefined}
          />

          {/* 信息行：跟进人 + 文本类（TEXT）画像字段（经营地址等），同一行展示，跟进人在经营地址左侧；
              本期需求：关联任务数功能暂时隐藏（不展示 shop.taskCount）；
              【全面排查修复】字号此前为 11px，与任务批次卡片 TaskCard.tsx 同层级「元信息行」12px 不一致
              （三种列表卡片信息密度接近，属并列同级组件，理应统一），统一调整为 12px；
              ProfileFields 同步改为 size="default"（12px），避免同一行内文字与画像字段大小不一致。
              【走查修复】统一字段展示文案为「跟进人」，此前为「责任人」，与任务详情页/商家详情页任务项卡片
              （taskHelpers.tsx TaskItem）等全站其余展示跟进人的位置口径不一致。
              【走查修复·二次】icon 与文本高度仍不对齐的根因：antd Typography.Text 默认行高约 1.57em，
              而图标容器高度收缩至 SVG 实际尺寸（约等于 fontSize），二者虽都设置 alignItems:center，但因
              各自所在行盒高度不同，视觉上仍会有明显错位；单纯给图标包一层 inline-flex 容器并不能消除这一
              差异。真正解法是让图标与文字共享同一 lineHeight 基准——此处显式设置 lineHeight:1，使图标
              容器与文字容器的行盒高度都收敛为 fontSize 本身，图标 verticalAlign 改为 middle 后即可与文字
              精确对齐 */}
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', fontSize: 12, lineHeight: 1, color: MT.textMuted }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, lineHeight: 1 }}>
              <CheckCircleOutlined style={{ fontSize: 12, color: MT.textMuted }} />
              <span>任务完成情况：{completedTaskCount}/{shop.taskCount}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, lineHeight: 1 }}>
              <UserOutlined style={{ fontSize: 12, verticalAlign: 'middle' }} />
              <span style={{ lineHeight: 1 }}>
                <span>跟进人：</span>
                <span style={{ marginLeft: 3 }}>
                  <PersonName name={shop.executorName} mis={shop.executorMis} style={{ color: MT.textMuted, fontSize: 12 }} />
                </span>
              </span>
            </span>
            {textFields.length > 0 && (
              <ProfileFields fields={textFields} size="default" textColor={MT.textMuted} />
            )}
          </div>
        </div>
      </div>

      {/* 底部任务概览：展示该商家关联的任务项明细，默认前3个，超过3个提供展开，对齐 NoCode 底部任务概览行 */}
      {overviews.length > 0 && (
        <div
          style={{ marginTop: 12, paddingTop: 12 }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: overviewLeftOffset }}>
            {visibleOverviews.map(task => {
              const parentTask = parentTaskMap[task.parentTaskId];
              if (isAggregatedOverview(task)) return <AggregatedOverviewRow key={`group-${task.parentTaskId}-${task.contactObjectType}`} task={task} parentTask={parentTask} taskTypeNameMap={taskTypeNameMap} onClick={onOverviewClick ? () => onOverviewClick(task) : undefined} />;
              // status 为任务项真实状态码（TaskStatus.code，与 BdTaskDto.status 同一套编码），直接复用
              // resolveStatusTagConfig 映射（第二参数 executorType 新结构未透出，传 undefined 走兜底分支），
              // 与任务详情页任务项卡片（taskHelpers.tsx statusTag）保持同一套状态文案口径。
              const statusCfg = resolveStatusTagConfig(task.status, undefined);
              const clickable = typeof onOverviewClick === 'function';
              return (
                <div
                  key={task.subTaskId}
                  onClick={clickable ? () => onOverviewClick!(task) : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, padding: '8px 10px', borderRadius: 8, background: MT.taskStripBg,
                    cursor: clickable ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLDivElement).style.background = MT.pageBg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = MT.taskStripBg; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 600, color: MT.textPrimary, minWidth: 0 }} ellipsis={{ tooltip: task.description ?? task.name }}>
                      {task.description ?? task.name}
                    </Text>
                    {parentTask ? (
                      <TaskTitleBadges
                        task={parentTask}
                        aiDirectExecute={task.aiDirectExecute ?? parentTask.aiDirectExecute}
                        taskTypeName={resolveTaskTypeName(parentTask.taskType, taskTypeNameMap)}
                        objectTypeLabel={getObjectTypeMeta(parentTask.contactObjectType ?? task.contactObjectType)?.label}
                      />
                    ) : (
                      <>
                        {typeof task.priority === 'number' && <PriorityBadge priority={task.priority} />}
                        <span style={{ ...TASK_TITLE_TAG_STYLE, background: statusCfg.background, color: statusCfg.color }}>
                          {statusCfg.text}
                        </span>
                        {task.aiDirectExecute && <AiDirectExecuteTag />}
                      </>
                    )}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, flexShrink: 0, color: MT.textMuted, whiteSpace: 'nowrap' }}>
                    <span>
                      创建人：{task.creatorId ? <PersonName name={task.creatorName} mis={task.creatorId} /> : '--'}
                    </span>
                    <span>时间限制：{formatOverviewDate(task.createdTime ?? task.createdDate)}-{formatOverviewDate(task.expireDate)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {hasMoreOverviews && (
            <Button
              type="text"
              size="small"
              block
              onClick={() => { trackTaskAction(overviewExpanded ? 'overview.collapse' : 'overview.expand'); setOverviewExpanded(prev => !prev); }}
              style={{ marginTop: 6, justifyContent: 'center' }}
              icon={overviewExpanded ? <UpOutlined /> : <DownOutlined />}
            >
              {overviewExpanded ? '收起' : `展开全部 ${overviews.length} 项`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ShopCard;
