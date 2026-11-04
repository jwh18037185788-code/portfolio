import { trackTaskAction } from '@/lib/taskAnalytics';
import AiExecutionResults from './AiExecutionResults';
import React from 'react';
import { Button, Checkbox, Tag, Tooltip } from 'antd';
import {
    CalendarOutlined,
    BellOutlined,
    EnvironmentOutlined,
    FileTextOutlined,
    InfoCircleOutlined,
    LinkOutlined,
    ShopOutlined,
    UserOutlined,
} from '@ant-design/icons';
import type { BdTaskDto, ParentTaskOverviewDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import CardTitleRow from './CardTitleRow';
import EntityProfileHeader from './EntityProfileHeader';
import { getIndustryTaskProfile } from '../utils/industryProfile';
import PersonName from './PersonName';
import ProfileFields from './ProfileFields';
import TaskConditionInfo from './TaskConditionInfo';
import TaskDetailLayout, {
    DetailMetaItem,
    DETAIL_META_ROW_STYLE,
    TASK_DETAIL_TITLE_ROW_HEIGHT,
    TASK_DETAIL_META_TOP_GAP,
    TASK_DETAIL_META_ROW_GAP,
} from './TaskDetailLayout';
import {
    canFeedback,
    canStartExecution,
    resolveCheckResult,
    resolveCheckResultTooltip,
    resolveStatusTagConfig,
    resolveTaskRemark,
    TaskRemarkMetadata,
    TaskRemarkResult,
} from './taskHelpers';
import { MT, MT_FILLED_TAG_STYLE } from '../theme';
import { TaskTitleBadges } from './TaskCard';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import { resolveTaskTypeName, type TaskTypeNameMap } from '../utils/taskTypeName';
import { formatOverviewDate } from '../utils/entityOverviews';

export interface EntityTaskRowProps {
    task: BdTaskDto;
    selected?: boolean;
    onSelect?: (checked: boolean) => void;
    onFeedback?: (tasks: BdTaskDto[], type: 'done' | 'failed') => void;
    onExecute?: () => void;
    executeDisabledReason?: string;
    onSubjectClick?: () => void;
    extraActions?: React.ReactNode;
    showParentTaskName?: boolean;
    parentTask?: ParentTaskOverviewDto;
    taskTypeNameMap?: TaskTypeNameMap;
    /** 商品聚合组已展示跟进人时，明细不再重复展示。 */
    hideFollower?: boolean;
    /** 商品聚合组内明细隐藏截止时间，改为展示创建时间。 */
    hideExpire?: boolean;
    showCreatedTime?: boolean;
    /** 商品聚合展开区中，不展示当前状态不可用的 AI 执行入口。 */
    hideUnavailableAiAction?: boolean;
}

function getTaskCheckFields(task: BdTaskDto) {
    const actualField =
        task.profileFields?.find(field => field.key === 'actualValue') ??
        (task.actualValue
            ? { label: '检核指标当前值', value: task.actualValue }
            : undefined);
    const target = task.profileFields?.find(
        field => field.key === 'targetValue',
    );
    const actual = actualField?.value;
    const targetValue =
        target?.value ?? task.targetValue ?? task.checkInfo?.targetValue;
    const result = resolveCheckResult(
        task,
        targetValue ? { label: '目标值', value: targetValue } : undefined,
    );
    const targetField =
        target ??
        (task.checkInfo?.bizIndicatorId && targetValue
            ? { label: '检核指标目标', value: targetValue }
            : undefined);
    return {
        actual,
        targetValue,
        result,
        tooltip: resolveCheckResultTooltip(actualField, targetField),
    };
}

/** 新实体共用检核展示，沿用存量状态与检核规则。 */
export const TaskCheckFields: React.FC<{ task: BdTaskDto }> = ({ task }) => {
    const { actual, targetValue, result } = getTaskCheckFields(task);
    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                columnGap: 16,
                rowGap: 8,
                color: MT.textMuted,
                fontSize: 12,
                lineHeight: '18px',
                overflowWrap: 'anywhere',
            }}
        >
            <span>当前值：{actual || '暂无数据'}</span>
            <span>目标值：{targetValue || '暂无数据'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                检核结果：
                <Tag
                    bordered={false}
                    style={{
                        ...MT_FILLED_TAG_STYLE,
                        color: result.color,
                        background: result.background,
                    }}
                >
                    {result.text}
                </Tag>
            </span>
        </div>
    );
};

const EntityTaskRow: React.FC<EntityTaskRowProps> = ({
    task,
    selected,
    onSelect,
    onFeedback,
    onExecute,
    executeDisabledReason,
    onSubjectClick,
    extraActions,
    showParentTaskName,
    parentTask,
    taskTypeNameMap = {},
    hideFollower,
    hideExpire,
    showCreatedTime,
    hideUnavailableAiAction,
}) => {
    const actionable =
        Number.isFinite(task.taskId) &&
        task.taskId > 0 &&
        !task.skuTaskAggregation;
    const selectable = actionable && (canFeedback(task) || !!task.canDelete);
    const showFeedbackActions = actionable && canFeedback(task) && !!onFeedback;
    const showAiAction =
        actionable && canStartExecution(task) && !!onExecute;
    const hasActions = showFeedbackActions || !!extraActions || showAiAction;
    const isIndustry = task.contactObjectType === CONTACT_OBJECT_TYPE.TS_POI;
    const name =
        (isIndustry ? task.tsPoiName : undefined) ||
        task.objectName ||
        '暂无数据';
    const id =
        task.objectId || (isIndustry ? task.tsPoiId : undefined) || '暂无数据';
    const statusAppearance = resolveStatusTagConfig(
        task.status,
        task.executorType,
    );
    const isSku =
        task.contactObjectType === CONTACT_OBJECT_TYPE.SKU ||
        task.contactObjectType === CONTACT_OBJECT_TYPE.PHF_SKU ||
        task.contactObjectType === CONTACT_OBJECT_TYPE.TS_SKU;
    const status = Number.isFinite(task.status) ? (
        <Tag
            bordered={false}
            style={{
                ...MT_FILLED_TAG_STYLE,
                width: 84,
                height: 27,
                paddingInline: 8,
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: '25px',
                background: statusAppearance.background,
                color: statusAppearance.color,
                border: `1px solid ${statusAppearance.color}40`,
            }}
        >
            {statusAppearance.text}
        </Tag>
    ) : (
        '暂无数据'
    );
    const actions = hasActions ? (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
            }}
        >
            {showFeedbackActions && (
                <>
                    <Button
                        style={{
                            height: 32,
                            paddingInline: 12,
                            fontSize: 13,
                        }}
                        onClick={() => { trackTaskAction('feedback.failed_one'); onFeedback?.([task], 'failed'); }}
                    >
                        无法完成
                    </Button>
                    <Button
                        type={!showAiAction ? 'primary' : 'default'}
                        style={{
                            height: 32,
                            paddingInline: 12,
                            fontSize: 13,
                        }}
                        onClick={() => { trackTaskAction('feedback.done_one'); onFeedback?.([task], 'done'); }}
                    >
                        确认完成
                    </Button>
                </>
            )}
            {extraActions}
            {actionable && canStartExecution(task) && onExecute && (
                <Button type="primary" style={{ height: 32, paddingInline: 12, fontSize: 13 }}
                    disabled={!!executeDisabledReason} title={executeDisabledReason} onClick={onExecute}>
                    去执行
                </Button>
            )}
        </div>
    ) : null;
    const checkFields = getTaskCheckFields(task);
    const { metadataRemark, resultRemark } = resolveTaskRemark(task);
    const results = (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, auto)',
                justifyContent: 'end',
                justifyItems: 'end',
                gap: TASK_DETAIL_META_ROW_GAP,
                fontSize: 12,
                lineHeight: '18px',
                color: MT.textMuted,
            }}
        >
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' }}>
                <span>检核结果：</span>
                <Tooltip title={checkFields.tooltip} placement="top">
                    <span
                        style={{
                            color: checkFields.result.color,
                            cursor: checkFields.tooltip ? 'help' : 'default',
                        }}
                    >
                        {checkFields.result.text}
                    </span>
                </Tooltip>
            </div>
            <AiExecutionResults task={task} />
            {resultRemark && <div style={{ gridColumn: '1 / -1' }}><TaskRemarkResult remark={resultRemark} /></div>}
        </div>
    );
    const skuMetadata = isSku
        ? [
              ...(showParentTaskName
                  ? [
                        <DetailMetaItem
                            key="parent"
                            icon={<FileTextOutlined />}
                            label="所属任务"
                            tooltip={task.parentTaskName || '暂无数据'}
                        >
                            {task.parentTaskName || '暂无数据'}
                        </DetailMetaItem>,
                    ]
                  : []),
              ...(task.taskContent
                  ? [
                        <DetailMetaItem
                            key="content"
                            icon={<FileTextOutlined />}
                            label="任务内容"
                            tooltip={task.taskContent}
                        >
                            <span style={{ whiteSpace: 'pre-wrap' }}>
                                {task.taskContent}
                            </span>
                        </DetailMetaItem>,
                    ]
                  : []),
              ...(!hideFollower
                  ? [
                        <DetailMetaItem
                            key="executor"
                            icon={<UserOutlined />}
                            label="跟进人"
                            tooltip={task.bdName || task.bdId || '暂无数据'}
                        >
                            <PersonName name={task.bdName} mis={task.bdId} />
                        </DetailMetaItem>,
                    ]
                  : []),
              ...(!hideExpire ? [
                  <DetailMetaItem
                      key="expire"
                      icon={<BellOutlined />}
                      label="截止"
                      tooltip={task.expireDate || '暂无数据'}
                  >
                      {task.expireDate || '暂无数据'}
                  </DetailMetaItem>,
              ] : []),
              ...(showCreatedTime ? [
                  <DetailMetaItem
                      key="created"
                      icon={<CalendarOutlined />}
                      label="创建时间"
                      tooltip={formatOverviewDate(task.createdTime ?? task.createdDate)}
                  >
                      {formatOverviewDate(task.createdTime ?? task.createdDate)}
                  </DetailMetaItem>,
              ] : []),
              ...(task.description
                  ? [
                        <DetailMetaItem
                            key="description"
                            icon={<InfoCircleOutlined />}
                            label="参考信息"
                            tooltip={task.description}
                        >
                            <span style={{ whiteSpace: 'pre-wrap' }}>
                                {task.description}
                            </span>
                        </DetailMetaItem>,
                    ]
                  : []),
              ...(metadataRemark
                  ? [<TaskRemarkMetadata key="remark" remark={metadataRemark} />]
                  : []),
          ]
        : [];
    const skuMetadataRows = Array.from(
        { length: Math.ceil(skuMetadata.length / 2) },
        (_, index) => skuMetadata.slice(index * 2, index * 2 + 2),
    );
    const industryShopValue = task.shopId > 0
        ? (task.shopName ? task.shopName + '（' + task.shopId + '）' : String(task.shopId))
        : '暂无数据';
    const industryWdcValue = task.industryWdcId != null ? String(task.industryWdcId) : '暂无数据';
    const industryAddress = task.outerAddress || '暂无数据';
    const industryMetadataItems = isIndustry ? [
        <DetailMetaItem key="task-content" icon={<FileTextOutlined />} label="任务描述" tooltip={task.taskContent || '暂无数据'}>
            {task.taskContent || '暂无数据'}
        </DetailMetaItem>,
        <DetailMetaItem key="follower" icon={<UserOutlined />} label="跟进人" tooltip={task.bdName || task.bdId || '暂无数据'}>
            <PersonName name={task.bdName} mis={task.bdId} />
        </DetailMetaItem>,
        <DetailMetaItem key="address" icon={<EnvironmentOutlined />} label="地址" tooltip={industryAddress}>
            {industryAddress}
        </DetailMetaItem>,
        <DetailMetaItem key="related-shop" icon={<ShopOutlined />} label="关联美团门店" tooltip={industryShopValue}>
            {industryShopValue}
        </DetailMetaItem>,
        <DetailMetaItem key="related-wdc" icon={<LinkOutlined />} label="关联公海门店" tooltip={industryWdcValue}>
            {industryWdcValue}
        </DetailMetaItem>,
    ] : [];
    const industryMetadataRows = Array.from(
        { length: Math.ceil(industryMetadataItems.length / 2) },
        (_, index) => industryMetadataItems.slice(index * 2, index * 2 + 2),
    );
    const entityMetadataItems = [
        ...(showParentTaskName ? [
            <DetailMetaItem key="parent" icon={<FileTextOutlined />} label="所属任务" tooltip={task.parentTaskName || '暂无数据'}>
                {task.parentTaskName || '暂无数据'}
            </DetailMetaItem>,
        ] : []),
        ...(!isIndustry ? [
            <DetailMetaItem key="follower" icon={<UserOutlined />} label="跟进人" tooltip={task.bdName || task.bdId || '暂无数据'}>
                <PersonName name={task.bdName} mis={task.bdId} />
            </DetailMetaItem>,
        ] : []),
        ...(!hideExpire ? [
            <DetailMetaItem key="expire" icon={<BellOutlined />} label="截止" tooltip={task.expireDate || '暂无数据'}>
                {task.expireDate || '暂无数据'}
            </DetailMetaItem>,
        ] : []),
        ...(showCreatedTime ? [
            <DetailMetaItem
                key="created"
                icon={<CalendarOutlined />}
                label="创建时间"
                tooltip={formatOverviewDate(task.createdTime ?? task.createdDate)}
            >
                {formatOverviewDate(task.createdTime ?? task.createdDate)}
            </DetailMetaItem>,
        ] : []),
        ...(task.taskContent ? [
            <DetailMetaItem key="task-content" icon={<FileTextOutlined />} label="任务内容" tooltip={task.taskContent}>
                {task.taskContent}
            </DetailMetaItem>,
        ] : []),
        ...(task.description ? [
            <DetailMetaItem key="description" icon={<InfoCircleOutlined />} label="参考信息" tooltip={task.description}>
                {task.description}
            </DetailMetaItem>,
        ] : []),
        ...(metadataRemark ? [<TaskRemarkMetadata key="remark" remark={metadataRemark} />] : []),
    ];
    const entityMetadataRows = Array.from(
        { length: Math.ceil(entityMetadataItems.length / 2) },
        (_, index) => entityMetadataItems.slice(index * 2, index * 2 + 2),
    );
    const entityMetadata = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: TASK_DETAIL_META_ROW_GAP, marginTop: TASK_DETAIL_META_TOP_GAP }}>
            {entityMetadataRows.map((row, index) => (
                <div key={index} style={DETAIL_META_ROW_STYLE}>{row}</div>
            ))}
            <TaskConditionInfo task={task} color={MT.textMuted} />
            <ProfileFields
                fields={task.profileFields?.filter(
                    field =>
                        ![
                            'actualValue',
                            'targetValue',
                        ].includes(field.key),
                )}
                textColor={MT.textMuted}
            />
        </div>
    );
    const parentTaskBadges = showParentTaskName && parentTask ? (
        <TaskTitleBadges
            task={parentTask}
            taskTypeName={resolveTaskTypeName(
                parentTask.taskType,
                taskTypeNameMap,
                task.taskTypeDesc,
            )}
            objectTypeLabel={getObjectTypeMeta(
                parentTask.contactObjectType ?? task.contactObjectType,
            )?.label}
        />
    ) : undefined;
    const title = isIndustry ? (
        <EntityProfileHeader
            entity={getIndustryTaskProfile(task)}
            contactObjectType={CONTACT_OBJECT_TYPE.TS_POI}
            onIdentityClick={onSubjectClick ? () => { trackTaskAction('entity.detail.name'); onSubjectClick(); } : undefined}
            titleTags={parentTaskBadges}
            metadata={(
                <div style={{ display: 'flex', flexDirection: 'column', gap: TASK_DETAIL_META_ROW_GAP, marginTop: TASK_DETAIL_META_TOP_GAP }}>
                    {industryMetadataRows.map((row, index) => (
                        <div key={index} style={DETAIL_META_ROW_STYLE}>{row}</div>
                    ))}
                    {!showParentTaskName && <TaskConditionInfo task={task} color={MT.textMuted} />}
                </div>
            )}
        >
            {showParentTaskName ? entityMetadata : null}
        </EntityProfileHeader>
    ) : (
        <CardTitleRow
            style={{ minHeight: isSku ? TASK_DETAIL_TITLE_ROW_HEIGHT : 27 }}
            title={
                <span
                    onClick={onSubjectClick ? () => { trackTaskAction('entity.detail.name'); onSubjectClick(); } : undefined}
                    style={{
                        fontSize: 15,
                        fontWeight: 600,
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                        color: MT.textPrimary,
                        cursor: onSubjectClick ? 'pointer' : undefined,
                    }}
                >
                    {name}
                </span>
            }
            id={id}
            tags={parentTaskBadges}
        />
    );
    return (
        <div
            style={{
                border: `1px solid ${MT.cardBorder}`,
                borderRadius: MT.cardRadius,
                boxShadow: MT.cardShadow,
                padding: '18px 20px',
                background: MT.cardBg,
                transition:
                    'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
            }}
            onMouseEnter={event => {
                event.currentTarget.style.boxShadow = MT.cardShadowHover;
                event.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={event => {
                event.currentTarget.style.boxShadow = MT.cardShadow;
                event.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <div
                style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                }}
            >
                {actionable && onSelect && (
                    <Checkbox
                        style={{ flexShrink: 0, marginTop: 4 }}
                        checked={selected}
                        disabled={!selectable}
                        onChange={event => { trackTaskAction('selection.task'); onSelect(event.target.checked); }}
                    />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {isSku ? (
                        <TaskDetailLayout
                            title={title}
                            metadata={
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: TASK_DETAIL_META_ROW_GAP,
                                        marginTop: TASK_DETAIL_META_TOP_GAP,
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    {skuMetadataRows.map((row, index) => (
                                        <div
                                            key={index}
                                            style={DETAIL_META_ROW_STYLE}
                                        >
                                            {row}
                                        </div>
                                    ))}
                                    <TaskConditionInfo task={task} />
                                    {/* 门店画像统一由外层主体卡展示；检核字段保留在右侧结果的悬浮提示中。 */}
                                </div>
                            }
                            status={status}
                            results={results}
                            actions={actions}
                        />
                    ) : (
                        <TaskDetailLayout
                            title={title}
                            metadata={isIndustry ? null : entityMetadata}
                            wrapContent={isIndustry}
                            status={status}
                            results={results}
                            actions={actions}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
export default EntityTaskRow;
