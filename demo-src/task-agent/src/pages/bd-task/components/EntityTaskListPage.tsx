import { useTaskAnalyticsView } from '@/lib/useTaskAnalyticsView';
import { trackTaskAction, captureTaskView } from '@/lib/taskAnalytics';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button, Spin, Empty, Pagination, message, Modal, Checkbox, Input, Switch, Breadcrumb, Avatar, Tag, Alert } from 'antd';
import dayjs from 'dayjs';
import { ProfileOutlined } from '@ant-design/icons';
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  UserOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { bdTaskApi } from '@/services/bdTaskApi';
import type { BdTaskDto, ShopDimensionItemDto, ContactObjectType, ParentTaskOverviewDto, TaskStatusStatsReq, TaskStatusStatsDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import { useTenantStore } from '@/stores/tenantStore';
import { FeedbackModal, canFeedback, canStartExecution, STATUS_STAT_CONFIG } from './taskHelpers';
import ProfileFields from './ProfileFields';
import { PRIORITY_CONFIG } from './TaskCard';
import StatCard from './StatCard';
import StatGroup, { StatGroupStack } from './StatGroup';
import TypeStatGroup from './TypeStatGroup';
import BatchToolbar from './BatchToolbar';
import ShopExecutionDrawer from './ShopExecutionDrawer';
import { useExecutionAvailability } from '@/components/shop-execution/useExecutionAvailability';
import { executableTaskScope } from '@/components/shop-execution/executionScope';
import { collectTaskExecutionObjectIds } from '@/components/shop-execution/taskObjectIds';
import { useTaskSelection, isSelectable } from '../hooks/useTaskSelection';
import { useTaskTypeDictionary } from '../hooks/useTaskTypeDictionary';
import { useTaskQuery } from '../hooks/useTaskQuery';
import TaskStatsNotice from './TaskStatsNotice';
import PersonName from './PersonName';
import TaskFilterBar from './TaskFilterBar';
import FilterFieldLabel from './FilterFieldLabel';
import SortTabs from './SortTabs';
import { MT, MT_FILLED_TAG_STYLE, SHOP_DETAIL_HEADER_AVATAR_SIZE } from '../theme';
import CardTitleRow from './CardTitleRow';
import EntityProfileHeader from './EntityProfileHeader';
import MixedTaskList from './MixedTaskList';
import { flattenRealTasks } from '../utils/entityIdentity';
import { getFeedbackResultMessage, resolveFeedbackResult } from '../utils/feedbackResult';
import type { FeedbackOutcome } from '../utils/feedbackResult';

const SHOP_DETAIL_HEADER_META_FONT_SIZE = 13;

/** 统计查询失败或缺少有效总数时保留未知值，合法的 0 仍正常显示。 */
function readDetailCount(result: PromiseSettledResult<{ total: number }>): number | null {
  return result.status === 'fulfilled' && Number.isSafeInteger(result.value?.total) && result.value.total >= 0
    ? result.value.total : null;
}

/** 按 parentTaskId 分组后循环调用 deleteSubTasks，规避跨任务批次批量移除的权限校验缺口 */
async function batchRemoveAcrossParents(tasks: BdTaskDto[]) {
  const grouped = new Map<number, number[]>();
  tasks.filter(t => Number.isFinite(t.taskId) && t.taskId > 0 && t.canDelete && !t.skuTaskAggregation).forEach(t => {
    const list = grouped.get(t.parentTaskId) ?? [];
    if (!list.includes(t.taskId)) list.push(t.taskId);
    grouped.set(t.parentTaskId, list);
  });
  if (grouped.size === 0) return;
  const entries = Array.from(grouped.entries()).flatMap(([parentTaskId, ids]) =>
    Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => [parentTaskId, ids.slice(index * 100, (index + 1) * 100)] as const),
  );
  const results = await Promise.allSettled(
    entries.map(([parentTaskId, taskIds]) => bdTaskApi.deleteSubTasks({ parentTaskId, taskIds })),
  );
  const failed = results.filter(r => r.status === 'rejected').length;
  const success = results.length - failed;
  if (failed === 0) message.success('移除成功', 10);
  else message.warning(`成功移除 ${success} 组，${failed} 组移除失败，请重试`, 10);
}

const EntityTaskListPage: React.FC<{ contactObjectType?: ContactObjectType }> = ({ contactObjectType: routeObjectType }) => {
  const navigate = useNavigate();
  const { shopId, brandId, outerId } = useParams<{ shopId: string; brandId: string; outerId: string }>();
  const objectId = brandId ?? outerId ?? shopId;
  const location = useLocation();
  const tenantId = useTenantStore(state => state.currentTenantId);
  const shopIdNum = Number(shopId);

  const [entityProfile, setEntityProfile] = useState<ShopDimensionItemDto | undefined>();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRetryKey, setProfileRetryKey] = useState(0);

  // 商家基本信息由 ShopListPage 通过 router state 传入（含门店类型，决定详情页展示分支：外卖门店详情 / 公海门店详情）
  const shopName: string = entityProfile?.outerName ?? entityProfile?.objectName ?? entityProfile?.shopName ?? (location.state as any)?.entityName ?? (location.state as any)?.shopName ?? (shopId ? `商家 ${shopId}` : '暂无数据');
  const taskCountFromState: number = (location.state as any)?.taskCount ?? 0;
  const contactObjectType: ContactObjectType = routeObjectType ?? (shopId
    ? (location.state as any)?.contactObjectType === CONTACT_OBJECT_TYPE.WDC_SHOP ? CONTACT_OBJECT_TYPE.WDC_SHOP : CONTACT_OBJECT_TYPE.WM_SHOP
    : CONTACT_OBJECT_TYPE.BRAND);
  const isShop = contactObjectType === CONTACT_OBJECT_TYPE.WM_SHOP || contactObjectType === CONTACT_OBJECT_TYPE.WDC_SHOP;
  const isIndustryShop = contactObjectType === CONTACT_OBJECT_TYPE.TS_POI;
  const entityQuery = useMemo(() => ({ tenantId, ...(isShop
    ? { shopId: shopIdNum, tab: contactObjectType === CONTACT_OBJECT_TYPE.WDC_SHOP ? 2 as const : 1 as const }
    : isIndustryShop
      ? { tsPoiId: objectId, tab: 4 as const }
      : { objectId, tab: 3 as const }) }), [tenantId, isShop, isIndustryShop, objectId, shopIdNum, contactObjectType]);

  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<BdTaskDto[]>([]);
  const realTasks = useMemo(() => flattenRealTasks(tasks), [tasks]);
  useEffect(() => {
    if (!objectId) return;
    let cancelled = false;
    setEntityProfile(undefined);
    setProfileError(null);
    bdTaskApi.queryShopDimensionList({
      page: 1, pageSize: 1,
      ...entityQuery,
    }).then(result => { if (!cancelled) setEntityProfile(result?.data?.[0]); }).catch(() => {
      if (!cancelled) setProfileError('主体信息加载失败，请重试');
    });
    return () => { cancelled = true; };
  }, [entityQuery, objectId, profileRetryKey]);
  const [parentTaskMap, setParentTaskMap] = useState<Record<number, ParentTaskOverviewDto>>({});
  const { getExecutionDisabledReason: getSingleExecutionDisabledReason, isExecutionHidden: isSingleExecutionHidden } = useExecutionAvailability(
    realTasks.map(task => task.contactObjectType ?? parentTaskMap[task.parentTaskId]?.contactObjectType), false,
  );
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [feedbackTasks, setFeedbackTasks] = useState<BdTaskDto[]>([]);
  const [feedbackType, setFeedbackType] = useState<'done' | 'failed'>('done');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackOutcome, setFeedbackOutcome] = useState<FeedbackOutcome | null>(null);
  // TC-118-4：任务类型字典（含 indicators 检核指标字典），用于按 task.checkInfo.bizIndicatorId 反查指标中文名，
  // 组装任务项卡片「检核口径」hover 浮层文案，与 SubTaskList.tsx fetchTaskTypes 同款获取方式
  const typeDictionary = useTaskTypeDictionary();
  const { taskTypes, taskTypeNameMap, getTaskTypeName, reload: fetchTypeDictionary } = typeDictionary;

  // 顶部信息区复用 ShopCard，构造符合 ShopDimensionItemDto 结构的数据；画像字段取任务项列表首条透出的字段作为过渡展示
  const shopCardData: ShopDimensionItemDto = useMemo(() => ({
    shopId: shopIdNum,
    shopName,
    taskCount: taskCountFromState,
    executorMis: tasks[0]?.bdId ?? null,
    executorName: tasks[0]?.bdName,
    logo: tasks[0]?.logo,
    experienceScore: tasks[0]?.experienceScore,
    experienceReachTarget: tasks[0]?.experienceReachTarget,
    profileFields: tasks[0]?.profileFields,
  }), [shopIdNum, shopName, taskCountFromState, tasks]);

  // 【全面排查修复】顶部商家信息头布局统一对齐商家列表页卡片 ShopCard.tsx：画像字段按 valueType 拆分，
  // TAG 类字段集中到标题行展示，TEXT 类字段（如经营地址）保留在下方信息行，与 ShopCard.tsx 同一套拆分规则
  // 【走查修复】actualValue/targetValue（检核指标当前值/目标值）本质是任务维度字段，而非商家维度画像字段——
  // 顶部信息头的 profileFields 数据源是 tasks[0].profileFields（取首个任务过渡展示），若不排除这两个 key，
  // 会把"随机某一个任务"的检核当前值/目标值当作商家整体信息展示出来；而商家详情页下可能存在多个任务项，
  // 各任务关联的检核指标并不相同，在商家维度顶部卡片展示任一任务的检核指标都是误导性信息，故排除展示，
  // 检核当前值/目标值改为仅在各任务项卡片自身的「检核结果」hover 浮层中查看（taskHelpers.tsx TaskItem）
  const tagFields = useMemo(
    () => shopCardData.profileFields?.filter(f => f.valueType === 'TAG' && f.key !== 'deliveryType' && f.key !== 'experienceScore') ?? [],
    [shopCardData.profileFields],
  );
  const textFields = useMemo(
    () => shopCardData.profileFields?.filter(f =>
      f.valueType !== 'TAG' &&
      f.key !== 'actualValue' &&
      f.key !== 'targetValue' &&
      f.key !== 'deliveryType' &&
      f.key !== 'experienceScore'
    ) ?? [],
    [shopCardData.profileFields],
  );
  const deliveryField = useMemo(
    () => shopCardData.profileFields?.find(field => field.key === 'deliveryType'),
    [shopCardData.profileFields],
  );
  const deliveryLabel = deliveryField?.value ?? deliveryField?.tagList?.[0];
  const experienceField = useMemo(
    () => shopCardData.profileFields?.find(field => field.key === 'experienceScore'),
    [shopCardData.profileFields],
  );
  const experienceScoreValue = shopCardData.experienceScore ?? experienceField?.value;
  const hasHeaderTitleTags = tagFields.length > 0 || !!deliveryLabel || (experienceScoreValue !== undefined && experienceScoreValue !== '');

  const [executionObjectType, setExecutionObjectType] = useState<number | undefined>(contactObjectType);
  const [conditionTask, setConditionTask] = useState<BdTaskDto>();
  const [executionTaskId, setExecutionTaskId] = useState<number>();
  const [executionTaskIds, setExecutionTaskIds] = useState<number[]>([]);
  const [ordinaryScope, setOrdinaryScope] = useState({ ordinaryTaskIds: [] as number[], ordinaryShopIds: [] as string[] });
  const [executionParentTaskId, setExecutionParentTaskId] = useState<number>();
  const [batchExecution, setBatchExecution] = useState(false);
  const [executeShopIds, setExecuteShopIds] = useState<string[] | null>(null);

  const openExecutionForObjects = (result: ReturnType<typeof collectTaskExecutionObjectIds>,
    objectType: number | undefined, targetTasks: BdTaskDto[], batch = false) => {
    if (!result.objectIds.length) {
      message.warning('所选任务项暂无有效执行实体 ID');
      return;
    }
    if (result.invalidCount) message.warning(`${result.invalidCount} 个任务项缺少有效执行实体 ID，未加入本次执行`);
    setExecutionObjectType(objectType);
    setExecutionTaskId(targetTasks[0]?.taskId);
    setExecutionTaskIds(targetTasks.map(task => task.taskId));
    setOrdinaryScope(executableTaskScope(targetTasks));
    setConditionTask(!batch && targetTasks.length === 1 ? targetTasks[0] : undefined);
    setExecutionParentTaskId(targetTasks[0]?.parentTaskId);
    setBatchExecution(batch);
    setExecuteShopIds(result.objectIds);
  };

  // 筛选/排序/搜索状态
  // 【全面排查修复】优先级/状态筛选此前为纯前端本地过滤（仅对当前页 tasks 数组 filter），
  // 现改为服务端真实筛选：BdTaskDetailReq 已支持 priority/status 参数（与 SubTaskList.tsx 完全一致），
  // 选中后随 buildReq 一并下发查询接口，全量生效而非仅当前页
  const [activePriority, setActivePriority] = useState<number | null>(null);
  const [activeStatus, setActiveStatus] = useState<number | null>(null);
  // 【重新梳理】新增业务类型筛选，与任务列表页 ParentTaskList.tsx 保持一致——同一商家可能挂多个不同
  // 业务类型的任务批次批次，业务类型在商家详情页下是有真实差异化筛选意义的维度
  const [activeType, setActiveType] = useState<number>(-1); // -1 表示「全部」
  // 搜索：草稿值 + 查询按钮生效两套状态，对齐 NoCode MerchantDetailPage handleSearch 交互
  // TC-054 修复：此前为纯本地过滤（对 tasks 数组按 taskContent 关键字 includes 匹配，仅能命中当前页数据）；
  // 改为搜索「所属任务（任务批次/批次）名称」，复用 BdTaskDetailReq.parentTaskName 真实服务端参数（商家可能关联
  // 多个不同任务批次/批次，按批次名称做服务端全量搜索才有意义）。
  // 注：BdTaskDetailReq 接口未提供任务 ID 精确搜索字段（该字段仅存在于任务批次列表查询接口 BdmParentTaskPageReq.id），
  // 故此处保持按名称模糊搜索，不能像任务列表页一样做「名称/ID 合并搜索」
  const [searchDraft, setSearchDraft] = useState('');
  const [searchValue, setSearchValue] = useState('');
  // 【重新梳理】新增任务创建人搜索，与任务列表页 ParentTaskList.tsx 保持一致；接口 BdTaskDetailReq.creatorId 已支持
  const [creatorSearchDraft, setCreatorSearchDraft] = useState('');
  const [creatorSearch, setCreatorSearch] = useState('');
  // 【重新梳理】此前的经营地址搜索 + 商家画像筛选（营业状态/上单状态/配送方式/认领上单状态/品类/商家标签/体验分区间）
  // 已删除：本页面是单一商家的任务详情页，商家自身维度信息（地址/营业状态/上单状态/配送方式/画像标签等）
  // 对该商家下的全部任务项而言均为同一个值，不具备筛选意义，与用户确认后统一收敛为「任务维度」筛选能力，
  // 对齐任务列表页 ParentTaskList.tsx（业务类型/优先级/状态/创建人/排序/仅看未过期），删除商家维度筛选
  // 【重新梳理】新增「仅看未过期任务」勾选，与任务列表页 ParentTaskList.tsx 保持一致：默认勾选（默认生效）
  // 与商家列表默认范围一致，先展示全部任务；可主动切换为仅看未过期。
  const [onlyUnexpired, setOnlyUnexpired] = useState(false);
  // TC-055 修复：排序此前为纯前端本地排序（仅对当前页 tasks 做 sort），改为真实服务端 sortList 参数下发查询接口；
  // 新增「按创建时间」排序项（等价用 id 降序代替，与 ParentTaskList.tsx buildSortList 用 id 降序代替创建时间排序的
  // 模式完全一致）；「按优先级」「按截止时间」整体按对应字段顺排，同值内部再按 id 降序稳定排序，避免同优先级/
  // 同截止时间任务间穿插错乱
  const [sortMode, setSortMode] = useState<'createdTime' | 'priority' | 'expireDate'>('createdTime');

  // 批量移除确认弹窗
  const [removeModal, setRemoveModal] = useState<{ visible: boolean; taskIds: number[]; loading: boolean }>(
    { visible: false, taskIds: [], loading: false },
  );

  // 【全面排查修复】排序参数构造：排序字段统一改用 id（之前误用 taskId，与后端字段命名不一致，
  // 且与 ParentTaskList.tsx buildSortList 口径不统一）：createdTime 等价代替为按 id 降序；priority/expireDate
  // 整体按该字段顺排，同值分组内再按 id 降序稳定排序，与 ParentTaskList.tsx buildSortList 同款模式
  const buildSortList = (mode: 'createdTime' | 'priority' | 'expireDate') => {
    if (mode === 'createdTime') return [{ field: 'id', asc: false }];
    return [{ field: mode, asc: true }, { field: 'id', asc: false }];
  };

  // 状态统计和列表共用其余生效条件；仅列表加选中状态、分页和排序。
  const statusFilters = useMemo<Omit<TaskStatusStatsReq, 'statsFields'>>(() => {
    const req: Omit<TaskStatusStatsReq, 'statsFields'> = { ...entityQuery };
    if (searchValue.trim()) req.parentTaskName = searchValue.trim();
    if (creatorSearch.trim()) req.creatorId = creatorSearch.trim();
    if (activePriority != null) req.priority = activePriority;
    if (activeType !== -1) req.taskType = activeType;
    if (onlyUnexpired) req.expireDateFrom = dayjs().format('YYYY-MM-DD');
    return req;
  }, [entityQuery, searchValue, creatorSearch, activePriority, activeType, onlyUnexpired]);

  const buildReq = useCallback((p: number, ps: number) => ({
    ...statusFilters,
    ...(activeStatus != null ? { status: activeStatus } : {}),
    page: p,
    pageSize: ps,
    sortList: buildSortList(sortMode),
  }), [statusFilters, activeStatus, sortMode]);

  const requestSeq = useRef(0);
  const fetchTasks = useCallback(async (p: number, ps?: number) => {
    if (!objectId) return;
    const sequence = ++requestSeq.current;
    setLoading(true);
    setListError(null);
    try {
      const result = await bdTaskApi.queryDetail(buildReq(p, ps ?? pageSize));
      if (sequence !== requestSeq.current) return;
      const taskData = result?.data || [];
      setTasks(taskData);
      setTotal(result?.total || 0);
      const parentTaskIds = Array.from(new Set(flattenRealTasks(taskData).map(task => task.parentTaskId).filter(Boolean)));
      if (parentTaskIds.length === 0) {
        setParentTaskMap({});
      } else {
        try {
          const parentResult = await bdTaskApi.queryParentTaskList({
            parentTaskIdList: parentTaskIds,
            page: 1,
            pageSize: parentTaskIds.length,
          });
          if (sequence !== requestSeq.current) return;
          setParentTaskMap(Object.fromEntries(
            (parentResult?.data || []).map(parentTask => [parentTask.parentTaskId, parentTask]),
          ));
        } catch {
          if (sequence !== requestSeq.current) return;
          setParentTaskMap({});
        }
      }
    } catch {
      if (sequence !== requestSeq.current) return;
      setTasks([]); setTotal(0); setParentTaskMap({});
      setListError('主体任务加载失败，请重试');
    } finally {
      if (sequence === requestSeq.current) setLoading(false);
    }
  }, [objectId, pageSize, buildReq]);

  // 优先级和业务类型沿用列表展示行计数，任务状态另取真实任务项统计。
  const priorityFilters = useMemo(() => {
    const base: any = { ...entityQuery, page: 1, pageSize: 1 };
    if (searchValue.trim()) base.parentTaskName = searchValue.trim();
    if (creatorSearch.trim()) base.creatorId = creatorSearch.trim();
    if (activeStatus != null) base.status = activeStatus;
    if (activeType !== -1) base.taskType = activeType;
    if (onlyUnexpired) base.expireDateFrom = dayjs().format('YYYY-MM-DD');
    return base;
  }, [entityQuery, searchValue, creatorSearch, activeStatus, activeType, onlyUnexpired]);
  const priorityStats = useTaskQuery<Record<number, number | null>>(JSON.stringify(priorityFilters));
  const { run: runPriorityStats } = priorityStats;
  const priorityCounts = priorityStats.data ?? {};
  const fetchPriorityCounts = useCallback(() => {
    if (!objectId || tenantId == null) return;
    void runPriorityStats(async () => {
      const results = await Promise.allSettled(
        [0, 1, 2, 3].map(p => bdTaskApi.queryDetail({ ...priorityFilters, priority: p })),
      );
      return Object.fromEntries([0, 1, 2, 3].map((p, i) => [p, readDetailCount(results[i])]));
    });
  }, [objectId, tenantId, priorityFilters, runPriorityStats]);
  useEffect(() => { fetchPriorityCounts(); }, [fetchPriorityCounts]);
  const priorityStatsError = priorityStats.error || Object.values(priorityCounts).some(count => count === null);

  // 一个请求返回跨批次主体的全部状态桶；真实totalCount不用于混排行分页。
  const statusStats = useTaskQuery<TaskStatusStatsDto>(JSON.stringify(statusFilters));
  const { run: runStatusStats } = statusStats;
  const fetchStatusCounts = useCallback(() => {
    if (!objectId || tenantId == null) return;
    void runStatusStats(async () => {
      const codes = STATUS_STAT_CONFIG.map(status => status.key);
      const result = await bdTaskApi.queryTaskStatusStats({
        ...statusFilters,
        statsFields: [{ field: 'status', codes }],
      });
      const items = result?.statusStats?.items;
      if (!Number.isSafeInteger(result?.totalCount) || result.totalCount < 0 || !Array.isArray(items)
        || items.length !== codes.length || new Set(items.map(item => item?.code)).size !== codes.length
        || items.some(item => !item || !codes.includes(item.code) || !Number.isSafeInteger(item.count) || item.count < 0)) {
        throw new Error('任务状态统计数据不完整');
      }
      return result;
    });
  }, [objectId, tenantId, statusFilters, runStatusStats]);
  const statusCounts = Object.fromEntries(statusStats.data?.statusStats?.items.map(item => [item.code, item.count]) ?? []);

  useEffect(() => { fetchStatusCounts(); }, [fetchStatusCounts]);

  // 业务类型数量按首次进入该租户/主体的默认范围获取，筛选和刷新列表不改变页签内容。
  const typeFilters = useMemo(() => ({ ...entityQuery, page: 1, pageSize: 1 }), [entityQuery]);
  const typeStats = useTaskQuery<{ all: number | null; counts: Record<number, number | null> }>(JSON.stringify([typeFilters, typeDictionary.data]));
  const { run: runTypeStats } = typeStats;
  const typeCounts = typeStats.data?.counts ?? {};
  const typeAllCount = typeStats.data?.all ?? null;
  const fetchTypeCounts = useCallback(() => {
    if (!objectId || tenantId == null || !typeDictionary.data) return;
    void runTypeStats(async () => {
      const [allRes, ...typeResults] = await Promise.allSettled([
        bdTaskApi.queryDetail(typeFilters),
        ...taskTypes.map(t => bdTaskApi.queryDetail({ ...typeFilters, taskType: t.code })),
      ]);
      return { all: readDetailCount(allRes),
        counts: Object.fromEntries(taskTypes.map((t, i) => [t.code, readDetailCount(typeResults[i])])) };
    });
  }, [objectId, tenantId, typeDictionary.data, taskTypes, typeFilters, runTypeStats]);
  useEffect(() => { fetchTypeCounts(); }, [fetchTypeCounts]);
  const typeStatsError = typeDictionary.error || typeStats.error || (!!typeStats.data
    && (typeStats.data.all === null || Object.values(typeCounts).some(count => count === null)));
  const retryTypeStats = () => {
    if (typeDictionary.error) fetchTypeDictionary();
    else fetchTypeCounts();
  };

  useEffect(() => {
    fetchTasks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, contactObjectType, tenantId]);

  // 服务端搜索/排序/筛选参数变化时重新拉取（真实生效，非本地过渡）；与 SubTaskList.tsx 保持一致的联动模式
  useEffect(() => {
    setPage(1);
    fetchTasks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, creatorSearch, sortMode, activePriority, activeStatus, activeType, onlyUnexpired]);

  // 反馈全成功沿用整页刷新；部分失败时只刷新数据，保留失败任务与原因供核对/重试。
  const reloadAfterDelay = useCallback((isCurrent: () => boolean = () => true) => {
    setTimeout(() => {
      if (isCurrent()) window.location.reload();
    }, 1000);
  }, []);

  const feedbackScope = JSON.stringify([objectId, contactObjectType, tenantId, page, pageSize, buildReq(page, pageSize)]);
  const feedbackScopeRef = useRef(feedbackScope);
  feedbackScopeRef.current = feedbackScope;
  const feedbackRequestSeq = useRef(0);
  const invalidateFeedbackRequest = useCallback(() => { feedbackRequestSeq.current++; }, []);
  useEffect(() => {
    invalidateFeedbackRequest();
    setFeedbackTasks([]);
    setFeedbackOutcome(null);
    setFeedbackLoading(false);
    return invalidateFeedbackRequest;
  }, [feedbackScope, invalidateFeedbackRequest]);

  useEffect(() => {
    if (feedbackOutcome?.kind !== 'partial') return;
    const refresh = () => {
      void fetchTasks(page);
      fetchPriorityCounts();
      fetchStatusCounts();
    };
    refresh();
    const timer = window.setTimeout(refresh, 1000);
    return () => window.clearTimeout(timer);
  }, [feedbackOutcome, page, fetchTasks, fetchPriorityCounts, fetchStatusCounts]);

  const openFeedback = (target: BdTaskDto[], type: 'done' | 'failed') => {
    feedbackRequestSeq.current++;
    setFeedbackLoading(false);
    setFeedbackOutcome(null);
    setFeedbackTasks(target);
    setFeedbackType(type);
  };

  const handleConfirm = async (feedbackResult: 1 | 2, remark?: string) => {
    if (feedbackLoading || feedbackOutcome?.kind === 'unknown') return;
    const submittedTasks = flattenRealTasks(feedbackTasks).filter(canFeedback);
    const taskIds = submittedTasks.map(task => task.taskId);
    if (taskIds.length === 0) return;
    const parentTaskIds = new Set(submittedTasks.map(task => task.parentTaskId));
    const context = { taskIds, feedbackResult, parentTaskId: parentTaskIds.size === 1 ? submittedTasks[0].parentTaskId : undefined };
    const reportResult = captureTaskView(context);
    const requestId = ++feedbackRequestSeq.current;
    const isCurrent = () => requestId === feedbackRequestSeq.current && feedbackScopeRef.current === feedbackScope;
    setFeedbackOutcome(null);
    setFeedbackLoading(true);
    try {
      trackTaskAction(feedbackResult === 1 ? 'feedback.submitted_done' : 'feedback.submitted_failed', undefined, context);
      const result = await bdTaskApi.feedback({ taskIds, feedbackResult, remark }).catch(error => {
        if (isCurrent()) reportResult('feedback.result_unknown');
        throw error;
      });
      if (!isCurrent()) return;
      const outcome = resolveFeedbackResult(taskIds, result);
      reportResult(`feedback.result_${outcome.kind}`, outcome.kind === 'unknown' ? undefined : {
        resultCounts: { totalCount: taskIds.length, successCount: outcome.successCount!, failedCount: outcome.failedTaskIds.length },
      });
      setFeedbackOutcome(outcome);
      if (outcome.kind === 'success') {
        message.success(getFeedbackResultMessage(outcome, feedbackResult));
        setFeedbackTasks([]);
        selection.clear();
        reloadAfterDelay(isCurrent);
      } else if (outcome.kind !== 'unknown') {
        setFeedbackTasks(submittedTasks.filter(task => outcome.failedTaskIds.includes(task.taskId)));
        outcome.succeededTaskIds.forEach(id => selection.selectOne(id, false));
      }
    } catch {
      // 网络中断可能发生在后端已写入之后，不能据此直接重复提交。
      if (isCurrent()) {
        setFeedbackOutcome(resolveFeedbackResult(taskIds, undefined));
      }
    } finally {
      if (isCurrent()) setFeedbackLoading(false);
    }
  };

  // 直接使用服务端过滤、排序及聚合结果，分页保持展示行口径。
  const sortedTasks = tasks;

  // 批量选中
  const selection = useTaskSelection(realTasks, isSelectable);
  const clearSelection = selection.clear;
  useEffect(() => {
    clearSelection();
    setPage(1);
    setFeedbackTasks([]);
    setFeedbackOutcome(null);
    setRemoveModal({ visible: false, taskIds: [], loading: false });
  }, [objectId, contactObjectType, clearSelection]);

  // A selection only applies to the currently loaded page and active query scope.
  useEffect(() => {
    clearSelection();
  }, [page, pageSize, searchValue, creatorSearch, sortMode, activePriority, activeStatus, activeType, onlyUnexpired, clearSelection]);

  useTaskAnalyticsView(removeModal.visible, 'task.remove_dialog');

  const handleRemoveClick = useCallback((taskIds: number[]) => {
    setRemoveModal({ visible: true, taskIds, loading: false });
  }, []);

  const removalScopeSequence = useRef(0);
  const invalidateRemovalScope = useCallback(() => { removalScopeSequence.current++; }, []);
  useEffect(() => {
    invalidateRemovalScope();
    return invalidateRemovalScope;
  }, [feedbackScope, invalidateRemovalScope]);

  const handleRemoveConfirm = useCallback(async () => {
    trackTaskAction('task.remove_confirm');
    if (!removeModal.taskIds.length) return;
    const submittedScope = feedbackScope;
    const submittedSequence = removalScopeSequence.current;
    const isCurrent = () => feedbackScopeRef.current === submittedScope
      && removalScopeSequence.current === submittedSequence;
    setRemoveModal(prev => ({ ...prev, loading: true }));
    try {
      const targetTasks = realTasks.filter(t => removeModal.taskIds.includes(t.taskId));
      await batchRemoveAcrossParents(targetTasks);
      if (!isCurrent()) return;
      setRemoveModal({ visible: false, taskIds: [], loading: false });
      clearSelection();
      // 等待索引同步后局部刷新，避免整页重载提前清掉10秒的移除提示。
      window.setTimeout(() => {
        if (!isCurrent()) return;
        setPage(1);
        void fetchTasks(1);
        fetchPriorityCounts();
        fetchStatusCounts();
        fetchTypeCounts();
      }, 1000);
    } catch {
      if (!isCurrent()) return;
      setRemoveModal(prev => ({ ...prev, loading: false }));
    }
  }, [removeModal.taskIds, realTasks, clearSelection, feedbackScope, fetchTasks, fetchPriorityCounts, fetchStatusCounts, fetchTypeCounts]);

  const handleRemoveCancel = useCallback(() => {
    trackTaskAction('task.remove_cancel');
    setRemoveModal({ visible: false, taskIds: [], loading: false });
  }, []);

  const selectedTasks = realTasks.filter(t => selection.selectedIds.includes(t.taskId));
  const hasFeedbackable = selectedTasks.some(canFeedback);
  const hasDeletable = selectedTasks.some(t => t.canDelete);

  // 点击查询：将搜索草稿值（任务名称/创建人）同步为生效值，驱动服务端重新查询，对齐 ParentTaskList.tsx handleSearch 交互
  const handleSearch = () => {
    trackTaskAction('filter.query');
    trackTaskAction('query.submitted');
    setSearchValue(searchDraft.trim());
    setCreatorSearch(creatorSearchDraft.trim());
  };

  // 重置筛选：清空全部草稿值/生效值/统计筛选/排序，恢复初始状态，与 ParentTaskList.tsx handleResetFilters 保持一致
  const handleReset = () => {
    trackTaskAction('filter.reset');
    setActivePriority(null);
    setActiveStatus(null);
    setActiveType(-1);
    setSearchDraft('');
    setSearchValue('');
    setCreatorSearchDraft('');
    setCreatorSearch('');
    setOnlyUnexpired(false);
    setSortMode('createdTime');
  };

  // 默认展示全部；主动启用未过期筛选后允许重置恢复初始范围。
  const hasActiveFilters =
    activePriority != null || activeStatus != null || activeType !== -1 || !!searchValue || !!creatorSearch ||
    sortMode !== 'createdTime' || onlyUnexpired;

  return (
    <div style={{ margin: '0 auto', maxWidth: 1800, padding: '18px 20px 20px' }}>
      {/* 返回按钮与实体详情内部面包屑同一行 */}
      <div style={{ display: 'flex', height: 32, alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => { trackTaskAction('detail.back_button'); navigate('/bd-task/shops'); }}
          title="返回列表"
          style={{
            display: 'flex', height: 32, width: 32, flexShrink: 0,
            alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: `1px solid ${MT.cardBorder}`,
            background: MT.cardBg, color: MT.textMuted, cursor: 'pointer',
          }}
        >
          <ArrowLeftOutlined style={{ fontSize: 14 }} />
        </button>
        <div style={{ width: 1, height: 16, background: MT.cardBorder }} />
        <Breadcrumb
          items={[
            { title: <a onClick={() => { trackTaskAction('detail.breadcrumb'); navigate('/bd-task/shops'); }} style={{ cursor: 'pointer' }}>任务项列表</a> },
            { title: <span style={{ color: MT.textPrimary }}>{shopName}</span> },
          ]}
        />
      </div>

      {/* 商家信息头：【全面排查修复】布局/信息结构统一对齐商家列表页卡片 ShopCard.tsx（Logo + 标题行[商家名+ID+
          TAG类画像字段+体验分] + 信息行[跟进人+TEXT类画像字段]），与用户确认后不再展示「关联任务数」（列表页
          卡片本期已隐藏该字段，两处保持完全一致）、不展示任务概览（本页已是该商家的任务列表，无需重复）；
          商家名字号保留 20px（详情页作为主标题适当放大，与列表页 15px 的区别是合理的信息层级差异），
          右侧按钮保留默认尺寸（详情页突出主操作），其余间距/结构与列表页卡片对齐 */}
      {isShop ? (
      <div style={{
        background: MT.cardBg,
        borderRadius: MT.cardRadius,
        border: '1px solid transparent',
        boxShadow: MT.cardShadow,
        padding: '20px 24px',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {shopCardData.logo ? (
            <Avatar shape="square" size={SHOP_DETAIL_HEADER_AVATAR_SIZE} src={shopCardData.logo} style={{ borderRadius: MT.cardRadiusSmall, flexShrink: 0 }} />
          ) : (
            <Avatar
              shape="square"
              size={SHOP_DETAIL_HEADER_AVATAR_SIZE}
              icon={<ShopOutlined />}
              style={{
                background: `linear-gradient(135deg, ${MT.brandPrimaryLight}, #F5F5F7)`,
                color: MT.brandPrimary,
                borderRadius: MT.cardRadiusSmall,
                flexShrink: 0,
              }}
            />
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            {/* 标题行：商家名 + ID + 全部标签类（TAG）画像字段 + 体验分，与列表页卡片 ShopCard.tsx 标题行
                结构完全一致（此前本处缺失 TAG 类画像字段，现补齐） */}
            <CardTitleRow
              title={<span style={{ fontSize: 20, fontWeight: 600, color: MT.textPrimary }}>{shopName}</span>}
              id={shopIdNum}
              idFontSize={SHOP_DETAIL_HEADER_META_FONT_SIZE}
              tags={hasHeaderTitleTags ? (
                <>
                {tagFields.length > 0 && <ProfileFields fields={tagFields} size="small" gap={8} />}
                {deliveryLabel && (
                  <Tag bordered={false} style={{ ...MT_FILLED_TAG_STYLE, background: MT.pageBg, color: MT.textMuted }}>
                    {deliveryLabel}
                  </Tag>
                )}
                {experienceScoreValue !== undefined && experienceScoreValue !== '' && (
                  <Tag bordered={false} style={{ ...MT_FILLED_TAG_STYLE, background: MT.pageBg, color: MT.textMuted }}>
                    体验分 {experienceScoreValue}
                  </Tag>
                )}
                </>
              ) : undefined}
            />

            {/* 信息行：跟进人 + 文本类（TEXT）画像字段（经营地址等），同一行展示，与列表页卡片 ShopCard.tsx
                信息行结构完全一致；不再展示「关联任务数」，与列表页卡片保持一致。
                【走查修复】字段展示文案统一为「跟进人」，此前为「责任人」，与全站其余展示跟进人的位置口径不一致；
                【走查修复·二次】icon 与文本高度不对齐根因是 Text 默认行高远大于图标行盒高度，仅靠 inline-flex
                包裹不足以消除偏差，改用 lineHeight:1 + verticalAlign:middle 彻底对齐（与 ShopCard.tsx 同步修复） */}
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', fontSize: SHOP_DETAIL_HEADER_META_FONT_SIZE, lineHeight: 1, color: MT.textMuted }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, lineHeight: 1 }}>
                <UserOutlined style={{ fontSize: SHOP_DETAIL_HEADER_META_FONT_SIZE, verticalAlign: 'middle' }} />
                <span style={{ lineHeight: 1 }}>
                  跟进人：<PersonName name={shopCardData.executorName} mis={shopCardData.executorMis} />
                </span>
              </span>
              {textFields.length > 0 && (
                <ProfileFields
                  fields={textFields}
                  size="default"
                  fontSize={SHOP_DETAIL_HEADER_META_FONT_SIZE}
                  textColor={MT.textMuted}
                />
              )}
            </div>
          </div>

        </div>
      </div>
      ) : (
        <>
        {profileError && <Alert type="error" showIcon message={profileError} style={{ marginBottom: 12 }} action={<Button onClick={() => { trackTaskAction('retry.entity_profile'); setProfileRetryKey(previous => previous + 1); }}>重试</Button>} />}
        <EntityProfileHeader
          entity={{
            ...(location.state as any)?.entity,
            ...entityProfile,
            objectId,
            objectName: entityProfile?.objectName ?? (location.state as any)?.entityName ?? (isIndustryShop ? undefined : realTasks[0]?.objectName),
            outerId: isIndustryShop ? objectId : undefined,
            executorMis: entityProfile?.executorMis ?? realTasks[0]?.bdId ?? (location.state as any)?.entity?.executorMis,
            executorName: entityProfile?.executorName ?? realTasks[0]?.bdName ?? (location.state as any)?.entity?.executorName,
            taskCount: entityProfile?.taskCount ?? (location.state as any)?.taskCount,
          }}
          contactObjectType={contactObjectType}
          detail
        />
        </>
      )}

      {/* 筛选区复用任务列表详情页的公共卡片骨架；仅传入商家详情页原有筛选状态与查询参数。 */}
      <TaskFilterBar
        cardStyle={{ paddingTop: 9 }}
        stats={[]}
        activeStatKey={null}
        onStatClick={() => undefined}
        statsContent={(
          <>
            <TypeStatGroup
              allCount={typeAllCount}
              activeCode={activeType}
              onChange={code => setActiveType(prev => (prev === code ? -1 : code))}
              options={taskTypes.map(t => ({ code: t.code, label: getTaskTypeName(t.code, t.name), count: typeCounts[t.code] ?? null }))}
            />
            <StatGroupStack rowGap={12}>
              <StatGroup icon={<BarChartOutlined />} title="优先级">
                {[0, 1, 2, 3].map(p => (
                  <StatCard
                    key={p}
                    count={priorityCounts[p] ?? '—'}
                    showCount={false}
                    disabled={priorityCounts[p] === 0 && activePriority !== p}
                    label={PRIORITY_CONFIG[p].label}
                    icon={PRIORITY_CONFIG[p].icon}
                    active={activePriority === p}
                    color={MT.brandPrimary}
                    onClick={() => { trackTaskAction('filter.priority'); setActivePriority(prev => (prev === p ? null : p)); }}
                  />
                ))}
              </StatGroup>
              <StatGroup icon={<UnorderedListOutlined />} title="任务项状态">
                {STATUS_STAT_CONFIG.map(s => (
                  <StatCard
                    key={s.key}
                    count={statusCounts[s.key] ?? '—'}
                    showCount={false}
                    disabled={statusCounts[s.key] === 0 && activeStatus !== s.key}
                    label={s.label}
                    icon={s.icon}
                    active={activeStatus === s.key}
                    color={MT.brandPrimary}
                    onClick={() => { trackTaskAction('filter.status'); setActiveStatus(prev => (prev === s.key ? null : s.key)); }}
                  />
                ))}
              </StatGroup>
            </StatGroupStack>
            <TaskStatsNotice loading={false} error={typeStatsError} onRetry={() => { trackTaskAction('retry.type_stats'); retryTypeStats(); }} />
            <TaskStatsNotice loading={false} error={priorityStatsError} onRetry={() => { trackTaskAction('retry.priority_stats'); fetchPriorityCounts(); }} />
            <TaskStatsNotice loading={false} error={statusStats.error} onRetry={() => { trackTaskAction('retry.status_stats'); fetchStatusCounts(); }} />
          </>
        )}
        extra={(
          <>
            <FilterFieldLabel label="所属任务批次">
              <Input
                placeholder="输入所属任务批次关键词"
                value={searchDraft}
                onChange={e => setSearchDraft(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                style={{ width: '100%', minWidth: 200 }}
              />
            </FilterFieldLabel>
            <FilterFieldLabel label="任务批次创建人">
              <Input
                placeholder="输入完整创建人 mis"
                value={creatorSearchDraft}
                onChange={e => setCreatorSearchDraft(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                style={{ width: '100%', minWidth: 180 }}
              />
            </FilterFieldLabel>
          </>
        )}
        resultCountLabel={(
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1 }}>
            <ProfileOutlined style={{ fontSize: 13 }} />
            <span>共 {total} 个任务批次</span>
          </span>
        )}
        onSearch={handleSearch}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
        resetLabel="重置"
      />

      {/* 列表区：独立卡片，包含全选 + 任务项列表 */}
      <div style={{
        background: MT.cardBg,
        borderRadius: MT.cardRadius,
        border: '1px solid transparent',
        boxShadow: MT.cardShadow,
        padding: '16px 16px 8px',
      }}>
        {(!isShop || realTasks.some(isSelectable)) && (
          <div style={{ display: 'flex', minHeight: 24, alignItems: 'center', gap: 20, marginBottom: 12, padding: '0 4px' }}>
            {realTasks.some(isSelectable) && <Checkbox
              checked={selection.allSelected}
              indeterminate={selection.selectedIds.length > 0 && !selection.allSelected}
              onChange={e => { trackTaskAction('selection.page_all'); selection.selectAll(e.target.checked); }}
            >
              全选当前页
            </Checkbox>}
            {selection.selectedIds.length === 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flexShrink: 0, fontSize: 13, color: '#595959' }}>排序方式</span>
                  <SortTabs value={sortMode} onChange={value => { trackTaskAction('list.sort'); setSortMode(value); }} />
                </div>
                <label style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', fontSize: 13, color: '#595959', gap: 10 }}>
                  仅看未过期任务
                  <Switch size="small" checked={onlyUnexpired} onChange={value => { trackTaskAction('list.unexpired'); setOnlyUnexpired(value); }} />
                </label>
              </>
            ) : (
              <BatchToolbar
                count={selection.selectedIds.length}
                actions={[
                  {
                    key: 'done',
                    label: '确认完成',
                    color: MT.textPrimary,
                    disabled: !hasFeedbackable,
                    onClick: () => {
                      const target = selectedTasks.filter(canFeedback);
                      if (target.length === 0) return;
                      trackTaskAction('feedback.done_selected');
                    openFeedback(target, 'done');
                    },
                  },
                  {
                    key: 'failed',
                    label: '无法完成',
                    color: MT.textPrimary,
                    disabled: !hasFeedbackable,
                    onClick: () => {
                      const target = selectedTasks.filter(canFeedback);
                      if (target.length === 0) return;
                      trackTaskAction('feedback.failed_selected');
                    openFeedback(target, 'failed');
                    },
                  },
                  {
                    key: 'remove',
                    label: '删除',
                    danger: true,
                    disabled: !hasDeletable,
                    onClick: () => { trackTaskAction('task.remove_selected'); handleRemoveClick(selectedTasks.filter(t => t.canDelete).map(t => t.taskId)); },
                  },
                ]}
              />
            )}
          </div>
        )}

        <Spin spinning={loading}>
          {listError && !isShop ? (
            <Alert type="error" showIcon message={listError} action={<Button onClick={() => { trackTaskAction('retry.task_list'); fetchTasks(page, pageSize); }}>重试</Button>} />
          ) : sortedTasks.length === 0 && !loading ? (
            <Empty description={isShop ? '该商家暂无任务' : '该主体暂无任务'} style={{ padding: '60px 0' }} />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <MixedTaskList
                  tasks={sortedTasks}
                  parentTaskMap={parentTaskMap}
                  taskTypeNameMap={taskTypeNameMap}
                  isShop={isShop}
                  selectedIds={selection.selectedIds}
                  onSelect={selection.selectOne}
                  onFeedback={openFeedback}
                  onRemove={target => handleRemoveClick(target.filter(t => t.canDelete).map(t => t.taskId))}
                  onExecute={task => {
                    trackTaskAction(task.skuTaskAggregation ? 'execution.open_group' : 'execution.open_one');
                    const targetTasks = task.skuTaskAggregation
                      ? flattenRealTasks([task]).filter(canStartExecution) : [task];
                    openExecutionForObjects(collectTaskExecutionObjectIds(targetTasks),
                      task.contactObjectType ?? parentTaskMap[task.parentTaskId]?.contactObjectType, targetTasks, !!task.skuTaskAggregation);
                  }}
                  isExecutionHidden={task => isSingleExecutionHidden(task.contactObjectType ?? parentTaskMap[task.parentTaskId]?.contactObjectType)}
                  getExecutionDisabledReason={task => getSingleExecutionDisabledReason(task.contactObjectType ?? parentTaskMap[task.parentTaskId]?.contactObjectType)}
                />
              </div>
              {total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 4px 16px' }}>
                  <Pagination current={page} pageSize={pageSize} total={total}
                    onChange={(p, ps) => { trackTaskAction('list.page'); setPage(p); setPageSize(ps); fetchTasks(p, ps); }}
                    showTotal={t => `共 ${t} 条`} showQuickJumper showSizeChanger size="small" />
                </div>
              )}
            </>
          )}
        </Spin>
      </div>

      <FeedbackModal
        open={feedbackTasks.length > 0}
        type={feedbackType}
        tasks={feedbackTasks}
        loading={feedbackLoading}
        resultNotice={feedbackOutcome && feedbackOutcome.kind !== 'success' ? (
          <Alert
            showIcon
            type={feedbackOutcome.kind === 'failed' ? 'error' : 'warning'}
            message={getFeedbackResultMessage(feedbackOutcome, feedbackType === 'done' ? 1 : 2)}
            description={`任务 ID：${feedbackTasks.map(task => task.taskId).join('、')}`}
          />
        ) : undefined}
        confirmDisabled={feedbackOutcome?.kind === 'unknown'}
        onConfirm={handleConfirm}
        onCancel={() => {
          feedbackRequestSeq.current++;
          setFeedbackTasks([]);
          setFeedbackOutcome(null);
          setFeedbackLoading(false);
        }}
      />

      {/* 批量移除二次确认弹窗 */}
      <Modal
        open={removeModal.visible}
        title={null}
        footer={null}
        onCancel={handleRemoveCancel}
        centered
        width={420}
      >
        <div style={{ padding: '24px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <ExclamationCircleOutlined style={{ fontSize: 40, color: MT.warning }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: MT.textPrimary, textAlign: 'center' }}>
            {removeModal.taskIds.length === 1 ? '确认移除该任务项？' : `确认移除选中的 ${removeModal.taskIds.length} 个任务项？`}
          </div>
          <div style={{ fontSize: 13, color: MT.textMuted, textAlign: 'center' }}>
            移除后不可恢复
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16 }}>
          <Button onClick={handleRemoveCancel}>取消</Button>
          <Button
            type="primary"
            danger
            loading={removeModal.loading}
            onClick={handleRemoveConfirm}
          >
            确认
          </Button>
        </div>
      </Modal>

      <ShopExecutionDrawer
        communicationParentTask={parentTaskMap[executionParentTaskId ?? 0]}
        batchExecution={batchExecution}
        executionTaskIds={executionTaskIds}
        {...ordinaryScope}
        conditionTask={conditionTask}
        showUnsupportedBatchAbilities={batchExecution}
        recommendationContext={executionTaskId == null ? undefined : batchExecution
          ? { parentTaskId: executionParentTaskId! }
          : { taskId: executionTaskId }}
        contactObjectType={executionObjectType}
        open={!!executeShopIds}
        shopIds={executeShopIds ?? []}
        onSuccess={() => { fetchTasks(page); fetchPriorityCounts(); fetchStatusCounts(); }}
        onClose={() => setExecuteShopIds(null)}
      />
    </div>
  );
};

export default EntityTaskListPage;
