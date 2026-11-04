import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useState } from 'react';
import { Checkbox, Typography, Button } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import type { ContactObjectType } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import { MT, SHOP_AVATAR_SIZE } from '../theme';
import { resolveStatusTagConfig } from './taskHelpers';
import { AiDirectExecuteTag, PriorityBadge, TASK_TITLE_TAG_STYLE, TaskTitleBadges } from './TaskCard';
import PersonName from './PersonName';
import AggregatedOverviewRow from './AggregatedOverviewRow';
import EntityProfileHeader from './EntityProfileHeader';
import type { ShopCardProps } from './ShopCard';
import { formatOverviewDate, isAggregatedOverview, normalizeEntityOverviews } from '../utils/entityOverviews';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import { resolveTaskTypeName } from '../utils/taskTypeName';

const { Text } = Typography;
const OVERVIEW_PREVIEW_COUNT = 3;

export interface BrandCardProps extends Omit<ShopCardProps, 'onBatchExecute'> {
  contactObjectType?: ContactObjectType;
}

const BrandCard: React.FC<BrandCardProps> = ({ shop, selected, onSelectChange, onClick, onOverviewClick, parentTaskMap = {}, taskTypeNameMap = {}, contactObjectType = CONTACT_OBJECT_TYPE.BRAND }) => {
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const overviews = normalizeEntityOverviews(shop);
  const visibleOverviews = overviewExpanded ? overviews : overviews.slice(0, OVERVIEW_PREVIEW_COUNT);
  const hasMoreOverviews = overviews.length > OVERVIEW_PREVIEW_COUNT;
  const overviewLeftOffset = (onSelectChange ? 32 : 0) + (contactObjectType === CONTACT_OBJECT_TYPE.TS_POI && shop.outerPic ? SHOP_AVATAR_SIZE + 16 : 0);
  return (
    <div
      onClick={onClick}
      style={{ background: MT.cardBg, borderRadius: MT.cardRadius, border: '1px solid transparent', boxShadow: MT.cardShadow, padding: '18px 20px', cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease' }}
      onMouseEnter={event => {
        event.currentTarget.style.boxShadow = MT.cardShadowHover;
        event.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={event => {
        event.currentTarget.style.boxShadow = MT.cardShadow;
        event.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {onSelectChange && <div style={{ display: 'flex', width: 16, height: contactObjectType === CONTACT_OBJECT_TYPE.TS_POI && shop.outerPic ? SHOP_AVATAR_SIZE : 24, flexShrink: 0, alignItems: 'center', paddingTop: 2 }} onClick={event => event.stopPropagation()}><Checkbox checked={selected} onChange={event => onSelectChange(event.target.checked)} /></div>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <EntityProfileHeader entity={shop} contactObjectType={contactObjectType} />
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
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px',
                    fontSize: 12, padding: '8px 10px', borderRadius: 8, background: MT.taskStripBg,
                    cursor: clickable ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLDivElement).style.background = MT.pageBg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = MT.taskStripBg; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 240px' }}>
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
                  <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', minWidth: 0, color: MT.textMuted, lineHeight: '20px', overflowWrap: 'anywhere' }}>
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

export default BrandCard;
