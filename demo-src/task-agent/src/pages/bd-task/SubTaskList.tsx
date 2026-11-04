import { resolveParentDeleteResult } from './utils/parentDeleteResult';
import { useTaskAnalyticsView } from '@/lib/useTaskAnalyticsView';
import { trackTaskAction, captureTaskView } from '@/lib/taskAnalytics';
import { formatParentGoal } from './utils/parentGoal';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button, Spin, Empty, Pagination, message, Modal, Input, Checkbox, Breadcrumb, Tag, Progress, Alert } from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  BellOutlined,
  RobotOutlined,
  RocketOutlined,
  UnorderedListOutlined,
  UserOutlined,
  FileTextOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { bdTaskApi } from '@/services/bdTaskApi';
import type { BdTaskDto, ParentTaskOverviewDto, TaskStatusStatsReq, TaskStatusStatsDto, PageDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import { FeedbackModal, canFeedback, canStartExecution, STATUS_STAT_CONFIG, statusTag } from './components/taskHelpers';
import { flattenRealTasks } from './utils/entityIdentity';
import { getFeedbackResultMessage, resolveFeedbackResult, FeedbackOutcome } from './utils/feedbackResult';
import { isValidNumericIdSearch } from './utils/numericIdSearch';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import EntityFilterFields, { EntityFilterValue } from './components/EntityFilterFields';
import SubTaskViewSwitch from './subtask-views/SubTaskViewSwitch';
import { TaskEditDropdownButton, TaskTitleBadges } from './components/TaskCard';
import CardTitleRow from './components/CardTitleRow';
import TaskFilterBar from './components/TaskFilterBar';
import BatchToolbar from './components/BatchToolbar';
import ShopExecutionDrawer from './components/ShopExecutionDrawer';
import { useExecutionAvailability } from '@/components/shop-execution/useExecutionAvailability';
import { executableTaskScope } from '@/components/shop-execution/executionScope';
import { collectTaskExecutionObjectIds } from '@/components/shop-execution/taskObjectIds';
import EditParentTaskModal from './components/EditParentTaskModal';
import ParentGoalNotice from './components/ParentGoalNotice';
import XiamiTaskDrawer from './components/XiamiTaskDrawer';
import ShopProfileFilterFields, { ShopProfileFilterValue } from './components/ShopProfileFilterFields';
import FilterFieldLabel from './components/FilterFieldLabel';
import PersonName from './components/PersonName';
import { useXiamiTaskDrawer } from './hooks/useXiamiTaskDrawer';
import { useTaskSelection, isSelectable } from './hooks/useTaskSelection';
import { useShopFilterOptions } from './hooks/useShopFilterOptions';
import { useTenantStore } from '@/stores/tenantStore';
import { useTaskTypeDictionary } from './hooks/useTaskTypeDictionary';
import { useTaskQuery } from './hooks/useTaskQuery';
import { useParentTaskOverview } from './hooks/useParentTaskOverview';
import { TaskCheckFields } from './components/EntityTaskRow';
import TaskStatsNotice from './components/TaskStatsNotice';
import { MT, MT_FILLED_TAG_STYLE } from './theme';

const TASK_DETAIL_HEADER_META_FONT_SIZE = 13;

/** 按 parentTaskId 分组后循环调用 deleteSubTasks；本页面场景下所有任务项天然属于同一 parentTaskId，分组结果恒为 1 组 */
async function batchRemoveAcrossParents(tasks: BdTaskDto[]) {
  const grouped = new Map<number, number[]>();
  tasks.filter(t => Number.isFinite(t.taskId) && t.taskId > 0 && t.canDelete && !t.skuTaskAggregation).forEach(t => {
    const list = grouped.get(t.parentTaskId) ?? [];
    if (!list.includes(t.taskId)) list.push(t.taskId);
    grouped.set(t.parentTaskId, list);
  });
  if (grouped.size === 0) return;
  const entries = Array.from(grouped.entries());
  const results = await Promise.allSettled(
    entries.flatMap(([parentTaskId, taskIds]) => Array.from({ length: Math.ceil(taskIds.length / 100) }, (_, index) => bdTaskApi.deleteSubTasks({ parentTaskId, taskIds: taskIds.slice(index * 100, (index + 1) * 100) }))),
  );
  const failed = results.filter(r => r.status === 'rejected').length;
  const success = results.length - failed;
  if (failed === 0) message.success('移除成功', 10);
  else message.warning(`成功移除 ${success} 组，${failed} 组移除失败，请重试`, 10);
}

const SubTaskList: React.FC = () => {
  const navigate = useNavigate();
  const { parentTaskId } = useParams<{ parentTaskId: string }>();
  const tenantId = useTenantStore(state => state.currentTenantId);
  const parentId = Number(parentTaskId);
  const validParentId = Number.isSafeInteger(parentId) && parentId > 0;
  const { parentTask, status: parentStatus, refreshParentTask, updateParentTask } = useParentTaskOverview(parentId, tenantId);
  const parentReady = parentStatus === 'ready';
  const { taskTypes, taskTypeNameMap, getTaskTypeName } = useTaskTypeDictionary();

  // 门店类型自动切换筛选字段集：同一任务批次下全部任务项门店类型唯一（后端技术方案 §3.5 ParentTaskOverviewDto.contactObjectType 已透出）
  const isWdcParentTask = parentTask?.contactObjectType === CONTACT_OBJECT_TYPE.WDC_SHOP;
  // 批量与全部执行均展示完整能力目录，非批量能力在执行面板中置灰。
  const { getExecutionDisabledReason: getSingleExecutionDisabledReason, isExecutionHidden: isSingleExecutionHidden } = useExecutionAvailability([parentTask?.contactObjectType], false);
  const executeDisabledReason = getSingleExecutionDisabledReason(parentTask?.contactObjectType);
  const executionHidden = isSingleExecutionHidden(parentTask?.contactObjectType);

  const objectMeta = getObjectTypeMeta(parentTask?.contactObjectType);
  const isShopParentTask = parentReady && objectMeta?.displayType === 'shop';
  const isSkuParentTask = parentTask?.contactObjectType === CONTACT_OBJECT_TYPE.SKU || parentTask?.contactObjectType === CONTACT_OBJECT_TYPE.PHF_SKU;
  const isIndustryParentTask = objectMeta?.listTab === 'industry_shop';
  const [entityFilterDraft, setEntityFilterDraft] = useState<EntityFilterValue>({});
  const [entityFilter, setEntityFilter] = useState<EntityFilterValue>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [feedbackTasks, setFeedbackTasks] = useState<BdTaskDto[]>([]);
  const [feedbackType, setFeedbackType] = useState<'done' | 'failed'>('done');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackOutcome, setFeedbackOutcome] = useState<FeedbackOutcome | null>(null);
  // 虾蜜任务抽屉：承接头部「修改」菜单中的「修改任务项」
  const xiami = useXiamiTaskDrawer();
  const [executionTarget, setExecutionTarget] = useState<
    { parentTaskId: number; batchExecution: true } | { shopIds: (number | string)[]; executionTaskIds: number[]; ordinaryTaskIds: number[]; ordinaryShopIds: string[]; conditionTask?: BdTaskDto; batchExecution: boolean; recommendationContext: { parentTaskId: number } | { taskId: number } } | null
  >(null);
  const [editingParentTask, setEditingParentTask] = useState(false);
  useEffect(() => { setEditingParentTask(false); }, [tenantId, parentId]);

  // 状态筛选（真实服务端筛选，BdTaskDetailReq 已支持 status 参数）+ 各状态真实计数
  const [activeStatus, setActiveStatus] = useState<number | null>(null);

  // 真实服务端参数搜索：跟进人 bdId、门店ID shopId、门店名称 shopName、经营地址 address
  // 后端技术方案 §3.12：address 为本次新增的真实服务端参数（依赖 §3.7 写入 ES 后生效）
  // 全部改为「草稿值 + 查询按钮」两套状态，对齐 NoCode TaskDetailPage handleSearch 交互：
  // 草稿值受控绑定输入框、随时可改不会立即生效；点击「查询」按钮或回车后统一同步进生效值，才会真正触发服务端请求
  // TC-110：不加任务名称搜索框——详情页下全部任务项本就同属一个任务批次，任务批次批次名称全页唯一，搜它无实际意义
  // 【回归修复2】按用户要求移除「创建人」搜索框（详情页场景下按创建人筛选任务项意义不大，与商家列表页保留创建人搜索的定位不同）
  // 移除此前的「按优先级/按截止时间」排序——任务项本身无独立 priority 字段（BdTaskDto 未定义该字段，
  // 此前排序请求传的 field:'priority' 后端 ES 侧并无对应字段），且同一任务批次下全部任务项的 expireDate
  // 均继承自任务批次、取值完全相同，按截止时间排序不产生任何实际排序效果，属于历史遗留的无意义功能，一并移除
  const [bdIdSearchDraft, setBdIdSearchDraft] = useState('');
  const [bdIdSearch, setBdIdSearch] = useState('');
  const [shopIdSearchDraft, setShopIdSearchDraft] = useState('');
  const [shopIdSearch, setShopIdSearch] = useState('');
  const [shopNameSearchDraft, setShopNameSearchDraft] = useState('');
  const [shopNameSearch, setShopNameSearch] = useState('');
  const [addressSearchDraft, setAddressSearchDraft] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  // 商家画像筛选：营业状态/上单状态/配送方式/认领上单状态/门店品类/商家标签/体验分区间，
  // 【回归修复2】改为「草稿值 + 查询按钮」两套状态，与其余搜索框统一由同一个查询/重置按钮驱动生效，
  // 不再是此前的「选中即生效」（与用户要求「所有筛选统一放一个区域、统一查询/重置按钮控制」对齐）
  const [profileFilterDraft, setProfileFilterDraft] = useState<ShopProfileFilterValue>({});
  const [profileFilter, setProfileFilter] = useState<ShopProfileFilterValue>({});
  const { options: filterOptions, loading: filterOptionsLoading } = useShopFilterOptions(
    isIndustryParentTask ? CONTACT_OBJECT_TYPE.TS_POI : isWdcParentTask ? CONTACT_OBJECT_TYPE.WDC_SHOP : CONTACT_OBJECT_TYPE.WM_SHOP,
  );

  // 移除确认弹窗
  const [removeModal, setRemoveModal] = useState<{ visible: boolean; taskIds: number[]; loading: boolean }>(
    { visible: false, taskIds: [], loading: false },
  );

  // 顶部“删除”按钮（删除整个任务批次）二次确认弹窗，与列表页一致真实调用 deleteParentTask
  const [deleteParentModal, setDeleteParentModal] = useState<{ visible: boolean; loading: boolean }>(
    { visible: false, loading: false },
  );

  const filters = useMemo<Omit<TaskStatusStatsReq, 'statsFields'>>(() => {
    const req: Omit<TaskStatusStatsReq, 'statsFields'> = { parentTaskId: parentId, tenantId: tenantId ?? undefined };
    if (!parentReady) return req;
    if (!isShopParentTask) {
      req.contactObjectType = parentTask?.contactObjectType;
      ['objectId', 'objectName', 'shopName', 'bdId', 'tsPoiId', 'creatorId', 'parentTaskName'].forEach(key => {
        const value = entityFilter[key as keyof EntityFilterValue];
        if (typeof value === 'string' && value.trim()) req[key] = value.trim();
      });
      if (entityFilter.shopId && /^\d+$/.test(entityFilter.shopId.trim())) req.shopId = Number(entityFilter.shopId.trim());
      if (isIndustryParentTask) {
        if (entityFilter.tsPoiName?.trim()) req.tsPoiName = entityFilter.tsPoiName.trim();
        if (entityFilter.address?.trim()) req.address = entityFilter.address.trim();
        if (entityFilter.matchTypes?.length) req.matchTypes = entityFilter.matchTypes;
      }
      if (isSkuParentTask) {
        if (entityFilter.address?.trim()) req.address = entityFilter.address.trim();
        if (profileFilter.businessStatus?.length) req.businessStatus = profileFilter.businessStatus;
        if (profileFilter.onlineStatus?.length) req.onlineStatus = profileFilter.onlineStatus;
        if (profileFilter.deliveryType?.length) req.deliveryType = profileFilter.deliveryType;
        if (profileFilter.claimStatus?.length) req.claimStatus = profileFilter.claimStatus;
        if (profileFilter.categoryId?.length) req.categoryId = profileFilter.categoryId;
        if (profileFilter.poiTags?.length) req.poiTags = profileFilter.poiTags;
        if (profileFilter.experienceScoreFrom != null) req.experienceScoreFrom = profileFilter.experienceScoreFrom;
        if (profileFilter.experienceScoreTo != null) req.experienceScoreTo = profileFilter.experienceScoreTo;
      }
      return req;
    }
    if (bdIdSearch.trim()) req.bdId = bdIdSearch.trim();
    if (shopIdSearch.trim() && /^\d+$/.test(shopIdSearch.trim())) req.shopId = Number(shopIdSearch.trim());
    if (shopNameSearch.trim()) req.shopName = shopNameSearch.trim();
    if (addressSearch.trim()) req.address = addressSearch.trim();
    if (profileFilter.businessStatus?.length) req.businessStatus = profileFilter.businessStatus;
    if (profileFilter.onlineStatus?.length) req.onlineStatus = profileFilter.onlineStatus;
    if (profileFilter.deliveryType?.length) req.deliveryType = profileFilter.deliveryType;
    if (profileFilter.claimStatus?.length) req.claimStatus = profileFilter.claimStatus;
    if (profileFilter.categoryId?.length) req.categoryId = profileFilter.categoryId;
    if (profileFilter.poiTags?.length) req.poiTags = profileFilter.poiTags;
    if (profileFilter.experienceScoreFrom != null) req.experienceScoreFrom = profileFilter.experienceScoreFrom;
    if (profileFilter.experienceScoreTo != null) req.experienceScoreTo = profileFilter.experienceScoreTo;
    return req;
  }, [tenantId, parentId, parentReady, bdIdSearch, shopIdSearch, shopNameSearch, addressSearch, profileFilter, entityFilter, isShopParentTask, isSkuParentTask, isIndustryParentTask, parentTask?.contactObjectType]);

  const effectiveStatus = parentReady ? activeStatus : null;
  const filterKey = JSON.stringify({ ...filters, status: effectiveStatus ?? undefined });
  const list = useTaskQuery<PageDto<BdTaskDto>>(filterKey);
  const stats = useTaskQuery<TaskStatusStatsDto>(JSON.stringify(filters));
  const { run: runList } = list;
  const { run: runStats } = stats;
  const tasks = useMemo(() => list.data?.data ?? [], [list.data]);
  const total = list.data?.total ?? 0;
  const loading = list.loading && validParentId && tenantId != null;
  const loadError = list.error;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;
  const fetchTasks = useCallback((p: number, ps?: number) => {
    if (!Number.isSafeInteger(parentId) || parentId <= 0 || tenantId == null) return;
    void runList(() => bdTaskApi.queryDetail({ ...filters, ...(effectiveStatus != null ? { status: effectiveStatus } : {}), page: p, pageSize: ps ?? pageSizeRef.current }));
  }, [filters, effectiveStatus, parentId, tenantId, runList]);
  const fetchStats = useCallback(() => {
    if (!parentReady || !Number.isSafeInteger(parentId) || parentId <= 0 || tenantId == null) return;
    void runStats(async () => {
      const codes = STATUS_STAT_CONFIG.map(status => status.key);
      const result = await bdTaskApi.queryTaskStatusStats({ ...filters, statsFields: [{ field: 'status', codes }] });
      const items = result?.statusStats?.items;
      if (!Number.isSafeInteger(result?.totalCount) || result.totalCount < 0 || !Array.isArray(items)
        || items.length !== codes.length || new Set(items.map(item => item?.code)).size !== codes.length
        || items.some(item => !item || !codes.includes(item.code) || !Number.isSafeInteger(item.count) || item.count < 0)) {
        throw new Error('任务状态统计数据不完整');
      }
      return result;
    });
  }, [filters, parentId, parentReady, tenantId, runStats]);
  const statusCounts = Object.fromEntries(stats.data?.statusStats?.items.map(item => [item.code, item.count]) ?? []);

  // 全成功沿用整页刷新；部分失败保留弹窗，避免失败任务和原因丢失。
  const reloadAfterDelay = useCallback((isCurrent: () => boolean = () => true) => {
    setTimeout(() => {
      if (isCurrent()) window.location.reload();
    }, 1000);
  }, []);

  const feedbackScope = JSON.stringify([tenantId, parentId, page, pageSize, filterKey]);
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
    const refresh = () => { fetchTasks(page); fetchStats(); };
    refresh();
    const timer = window.setTimeout(refresh, 1000);
    return () => window.clearTimeout(timer);
  }, [feedbackOutcome, page, fetchTasks, fetchStats]);

  const openFeedback = (target: BdTaskDto[], type: 'done' | 'failed') => {
    if (!parentReady) return;
    invalidateFeedbackRequest();
    setFeedbackLoading(false);
    setFeedbackOutcome(null);
    setFeedbackTasks(target);
    setFeedbackType(type);
  };

  useEffect(() => {
    setPage(1);
    fetchTasks(1);
  }, [fetchTasks]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // 点击查询：将所有草稿值（含商家画像筛选草稿）一次性同步为生效值，统一触发一次真实服务端请求，
  // 对齐 NoCode handleSearch 交互，也是用户要求「所有筛选统一用一个查询按钮控制」的落地方式
  const handleSearch = () => {
    trackTaskAction('filter.query');
    if (!parentReady) return;
    const shopIdDraft = isShopParentTask ? shopIdSearchDraft : isSkuParentTask ? entityFilterDraft.shopId : undefined;
    if (!isValidNumericIdSearch(shopIdDraft)) {
      message.warning('请输入有效的门店 ID（纯数字）');
      return;
    }
    trackTaskAction('query.submitted');
    setBdIdSearch(bdIdSearchDraft.trim());
    setShopIdSearch(shopIdSearchDraft.trim());
    setShopNameSearch(shopNameSearchDraft.trim());
    setAddressSearch(addressSearchDraft.trim());
    setProfileFilter(profileFilterDraft);
    setEntityFilter(entityFilterDraft);
  };

  // 重置筛选：同时清空全部草稿值与生效值，并恢复状态筛选/商家画像筛选为初始态，才是真正的全局重置
  const handleResetFilters = () => {
    trackTaskAction('filter.reset');
    setActiveStatus(null);
    setEntityFilterDraft({}); setEntityFilter({});
    setBdIdSearchDraft(''); setBdIdSearch('');
    setShopIdSearchDraft(''); setShopIdSearch('');
    setShopNameSearchDraft(''); setShopNameSearch('');
    setAddressSearchDraft(''); setAddressSearch('');
    setProfileFilterDraft({}); setProfileFilter({});
  };

  // 是否存在任一生效中的筛选/搜索条件，用于控制「重置筛选」按钮可用态
  const hasActiveFilters =
    activeStatus != null || Object.values(entityFilter).some(value => Array.isArray(value) ? value.length > 0 : value != null && value !== '') ||
    !!bdIdSearch || !!shopIdSearch || !!shopNameSearch || !!addressSearch ||
    Object.values(profileFilter).some(v => (Array.isArray(v) ? v.length > 0 : v != null));

  const handleConfirm = async (feedbackResult: 1 | 2, remark?: string) => {
    if (!parentReady || feedbackLoading || feedbackOutcome?.kind === 'unknown') return;
    const submittedTasks = flattenRealTasks(feedbackTasks).filter(canFeedback);
    const taskIds = submittedTasks.map(task => task.taskId);
    if (taskIds.length === 0) return;
    const context = { taskIds, feedbackResult };
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
      // 网络中断时无法断定后端是否已写入，先核对状态，避免重复提交。
      if (isCurrent()) {
        setFeedbackOutcome(resolveFeedbackResult(taskIds, undefined));
      }
    } finally {
      if (isCurrent()) setFeedbackLoading(false);
    }
  };

  // 详情 DTO 尚无 wdcId，仅补这一关联字段；名称、地址等始终使用本次详情返回值。
  const industrySubjectIdsKey = JSON.stringify(isIndustryParentTask ? Array.from(new Set(tasks.map(task =>
    parentTask?.contactObjectType === CONTACT_OBJECT_TYPE.TS_SKU ? task.tsPoiId : task.objectId,
  ).filter((id): id is string => typeof id === 'string' && id.length > 0))) : []);
  const industrySubjectScope = JSON.stringify([tenantId, parentId, industrySubjectIdsKey]);
  const [industryWdcIds, setIndustryWdcIds] = useState<{ scope: string; tasks: BdTaskDto[]; values: Record<string, number> }>({ scope: '', tasks: [], values: {} });
  useEffect(() => {
    let cancelled = false;
    if (!isIndustryParentTask || tenantId == null) return;
    const ids = JSON.parse(industrySubjectIdsKey) as string[];
    if (!ids.length) return;
    Promise.allSettled(ids.map(id => bdTaskApi.queryShopDimensionList({
      tenantId, tab: 4, tsPoiId: id, parentTaskId: parentId, page: 1, pageSize: 1,
    }).then(result => result?.data?.find(item => item.outerId === id)?.wdcId))).then(results => {
      if (cancelled) return;
      const values: Record<string, number> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && typeof result.value === 'number' && Number.isFinite(result.value) && result.value > 0) {
          values[ids[index]] = result.value;
        }
      });
      setIndustryWdcIds({ scope: industrySubjectScope, tasks, values });
    });
    return () => { cancelled = true; };
  }, [isIndustryParentTask, tenantId, parentId, industrySubjectIdsKey, industrySubjectScope, tasks]);
  const sortedTasks = useMemo(() => {
    if (!isIndustryParentTask || industryWdcIds.scope !== industrySubjectScope || industryWdcIds.tasks !== tasks) return tasks;
    return tasks.map(task => {
      const id = parentTask?.contactObjectType === CONTACT_OBJECT_TYPE.TS_SKU ? task.tsPoiId : task.objectId;
      const industryWdcId = id ? industryWdcIds.values[id] : undefined;
      return industryWdcId != null ? { ...task, industryWdcId } : task;
    });
  }, [tasks, isIndustryParentTask, parentTask?.contactObjectType, industryWdcIds, industrySubjectScope]);

  // 批量选中：复选框展示条件统一为 canDelete || canFeedback
  const realTasks = useMemo(() => flattenRealTasks(tasks), [tasks]);
  const selection = useTaskSelection(realTasks, isSelectable);
  const clearSelection = selection.clear;
  useEffect(() => { clearSelection(); }, [tenantId, parentId, page, pageSize, filterKey, clearSelection]);

  useTaskAnalyticsView(removeModal.visible, 'task.remove_dialog');
  useTaskAnalyticsView(deleteParentModal.visible, 'batch.delete_dialog');

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
      const targetTasks = realTasks.filter(t => t.canDelete && removeModal.taskIds.includes(t.taskId));
      await batchRemoveAcrossParents(targetTasks);
      if (!isCurrent()) return;
      setRemoveModal({ visible: false, taskIds: [], loading: false });
      clearSelection();
      // 等待索引同步后局部刷新，避免整页重载提前清掉10秒的移除提示。
      window.setTimeout(() => {
        if (!isCurrent()) return;
        setPage(1);
        fetchTasks(1);
        fetchStats();
        void refreshParentTask();
      }, 1000);
    } catch {
      if (!isCurrent()) return;
      setRemoveModal(prev => ({ ...prev, loading: false }));
    }
  }, [removeModal.taskIds, realTasks, clearSelection, feedbackScope, fetchTasks, fetchStats, refreshParentTask]);

  const handleRemoveCancel = useCallback(() => {
    trackTaskAction('task.remove_cancel');
    setRemoveModal({ visible: false, taskIds: [], loading: false });
  }, []);

  const handleDeleteParentConfirm = useCallback(async () => {
    trackTaskAction('batch.delete_confirm');
    if (!parentReady || !parentTask?.canDelete || !parentId) return;
    const reportResult = captureTaskView({ parentTaskIds: [parentId], deleteMode: 'single' });
    setDeleteParentModal({ visible: true, loading: true });
    try {
      // 后端技术方案 §3.13：deleteParentTask 已改造为支持批量，单删也传 parentTaskIds: [singleId]
      const result = await bdTaskApi.deleteParentTask({ parentTaskIds: [parentId] }).catch(error => {
        reportResult('batch.delete_result_unknown');
        throw error;
      });
      const outcome = resolveParentDeleteResult([parentId], result);
      reportResult(`batch.delete_result_${outcome}`, outcome === 'unknown' ? undefined : {
        resultCounts: { totalCount: 1, successCount: result.successCount, failedCount: result.failDetails.length },
      });
      if ((result?.failDetails?.length ?? 0) > 0) {
        message.warning(result.failDetails[0].reason || '删除失败');
        setDeleteParentModal({ visible: true, loading: false });
        return;
      }
      message.success('删除成功');
      navigate('/bd-task/batch-list');
    } catch {
      // 错误由 bdTaskApi 内部处理（showError=true），弹窗保持打开
      setDeleteParentModal({ visible: true, loading: false });
    }
  }, [parentId, parentReady, parentTask?.canDelete, navigate]);

  const handleEditSuccess = (updatedFields?: Partial<ParentTaskOverviewDto>) => {
    if (updatedFields) {
      // 先保留本次保存结果，避免立即回查受主从延迟影响而短暂恢复旧值。
      updateParentTask(updatedFields);
    } else {
      refreshParentTask();
    }
    fetchTasks(page);
    fetchStats();
  };

  // 虾蜜抽屉关闭：关闭按钮回传与 Drawer 顶部关闭都走同一条清理/刷新链路。
  const handleXiamiClose = useCallback(() => {
    xiami.close();
    fetchTasks(page);
    fetchStats();
    refreshParentTask();
  }, [xiami, fetchTasks, page, fetchStats, refreshParentTask]);

  const selectedTasks = realTasks.filter(t => selection.selectedIds.includes(t.taskId));
  const hasFeedbackable = selectedTasks.some(canFeedback);
  const executableTasks = selectedTasks.filter(canStartExecution);
  const hasExecutable = executableTasks.length > 0;
  const hasDeletable = selectedTasks.some(t => t.canDelete);

  // 内部执行统一读取任务 objectId，关联 shopId 为空或不同都不影响实体选择。
  const openExecutionForTasks = useCallback((targetTasks: BdTaskDto[], batchExecution: boolean) => {
    const { objectIds, invalidCount } = collectTaskExecutionObjectIds(targetTasks);
    if (objectIds.length === 0) {
      message.warning('所选任务项暂无有效执行实体 ID');
      return;
    }
    if (invalidCount > 0) {
      message.warning(`${invalidCount} 个任务项缺少有效执行实体 ID，未加入本次执行`);
    }
    setExecutionTarget({ conditionTask: !batchExecution && targetTasks.length === 1 ? targetTasks[0] : undefined, shopIds: objectIds, ...executableTaskScope(targetTasks), executionTaskIds: targetTasks.map(task => task.taskId), batchExecution, recommendationContext: batchExecution
      ? { parentTaskId: parentTask!.parentTaskId } : { taskId: targetTasks[0].taskId } });
  }, [parentTask]);

  return (
    <div style={{ margin: '0 auto', maxWidth: 1800, padding: '18px 20px 20px' }}>
      {/* 返回按钮与详情页内部面包屑同一行 */}
      <div style={{ display: 'flex', height: 32, alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => { trackTaskAction('detail.back_button'); navigate('/bd-task/batch-list'); }}
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
            { title: <a onClick={() => { trackTaskAction('detail.breadcrumb'); navigate('/bd-task/batch-list'); }} style={{ cursor: 'pointer' }}>任务批次列表</a> },
            { title: <span style={{ color: MT.textPrimary }}>{parentTask?.name ?? '任务详情'}</span> },
          ]}
        />
      </div>

      {parentReady && parentTask && <ParentGoalNotice
        task={parentTask}
        onAdd={() => xiami.open('update-task-items', parentId)}
        onAdjust={() => setEditingParentTask(true)}
      />}

      {!parentReady && <Alert
        style={{ marginBottom: 12 }}
        type={parentStatus === 'loading' ? 'info' : parentStatus === 'error' ? 'error' : 'warning'}
        showIcon
        message={!validParentId ? '任务批次 ID 无效' : parentStatus === 'loading' ? <><Spin size="small" /> 正在加载任务批次信息</>
          : parentStatus === 'empty' ? '未查询到任务批次信息'
          : parentStatus === 'unsupported' ? '任务批次的实体类型暂不支持'
          : '任务批次信息加载失败'}
        description={validParentId ? '可继续查看已加载的任务项；批次信息恢复后可使用筛选和操作。' : '请从任务批次列表重新打开有效批次。'}
        action={validParentId && parentStatus !== 'loading' && <Button size="small" onClick={() => { trackTaskAction('retry.parent_detail'); void refreshParentTask(); }}>重试</Button>}
      />}

      {/* 顶部任务基础信息：重新设计为独立 Panel，对齐 NoCode TaskDetailPage 顶部信息区
          （大标题 + 标签行 + 元信息行 + 当前可见范围进度与独立目标 + 右侧操作按钮），业务字段/回调与列表页完全一致 */}
      {parentTask && (() => {
        const percent = parentTask.totalCount > 0 ? Math.round((parentTask.completedCount / parentTask.totalCount) * 100) : 0;
        const hasAgents = Array.isArray(parentTask.agentInfos) && parentTask.agentInfos.length > 0;
        const parentTaskDescription = parentTask.parentTaskDescription?.trim();
        const statisticSubjectLabel = objectMeta?.displayType === 'brand'
          ? '品牌'
          : objectMeta?.displayType === 'industry_shop' || objectMeta?.displayType === 'industry_sku'
            ? '行业商家'
            : '门店';
        const statisticText = '统计：涉及 '
          + (parentTask.subjectCount ?? '暂无数据')
          + ' 个'
          + statisticSubjectLabel
          + (objectMeta?.aggregated
            ? ' / ' + parentTask.totalCount + ' 条' + (objectMeta.displayType === 'industry_sku' ? '行业商品任务' : ' SKU 任务')
            : '');
        // 修改基础信息/修改任务项 菜单仅在 canDelete 为 true 时展示（与删除按钮同一权限控制）
        const editMenuItems: MenuProps['items'] = parentTask.canDelete ? [
          { key: 'basic-info', label: '修改基础信息' },
          { key: 'sub-task', label: '修改任务项' },
          { key: 'delete', label: '删除', danger: true },
        ] : [];
        const handleEditMenuClick: MenuProps['onClick'] = ({ key }) => {
          if (key === 'basic-info') { trackTaskAction('batch.edit_basic'); setEditingParentTask(true); }
          if (key === 'sub-task') { trackTaskAction('batch.edit_items'); xiami.open('update-task-items', parentId); }
          if (key === 'delete') { trackTaskAction('batch.delete_one'); setDeleteParentModal({ visible: true, loading: false }); }
        };

        return (
          <div style={{
            background: MT.cardBg,
            borderRadius: MT.cardRadius,
            border: '1px solid transparent',
            boxShadow: MT.cardShadow,
            padding: '20px 24px',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <CardTitleRow
                  title={<h1 style={{ fontSize: 20, fontWeight: 600, color: MT.textPrimary, margin: 0 }}>{parentTask.name}</h1>}
                  id={parentTask.parentTaskId}
                  idFontSize={TASK_DETAIL_HEADER_META_FONT_SIZE}
                  tags={<>
                    <TaskTitleBadges
                      task={parentTask}
                      taskTypeName={getTaskTypeName(parentTask.taskType)}
                      objectTypeLabel={objectMeta?.label}
                    />
                  </>}
                />

              </div>

              {/* 右侧操作按钮 */}
              <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 8 }}>
                {editMenuItems.length > 0 && (
                  <TaskEditDropdownButton items={editMenuItems} onMenuClick={handleEditMenuClick} />
                )}
                {!executionHidden && <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  disabled={!!executeDisabledReason}
                  title={executeDisabledReason}
                  onClick={() => { trackTaskAction('execution.open_all'); setExecutionTarget({ parentTaskId: parentTask.parentTaskId, batchExecution: true }); }}
                >
                  全部执行
                </Button>}
              </div>
            </div>

            {/* 元信息行：移出标题/按钮的双列布局，让下方信息可使用卡片全宽 */}
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', fontSize: TASK_DETAIL_HEADER_META_FONT_SIZE, color: MT.textMuted }}>
              {!isShopParentTask && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ProfileOutlined style={{ fontSize: TASK_DETAIL_HEADER_META_FONT_SIZE }} />
                  {statisticText}
                </span>
              )}
              {parentTask.creatorId && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <UserOutlined style={{ fontSize: TASK_DETAIL_HEADER_META_FONT_SIZE }} />
                  创建人：<PersonName name={parentTask.creatorName} mis={parentTask.creatorId} />
                </span>
              )}
              {parentTask.createdTime != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CalendarOutlined style={{ fontSize: TASK_DETAIL_HEADER_META_FONT_SIZE }} />
                  创建：{dayjs(parentTask.createdTime).format('YYYY.MM.DD')}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <BellOutlined style={{ fontSize: 13 }} />
                截止：{dayjs(parentTask.expireDate).format('YYYY.MM.DD')}
              </span>
              {hasAgents && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MT.textMuted }}>
                  <RobotOutlined style={{ fontSize: 13 }} />
                  <span>相关 Agent：{parentTask.agentInfos!.map(a => a.agentName).join('、')}</span>
                </span>
              )}
            </div>

            {/* 任务说明独占卡片整行，正文可延伸至右侧操作按钮下方的空间 */}
            {parentTaskDescription && (
              <div style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                width: '100%',
                minWidth: 0,
                color: MT.textMuted,
                fontSize: 13,
                lineHeight: 1.7,
              }}>
                <FileTextOutlined style={{ flexShrink: 0, marginTop: 4, fontSize: 13 }} />
                <span style={{ flexShrink: 0 }}>任务说明：</span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {parentTaskDescription}
                </span>
              </div>
            )}

            {/* 当前可见范围进度条 + 完成数 */}
            <div style={{ marginTop: 16, display: 'flex', maxWidth: 420, alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1, lineHeight: 0 }}>
                <Progress
                  aria-label="当前可见范围任务完成进度"
                  percent={percent}
                  size="small"
                  showInfo={false}
                  strokeColor={parentTask.achieved ? MT.success : MT.info}
                  trailColor={MT.pageBg}
                  style={{ lineHeight: 0 }}
                />
              </div>
              <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 600, color: MT.textPrimary }}>
                {parentTask.completedCount}/{parentTask.totalCount} ({percent}%)
              </span>
              <Tag
                bordered={false}
                style={{
                  ...MT_FILLED_TAG_STYLE,
                  flexShrink: 0,
                  ...(parentTask.achieved ? { background: MT.successBg, color: MT.successText } : { background: MT.dangerBg, color: MT.dangerText }),
                }}
              >
                {`${parentTask.achieved ? '已达标' : '未达标'} · 目标 ${formatParentGoal(parentTask)}`}
              </Tag>
            </div>
          </div>
        );
      })()}

      {/* 中间层：状态统计（真实全量计数，保持现状）+ 搜索/画像筛选；
          【回归修复2】所有搜索/筛选控件（门店ID/门店名称/经营地址/跟进人 + 商家画像筛选组）统一收拢在
          TaskFilterBar 同一个区域内，共用同一个「查询」/「重置筛选」按钮驱动生效——商家画像筛选此前是独立
          区块 + 选中即生效，现改为与其余输入框一致的「草稿值，点查询才生效」，不再有两套不同的交互心智；
          按任务批次门店类型自动切换外卖/公海门店可用字段集（后端技术方案 §3.5 contactObjectType 已透出）；
          「创建人」搜索框按用户要求已移除；此前的「按优先级/按截止时间」排序功能已移除（同一任务批次下任务项
          优先级/截止时间均继承自任务批次，取值完全相同，排序不产生实际效果，属无意义功能） */}
      {parentReady && <TaskFilterBar
        stats={STATUS_STAT_CONFIG.map(s => ({
          key: String(s.key),
          count: statusCounts[s.key] ?? '—',
          showCount: false,
          disabled: statusCounts[s.key] === 0 && activeStatus !== s.key,
          label: s.label,
          color: MT.brandPrimary,
          icon: s.icon,
        }))}
        activeStatKey={activeStatus != null ? String(activeStatus) : null}
        onStatClick={key => { trackTaskAction('filter.status'); setActiveStatus(key != null ? Number(key) : null); }}
        statsIcon={<UnorderedListOutlined />}
        statsTitle="任务项状态"
        statsNotice={<TaskStatsNotice loading={false} error={stats.error} onRetry={() => { trackTaskAction('retry.status_stats'); fetchStats(); }} />}
        onSearch={handleSearch}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        resetLabel="重置"
        resultCountLabel={(
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1 }}>
            <ProfileOutlined style={{ fontSize: 13 }} />
            <span>共 {total} {objectMeta?.aggregated ? (objectMeta.aggregateSubject === 'shop' ? '个门店' : '个行业商家') : '个任务项'}</span>
          </span>
        )}
        extra={isShopParentTask ?
          <>
            {/* 【全面排查修复】筛选搜索区参考商家列表页 ShopListPage.tsx 的形式，全部字段加上小标题，
                告知用户各输入框的筛选用途，与商家画像筛选组的 withLabel 风格保持统一；
                取消跟进人与商家画像筛选组之间的竖向分隔线，字段之间统一用 gap 间距区隔，不再用竖线强行分组；
                各输入框宽度由固定 width 改为 flex:1 + minWidth，随筛选行可用宽度自适应伸展，避免宽屏下
                右侧出现大片空白 */}
            <FilterFieldLabel label={isWdcParentTask ? '公海门店名称' : '门店名称'}>
              <Input
                placeholder={isWdcParentTask ? '输入公海门店名称关键词' : '输入门店名称关键词'}
                value={shopNameSearchDraft}
                onChange={e => setShopNameSearchDraft(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                style={{ width: '100%', minWidth: 160 }}
              />
            </FilterFieldLabel>
            <FilterFieldLabel label={isWdcParentTask ? '公海门店 ID' : '门店 ID'}>
              <Input
                placeholder={isWdcParentTask ? '输入完整公海门店 ID' : '输入完整门店 ID'}
                value={shopIdSearchDraft}
                onChange={e => setShopIdSearchDraft(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                style={{ width: '100%', minWidth: 140 }}
              />
            </FilterFieldLabel>
            <FilterFieldLabel label={isWdcParentTask ? '公海门店地址' : '经营地址'}>
              <Input
                placeholder={isWdcParentTask ? '输入公海门店地址关键词' : '输入经营地址关键词'}
                value={addressSearchDraft}
                onChange={e => setAddressSearchDraft(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                style={{ width: '100%', minWidth: 160 }}
              />
            </FilterFieldLabel>
            <FilterFieldLabel label="跟进人">
              <Input
                placeholder="输入完整跟进人 mis"
                value={bdIdSearchDraft}
                onChange={e => setBdIdSearchDraft(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                style={{ width: '100%', minWidth: 120 }}
              />
            </FilterFieldLabel>
            <ShopProfileFilterFields
              contactObjectType={parentTask?.contactObjectType ?? CONTACT_OBJECT_TYPE.WM_SHOP}
              options={filterOptions}
              optionsLoading={filterOptionsLoading}
              value={profileFilterDraft}
              onChange={patch => setProfileFilterDraft(prev => ({ ...prev, ...patch }))}
              withLabel
              flexField
            />
          </> : <>
            <EntityFilterFields contactObjectType={parentTask!.contactObjectType!} value={entityFilterDraft} onChange={patch => setEntityFilterDraft(current => ({ ...current, ...patch }))} onSearch={handleSearch} matchTypeOptions={filterOptions.matchTypeOptions} optionsLoading={filterOptionsLoading} />
            {isSkuParentTask && <ShopProfileFilterFields
              contactObjectType={CONTACT_OBJECT_TYPE.WM_SHOP}
              options={filterOptions}
              optionsLoading={filterOptionsLoading}
              value={profileFilterDraft}
              onChange={patch => setProfileFilterDraft(current => ({ ...current, ...patch }))}
              withLabel
              flexField
            />}
          </>
        }
      />}

      {/* 列表区：独立卡片，包含全选 + 任务项/商家卡片列表 */}
      {validParentId && <div style={{
        background: MT.cardBg,
        borderRadius: MT.cardRadius,
        border: '1px solid transparent',
        boxShadow: MT.cardShadow,
        padding: '16px 16px 8px',
      }}>
        {parentReady && realTasks.some(isSelectable) && (
          <div style={{ display: 'flex', minHeight: 24, alignItems: 'center', gap: 12, marginBottom: 12, paddingLeft: 4 }}>
            <Checkbox
              checked={selection.allSelected}
              indeterminate={selection.selectedIds.length > 0 && !selection.allSelected}
              onChange={e => { trackTaskAction('selection.page_all'); selection.selectAll(e.target.checked); }}
            >
              全选当前页
            </Checkbox>
            <BatchToolbar
              count={selection.selectedIds.length}
              actions={[
                {
                  key: 'batch-execute',
                  label: '全部执行',
                  color: MT.textPrimary,
                  disabled: !hasExecutable || !!executeDisabledReason,
                  title: executeDisabledReason,
                  onClick: () => { trackTaskAction('execution.open_selected'); openExecutionForTasks(executableTasks, true); },
                },
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
              ].filter(action => action.key !== 'batch-execute' || !executionHidden)}
            />
          </div>
        )}

        <Spin spinning={loading}>
          {loadError && !loading ? <Alert type="error" showIcon message="任务项加载失败" action={<Button size="small" onClick={() => { trackTaskAction('retry.task_list'); fetchTasks(page); }}>重试</Button>} /> : sortedTasks.length === 0 && !loading ? (
            <Empty description="暂无任务项" style={{ padding: '60px 0' }} />
          ) : (
            <>
              {!parentReady ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {realTasks.map(task => <div key={task.taskId} style={{ padding: 16, border: `1px solid ${MT.cardBorder}`, borderRadius: MT.cardRadiusSmall }}>
                  <CardTitleRow title={task.objectName || task.shopName || '任务项'} id={task.objectId ?? task.shopId} tags={statusTag(task)} />
                  <div style={{ marginTop: 8, color: MT.textMuted, fontSize: 13, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    <div>任务 ID：{task.taskId}</div>
                    {task.taskContent && <div>{task.taskContent}</div>}
                    {task.description && <div>{task.description}</div>}
                    <TaskCheckFields task={task} />
                  </div>
                </div>)}
              </div> : <SubTaskViewSwitch
                key={JSON.stringify([filterKey, page, pageSize])}
                tasks={sortedTasks}
                contactObjectType={parentTask?.contactObjectType}
                selectedIds={selection.selectedIds}
                onSelect={selection.selectOne}
                onFeedback={openFeedback}
                onRemove={target => handleRemoveClick(target.filter(task => task.canDelete).map(task => task.taskId))}
                onExecute={executionHidden ? undefined : task => {
                  trackTaskAction(task.skuTaskAggregation ? 'execution.open_group' : 'execution.open_one');
                  openExecutionForTasks(task.skuTaskAggregation ? flattenRealTasks([task]).filter(canStartExecution) : [task], !!task.skuTaskAggregation);
                }}
                executeDisabledReason={executeDisabledReason}
                onSubjectClick={task => {
                  const type = parentTask?.contactObjectType;
                  const route = type === CONTACT_OBJECT_TYPE.BRAND ? 'brands' : type === CONTACT_OBJECT_TYPE.TS_POI || type === CONTACT_OBJECT_TYPE.TS_SKU ? 'industry-shops' : 'shops';
                  const id = route === 'brands' ? task.objectId : route === 'industry-shops' ? (type === CONTACT_OBJECT_TYPE.TS_SKU ? task.tsPoiId : task.objectId) : task.shopId;
                  if (id == null || id === '') return;
                  navigate(`/bd-task/${route}/${encodeURIComponent(String(id))}`, {
                    state: { shopName: task.shopName, objectName: route === 'industry-shops' ? task.tsPoiName || (type === CONTACT_OBJECT_TYPE.TS_POI ? task.objectName : undefined) : task.objectName, contactObjectType: route === 'shops' && !isWdcParentTask ? CONTACT_OBJECT_TYPE.WM_SHOP : route === 'industry-shops' ? CONTACT_OBJECT_TYPE.TS_POI : type },
                  });
                }}
              />}
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
      </div>}

      <FeedbackModal
        open={parentReady && feedbackTasks.length > 0}
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
        confirmDisabled={!parentReady || feedbackOutcome?.kind === 'unknown'}
        onConfirm={handleConfirm}
        onCancel={() => {
          invalidateFeedbackRequest();
          setFeedbackTasks([]);
          setFeedbackOutcome(null);
          if (feedbackOutcome) {
            // 离开结果弹窗后再刷新批次头部，不在用户核对失败项期间卸载弹窗。
            void refreshParentTask();
          }
        }}
      />

      {/* 移除二次确认弹窗 */}
      <Modal
        open={parentReady && removeModal.visible}
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

      {/* 顶部删除任务批次二次确认弹窗：与任务列表页同样真实调用 deleteParentTask，不再仅仅跳转 */}
      <Modal
        open={parentReady && deleteParentModal.visible}
        title={null}
        footer={null}
        onCancel={() => { trackTaskAction('batch.delete_cancel'); setDeleteParentModal({ visible: false, loading: false }); }}
        centered
        width={420}
      >
        <div style={{ padding: '24px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <ExclamationCircleOutlined style={{ fontSize: 40, color: MT.danger }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: MT.textPrimary, textAlign: 'center' }}>
            确认删除任务批次？
          </div>
          <div style={{ fontSize: 13, color: MT.textMuted, textAlign: 'center' }}>
            删除后将无法恢复，请确认是否删除
          </div>
          {parentTask?.name && (
            <div style={{ fontSize: 13, color: MT.textPrimary, background: MT.dangerBg, border: `1px solid ${MT.dangerBorder}`, borderRadius: MT.cardRadiusSmall, padding: '6px 14px', width: '100%', textAlign: 'center' }}>
              {parentTask.name}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16 }}>
          <Button onClick={() => { trackTaskAction('batch.delete_cancel'); setDeleteParentModal({ visible: false, loading: false }); }}>取消</Button>
          <Button
            type="primary"
            danger
            loading={deleteParentModal.loading}
            onClick={handleDeleteParentConfirm}
          >
            确认
          </Button>
        </div>
      </Modal>

      <EditParentTaskModal
        open={parentReady && editingParentTask}
        task={parentTask ?? null}
        taskTypes={taskTypes}
        taskTypeNameMap={taskTypeNameMap}
        onClose={() => setEditingParentTask(false)}
        onSuccess={handleEditSuccess}
      />

      <XiamiTaskDrawer
        open={parentReady && xiami.state != null}
        action={xiami.state?.action ?? null}
        parentTaskId={xiami.state?.parentTaskId}
        onClose={handleXiamiClose}
      />
      <ShopExecutionDrawer
        communicationParentTask={parentTask}
        contactObjectType={parentTask?.contactObjectType}
        showUnsupportedBatchAbilities
        unsupportedBatchMessage="不支持批量执行，请依次执行各商家任务"
        open={parentReady && executionTarget != null}
        {...(executionTarget ?? { shopIds: [], batchExecution: true })}
        onSuccess={() => { fetchTasks(page); fetchStats(); void refreshParentTask(); }}
        onClose={() => setExecutionTarget(null)}
      />
    </div>
  );
};

/** 切租户或批次时重建查询、筛选和弹层状态，避免上一批次条件或管理弹层进入新范围。 */
const ScopedSubTaskList: React.FC = () => {
  const { parentTaskId } = useParams<{ parentTaskId: string }>();
  const tenantId = useTenantStore(state => state.currentTenantId);
  return <SubTaskList key={JSON.stringify([tenantId, parentTaskId])} />;
};

export default ScopedSubTaskList;
