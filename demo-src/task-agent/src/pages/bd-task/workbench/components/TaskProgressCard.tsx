import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useMemo } from 'react';
import { Card, Skeleton, Empty, Button, Typography, Space, Tooltip } from 'antd';
import { ReloadOutlined, BarChartOutlined, QuestionCircleOutlined, RightOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { AsyncCardState } from '../hooks/useAsyncCard';
import type { TaskProgressPageDto } from '@/types/workbench';
import { isEmptyWorkbenchData } from '../hooks/useWorkbenchData';
import { mergeOthers } from '../utils/mergeOthers';
import { filterByRecentNew, filterByTaskType } from '../utils/detailFilter';
import ClickableStat from './ClickableStat';
import { MT } from '../../theme';
import { useTaskTypeDictionary } from '../../hooks/useTaskTypeDictionary';
import './workbench-responsive.css';

const { Title, Text } = Typography;

interface TaskProgressCardProps {
  card: AsyncCardState<TaskProgressPageDto>;
  orgSelected: boolean;
  /** 拼装明细弹窗副标题所需的当前创建时间区间 + 组织架构范围文案（Requirement 8.3） */
  scopeText: string;
  onOpenDetailModal: (params: { title: string; subtitle: string; detailList: TaskProgressPageDto['detailList']; initialTab?: string; showTabs?: boolean; isP0Entry?: boolean }) => void;
}

const BUSINESS_COLORS = MT.chart.businessColors;

/** 推进情况卡片：还原视觉稿「任务推进情况」——4 项 KPI + 分隔线 + 业务类型环形图（ECharts）+ 卡片式图例。 */
const TaskProgressCard: React.FC<TaskProgressCardProps> = ({ card, orgSelected, scopeText, onOpenDetailModal }) => {
  const { data, loading, error, refetch } = card;

  const { getTaskTypeName } = useTaskTypeDictionary();

  const pieData = data
    ? mergeOthers(
        data.taskTypeDistribution,
        (t) => t.parentTaskCount,
        // 后端将未设置业务类型聚合进 0 桶；若租户真的配置了 0，完整字典名称仍优先。
        (t) => getTaskTypeName(t.taskType, Number(t.taskType) === 0 ? '未设置业务类型' : undefined),
        5,
      )
    : [];
  const businessLegend = pieData.map((item, index) => ({
    ...item,
    color: BUSINESS_COLORS[index % BUSINESS_COLORS.length],
    taskType: item.source?.taskType,
  }));

  const businessOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'item' as const,
        appendToBody: true,
        confine: false,
        borderWidth: 0,
        backgroundColor: '#FFFFFF',
        padding: [10, 12],
        extraCssText: 'z-index:1000;border-radius:8px;box-shadow:none;',
        formatter: (p: any) =>
          `${p.marker}${p.name}<br/><b>${p.value}</b> 个任务批次 · ${p.percent}%`,
      },
      series: [
        {
          type: 'pie',
          radius: ['55%', '80%'],
          center: ['50%', '50%'],
          startAngle: 90,
          clockwise: true,
          label: { show: false },
          emphasis: { scale: true, scaleSize: 5 },
          itemStyle: { borderColor: '#FFFFFF', borderWidth: 3, borderRadius: 4 },
          data: businessLegend
            .filter((item) => item.value > 0)
            .map((item) => ({ value: item.value, name: item.label, itemStyle: { color: item.color } })),
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '35%',
          style: {
            text: `${businessLegend.length}`,
            textAlign: 'center',
            fill: MT.brandPrimary,
            fontSize: 25,
            fontWeight: 700,
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '54%',
          style: {
            text: '业务类型',
            textAlign: 'center',
            fill: MT.textTertiary,
            fontSize: 12,
            fontWeight: 600,
          },
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [JSON.stringify(businessLegend), data?.parentTaskCount],
  );

  // 复用 queryTaskProgress 返回的任务批次明细：近7日新增且 priority=0 即为近7日新增 P0 任务批次。
  const recentNewDetailList = data ? filterByRecentNew(data.detailList) : [];
  const recentNewP0Count = recentNewDetailList.filter((item) => Number(item.priority) === 0).length;

  const handleRecentNewClick = () => {
    trackTaskAction('focus.recent_new_detail');
    if (!data) return;
    onOpenDetailModal({
      title: '近7日新增任务批次明细',
      subtitle: `${scopeText}，当前范围内共 ${recentNewDetailList.length} 个近7日新增任务批次`,
      detailList: recentNewDetailList,
    });
  };

  return (
    <Card
      style={{ border: 'none', borderRadius: MT.cardRadius, boxShadow: MT.cardShadow }}
      styles={{ body: { padding: 18 } }}
    >
      <Space size={7} align="center" style={{ marginBottom: 16 }}>
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
          <BarChartOutlined />
        </span>
        <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 600, color: MT.textPrimary }}>
          任务推进情况
        </Title>
        <Tooltip title="展示任务规模、完成进展及任务批次业务类型分布。占比为四舍五入值。">
          <QuestionCircleOutlined style={{ color: MT.textTertiary, fontSize: 13, cursor: 'help' }} />
        </Tooltip>
      </Space>

      {!orgSelected ? (
        <Empty description="请先选择组织架构" style={{ padding: '30px 0' }} />
      ) : loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 12, color: MT.danger }}>加载失败，点击重试</div>
          <Button icon={<ReloadOutlined />} onClick={() => { trackTaskAction('retry.progress'); refetch(); }}>
            重试
          </Button>
        </div>
      ) : !data || isEmptyWorkbenchData(data) ? (
        <Empty description="当前筛选范围暂无数据" style={{ padding: '30px 0' }} />
      ) : (
        <>
          <div className="wb-progress-grid">
            <section className="wb-parent-overview" aria-label="任务批次总量及业务类型分布">
              <div className="wb-parent-total">
                <span>任务批次总量</span>
                <b style={{ color: MT.brandPrimary }}>{data.parentTaskCount}</b>
                <small>{data.achievedParentCount} 个已完成</small>
              </div>
              <div className="wb-business-chart-group">
                {businessLegend.length === 0 ? (
                  <Empty description="暂无数据" style={{ padding: '20px 0' }} />
                ) : (
                  <ReactECharts option={businessOption} className="wb-business-chart" style={{ height: 160 }} notMerge />
                )}
              </div>
              <div className="wb-business-legend wb-soft-scrollbar">
                {businessLegend.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="wb-business-legend-item"
                    onClick={() => {
                      trackTaskAction('focus.task_type_detail');
                      if (!data || item.taskType === undefined) return;
                      const filtered = filterByTaskType(data.detailList, item.taskType);
                      onOpenDetailModal({
                        title: `${item.label}任务批次明细`,
                        subtitle: `${scopeText}，当前范围内共 ${filtered.length} 个${item.label}任务批次`,
                        detailList: filtered,
                      });
                    }}
                  >
                    <i style={{ background: item.color }} />
                    <Text
                      ellipsis={{
                        tooltip: {
                          title: item.label,
                          color: '#1F1F1F',
                          placement: 'top',
                        },
                      }}
                      style={{ minWidth: 0, maxWidth: '100%', color: MT.textMuted, fontSize: 12 }}
                    >
                      {item.label}
                    </Text>
                    <RightOutlined style={{ color: MT.clickArrow, fontSize: 11, transition: 'transform .16s ease' }} />
                    <div className="wb-business-meta">
                      <small>{item.value} 个</small>
                      <b>{data.parentTaskCount > 0 ? `${((item.value / data.parentTaskCount) * 100).toFixed(0)}%` : '0%'}</b>
                    </div>
                  </button>
                ))}
              </div>
            </section>
            <KpiItem label="任务项总量" value={data.totalTaskCount.toLocaleString()} note={`${data.achievedTaskCount} 个已完成`} tone="neutral" />
            <ClickableStat as="div" onClick={handleRecentNewClick} className="wb-progress-kpi wb-progress-kpi-success">
              <span style={kpiLabelStyle}>近七日新增任务批次量</span>
              <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{data.recentSevenDayNewParentCount}<RightOutlined style={{ color: MT.clickArrow, fontSize: 11, transition: 'transform .16s ease' }} /></b>
              <small style={kpiNoteStyle}>含 {recentNewP0Count} 个 P0 任务批次</small>
            </ClickableStat>
            <KpiItem label="覆盖商家数" value={data.shopCount} note={`覆盖 ${businessLegend.length} 个业务类型`} tone="neutral" />
          </div>
        </>
      )}
    </Card>
  );
};

const kpiLabelStyle: React.CSSProperties = {
  minHeight: 18,
  margin: '0 0 8px',
  color: MT.textMuted,
  fontSize: 13,
  fontWeight: 600,
};

const kpiNoteStyle: React.CSSProperties = {
  minHeight: 18,
  marginTop: 6,
  color: MT.textTertiary,
  fontSize: 12,
  fontWeight: 400,
};

const KpiItem: React.FC<{ label: string; value: React.ReactNode; note: string; tone: 'theme' | 'neutral' | 'success' }> = ({
  label,
  value,
  note,
  tone,
}) => {
  const valueColor = tone === 'theme' ? MT.brandPrimary : tone === 'success' ? MT.success : MT.textPrimary;
  return (
    <div className={`wb-progress-kpi${tone === 'success' ? ' wb-progress-kpi-success' : ''}`}>
      <span style={kpiLabelStyle}>{label}</span>
      <b style={{ color: valueColor }}>{value}</b>
      <small style={kpiNoteStyle}>{note}</small>
    </div>
  );
};

export default TaskProgressCard;
