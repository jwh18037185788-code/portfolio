import { trackTaskAction } from '@/lib/taskAnalytics';
import { useTaskAnalyticsView } from '@/lib/useTaskAnalyticsView';
import React, { useMemo, useState } from 'react';
import { Button, Typography } from 'antd';
import dayjs from 'dayjs';
import { useWorkbenchFilters } from './hooks/useWorkbenchFilters';
import { useWorkbenchData, isEmptyWorkbenchData } from './hooks/useWorkbenchData';
import { useOrgTree } from './hooks/useOrgTree';
import { useDefaultOrgIds } from './hooks/useDefaultOrgIds';
import WorkbenchFilterBar from './components/WorkbenchFilterBar';
import ConclusionCard from './components/ConclusionCard';
import TaskProgressCard from './components/TaskProgressCard';
import ExpireRiskCard from './components/ExpireRiskCard';
import BdQuadrantCard from './components/BdQuadrantCard';
import ExecutionGuardCard from './components/ExecutionGuardCard';
import SourceDiagnosisCard from './components/SourceDiagnosisCard';
import ParentTaskDetailModal, {
  EMPTY_DETAIL_MODAL_STATE,
  type ParentTaskDetailModalState,
} from './components/ParentTaskDetailModal';
import SupervisionConfirmModal from './components/SupervisionConfirmModal';
import type { ParentTaskDetailItem, WorkbenchStatsReq } from '@/types/workbench';
import { MT } from '../theme';

const { Text } = Typography;

/**
 * 「重点关注」Tab 主体：组合筛选栏 + 数据 Hook + 六大卡片 + 两个弹窗，
 * 负责 openDetailModal/openSupervisionModal 的状态提升与向下透传。
 */
const FocusTab: React.FC = () => {
  const { filters, setDateRange, setOrgIds, resetFilters, req } = useWorkbenchFilters();
  const { conclusion, progress, expireRisk, execution, source, lastRefreshedAt, refetchAll } =
    useWorkbenchData(req);

  // 🔧 提升为单一共享实例：WorkbenchFilterBar（OrgTreeSelector）与 BdQuadrantCard（useCityAnchor）
  // 复用同一份组织树节点缓存，避免各自独立调用 useOrgTree() 导致缓存不共享、重复下钻请求。
  const { fetchOrgChildren, fetchOrgNodeById, getNodePath } = useOrgTree();

  useDefaultOrgIds(fetchOrgChildren, filters.orgIds.length > 0, setOrgIds);

  const [detailModal, setDetailModal] = useState<ParentTaskDetailModalState>(EMPTY_DETAIL_MODAL_STATE);
  const [supervisionModalVisible, setSupervisionModalVisible] = useState(false);
  const [supervisionReq, setSupervisionReq] = useState<WorkbenchStatsReq | null>(null);

  const orgSelected = filters.orgIds.length > 0;
  const refreshing = conclusion.loading || progress.loading || expireRisk.loading || execution.loading || source.loading;

  // 拼装明细弹窗副标题所需的“当前创建时间区间 + 组织架构范围”文案（Requirement 8.3 明确要求）。
  // 组织名称优先从共享的 useOrgTree 节点缓存中取（选中操作发生在已渲染节点上，必然已缓存），
  // 若个别节点未命中缓存则降级展示 orgId 本身，不影响整体可用性。
  const scopeText = useMemo(() => {
    const [from, to] = filters.dateRange;
    const dateText = from && to ? `${dayjs(from).format('YYYY-MM-DD')} 至 ${dayjs(to).format('YYYY-MM-DD')}` : '全部时间';
    const orgText =
      filters.orgIds.length === 0
        ? '未选择组织'
        : filters.orgIds
            .map((id) => fetchOrgNodeById(id)?.name ?? `#${id}`)
            .join('、');
    return `创建时间：${dateText}；组织范围：${orgText}`;
  }, [filters.dateRange, filters.orgIds, fetchOrgNodeById]);

const openDetailModal = (params: { title: string; subtitle: string; detailList: ParentTaskDetailItem[]; initialTab?: string; showTabs?: boolean; isP0Entry?: boolean }) => {
  setDetailModal({ visible: true, ...params } as any);
};
  const closeDetailModal = () => setDetailModal(EMPTY_DETAIL_MODAL_STATE);

  const openSupervisionModal = () => {
    setSupervisionReq(req);
    setSupervisionModalVisible(true);
  };
  const closeSupervisionModal = () => setSupervisionModalVisible(false);
  useTaskAnalyticsView(detailModal.visible, 'workbench.batch_detail');
  useTaskAnalyticsView(supervisionModalVisible, 'workbench.supervision_preview');

  // 6 个共用卡片中任一命中空态时展示"重置筛选"入口（BD 四象限卡片使用独立二级城市筛选，不适用该重置入口）
  const anyEmpty =
    orgSelected &&
    !refreshing &&
    (isEmptyWorkbenchData(conclusion.data) ||
      isEmptyWorkbenchData(progress.data) ||
      isEmptyWorkbenchData(expireRisk.data) ||
      isEmptyWorkbenchData(execution.data) ||
      isEmptyWorkbenchData(source.data));

  return (
    <div>
      <WorkbenchFilterBar
        filters={filters}
        onDateRangeChange={setDateRange}
        onOrgIdsChange={setOrgIds}
        lastRefreshedAt={lastRefreshedAt}
        onRefresh={refetchAll}
        refreshing={refreshing}
        fetchOrgChildren={fetchOrgChildren}
        fetchOrgNodeById={fetchOrgNodeById}
        getNodePath={getNodePath}
      />

      {anyEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <Text style={{ fontSize: 12, color: MT.textMuted }}>部分模块当前筛选范围暂无数据</Text>
          <Button
            size="small"
            onClick={() => {
              trackTaskAction('workbench.reset_filters');
              resetFilters();
            }}
          >
            重置筛选
          </Button>
        </div>
      )}

      {/* 卡片流：全部单列纵向排列，主卡片及与上方筛选区的间距统一为 12px。 */}
      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <ConclusionCard card={conclusion} onOpenSupervisionModal={openSupervisionModal} orgSelected={orgSelected} />

        <TaskProgressCard card={progress} orgSelected={orgSelected} scopeText={scopeText} onOpenDetailModal={openDetailModal} />

        <ExpireRiskCard card={expireRisk} orgSelected={orgSelected} scopeText={scopeText} onOpenDetailModal={openDetailModal} />

        <BdQuadrantCard
          topFilters={filters}
          onOpenSupervisionModal={openSupervisionModal}
          fetchOrgChildren={fetchOrgChildren}
          fetchOrgNodeById={fetchOrgNodeById}
          getNodePath={getNodePath}
        />

        <ExecutionGuardCard card={execution} orgSelected={orgSelected} />

        <SourceDiagnosisCard card={source} orgSelected={orgSelected} scopeText={scopeText} onOpenDetailModal={openDetailModal} />
      </div>

      <ParentTaskDetailModal state={detailModal} onClose={closeDetailModal} />
      <SupervisionConfirmModal
        visible={supervisionModalVisible}
        req={supervisionReq}
        onClose={closeSupervisionModal}
      />
    </div>
  );
};

export default FocusTab;
