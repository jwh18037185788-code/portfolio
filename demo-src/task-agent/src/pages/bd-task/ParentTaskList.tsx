import { resolveParentDeleteResult } from './utils/parentDeleteResult';
import { useTaskAnalyticsView } from '@/lib/useTaskAnalyticsView';
import { trackTaskAction, captureTaskView } from '@/lib/taskAnalytics';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Spin, Empty, Pagination, Button, Modal, message, Input, Checkbox, Switch, Alert } from 'antd';
import dayjs from 'dayjs';
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { bdTaskApi } from '@/services/bdTaskApi';
import { isValidNumericIdSearch } from './utils/numericIdSearch';
import type { ParentTaskOverviewDto, BdTaskTypeConfigDto, ParentTaskDerivedStatus, ParentTaskStatsReq, ParentTaskStatsDto, PageDto, ContactObjectType } from '@/types/bdTask';
import { PARENT_TASK_DERIVED_STATUS } from '@/types/bdTask';
import TaskCard, { PRIORITY_CONFIG } from './components/TaskCard';
import StatCard from './components/StatCard';
import StatGroup, { StatGroupStack } from './components/StatGroup';
import TypeStatGroup from './components/TypeStatGroup';
import BatchToolbar from './components/BatchToolbar';
import ShopExecutionDrawer from './components/ShopExecutionDrawer';
import { useExecutionAvailability } from '@/components/shop-execution/useExecutionAvailability';
import EditParentTaskModal from './components/EditParentTaskModal';
import FilterFieldLabel from './components/FilterFieldLabel';
import SortTabs from './components/SortTabs';
import {
  TASK_FILTER_ACTIONS_STYLE,
  TASK_FILTER_CARD_STYLE,
  TASK_FILTER_FIELDS_STYLE,
  TASK_FILTER_RESULT_COUNT_STYLE,
  TASK_FILTER_SEARCH_ROW_STYLE,
} from './components/TaskFilterBar';
import XiamiTaskDrawer from './components/XiamiTaskDrawer';
import { useTenantStore } from '@/stores/tenantStore';
import { useTaskQuery } from './hooks/useTaskQuery';
import { useTaskTypeDictionary } from './hooks/useTaskTypeDictionary';
import { useVisibleObjectTypes } from './hooks/useVisibleObjectTypes';
import TaskStatsNotice from './components/TaskStatsNotice';
import { useXiamiTaskDrawer } from './hooks/useXiamiTaskDrawer';
import { MT } from './theme';


const ALL_TYPE = -1;

const STATUS_FILTER_CONFIG: Record<ParentTaskDerivedStatus, { label: string; color: string; icon: React.ReactNode }> = {
  [PARENT_TASK_DERIVED_STATUS.COMPLETED]:   { label: '已完成', color: MT.successText, icon: <CheckCircleOutlined /> },
  [PARENT_TASK_DERIVED_STATUS.EXPIRED]:     { label: '已过期', color: MT.dangerText,  icon: <CloseCircleOutlined /> },
  [PARENT_TASK_DERIVED_STATUS.IN_PROGRESS]: { label: '进行中', color: MT.infoText, icon: <SyncOutlined /> },
  [PARENT_TASK_DERIVED_STATUS.SOON_EXPIRE]: { label: '即将到期', color: MT.warningText, icon: <ExclamationCircleOutlined /> },
};
const STATUS_ORDER: ParentTaskDerivedStatus[] = [
  PARENT_TASK_DERIVED_STATUS.IN_PROGRESS,
  PARENT_TASK_DERIVED_STATUS.SOON_EXPIRE,
  PARENT_TASK_DERIVED_STATUS.EXPIRED,
  PARENT_TASK_DERIVED_STATUS.COMPLETED,
];

/** 调用后端删除接口（后端技术方案 §3.13，deleteParentTask 已改造为支持批量，单次最多 50 个；单删也传 list-of-1；
 * 权限按任务批次逐个判断，部分失败不整体拒绝） */
async function deleteParentTasks(taskIds: number[], deleteMode: 'single' | 'batch') {
  const reportResult = captureTaskView({ parentTaskIds: taskIds, deleteMode });
  const result = await bdTaskApi.deleteParentTask({ parentTaskIds: taskIds }).catch(error => {
    reportResult('batch.delete_result_unknown');
    throw error;
  });
  const outcome = resolveParentDeleteResult(taskIds, result);
  reportResult(`batch.delete_result_${outcome}`, outcome === 'unknown' ? undefined : {
    resultCounts: { totalCount: taskIds.length, successCount: result.successCount, failedCount: result.failDetails.length },
  });
  const success = result?.successCount ?? 0;
  const failDetails = result?.failDetails ?? [];
  if (failDetails.length === 0) {
    message.success(taskIds.length > 1 ? `成功删除 ${success} 个任务` : '删除成功');
  } else {
    message.warning(`成功删除 ${success} 个，${failDetails.length} 个删除失败：${failDetails.map(f => f.reason).join('、')}`);
  }
}

const ParentTaskList: React.FC = () => {
  const navigate = useNavigate();
  const tenantId = useTenantStore(state => state.currentTenantId);
  const visibleTypes = useVisibleObjectTypes();
  const typeNames = useTaskTypeDictionary();
  const { taskTypeNameMap, getTaskTypeName } = typeNames;
  const objectTypeOptions = useMemo(() => visibleTypes.objectTypes ?? [], [visibleTypes.objectTypes]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);
  const [objectTypeSelection, setObjectTypeSelection] = useState<{ tenantId: typeof tenantId; value: ContactObjectType | null }>({ tenantId, value: null });
  const selectedObjectType = objectTypeSelection.tenantId === tenantId
    && (!visibleTypes.objectTypes || objectTypeOptions.some(option => option.code === objectTypeSelection.value))
    ? objectTypeSelection.value : null;
  const setSelectedObjectType = (value: ContactObjectType | null) => setObjectTypeSelection({ tenantId, value });
  const [typeSelection, setTypeSelection] = useState({ tenantId, value: ALL_TYPE });
  const setSelectedType = (value: number) => setTypeSelection({ tenantId, value });
  useEffect(() => {
    setObjectTypeSelection({ tenantId, value: null });
    setTypeSelection({ tenantId, value: ALL_TYPE });
  }, [tenantId]);
  // 任务状态筛选（服务端全量筛选，前端单选交互，传参时包一层数组）
  // status 参数后端定义为 List<Integer>，前端筛选卡片仍为单选交互，传参时包一层数组
  const [selectedStatus, setSelectedStatus] = useState<ParentTaskDerivedStatus | null>(null);
  // 默认排序方式为「按创建时间降序」（底层等价传参按任务ID降序，AC-005-11）
  const [sortMode, setSortMode] = useState<'createdTime' | 'priority' | 'expireDate'>('createdTime');
  // 仅看未过期任务筛选（AC-005-12）：默认勾选（默认生效），勾选后向接口透传 expireDateFrom=当天日期，服务端全量过滤
  const [onlyUnexpired, setOnlyUnexpired] = useState(true);
  // 三个搜索字段分别维护草稿值与已生效值，点击查询/回车后统一提交。
  const [nameSearchDraft, setNameSearchDraft] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [taskIdSearchDraft, setTaskIdSearchDraft] = useState('');
  const [taskIdSearch, setTaskIdSearch] = useState('');
  const [creatorSearchDraft, setCreatorSearchDraft] = useState('');
  const [creatorSearch, setCreatorSearch] = useState('');

  // 虾蜜任务抽屉：承接「新建任务」与任务卡片「修改任务项」。
  const xiami = useXiamiTaskDrawer();
  const [executionTask, setExecutionTask] = useState<ParentTaskOverviewDto | null>(null);

  // 基础信息编辑弹窗（后端技术方案 §3.6：operatorId 已改为可选自动兜底，priority 字段已支持）
  const [editingTask, setEditingTask] = useState<ParentTaskOverviewDto | null>(null);
  useEffect(() => { setEditingTask(null); }, [tenantId]);

  // 批量选中
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 删除确认弹窗状态（单个 + 批量共用）
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    taskIds: number[];
    taskName: string;
    deleteMode: 'single' | 'batch';
    loading: boolean;
  }>({ visible: false, taskIds: [], taskName: '', deleteMode: 'single', loading: false });

  const dictionaryFilters = useMemo(() => ({ tenantId: tenantId ?? undefined }), [tenantId]);
  const dictionary = useTaskQuery<BdTaskTypeConfigDto[]>(JSON.stringify(dictionaryFilters));
  const { run: runDictionary } = dictionary;
  const taskTypes = useMemo(() => dictionary.data ?? [], [dictionary.data]);
  const selectedType = typeSelection.tenantId === tenantId
    && (!dictionary.data || dictionary.data.some(type => type.code === typeSelection.value))
    ? typeSelection.value : ALL_TYPE;
  const fetchDictionary = useCallback(() => {
    if (tenantId == null) return;
    void runDictionary(() => bdTaskApi.listTaskTypes(dictionaryFilters));
  }, [tenantId, runDictionary, dictionaryFilters]);
  useEffect(() => { fetchDictionary(); }, [fetchDictionary]);
  useEffect(() => {
    if (dictionary.data && typeSelection.value !== ALL_TYPE
      && !dictionary.data.some(type => type.code === typeSelection.value)) {
      setTypeSelection({ tenantId, value: ALL_TYPE });
    }
  }, [dictionary.data, tenantId, typeSelection.value]);
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;

  useTaskAnalyticsView(deleteModal.visible, 'batch.delete_dialog');

  const handleDeleteClick = useCallback((task: ParentTaskOverviewDto) => {
    setDeleteModal({ visible: true, taskIds: [task.parentTaskId], taskName: task.name, deleteMode: 'single', loading: false });
  }, []);

  const handleBatchDeleteClick = useCallback(() => {
    trackTaskAction('batch.delete_selected');
    setDeleteModal({ visible: true, taskIds: selectedIds, taskName: '', deleteMode: 'batch', loading: false });
  }, [selectedIds]);

  // 「按创建时间降序」等价替代为按任务ID（`id`）降序（已与用户确认字段选型）；
  // 「按优先级」「按截止时间」需整体按该字段顺排，同优先级/同截止日期内部再按任务ID降序稳定排序（本次修复：
  // 此前仅传了单一排序字段，同值分组内顺序由后端不保证稳定，导致同优先级/同截止日期任务间穿插错乱）
  const buildSortList = (mode: 'createdTime' | 'priority' | 'expireDate') => {
    if (mode === 'createdTime') return [{ field: 'id', asc: false }];
    return [{ field: mode, asc: true }, { field: 'id', asc: false }];
  };

  // 统一构造查询参数：所有筛选/搜索条件均已切换为真实服务端参数（后端技术方案 §3.11/§3.12）
  const objectFilters = useMemo<Omit<ParentTaskStatsReq, 'statsFields'>>(() => {
    const req: Omit<ParentTaskStatsReq, 'statsFields'> = { tenantId: tenantId ?? undefined };
    if (selectedPriority != null) req.priority = selectedPriority;
    if (selectedType !== ALL_TYPE) req.taskType = selectedType;
    if (onlyUnexpired) req.expireDateFrom = dayjs().format('YYYY-MM-DD');
    if (selectedStatus != null) req.status = [selectedStatus];
    if (nameSearch.trim()) req.name = nameSearch.trim();
    if (/^\d+$/.test(taskIdSearch.trim())) req.id = Number(taskIdSearch.trim());
    if (creatorSearch.trim()) req.creatorId = creatorSearch.trim();
    return req;
  }, [tenantId, selectedPriority, selectedType, onlyUnexpired, selectedStatus, nameSearch, taskIdSearch, creatorSearch]);
  const filters = useMemo(() => selectedObjectType == null ? objectFilters
    : { ...objectFilters, contactObjectType: selectedObjectType }, [objectFilters, selectedObjectType]);
  const filterKey = JSON.stringify(filters);
  const list = useTaskQuery<PageDto<ParentTaskOverviewDto>>(`${filterKey}:${sortMode}`);
  const baselineFilters = useMemo(() => ({ tenantId: tenantId ?? undefined, expireDateFrom: dayjs().format('YYYY-MM-DD') }), [tenantId]);
  const baseline = useTaskQuery<ParentTaskStatsDto>(JSON.stringify([baselineFilters, dictionary.data]));
  const { run: runBaseline } = baseline;
  const fetchBaseline = useCallback(() => {
    if (tenantId == null || !dictionary.data) return;
    void runBaseline(() => bdTaskApi.queryParentTaskStats({ ...baselineFilters,
      statsFields: [{ field: 'taskType', codes: dictionary.data.map(type => type.code) }] }));
  }, [tenantId, dictionary.data, baselineFilters, runBaseline]);
  useEffect(() => { fetchBaseline(); }, [fetchBaseline]);
  const stats = useTaskQuery<ParentTaskStatsDto>(JSON.stringify(filters));
  const { run: runList } = list;
  const { run: runStats } = stats;
  const tasks = list.data?.data ?? [];
  // 「全部执行」展示完整目录，仅支持单个执行的能力在抽屉内置灰。
  const { getExecutionDisabledReason, isExecutionHidden } = useExecutionAvailability(tasks.map(task => task.contactObjectType), false);
  const total = list.data?.total ?? 0;
  const loading = list.loading;
  const loadError = list.error;
  const fetchTasks = useCallback((p: number, ps?: number) => {
    if (tenantId == null) return;
    void runList(() => bdTaskApi.queryParentTaskList({ ...filters, page: p,
      pageSize: ps ?? pageSizeRef.current, sortList: buildSortList(sortMode) }));
  }, [filters, sortMode, runList, tenantId]);
  const fetchStats = useCallback(() => {
    if (tenantId == null) return;
    void runStats(async () => {
      // 每个标签组只排除自身条件，其余条件参与可用性计算。
      const { priority: _priority, ...priorityFilters } = filters;
      const { status: _status, ...statusFilters } = filters;
      const [priority, status] = await Promise.all([
        bdTaskApi.queryParentTaskStats({ ...priorityFilters, statsFields: [{ field: 'priority', codes: [0, 1, 2, 3] }] }),
        bdTaskApi.queryParentTaskStats({ ...statusFilters, statsFields: [{ field: 'status', codes: STATUS_ORDER }] }),
      ]);
      return { totalCount: 0, priorityStats: priority.priorityStats, statusStats: status.statusStats };
    });
  }, [filters, runStats, tenantId]);
  const retryStats = () => {
    if (dictionary.error) fetchDictionary();
    else { fetchStats(); if (baseline.error) fetchBaseline(); }
  };
  const statusCounts = Object.fromEntries(stats.data?.statusStats?.items.map(item => [item.code, item.count]) ?? []);
  const priorityCounts = Object.fromEntries(stats.data?.priorityStats?.items.map(item => [item.code, item.count]) ?? []);


  // 实体分布保留其他筛选，但不传根层 contactObjectType；单次请求服务端维度桶。
  const objectStats = useTaskQuery<Record<number, number>>(JSON.stringify([objectFilters, visibleTypes.objectTypes]));
  const { run: runObjectStats } = objectStats;
  const objectTypeCounts = objectStats.data ?? {};
  const fetchObjectTypeCounts = useCallback(() => {
    if (tenantId == null || !visibleTypes.objectTypes) return;
    void runObjectStats(async () => {
      const codes = objectTypeOptions.map(option => option.code);
      if (codes.length === 0) return {};
      const result = await bdTaskApi.queryParentTaskStats({ ...objectFilters,
        statsFields: [{ field: 'contactObjectType', codes }] });
      const items = result?.contactObjectTypeStats?.items;
      if (!Array.isArray(items)) throw new Error('实体类型统计数据不完整');
      return Object.fromEntries(codes.map(code => {
        const matches = items.filter(item => item.code === code);
        if (matches.length !== 1 || !Number.isInteger(matches[0].count) || matches[0].count < 0) {
          throw new Error('实体类型统计数据不完整');
        }
        return [code, matches[0].count];
      }));
    });
  }, [objectFilters, objectTypeOptions, visibleTypes.objectTypes, runObjectStats, tenantId]);
  useEffect(() => { fetchObjectTypeCounts(); }, [fetchObjectTypeCounts]);
  const retryObjectStats = () => {
    if (visibleTypes.objectTypesError) visibleTypes.reload();
    else fetchObjectTypeCounts();
  };

  const handleDeleteConfirm = useCallback(async () => {
    trackTaskAction('batch.delete_confirm');
    if (!deleteModal.taskIds.length) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await deleteParentTasks(deleteModal.taskIds, deleteModal.deleteMode);
      setDeleteModal({ visible: false, taskIds: [], taskName: '', deleteMode: 'single', loading: false });
      setSelectedIds([]);
      fetchTasks(page);
      fetchStats();
      fetchObjectTypeCounts();
    } catch {
      // 错误由 bdTaskApi 内部处理（showError=true），弹窗保持打开
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteModal.taskIds, deleteModal.deleteMode, page, fetchTasks, fetchStats, fetchObjectTypeCounts]);

  const handleDeleteCancel = useCallback(() => {
    trackTaskAction('batch.delete_cancel');
    setDeleteModal({ visible: false, taskIds: [], taskName: '', deleteMode: 'single', loading: false });
  }, []);

  // 批次入口传任务批次 ID，由执行组件读取服务端筛选后的实体及推荐能力。
  const handleExecuteClick = useCallback((task: ParentTaskOverviewDto) => {
    trackTaskAction('execution.open_batch');
    setExecutionTask(task);
  }, []);

  // 分页/排序只刷新列表；业务筛选变动同时驱动独立统计，不重复触发首屏请求。
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
    fetchTasks(1);
  }, [fetchTasks]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handlePriorityClick = (priority: number | null) => {
    trackTaskAction('filter.priority');
    const next = priority === selectedPriority ? null : priority;
    setSelectedPriority(next);
  };

  const handleTypeClick = (type: number) => {
    const next = type === selectedType ? ALL_TYPE : type;
    setSelectedType(next);
    // “全部”仅清除业务类型；切换具体类型保留原页面的联动重置行为。
    if (next !== ALL_TYPE) {
      setSelectedPriority(null);
      setSelectedStatus(null);
    }
  };

  const handleSortModeChange = (mode: 'createdTime' | 'priority' | 'expireDate') => {
    trackTaskAction('list.sort');
    setSortMode(mode);
  };

  // 点击查询：将草稿值同步为生效值，驱动实际筛选（对齐 NoCode handleSearch）
  const handleSearch = () => {
    trackTaskAction('filter.query');
    if (!isValidNumericIdSearch(taskIdSearchDraft)) {
      message.warning('请输入有效的任务 ID（纯数字）');
      return;
    }
    trackTaskAction('query.submitted');
    setNameSearch(nameSearchDraft.trim());
    setTaskIdSearch(taskIdSearchDraft.trim());
    setCreatorSearch(creatorSearchDraft.trim());
  };

  const handleStatusClick = (status: ParentTaskDerivedStatus) => {
    trackTaskAction('filter.status');
    setSelectedStatus(prev => {
      const next = prev === status ? null : status;
      if (next === PARENT_TASK_DERIVED_STATUS.EXPIRED) setOnlyUnexpired(false);
      return next;
    });
  };

  const handleOnlyUnexpiredChange = (checked: boolean) => {
    trackTaskAction('list.unexpired');
    setOnlyUnexpired(checked);
    if (checked && selectedStatus === PARENT_TASK_DERIVED_STATUS.EXPIRED) setSelectedStatus(null);
  };

  // 重置全部筛选/排序/搜索条件，恢复初始状态并重新拉取列表
  const handleResetFilters = () => {
    trackTaskAction('filter.reset');
    setSelectedPriority(null);
    setSelectedObjectType(null);
    setSelectedType(ALL_TYPE);
    setSelectedStatus(null);
    setNameSearchDraft('');
    setNameSearch('');
    setTaskIdSearchDraft('');
    setTaskIdSearch('');
    setCreatorSearchDraft('');
    setCreatorSearch('');
    setSelectedIds([]);
    setOnlyUnexpired(true);   // 重置后恢复默认勾选状态
    setSortMode('createdTime');
  };

  // 是否存在任一生效中的筛选/排序/搜索条件（用于控制重置按钮可用态）；「仅看未过期任务」默认为选中状态，取消勾选才视为存在筛选变化
  const hasActiveFilters =
    selectedPriority !== null || selectedObjectType !== null ||
    selectedType !== ALL_TYPE ||
    selectedStatus !== null ||
    sortMode !== 'createdTime' ||
    !onlyUnexpired ||
    !!nameSearch.trim() ||
    !!taskIdSearch.trim() ||
    !!creatorSearch.trim();

  // 展示数据源：真实服务端筛选后的列表数据
  const displayTasks = tasks;

  // TC-071/072 修复：三种排序模式（按创建时间/按优先级/按截止时间）服务端均已支持真实排序，
  // 此前「按优先级」「按截止时间」模式下仍会叠加前端本地二次整理（未完成排前），导致与服务端排序结果冲突，
  // 出现同优先级/截止时间被打断、任务穿插的现象。现统一直接使用服务端返回顺序，不再做任何本地二次排序。
  const sortedTasks = displayTasks;

  const selectedTasks = displayTasks.filter(t => selectedIds.includes(t.parentTaskId));
  const hasDeletable = selectedTasks.some(t => t.canDelete);

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));
  };

  // 全选：仅对当前实际展示的数据生效（ID 精确搜索模式下以搜索结果为准）
  const allVisibleIds = sortedTasks.map(t => t.parentTaskId);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id));
  const indeterminate = selectedIds.length > 0 && !allSelected;
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? allVisibleIds : []);
  };

  const handleEditSuccess = () => {
    fetchTasks(page);
    fetchStats();
    fetchObjectTypeCounts();
  };

  // 虾蜜抽屉关闭：关闭按钮回传与 Drawer 顶部关闭都走同一条清理/刷新链路。
  const handleXiamiClose = useCallback(() => {
    xiami.close();
    fetchTasks(page);
    fetchStats();
    fetchObjectTypeCounts();
  }, [xiami, fetchTasks, page, fetchStats, fetchObjectTypeCounts]);

  return (
    <div style={{ margin: '0 auto', maxWidth: 1800, display: 'flex', flexDirection: 'column', gap: 14, padding: '15px 20px 20px' }}>
      {/* 与任务详情页 TaskFilterBar 复用同一筛选卡片骨架、字段行和操作区布局。 */}
      <div className="bd-task-batch-filter-card" style={{ ...TASK_FILTER_CARD_STYLE, paddingTop: 11, marginBottom: 0 }}>
        <div>
          <TypeStatGroup
            allCount={baseline.data?.totalCount ?? null}
            activeCode={selectedType}
            onChange={handleTypeClick}
            options={taskTypes.map(type => ({ code: type.code, label: getTaskTypeName(type.code, type.name),
              count: baseline.data?.taskTypeStats?.items.find(item => item.code === type.code)?.count ?? null }))}
          />
          {typeNames.error && <div role="alert">业务类型名称加载失败<Button type="link" size="small" onClick={() => { trackTaskAction('retry.type_dictionary'); typeNames.reload(); }}>重试</Button></div>}
          <StatGroupStack rowGap={12}>
            {/* 实体类型按可见项全部展示：数量为 0 仍保留，空间不足时自然换行，不隐藏也不折叠。 */}
            <StatGroup icon={<ProfileOutlined />} title="实体类型">
              {objectTypeOptions.map(option => <StatCard key={option.code} label={option.label} count={objectTypeCounts[option.code] ?? '—'} showCount={false} disabled={objectTypeCounts[option.code] === 0 && selectedObjectType !== option.code} active={selectedObjectType === option.code} color={MT.brandPrimary} onClick={() => { trackTaskAction('filter.object_type'); setSelectedObjectType(selectedObjectType === option.code ? null : option.code); }} />)}
            </StatGroup>
            {/* 优先级与任务状态各占一行，状态筛选不再挤在优先级右侧。 */}
            <StatGroup icon={<BarChartOutlined />} title="优先级">
              {[0, 1, 2, 3].map(p => (
                <StatCard
                  key={p}
                  count={priorityCounts[p] ?? '—'}
                  showCount={false}
                  disabled={priorityCounts[p] === 0 && selectedPriority !== p}
                  label={PRIORITY_CONFIG[p].label}
                  icon={PRIORITY_CONFIG[p].icon}
                  active={selectedPriority === p}
                  color={MT.brandPrimary}
                  onClick={() => handlePriorityClick(p)}
                />
              ))}
            </StatGroup>

            <StatGroup icon={<UnorderedListOutlined />} title="任务批次状态">
              {STATUS_ORDER.map(key => (
                <StatCard
                  key={key}
                  count={statusCounts[key] ?? '—'}
                  showCount={false}
                  disabled={statusCounts[key] === 0 && selectedStatus !== key}
                  label={STATUS_FILTER_CONFIG[key].label}
                  icon={STATUS_FILTER_CONFIG[key].icon}
                  active={selectedStatus === key}
                  color={MT.brandPrimary}
                  onClick={() => handleStatusClick(key)}
                />
              ))}
            </StatGroup>
          </StatGroupStack>
          <TaskStatsNotice loading={false} error={stats.error || dictionary.error || baseline.error} onRetry={() => { trackTaskAction('retry.type_stats'); retryStats(); }} />
          <TaskStatsNotice loading={false} error={!!visibleTypes.objectTypesError || objectStats.error} onRetry={() => { trackTaskAction('retry.object_stats'); retryObjectStats(); }} />
        </div>

        {/* 搜索字段与任务详情页保持相同的信息架构：带标题的独立字段，操作按钮右下对齐。 */}
        <div style={TASK_FILTER_SEARCH_ROW_STYLE}>
          <div style={TASK_FILTER_FIELDS_STYLE}>
            <FilterFieldLabel label="任务名称" minWidth={220}>
              <Input
                value={nameSearchDraft}
                onChange={e => setNameSearchDraft(e.target.value)}
                onPressEnter={handleSearch}
                placeholder="输入任务名称关键词"
                prefix={<SearchOutlined style={{ color: MT.textMuted }} />}
                allowClear
              />
            </FilterFieldLabel>
            <FilterFieldLabel label="任务 ID" minWidth={160}>
              <Input
                value={taskIdSearchDraft}
                onChange={e => setTaskIdSearchDraft(e.target.value)}
                onPressEnter={handleSearch}
                placeholder="输入完整任务 ID"
                prefix={<SearchOutlined style={{ color: MT.textMuted }} />}
                inputMode="numeric"
                allowClear
              />
            </FilterFieldLabel>
            <FilterFieldLabel label="任务批次创建人" minWidth={180}>
              <Input
                value={creatorSearchDraft}
                onChange={e => setCreatorSearchDraft(e.target.value)}
                onPressEnter={handleSearch}
                placeholder="输入完整创建人 mis"
                prefix={<SearchOutlined style={{ color: MT.textMuted }} />}
                allowClear
              />
            </FilterFieldLabel>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={TASK_FILTER_RESULT_COUNT_STYLE}>
            <ProfileOutlined style={{ fontSize: 13 }} />
            <span>共 {total} 个任务批次</span>
          </span>
          <div style={TASK_FILTER_ACTIONS_STYLE}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
            >
              重置
            </Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} style={{ height: 36, flexShrink: 0 }}>
              查询
            </Button>
          </div>
        </div>
      </div>

      {/* 列表工具行：全选、任务数、排序和未过期筛选依次左对齐，新建任务靠右。 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 6, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Checkbox
            checked={allSelected}
            indeterminate={indeterminate}
            onChange={e => { trackTaskAction('selection.page_all'); toggleSelectAll(e.target.checked); }}
            disabled={sortedTasks.length === 0}
            style={{ marginInline: 0 }}
          >
            全选当前页
          </Checkbox>
        </div>
        {selectedIds.length === 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flexShrink: 0, fontSize: 13, color: '#595959' }}>排序方式</span>
              <SortTabs value={sortMode} onChange={handleSortModeChange} />
            </div>
            <label style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', fontSize: 13, color: '#595959', gap: 10 }}>
              仅看未过期任务
              <Switch size="small" checked={onlyUnexpired} onChange={handleOnlyUnexpiredChange} />
            </label>
          </>
        ) : (
          <BatchToolbar
            count={selectedIds.length}
            actions={[
              {
                key: 'batch-delete',
                label: '删除',
                danger: true,
                disabled: !hasDeletable,
                onClick: handleBatchDeleteClick,
              },
            ]}
          />
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { trackTaskAction('batch.create'); xiami.open('create-task'); }} style={{ marginLeft: 'auto' }}>
          新建任务
        </Button>
      </div>

      {/* 任务卡片列表：纵向堆叠，无表头 */}
      <Spin spinning={loading}>
        {loadError && !loading ? <Alert type="error" showIcon message="任务批次加载失败" action={<Button size="small" onClick={() => { trackTaskAction('retry.task_list'); fetchTasks(page); }}>重试</Button>} /> : sortedTasks.length === 0 && !loading ? (
          <div style={{ borderRadius: MT.cardRadius, border: `1px dashed ${MT.cardBorder}`, padding: '40px 0' }}>
            {/* TC-079：按任务ID精确搜索但未命中时，展示定制文案区分于通用空列表 */}
            <Empty description={/^\d+$/.test(taskIdSearch.trim()) ? `未找到任务 ID: ${taskIdSearch.trim()}` : '暂无任务'} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedTasks.map(task => (
              <TaskCard
                key={task.parentTaskId}
                task={task}
                taskTypeName={getTaskTypeName(task.taskType)}
                canDelete={!!task.canDelete}
                selectable
                selected={selectedIds.includes(task.parentTaskId)}
                onToggleSelect={toggleSelect}
                onDeleteClick={handleDeleteClick}
                onExecute={isExecutionHidden(task.contactObjectType) ? undefined : handleExecuteClick}
                executeDisabledReason={getExecutionDisabledReason(task.contactObjectType)}
                executeLabel="全部执行"
                onEditBasicInfo={task.canDelete ? () => setEditingTask(task) : undefined}
                onEditSubTask={task.canDelete ? () => xiami.open('update-task-items', task.parentTaskId) : undefined}
                onClick={() => {
                  trackTaskAction('batch.detail');
                  navigate(`/bd-task/${task.parentTaskId}`, {
                    state: { parentTask: task, taskTypeName: getTaskTypeName(task.taskType) },
                  });
                }}
              />
            ))}
          </div>
        )}
      </Spin>

      {/* 分页：任务量较大时支持分页浏览，并可切换每页展示条数 */}
      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0' }}>
          <Pagination
            current={page} pageSize={pageSize} total={total}
            onChange={(p, ps) => {
              trackTaskAction('list.page');
              setPage(p);
              setPageSize(ps);
              setSelectedIds([]);
              fetchTasks(p, ps);
            }}
            showTotal={t => `共 ${t} 条`} showQuickJumper showSizeChanger
            size="small"
          />
        </div>
      )}

      {/* 删除二次确认弹窗（单个 + 批量共用） */}
      <Modal
        open={deleteModal.visible}
        title={null}
        footer={null}
        onCancel={handleDeleteCancel}
        centered
        width={420}
      >
        <div style={{ padding: '24px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <ExclamationCircleOutlined style={{ fontSize: 40, color: MT.danger }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: MT.textPrimary, textAlign: 'center' }}>
            {deleteModal.taskIds.length > 1
              ? `确认批量删除选中的 ${deleteModal.taskIds.length} 个任务？`
              : '确认删除任务批次？'}
          </div>
          <div style={{ fontSize: 13, color: MT.textMuted, textAlign: 'center' }}>
            正在删除任务，请确认是否删除
          </div>
          {deleteModal.taskName && (
            <div style={{ fontSize: 13, color: MT.textPrimary, background: MT.dangerBg, border: `1px solid ${MT.dangerBorder}`, borderRadius: MT.cardRadiusSmall, padding: '6px 14px', width: '100%', textAlign: 'center' }}>
              {deleteModal.taskName}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16 }}>
          <Button onClick={handleDeleteCancel}>取消</Button>
          <Button
            type="primary"
            danger
            loading={deleteModal.loading}
            onClick={handleDeleteConfirm}
          >
            确认
          </Button>
        </div>
      </Modal>

      <EditParentTaskModal
        open={!!editingTask}
        task={editingTask}
        taskTypes={taskTypes}
        taskTypeNameMap={taskTypeNameMap}
        onClose={() => setEditingTask(null)}
        onSuccess={handleEditSuccess}
      />

      <XiamiTaskDrawer
        open={xiami.state != null}
        action={xiami.state?.action ?? null}
        parentTaskId={xiami.state?.parentTaskId}
        onClose={handleXiamiClose}
      />
      <ShopExecutionDrawer
        communicationParentTask={executionTask ?? undefined}
        batchExecution
        showUnsupportedBatchAbilities
        open={executionTask != null}
        parentTaskId={executionTask?.parentTaskId ?? 0}
        contactObjectType={executionTask?.contactObjectType}
        onSuccess={() => { fetchTasks(page); fetchStats(); fetchObjectTypeCounts(); }}
        onClose={() => setExecutionTask(null)}
      />
    </div>
  );
};

export default ParentTaskList;
