import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useMemo, useState } from 'react';
import { Avatar, Checkbox, Tag } from 'antd';
import {
    DownOutlined,
    EnvironmentOutlined,
    LinkOutlined,
    ShopOutlined,
    UserOutlined,
} from '@ant-design/icons';
import type { BdTaskDto, ParentTaskOverviewDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import CardTitleRow from './CardTitleRow';
import { flattenRealTasks } from '../utils/entityIdentity';
import { getIndustryTaskProfile } from '../utils/industryProfile';
import PersonName from './PersonName';
import SkuTaskRow from './SkuTaskRow';
import EntityProfileHeader from './EntityProfileHeader';
import ProfileFields from './ProfileFields';
import BatchToolbar, { BatchToolbarAction } from './BatchToolbar';
import {
    canFeedback,
    canStartExecution,
    resolveStatusTagConfig,
    STATUS_STAT_CONFIG,
} from './taskHelpers';
import {
    MT,
    MT_FILLED_TAG_STYLE,
    TASK_DETAIL_ITEM_AVATAR_SIZE,
} from '../theme';
import { TaskTitleBadges } from './TaskCard';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import { resolveTaskTypeName, type TaskTypeNameMap } from '../utils/taskTypeName';
import { DetailMetaItem, DETAIL_META_ROW_STYLE } from './TaskDetailLayout';

export interface GroupedTaskRowProps {
    task: BdTaskDto;
    variant?: 'subtask' | 'entity-detail';
    selectedIds?: number[];
    onSelect?: (taskId: number, checked: boolean) => void;
    onFeedback?: (tasks: BdTaskDto[], type: 'done' | 'failed') => void;
    onRemove?: (tasks: BdTaskDto[]) => void;
    onExecute?: (task: BdTaskDto) => void;
    executeDisabledReason?: string;
    isExecutionHidden?: (task: BdTaskDto) => boolean;
    getExecutionDisabledReason?: (task: BdTaskDto) => string | undefined;
    onSubjectClick?: () => void;
    parentTask?: ParentTaskOverviewDto;
    taskTypeNameMap?: TaskTypeNameMap;
}

/** 聚合展示行本身不具备操作身份；所有选择和操作均使用组内真实任务。 */
const GroupedTaskRow: React.FC<GroupedTaskRowProps> = ({
    task,
    variant = 'subtask',
    selectedIds = [],
    onSelect,
    onFeedback,
    onRemove,
    onExecute,
    executeDisabledReason,
    isExecutionHidden,
    getExecutionDisabledReason,
    onSubjectClick,
    parentTask,
    taskTypeNameMap = {},
}) => {
    const [expanded, setExpanded] = useState(false);
    const [localSelected, setLocalSelected] = useState<number[]>([]);
    const tasks = useMemo(() => flattenRealTasks([task]), [task]);
    const feedbackable = tasks.filter(canFeedback);
    const selectable = tasks.filter(
        item => canFeedback(item) || item.canDelete,
    );
    const selected = localSelected.filter(id =>
        selectable.some(item => item.taskId === id),
    );
    const feedbackTasks = feedbackable.filter(item =>
        selected.includes(item.taskId),
    );
    const removeTasks = tasks.filter(
        item => item.canDelete && selected.includes(item.taskId),
    );
    const pageSelected = selectable.filter(item =>
        selectedIds.includes(item.taskId),
    );
    const toggleExpanded = () => {
        setExpanded(current => !current);
    };
    const industry = task.contactObjectType === CONTACT_OBJECT_TYPE.TS_SKU;
    const showIndustryProfile =
        industry && variant === 'subtask';
    const showShopProfile =
        variant === 'subtask' &&
        (task.contactObjectType === CONTACT_OBJECT_TYPE.SKU ||
            task.contactObjectType === CONTACT_OBJECT_TYPE.PHF_SKU);
    // 聚合行只展示所属门店的共性画像，检核值仍在展开后的真实商品任务中展示。
    const shopProfileFields = showShopProfile
        ? task.profileFields?.filter(
              field => !['actualValue', 'targetValue'].includes(field.key),
          ) ?? []
        : [];
    const tagFields = shopProfileFields.filter(
        field =>
            field.valueType === 'TAG' &&
            !['deliveryType', 'experienceScore'].includes(field.key),
    );
    const categoryIndex = tagFields.findIndex(
        field => field.key === 'categoryName',
    );
    const tagFieldsThroughCategory =
        categoryIndex >= 0 ? tagFields.slice(0, categoryIndex + 1) : tagFields;
    const tagFieldsAfterCategory =
        categoryIndex >= 0 ? tagFields.slice(categoryIndex + 1) : [];
    const textFields = shopProfileFields.filter(
        field =>
            field.valueType !== 'TAG' &&
            !['deliveryType', 'experienceScore'].includes(field.key),
    );
    const addressField = textFields.find(field => field.key === 'address');
    const remainingTextFields = textFields.filter(field => field.key !== 'address');
    const deliveryField = shopProfileFields.find(
        field => field.key === 'deliveryType',
    );
    const deliveryLabel = deliveryField?.value ?? deliveryField?.tagList?.[0];
    const experienceScore = showShopProfile
        ? task.experienceScore ??
          shopProfileFields.find(field => field.key === 'experienceScore')
              ?.value
        : undefined;
    const subjectId = industry ? task.tsPoiId : task.shopId;
    // 行业商品使用归属主体名，不能用 objectName（商品名）冒充门店名。
    const subjectName = industry
        ? task.tsPoiName ||
          (task.tsPoiId ? '行业商家' : undefined)
        : task.shopName;
    const first = tasks[0];
    const title =
        variant === 'entity-detail'
            ? first?.parentTaskName ?? task.parentTaskName
            : subjectName;
    const id =
        variant === 'entity-detail'
            ? first?.parentTaskId ?? task.parentTaskId
            : subjectId;
    const groupTaskCount = task.skuTaskAggregation?.taskCount ?? tasks.length;
    const parentObjectType = parentTask?.contactObjectType ?? task.contactObjectType;
    // 任务项列表详情页的标题标签只表达实体类型；具体任务数量保留在下方可展开概览中，
    // 避免同一张卡片在标题标签和执行概览中重复展示统计信息。
    const parentObjectTypeLabel = getObjectTypeMeta(parentObjectType)?.label;
    const parentTaskBadges = variant === 'entity-detail' && parentTask ? (
        <TaskTitleBadges
            task={parentTask}
            taskTypeName={resolveTaskTypeName(
                parentTask.taskType,
                taskTypeNameMap,
                first?.taskTypeDesc,
            )}
            objectTypeLabel={parentObjectTypeLabel}
        />
    ) : undefined;
    const relatedShopValue = task.shopId > 0
        ? (task.shopName ? task.shopName + '（' + task.shopId + '）' : String(task.shopId))
        : '暂无数据';
    const relatedWdcValue = task.industryWdcId != null ? String(task.industryWdcId) : '暂无数据';
    const industryAddress = task.outerAddress || '暂无数据';
    const industryMetadataItems = industry ? [
        <DetailMetaItem key="follower" icon={<UserOutlined />} label="跟进人" tooltip={task.bdName || task.bdId || '暂无数据'} color={MT.textMuted}>
            <PersonName name={task.bdName} mis={task.bdId} />
        </DetailMetaItem>,
        <DetailMetaItem key="address" icon={<EnvironmentOutlined />} label="地址" tooltip={industryAddress} color={MT.textMuted}>
            {industryAddress}
        </DetailMetaItem>,
        <DetailMetaItem key="related-shop" icon={<ShopOutlined />} label="关联美团门店" tooltip={relatedShopValue} color={MT.textMuted}>
            {relatedShopValue}
        </DetailMetaItem>,
        <DetailMetaItem key="related-wdc" icon={<LinkOutlined />} label="关联公海门店" tooltip={relatedWdcValue} color={MT.textMuted}>
            {relatedWdcValue}
        </DetailMetaItem>,
    ] : [];
    const industryMetadataRows = Array.from(
        { length: Math.ceil(industryMetadataItems.length / 2) },
        (_, index) => industryMetadataItems.slice(index * 2, index * 2 + 2),
    );
    const selectGroup = (checked: boolean) => {
        setLocalSelected(checked ? selectable.map(item => item.taskId) : []);
    };
    const changeSelection = (taskId: number, checked: boolean) => {
        setLocalSelected(current =>
            checked
                ? Array.from(new Set([...current, taskId]))
                : current.filter(value => value !== taskId),
        );
    };
    const selectPageGroup = (checked: boolean) => {
        selectable
            .filter(item => selectedIds.includes(item.taskId) !== checked)
            .forEach(item => onSelect?.(item.taskId, checked));
    };
    const executableTasks = tasks.filter(item => canStartExecution(item) && !isExecutionHidden?.(item));
    const executable = executableTasks.length > 0;
    const batchDisabledReason = executeDisabledReason ?? executableTasks.map(item => getExecutionDisabledReason?.(item)).find(Boolean);
    const statusItems = STATUS_STAT_CONFIG.filter(
        status => (task.skuTaskAggregation?.statusCounts?.[status.key] ?? 0) > 0,
    );
    const expandedIndent = (onSelect && selectable.length > 0 ? 32 : 0)
        + (showShopProfile ? TASK_DETAIL_ITEM_AVATAR_SIZE + 16 : 0);
    const batchActions: BatchToolbarAction[] = [];
    batchActions.push({
        key: 'batch-execute',
        label: '全部执行',
        color: MT.textPrimary,
        disabled: !onExecute || !executable || !!batchDisabledReason,
        title: batchDisabledReason,
        onClick: () => {
            if (onExecute && executable && !batchDisabledReason) {
                onExecute(task);
            }
        },
    });
    batchActions.push(
        {
            key: 'done',
            label: '确认完成',
            color: MT.textPrimary,
            disabled: !onFeedback || !feedbackTasks.length,
            onClick: () => { trackTaskAction('feedback.done_group'); onFeedback?.(feedbackTasks, 'done'); },
        },
        {
            key: 'failed',
            label: '无法完成',
            color: MT.textPrimary,
            disabled: !onFeedback || !feedbackTasks.length,
            onClick: () => { trackTaskAction('feedback.failed_group'); onFeedback?.(feedbackTasks, 'failed'); },
        },
        {
            key: 'remove',
            label: '删除',
            danger: true,
            disabled: !onRemove || !removeTasks.length,
            onClick: () => { trackTaskAction('task.remove_group'); onRemove?.(removeTasks); },
        },
    );
    return (
        <div
            style={{
                border: `1px solid ${MT.cardBorder}`,
                borderRadius: MT.cardRadius,
                boxShadow: MT.cardShadow,
                padding: '18px 20px',
                background: MT.cardBg,
                transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
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
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {onSelect && selectable.length > 0 && (
                    <Checkbox
                        style={{ flexShrink: 0, marginTop: 4 }}
                        checked={pageSelected.length === selectable.length}
                        indeterminate={
                            pageSelected.length > 0 &&
                            pageSelected.length < selectable.length
                        }
                        onChange={event => { trackTaskAction('selection.group_page'); selectPageGroup(event.target.checked); }}
                    />
                )}
                {showShopProfile && (
                    <Avatar
                        shape="square"
                        size={TASK_DETAIL_ITEM_AVATAR_SIZE}
                        src={task.logo}
                        icon={!task.logo ? <ShopOutlined /> : undefined}
                        onClick={onSubjectClick ? () => { trackTaskAction('entity.detail.avatar'); onSubjectClick(); } : undefined}
                        style={{
                            flexShrink: 0,
                            borderRadius: MT.cardRadiusSmall,
                            background: task.logo
                                ? undefined
                                : `linear-gradient(135deg, ${MT.brandPrimaryLight}, #F5F5F7)`,
                            color: MT.brandPrimary,
                            cursor: onSubjectClick ? 'pointer' : undefined,
                        }}
                    />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {showIndustryProfile ? (
                        <div
                            onClick={onSubjectClick ? () => { trackTaskAction('entity.detail.name'); onSubjectClick(); } : undefined}
                            style={{
                                cursor: onSubjectClick ? 'pointer' : undefined,
                            }}
                        >
                            <EntityProfileHeader
                                entity={getIndustryTaskProfile(task)}
                                contactObjectType={CONTACT_OBJECT_TYPE.TS_POI}
                                metadata={(
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                                        {industryMetadataRows.map((row, index) => (
                                            <div key={index} style={DETAIL_META_ROW_STYLE}>{row}</div>
                                        ))}
                                    </div>
                                )}
                            />
                        </div>
                    ) : (
                        <CardTitleRow
                            style={{ minHeight: 24 }}
                            title={
                                <span
                                    onClick={onSubjectClick ? () => { trackTaskAction('entity.detail.name'); onSubjectClick(); } : undefined}
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 600,
                                        minWidth: 0,
                                        overflowWrap: 'anywhere',
                                        color: MT.textPrimary,
                                        cursor: onSubjectClick
                                            ? 'pointer'
                                            : undefined,
                                    }}
                                >
                                    {title || '暂无数据'}
                                </span>
                            }
                            id={id || '暂无数据'}
                            tags={
                                parentTaskBadges ?? <>
                                    <ProfileFields
                                        fields={tagFieldsThroughCategory}
                                        size="small"
                                        gap={8}
                                    />
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
                                    {experienceScore != null &&
                                        experienceScore !== '' && (
                                            <Tag
                                                bordered={false}
                                                style={{
                                                    ...MT_FILLED_TAG_STYLE,
                                                    background: MT.pageBg,
                                                    color: MT.textMuted,
                                                }}
                                            >
                                                体验分 {experienceScore}
                                            </Tag>
                                        )}
                                    <ProfileFields
                                        fields={tagFieldsAfterCategory}
                                        size="small"
                                        gap={8}
                                    />
                                </>
                            }
                        />
                    )}
                    {!showIndustryProfile && (
                        <div style={{ ...DETAIL_META_ROW_STYLE, marginTop: 8 }}>
                            <DetailMetaItem
                                icon={<UserOutlined />}
                                label="跟进人"
                                tooltip={task.bdName || task.bdId || '暂无数据'}
                                color={MT.textMuted}
                            >
                                <PersonName name={task.bdName} mis={task.bdId} />
                            </DetailMetaItem>
                            {addressField?.value && (
                                <DetailMetaItem
                                    icon={<EnvironmentOutlined />}
                                    label="经营地址"
                                    tooltip={addressField.value}
                                    color={MT.textMuted}
                                >
                                    {addressField.value}
                                </DetailMetaItem>
                            )}
                        </div>
                    )}
                    {remainingTextFields.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                            <ProfileFields
                                fields={remainingTextFields}
                                textColor={MT.textMuted}
                            />
                        </div>
                    )}
                    <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => { trackTaskAction(expanded ? 'group.collapse' : 'group.expand', undefined, { parentTaskId: task.parentTaskId, taskIds: tasks.map(item => item.taskId) }); toggleExpanded(); }}
                        style={{
                            display: 'flex',
                            width: '100%',
                            minWidth: 0,
                            marginTop: 16,
                            padding: '12px 14px',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                            border: 0,
                            borderRadius: expanded
                                ? MT.cardRadiusSmall + 'px ' + MT.cardRadiusSmall + 'px 0 0'
                                : MT.cardRadiusSmall,
                            background: MT.taskStripBg,
                            color: MT.textPrimary,
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <span style={{ display: 'flex', minWidth: 0, flex: 1, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: MT.textPrimary }}>
                                共 {groupTaskCount} 条 SKU 任务
                            </span>
                            {statusItems.map(status => {
                                const count = task.skuTaskAggregation?.statusCounts?.[status.key] ?? 0;
                                const appearance = resolveStatusTagConfig(status.key, undefined);
                                return (
                                    <span
                                        key={status.key}
                                        style={{
                                            ...MT_FILLED_TAG_STYLE,
                                            margin: 0,
                                            background: appearance.background,
                                            color: appearance.color,
                                        }}
                                    >
                                        {status.label} {count}
                                    </span>
                                );
                            })}
                        </span>
                        <span style={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: 4, fontSize: 12, color: MT.textMuted }}>
                            {expanded ? '收起明细' : '展开明细'}
                            <DownOutlined rotate={expanded ? 180 : 0} />
                        </span>
                    </button>
                </div>
            </div>
            {expanded && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        width: expandedIndent > 0 ? 'calc(100% - ' + expandedIndent + 'px)' : '100%',
                        boxSizing: 'border-box',
                        marginTop: 0,
                        marginLeft: expandedIndent,
                        padding: '4px 16px 16px',
                        borderRadius: '0 0 ' + MT.cardRadiusSmall + 'px ' + MT.cardRadiusSmall + 'px',
                        background: MT.taskStripBg,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            height: 16,
                            marginBottom: 4,
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            scrollbarWidth: 'none',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flex: '0 0 auto',
                                alignItems: 'center',
                                gap: 12,
                                minWidth: 'max-content',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {selectable.length > 0 && (
                                <Checkbox
                                    style={{
                                        height: 16,
                                        flexShrink: 0,
                                        fontSize: 12,
                                        lineHeight: '16px',
                                        color: MT.textMuted,
                                    }}
                                    checked={selectable.every(item => selected.includes(item.taskId))}
                                    indeterminate={
                                        selectable.some(item => selected.includes(item.taskId)) &&
                                        !selectable.every(item => selected.includes(item.taskId))
                                    }
                                    onChange={event => { trackTaskAction('selection.group_all'); selectGroup(event.target.checked); }}
                                >
                                    全选组内可操作任务
                                </Checkbox>
                            )}
                            {selected.length > 0 && batchActions.length > 0 && (
                                <BatchToolbar compact count={selected.length} actions={batchActions} />
                            )}
                        </div>
                    </div>
                    {tasks.map(item => (
                        <SkuTaskRow
                            key={item.taskId}
                            hideFollower
                            task={{
                                ...item,
                                contactObjectType:
                                    item.contactObjectType ??
                                    task.contactObjectType,
                            }}
                            selected={selected.includes(item.taskId)}
                            onSelect={checked =>
                                changeSelection(item.taskId, checked)
                            }
                            onFeedback={onFeedback}
                            hideExpire={variant === 'subtask'}
                            showCreatedTime={variant === 'subtask'}
                            onExecute={onExecute && !isExecutionHidden?.(item) ? () => onExecute(item) : undefined}
                            executeDisabledReason={getExecutionDisabledReason?.(item) ?? executeDisabledReason}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
export default GroupedTaskRow;
