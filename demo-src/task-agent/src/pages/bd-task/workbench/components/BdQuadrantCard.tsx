import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useEffect, useMemo, useRef } from 'react';
import { Card, Skeleton, Empty, Button, Typography, Space, Tooltip } from 'antd';
import { ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { workbenchApi } from '@/services/workbenchApi';
import { buildWorkbenchStatsReq, type WorkbenchFilters } from '../hooks/useWorkbenchFilters';
import { useAsyncCard } from '../hooks/useAsyncCard';
import { useCityAnchor } from '../hooks/useCityAnchor';
import type { OrgNode } from '../hooks/useOrgTree';
import CitySubFilter from './CitySubFilter';
import BdQuadrantChart from './BdQuadrantChart';
import { MT } from '../../theme';
import './workbench-responsive.css';

const { Title, Text } = Typography;

interface BdQuadrantCardProps {
  topFilters: WorkbenchFilters;
  onOpenSupervisionModal: () => void;
  /** 与 WorkbenchFilterBar/OrgTreeSelector 共享同一 useOrgTree() 实例（由 FocusTab.tsx 提升并传入） */
  fetchOrgChildren: (parentId: number) => Promise<OrgNode[]>;
  fetchOrgNodeById: (orgId: number) => OrgNode | undefined;
  getNodePath: (orgId: number) => OrgNode[];
}

/**
 * 需要关注的 BD 卡片：还原视觉稿「需要关注的 BD」——
 * 左侧固定宽度摘要区（需关注BD数 + 说明文案 + 象限图例）+ 右侧 ECharts 四象限散点图。
 * 自建独立的 useAsyncCard 实例调用 queryBdStats(buildWorkbenchStatsReq(topFilters, [cityOrgId]))，
 * 不复用 useWorkbenchData 共用 req（cityOrgId 变化频率与其余5个卡片不一致）。
 */
const BdQuadrantCard: React.FC<BdQuadrantCardProps> = ({
  topFilters,
  onOpenSupervisionModal,
  fetchOrgChildren,
  fetchOrgNodeById,
  getNodePath,
}) => {
  const { cityOrgId, setCityOrgId, error: cityError, loading: cityLoading, resolve } = useCityAnchor(
    fetchOrgChildren,
    fetchOrgNodeById,
  );
  const topOrgIdsKey = useMemo(() => [...topFilters.orgIds].sort((a, b) => a - b).join(','), [topFilters.orgIds]);
  const prevKeyRef = useRef<string | null>(null);

  // 仅在顶部 orgIds 实际变化时重新计算城市锚点（会话内一致性缓存由 useCityAnchor 内部维护）
  useEffect(() => {
    if (topFilters.orgIds.length === 0) return;
    if (prevKeyRef.current === topOrgIdsKey) return;
    prevKeyRef.current = topOrgIdsKey;
    resolve(topFilters.orgIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topOrgIdsKey]);

  const bdReqEnabled = topFilters.orgIds.length > 0 && cityOrgId !== null && !cityError;
  const bdReq = useMemo(
    () => buildWorkbenchStatsReq(topFilters, cityOrgId !== null ? [cityOrgId] : []),
    [topFilters, cityOrgId],
  );

  const { data, loading, error, refetch } = useAsyncCard(
    () => workbenchApi.queryBdStats(bdReq),
    [JSON.stringify(bdReq)],
    bdReqEnabled,
  );

  const isEmpty = !data || data.list.length === 0;

  return (
    <Card
      style={{ border: 'none', borderRadius: MT.cardRadius, boxShadow: MT.cardShadow }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Space size={7} align="center">
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: MT.brandPrimaryLight,
              color: MT.brandPrimary,
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserOutlined />
          </span>
          <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 600, color: MT.textPrimary }}>
            需要关注的 BD
          </Title>
        </Space>
        <CitySubFilter
          cityOrgId={cityOrgId}
          error={cityError}
          fetchOrgChildren={fetchOrgChildren}
          fetchOrgNodeById={fetchOrgNodeById}
          getNodePath={getNodePath}
          rootOrgIds={topFilters.orgIds}
          onChange={id => { trackTaskAction('focus.city_select'); setCityOrgId(id); }}
        />
      </div>

      {topFilters.orgIds.length === 0 ? (
        <Empty description="请先选择组织架构" style={{ padding: '40px 0' }} />
      ) : cityError ? (
        <Empty description={cityError} style={{ padding: '40px 0' }} />
      ) : cityLoading && cityOrgId === null ? (
        // 默认城市后台计算中且尚无任何选中值：仅此时展示轻量提示（筛选器本身仍已可交互，不被阻塞）；
        // 若用户在计算完成前已手动选择了城市，cityOrgId 会提前非 null，直接走下方数据请求分支，不再等待后台计算结果。
        <div style={{ textAlign: 'center', padding: '40px 0', color: MT.textMuted, fontSize: 13 }}>
          正在计算默认城市，可直接在上方展开选择
        </div>
      ) : loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ marginBottom: 12, color: MT.danger }}>加载失败，点击重试</div>
          <Button icon={<ReloadOutlined />} onClick={() => { trackTaskAction('retry.quadrant'); refetch(); }}>
            重试
          </Button>
        </div>
      ) : isEmpty ? (
        <Empty description="当前筛选范围暂无数据" style={{ padding: '40px 0' }} />
      ) : (
        <div className="wb-bd-layout">
          <div
            className="wb-bd-summary"
          >
            <Text className="wb-bd-summary-title" style={{ color: MT.textMuted, fontSize: 12 }}>需关注的 BD 数</Text>
            <b style={{ display: 'block', marginTop: 6, color: MT.textPrimary, fontSize: 30, fontWeight: 500 }}>
              {data!.needSupportBdCount} <small style={{ color: MT.textPrimary, fontSize: 12, fontWeight: 400 }}>/ {data!.activeBdCount} 位</small>
            </b>
            <p style={{ color: MT.textMuted, fontSize: 12, lineHeight: 1.65, margin: '10px 0 0', maxWidth: 220, marginBottom: 0 }}>
              任务负荷较高且任务项达标率偏低，建议优先确认阻塞并调整资源。
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 50 }}>
              <QuadrantLegendItem color={MT.chart.quadrantColors.stable} label="状态稳定" desc="负荷适中且执行稳定，维持日常节奏" />
              <QuadrantLegendItem color={MT.chart.quadrantColors.normal} label="任务承压" desc="任务量大但执行稳定，建议关注资源支持" />
              <QuadrantLegendItem color={MT.chart.quadrantColors.slow} label="进度偏慢" desc="负荷不高但执行偏弱，建议排查方法、难度或阻塞" />
              <QuadrantLegendItem color={MT.chart.quadrantColors.urgent} label="需要关注" desc="负荷高且执行偏弱，优先关注，可发起督办" />
            </div>
            <small className="wb-bd-summary-footnote" style={{ display: 'block', color: '#999999', fontSize: 12, marginTop: 'auto', lineHeight: 1.5 }}>
              中位线：当前范围中位数
            </small>
          </div>
          <BdQuadrantChart list={data!.list} onPointClick={onOpenSupervisionModal} />
        </div>
      )}
    </Card>
  );
};

const QuadrantLegendItem: React.FC<{ color: string; label: string; desc: string }> = ({ color, label, desc }) => (
  <Tooltip title={desc} placement="top">
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: MT.textTertiary, fontSize: 12, cursor: 'help', width: 'fit-content' }}>
      <i style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: '0 0 8px' }} />
      {label}
    </span>
  </Tooltip>
);

export default BdQuadrantCard;
