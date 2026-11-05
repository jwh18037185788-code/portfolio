import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import {
  Card,
  Alert,
  Table,
  DatePicker,
  Button,
  Spin,
  Empty,
  Typography,
  Space,
  Tag,
  Badge,
  Tooltip,
} from 'antd';
import {
  BarChartOutlined,
  PieChartOutlined,
  UnorderedListOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTaskTypeDictionary } from './hooks/useTaskTypeDictionary';
import { bdTaskApi } from '@/services/bdTaskApi';
import type {
  BdStatsDto,
  ParentTaskOverviewDto,
} from '@/types/bdTask';
import { BATCH_ACTION_BUTTON_STYLE, MT, MT_FILLED_TAG_STYLE } from './theme';
import PersonName from './components/PersonName';
import { PRIORITY_CONFIG } from './components/TaskCard';
import BatchExecutionDetail from './workbench/components/BatchExecutionDetail';
import InfoTooltip from './workbench/components/InfoTooltip';
import { groupBusinessTypes } from './workbench/utils/businessTypeData';
import OrgTreeSelector from './workbench/components/OrgTreeSelector';
import { useOrgTree, type OrgNode } from './workbench/hooks/useOrgTree';
import { useBatchResource } from './workbench/hooks/useBatchResource';
import { useDefaultOrgIds } from './workbench/hooks/useDefaultOrgIds';
import { useTenantStore } from '@/stores/tenantStore';
import './workbench/components/workbench-responsive.css';
import './analysis-detail.css';
import { donutCenterGraphic } from './workbench/utils/donutCenterGraphic';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const BUSINESS_COLORS = MT.chart.businessColors;
const PARENT_TABLE_MIN_WIDTH = 1040;

// ==================== ModuleTitle（对齐 Codex V4 .v2-module-icon / .v2-module-title） ====================
function ModuleTitle({ icon, title, tooltip }: { icon: React.ReactNode; title: string; tooltip: string }) {
  return (
    <Space size={7} align="center">
      <span className="v2-module-icon">{icon}</span>
      <span className="v2-module-title">{title}</span>
      <Tooltip title={tooltip}>
        <QuestionCircleOutlined className="v2-help" />
      </Tooltip>
    </Space>
  );
}

// ==================== 主页面 ====================
const AnalysisPage: React.FC = () => {
  const { getTaskTypeName } = useTaskTypeDictionary();
  const tenantId = Number(useTenantStore((state) => state.currentTenantId));
  const { fetchOrgChildren: loadOrgChildren, fetchOrgNodeById, getNodePath } = useOrgTree();
  const pendingOrgRequests = useRef(new Map<string, Promise<OrgNode[]>>());
  // 全局选择器与默认节点共用同一个进行中的请求；完成或失败后移除，结果缓存仍由 useOrgTree 管理。
  const fetchOrgChildren = useCallback((parentId: number): Promise<OrgNode[]> => {
    const key = `${tenantId}:${parentId}`;
    const pending = pendingOrgRequests.current.get(key);
    if (pending) return pending;
    const request = loadOrgChildren(parentId).finally(() => {
      pendingOrgRequests.current.delete(key);
    });
    pendingOrgRequests.current.set(key, request);
    return request;
  }, [tenantId, loadOrgChildren]);
  const [orgIds, setSelectedOrgIds] = useState<number[]>([]);
  useDefaultOrgIds(fetchOrgChildren, orgIds.length > 0, setSelectedOrgIds);
  const globalOrgs = useMemo(() => orgIds.map((id) => fetchOrgNodeById(id)).filter((node): node is OrgNode => !!node), [orgIds, fetchOrgNodeById]);
  const hasOrgs = orgIds.length > 0;
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);
  const [query, setQuery] = useState(() => ({
    createdTimeFrom: dateRange[0].format('YYYY-MM-DD'),
    createdTimeTo: dateRange[1].format('YYYY-MM-DD'), revision: 0,
  }));
  const matrixScope = {
    createTimeFrom: Number(query.createdTimeFrom.replace(/-/g, '')),
    createTimeTo: Number(query.createdTimeTo.replace(/-/g, '')), revision: query.revision,
  };
  const requestKey = JSON.stringify([tenantId, orgIds, query]);
  const statsReq = { tenantId, orgNodeIds: orgIds, createdTimeFrom: query.createdTimeFrom, createdTimeTo: query.createdTimeTo };
  // 全局统计独立加载，不依赖批次组织规则，也不等待其他统计接口。
  const summaryResult = useBatchResource(`summary:${requestKey}`, hasOrgs,
    () => bdTaskApi.queryTaskStatsSummary(statsReq));
  const bdResult = useBatchResource(`bd:${requestKey}`, hasOrgs,
    () => bdTaskApi.queryBdStats(statsReq));
  const [parentPagination, setParentPagination] = useState({ key: '', page: 1 });
  const parentPage = parentPagination.key === requestKey ? parentPagination.page : 1;
  const parentResult = useBatchResource(`parents:${requestKey}:${parentPage}`, hasOrgs,
    () => bdTaskApi.queryParentTaskList({ tenantId, orgNodeIds: orgIds, page: parentPage, pageSize: 5 }));
  const summary = summaryResult.data ?? null;
  const aiUsageRate = summary?.aiUsageRate;
  const aiCompletedCount = summary?.aiCompletedCount;
  const bdStats = bdResult.data ?? [];
  const parentTasks = parentResult.data?.data ?? [];
  const parentCardRef = useRef<HTMLDivElement>(null);
  const [parentColumnWidths, setParentColumnWidths] = useState<number[]>([]);
  useLayoutEffect(() => {
    const content = parentCardRef.current?.querySelector<HTMLElement>('.ant-table-content');
    const table = content?.querySelector('table');
    const header = table?.tHead?.rows[0];
    if (!content || !table || !header) return;

    const measure = () => {
      const viewportWidth = content.clientWidth;
      if (!viewportWidth) return;
      const bodyRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr[data-row-key]'));
      if (!bodyRows.length) return;
      const range = document.createRange();
      const contentWidths = Array.from(header.cells, (cell, index) => {
        const cells = [cell, ...bodyRows.map(row => row.cells[index])];
        return Math.max(...cells.map(columnCell => {
          range.selectNodeContents(columnCell);
          return range.getBoundingClientRect().right - columnCell.getBoundingClientRect().left;
        }));
      });
      const totalWidth = Math.max(PARENT_TABLE_MIN_WIDTH, viewportWidth);
      // Add the same right-side space to the widest displayed content in each column.
      const rightSpace = Math.max(8, (totalWidth - contentWidths.reduce((sum, width) => sum + width, 0)) / contentWidths.length);
      const widths = contentWidths.map(width => width + rightSpace);
      setParentColumnWidths(previous => widths.length === previous.length &&
        widths.every((width, index) => Math.abs(width - previous[index]) < 0.1) ? previous : widths);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    document.fonts.addEventListener('loadingdone', measure);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', measure);
    };
  }, [parentTasks, parentResult.loading, getTaskTypeName]);
  const errors = [summaryResult, bdResult, parentResult].flatMap((item, index) => item.error
    ? [`${['概览统计', 'BD 统计', '任务批次列表'][index]}：${item.error}`] : []);
  const refreshing = [summaryResult, bdResult, parentResult].some((item) => item.loading);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>();
  useEffect(() => {
    if (hasOrgs) setLastRefreshedAt(Date.now());
  }, [requestKey, hasOrgs]);
  const fetchAll = () => setQuery((previous) => ({
    createdTimeFrom: dateRange[0].format('YYYY-MM-DD'),
    createdTimeTo: dateRange[1].format('YYYY-MM-DD'), revision: previous.revision + 1,
  }));

  // ===== 派生展示数据 =====
  // 直接展示后端百分比字符串，保留其小数位。
  const parentCompletionRate = summary?.parentCompletionRate ?? '0.00%';
  const subTaskCompletionRate = summary?.completionRate ?? '0.00%';
  const riskParentTaskCount = summary?.soonDueParentTaskCount;
  const shopCount = summary?.shopCount ?? 0;

  // 业务类型分布环形图数据
  const businessTypeData = useMemo(() => {
    return groupBusinessTypes(summary?.typeStats ?? []).map((item, index) => ({
      ...item,
      color: BUSINESS_COLORS[index % BUSINESS_COLORS.length],
    }));
  }, [summary]);

  const taskTypeTotal = businessTypeData.reduce((sum, item) => sum + item.count, 0);

  const businessChart = useRef<ReactECharts>(null);
  const showBusinessDetail = (index: number) => {
    const chart = businessChart.current?.getEchartsInstance();
    chart?.dispatchAction({ type: 'downplay', seriesIndex: 0 });
    chart?.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: index });
    chart?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index });
  };
  const hideBusinessDetail = () => {
    const chart = businessChart.current?.getEchartsInstance();
    chart?.dispatchAction({ type: 'downplay', seriesIndex: 0 });
    chart?.dispatchAction({ type: 'hideTip' });
  };
  const businessOption = useMemo(() => ({
    animationDuration: 350,
    tooltip: {
      trigger: 'item' as const, confine: true, borderColor: MT.brandPrimary, borderWidth: 1,
      backgroundColor: '#fff', padding: [10, 12], textStyle: { color: MT.textMuted, fontSize: 12 },
      formatter: (p: any) => `${p.data.name}<br/><b>${p.data.percent}%</b> · ${p.data.count.toLocaleString()} 个任务项`,
    },
    series: [{
      type: 'pie', radius: ['58%', '78%'], center: ['50%', '50%'], startAngle: 90,
      label: { show: false }, labelLine: { show: false }, selectedMode: false,
      emphasis: { scale: true, scaleSize: 6 },
      itemStyle: { borderColor: '#FFFFFF', borderWidth: 3, borderRadius: 4 },
      data: businessTypeData.filter(item => item.count > 0)
        .map(item => ({ ...item, value: item.count, itemStyle: { color: item.color } })),
    }],
    graphic: donutCenterGraphic(String(taskTypeTotal), '任务项', 280),
  }), [businessTypeData, taskTypeTotal]);

  const trend = summary?.completionTrend ?? [];
  const trendOption = useMemo(() => ({
    animationDuration: 350,
    color: [MT.brandPrimary, '#13BFC4'],
    tooltip: { trigger: 'axis' as const, confine: true, borderColor: MT.brandPrimary,
      valueFormatter: (value: unknown) => `${value}%` },
    legend: { top: 0, right: 0, itemWidth: 22, itemHeight: 9, itemGap: 12,
      textStyle: { color: '#777777', fontSize: 11 } },
    grid: { top: 40, left: 44, right: 12, bottom: 30 },
    xAxis: { type: 'category', boundaryGap: false, data: trend.map(point => point.date.slice(5).replace('-', '/')),
      axisLine: { lineStyle: { color: '#DDE1EB' } }, axisTick: { show: false },
      axisLabel: { color: '#777777', fontSize: 11, margin: 12 } },
    yAxis: { type: 'value', min: 0, max: 100, interval: 20,
      axisLabel: { formatter: '{value}%', color: '#777777', fontSize: 11 },
      axisTick: { show: false }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#EEF0F5' } } },
    series: [
      { name: '父任务完成率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
        data: trend.map(point => point.parentRate), lineStyle: { width: 2, color: MT.brandPrimary },
        itemStyle: { color: '#FFFFFF', borderColor: MT.brandPrimary, borderWidth: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(72,42,247,.10)' }, { offset: 1, color: 'rgba(72,42,247,.01)' }] } } },
      { name: '子任务完成率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
        data: trend.map(point => point.taskRate), lineStyle: { width: 2, color: '#13BFC4' },
        itemStyle: { color: '#FFFFFF', borderColor: '#13BFC4', borderWidth: 2 } },
    ],
  }), [trend]);

  const rateOf = (row: BdStatsDto) => row.totalCount ? row.completedCount / row.totalCount * 100 : 0;
  const rankedBdStats = useMemo(() => [...bdStats]
    .sort((a, b) => rateOf(b) - rateOf(a) || b.completedCount - a.completedCount)
    .map((row, index) => ({ ...row, rank: index + 1 })), [bdStats]);
  const bdColumns: ColumnsType<BdStatsDto & { rank: number }> = [
    { title: '排名', dataIndex: 'rank',
      render: (rank: number) => <span className="analysis-bd-rank" aria-label={`第${rank}名`}>{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</span> },
    { title: 'BD', dataIndex: 'bdMis',
      render: (bdMis: string, record: BdStatsDto) => <PersonName name={record.bdName} mis={bdMis} /> },
    { title: '任务项完成率', key: 'completionRate',
      sorter: (a, b) => rateOf(a) - rateOf(b), defaultSortOrder: 'descend', sortDirections: ['descend', 'ascend', 'descend'],
      render: (_, row) => <span style={{ color: rateOf(row) >= 80 ? MT.success : rateOf(row) >= 60 ? MT.warning : MT.danger, fontWeight: 600 }}>{rateOf(row).toFixed(1)}%</span> },
    { title: '总数', dataIndex: 'totalCount' },
    { title: '已完成', dataIndex: 'completedCount' },
    { title: '在途', dataIndex: 'inProgressCount' },
    { title: '超时', dataIndex: 'expiredCount',
      render: (value: number) => <span style={{ color: value > 0 ? MT.danger : MT.textTertiary }}>{value}</span> },
  ];

  // 父任务详细数据表格列（对齐 Codex V4 detailColumns）
  const parentTaskColumns: ColumnsType<ParentTaskOverviewDto> = [
    {
      title: '任务批次名称',
      dataIndex: 'name',
      render: (value: string, row: ParentTaskOverviewDto) => {
        const priority = PRIORITY_CONFIG[row.priority] ?? PRIORITY_CONFIG[3];
        return (
          <Space size={7}>
            <Tag bordered={false} style={{ ...MT_FILLED_TAG_STYLE, background: priority.bg, color: priority.color }}>
              {priority.short}
            </Tag>
            <Text strong>{value}</Text>
          </Space>
        );
      },
    },
    {
      title: '业务类型',
      dataIndex: 'taskType',
      width: 104,
      render: (taskType: number) => getTaskTypeName(taskType),
    },
    {
      title: '创建人',
      dataIndex: 'creatorName',
      width: 90,
      render: (creatorName: string | undefined, row: ParentTaskOverviewDto) => <PersonName name={creatorName} mis={row.creatorId} />,
    },
    {
      title: '关联任务项数',
      dataIndex: 'totalCount',
      width: 106,
      render: (v: number) => `${v} 个`,
    },
    {
      title: '已完成',
      dataIndex: 'completedCount',
      width: 76,
      render: (v: number) => <Text style={{ color: v > 0 ? MT.success : 'inherit' }}>{v}</Text>,
    },
    {
      title: '目标量',
      dataIndex: 'targetCount',
      width: 76,
    },
    {
      title: '达标率',
      dataIndex: 'targetCompletionRate',
      width: 78,
      render: (v: number) => {
        const n = Number(v);
        return (
          <Text style={{ color: n >= 80 ? MT.success : n >= 60 ? MT.warning : MT.danger, fontWeight: 600 }}>
            {Number.isFinite(n) ? `${n.toFixed(1)}%` : '-'}
          </Text>
        );
      },
    },
    {
      title: '截止时间',
      dataIndex: 'expireDate',
      width: 148,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '状态',
      dataIndex: 'achieved',
      width: 92,
      render: (achieved: boolean, row: ParentTaskOverviewDto) => {
        const isExpired = row.expireDate && dayjs(row.expireDate).isBefore(dayjs(), 'day');
        if (achieved) return <Badge status="success" text="已完成" />;
        if (isExpired) return <Badge status="error" text="已超时" />;
        return <Badge status="processing" text="进行中" />;
      },
    },
  ];

  // KPI 卡片数据（对齐 Codex V4 v4-detail-kpis）
  const kpiCards = [
    {
      label: '任务批次完成率',
      tooltip: '已达标任务批次数 ÷ 任务批次总数',
      value: parentCompletionRate,
      note: `已完成 ${summary?.parentCompletedTaskCount ?? 0} 个`,
    },
    {
      label: '任务项完成率',
      tooltip: '已完成任务项数 ÷ 任务项总数（不含AI完成的任务项）',
      value: subTaskCompletionRate,
      note: `已完成 ${summary?.completedCount ?? 0} 个`,
    },
    {
      label: '即将到期任务批次',
      tooltip: '统计今天及未来 3 天内到期，但尚未达标的任务批次。',
      value: riskParentTaskCount === undefined ? '—' : `${riskParentTaskCount}`,
      note: summary?.todayDueParentTaskCount == null ? '今日到期 — 个' : `今日到期 ${summary.todayDueParentTaskCount} 个`,
    },
    {
      label: '覆盖商家',
      tooltip: '统计周期内被下发任务的去重商家数',
      value: shopCount.toLocaleString(),
      note: `覆盖 ${summary?.typeStats?.length ?? 0} 个业务类型`,
    },
    {
      label: '任务项 AI 使用率',
      tooltip: '关联 AI 能力的任务批次中，任务项状态为AI执行中和AI已完成的总数 ÷ 这些任务批次下的任务项总数',
      value: aiUsageRate ?? '—',
      note: summaryResult.loading ? '数据加载中' : aiCompletedCount == null ? '已完成 — 项' : `已完成 ${aiCompletedCount} 项`,
    },
  ];

  return (
    <div className="analysis-detail-page">
      {/* 筛选栏：对齐 Codex V4 .v2-card .v2-filter-card */}
      <Card
        className="v2-card v2-filter-card"
        size="small"
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ color: MT.textMuted, fontSize: 14, whiteSpace: 'nowrap' }}>创建日期</span>
            <RangePicker
              value={dateRange}
              onChange={v => { if (v) { trackTaskAction('analysis.date_range'); setDateRange(v as [Dayjs, Dayjs]); } }}
              allowClear={false}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, maxWidth: '100%' }}>
            <span style={{ color: MT.textMuted, fontSize: 14, whiteSpace: 'nowrap' }}>组织架构</span>
            <OrgTreeSelector
              value={orgIds} onChange={ids => { trackTaskAction('analysis.org_select'); setSelectedOrgIds(ids); }}
              fetchOrgChildren={fetchOrgChildren}
              fetchOrgNodeById={fetchOrgNodeById} getNodePath={getNodePath}
            />
          </label>
          <div style={{ flex: 1 }} />
          <Space size={12} align="center">
            <Text style={{ fontSize: 12, color: MT.textTertiary, whiteSpace: 'nowrap' }}>
              {lastRefreshedAt ? `数据更新于 ${dayjs(lastRefreshedAt).format('HH:mm')}` : ''}
            </Text>
            <Button
              type="text"
              shape="circle"
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={() => { trackTaskAction('analysis.refresh'); fetchAll(); }}
              aria-label="刷新数据"
              style={{ color: MT.textTertiary }}
            />
            <Button
              icon={<SearchOutlined />}
              onClick={() => { trackTaskAction('analysis.query'); fetchAll(); }}
              loading={refreshing}
              disabled={!hasOrgs}
              style={{ background: MT.brandPrimary, borderColor: MT.brandPrimary, color: '#fff' }}
            >
              查询
            </Button>
          </Space>
        </div>
      </Card>

      {!hasOrgs && <Empty description="请先选择组织架构" />}
      {!!errors.length && <Alert type="error" showIcon message="部分数据加载失败" description={errors.join('；')}
        action={<Button onClick={() => { trackTaskAction('retry.workbench_summary'); fetchAll(); }}>重试</Button>} />}

        {/* 详细数据内容流：对齐 Codex V4 .v4-detail-flow */}
        <div className="v4-detail-flow">
          {/* KPI 卡片区：对齐 .v4-detail-kpis */}
          {hasOrgs && <div className="v4-detail-kpis">
            {kpiCards.map((item) => (
              <Card key={item.label} className="v2-card">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {item.label}
                  <InfoTooltip content={item.tooltip} style={{ display: 'inline-flex' }} />
                </span>
                <b>{summaryResult.loading ? <Spin size="small" /> : summaryResult.error ? '—' : item.value}</b>
                <small>{item.label !== '任务项 AI 使用率' && (summaryResult.loading || summaryResult.error) ? '—' : item.note}</small>
              </Card>
            ))}
          </div>}

          {hasOrgs && <>
          {/* 图表区：任务完成趋势 + 业务类型结构（对齐 .v4-detail-grid） */}
          <div className="v4-detail-grid v4-detail-grid-business-wide analysis-chart-grid">
            <Card
              className="v2-card analysis-chart-card"
              loading={summaryResult.loading}
              title={
                <ModuleTitle
                  icon={<BarChartOutlined />}
                  title="任务完成趋势"
                  tooltip="展示查询区间内最近 7 天的父任务、子任务完成率。历史曲线为本地演示样例，末日与概览统计一致。"
                />
              }
            >
              {trend.length ? <div role="img" aria-label={`任务完成趋势，${trend.length}天，父任务与子任务完成率`}>
                <ReactECharts option={trendOption} style={{ height: 280 }} opts={{ renderer: 'svg' }} notMerge />
              </div> : <Empty description="暂无趋势数据" style={{ padding: '60px 0' }} />}
            </Card>

            <Card
              className="v2-card analysis-chart-card"
              loading={summaryResult.loading}
              title={
                <ModuleTitle
                  icon={<PieChartOutlined />}
                  title="业务类型结构"
                  tooltip="按任务项统计业务类型占比，同一批次内的商品任务分别计数。"
                />
              }
            >
              {businessTypeData.length === 0 ? (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              ) : (
                <div className="v4-detail-business analysis-business-layout">
                  <div className="analysis-business-ring" role="img" aria-label={`业务类型结构，共${taskTypeTotal}个任务项`}>
                    <ReactECharts ref={businessChart} option={businessOption} style={{ height: 280 }} opts={{ renderer: 'svg' }} notMerge />
                  </div>
                  <div className="v4-business-legend compact">
                    {businessTypeData.filter(item => item.count > 0).map((item, index) => (
                      <button type="button" key={item.id} aria-label={`${item.name}，占比${item.percent}%，${item.count}个任务项`}
                        onMouseEnter={() => showBusinessDetail(index)} onMouseLeave={hideBusinessDetail}
                        onFocus={() => showBusinessDetail(index)} onBlur={hideBusinessDetail}>
                        <i style={{ background: item.color }} />
                        <span>{item.name}</span>
                        <b>{item.percent}%</b>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <BatchExecutionDetail scope={matrixScope} globalOrgs={globalOrgs} fetchOrgChildren={fetchOrgChildren} />

          {/* 父任务详细数据表（对齐 Codex V4 detailColumns 区域） */}
          <Card
            ref={parentCardRef}
            className="v2-card"
            loading={parentResult.loading}
            title={
              <ModuleTitle
                icon={<UnorderedListOutlined />}
                title="任务批次详细数据"
                tooltip="展示任务批次的业务类型、任务进度、截止时间与创建人。"
              />
            }
            extra={<Button style={BATCH_ACTION_BUTTON_STYLE}>导出</Button>}
          >
            {parentTasks.length === 0 ? (
              <Empty description="暂无数据" style={{ padding: '40px 0' }} />
            ) : (
              <Table
                className="analysis-data-table analysis-parent-table"
                rowKey="parentTaskId"
                columns={parentTaskColumns.map((column, index) => ({
                  ...column,
                  width: parentColumnWidths[index] ?? column.width,
                }))}
                dataSource={parentTasks}
                pagination={{ current: parentPage, pageSize: 5, total: parentResult.data?.total ?? 0, onChange: page => { trackTaskAction('detail.parent_page'); setParentPagination({ key: requestKey, page }); }, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }}
                tableLayout="fixed"
                scroll={{ x: PARENT_TABLE_MIN_WIDTH }}
                size="small"
              />
            )}
          </Card>
          {/* 按完成率排名，同时展示任务量和状态构成。 */}
          <Card
            className="v2-card analysis-bd-card"
            loading={bdResult.loading}
            title={
              <ModuleTitle
                icon={<UnorderedListOutlined />}
                title="BD 任务项完成率排名及负载量"
                tooltip="按 BD 任务项完成率从高到低排名。总数 = 已完成 + 在途 + 超时。点击任务项完成率列可切换排序。"
              />
            }
          >
            {bdStats.length === 0 ? (
              <Empty description="暂无数据" style={{ padding: '40px 0' }} />
            ) : (
              <Table
                className="analysis-data-table"
                dataSource={rankedBdStats}
                columns={bdColumns}
                rowKey="bdMis"
                pagination={bdStats.length > 20 ? { pageSize: 20, onChange: () => trackTaskAction('detail.bd_page') } : false}
                size="small"
                tableLayout="fixed"
                scroll={{ x: 752 }}
              />
            )}
          </Card>

          </>}
        </div>

    </div>);
};

// 租户变化时重建组织缓存及查询状态，旧租户响应不能覆盖新租户。
const TenantAnalysisPage: React.FC = () => {
  const tenant = useTenantStore((state) => state.currentTenantId);
  const tenantId = Number(tenant);
  return Number.isSafeInteger(tenantId) && tenantId > 0
    ? <AnalysisPage key={tenantId} /> : <Spin />;
};

export default TenantAnalysisPage;
