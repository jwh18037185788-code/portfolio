import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useMemo } from 'react';
import { Card, Skeleton, Empty, Button, Typography, Space, Progress, Tooltip } from 'antd';
import { ReloadOutlined, DatabaseOutlined, RightOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { AsyncCardState } from '../hooks/useAsyncCard';
import type { SourceDiagnosisDto } from '@/types/workbench';
import { isEmptyWorkbenchData } from '../hooks/useWorkbenchData';
import { filterByTaskSource } from '../utils/detailFilter';
import InfoTooltip from './InfoTooltip';
import ClickableStat from './ClickableStat';
import { MT } from '../../theme';
import './workbench-responsive.css';

const { Title } = Typography;

const SOURCE_COLORS = MT.chart.sourceColors;

interface SourceDiagnosisCardProps {
  card: AsyncCardState<SourceDiagnosisDto>;
  orgSelected: boolean;
  /** 拼装明细弹窗副标题所需的当前创建时间区间 + 组织架构范围文案（Requirement 8.3） */
  scopeText: string;
  onOpenDetailModal: (params: { title: string; subtitle: string; detailList: SourceDiagnosisDto['detailList']; initialTab?: string; showTabs?: boolean; isP0Entry?: boolean }) => void;
}

/** 任务来源卡片：还原视觉稿「任务来源」——左侧环形图 + 右侧 2 列卡片网格，每组均可点击，parentTaskCount=0 仍渲染不隐藏 */
const SourceDiagnosisCard: React.FC<SourceDiagnosisCardProps> = ({ card, orgSelected, scopeText, onOpenDetailModal }) => {
  const { data, loading, error, refetch } = card;

  const sourceList = useMemo(
    () => (data ? data.sourceList.map((s, index) => ({ ...s, color: SOURCE_COLORS[index % SOURCE_COLORS.length] })) : []),
    [data],
  );

  const sourceOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'item' as const,
        appendToBody: true,
        confine: false,
        borderWidth: 0,
        backgroundColor: '#FFFFFF',
        padding: [10, 12] as [number, number],
        extraCssText: 'z-index:1000;border-radius:8px;box-shadow:none;',
        formatter: (p: any) => `${p.name}<br/>${p.value} 个任务批次 · ${p.percent}%`,
      },
      series: [
        {
          type: 'pie',
          radius: ['58%', '80%'],
          center: ['50%', '50%'],
          label: { show: false },
          itemStyle: { borderColor: '#FFFFFF', borderWidth: 3, borderRadius: 4 },
          emphasis: { scale: true, scaleSize: 5 },
          data: sourceList.map((item) => ({
            value: item.parentTaskCount,
            name: item.taskSource,
            itemStyle: { color: item.color },
          })),
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '39%',
          style: { text: `${data?.sourceList.reduce((sum, s) => sum + s.parentTaskCount, 0) ?? 0}`, textAlign: 'center', fill: MT.brandPrimary, fontSize: 25, fontWeight: 700 },
        },
        {
          type: 'text',
          left: 'center',
          top: '54%',
          style: { text: '父任务总量', textAlign: 'center', fill: MT.textTertiary, fontSize: 12, fontWeight: 600 },
        },
      ],
    }),
    [sourceList, data],
  );

  const handleClick = (taskSourceCode: number, label: string) => {
    trackTaskAction('focus.source_detail');
    if (!data) return;
    const filtered = filterByTaskSource(data.detailList, taskSourceCode);
    onOpenDetailModal({
      title: `${label}来源明细`,
      subtitle: `${scopeText}，当前范围内共 ${filtered.length} 个来自「${label}」的任务批次`,
      detailList: filtered,
    });
  };

  return (
    <Card
      style={{ border: 'none', borderRadius: MT.cardRadius, boxShadow: MT.cardShadow }}
      styles={{ body: { padding: 18 } }}
    >
      <Space size={7} align="center" style={{ marginBottom: 12 }}>
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
          <DatabaseOutlined />
        </span>
        <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 600, color: MT.textPrimary }}>
          任务来源
        </Title>
        <InfoTooltip content="按任务来源（一线管理者/总部管理者/蜂窝 Agent/下沉驾驶舱/未知）展示分布及各来源执行情况，来源名称由后端配置下发。" />
      </Space>

      {!orgSelected ? (
        <Empty description="请先选择组织架构" style={{ padding: '30px 0' }} />
      ) : loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 12, color: MT.danger }}>加载失败，点击重试</div>
          <Button icon={<ReloadOutlined />} onClick={() => { trackTaskAction('retry.source'); refetch(); }}>
            重试
          </Button>
        </div>
      ) : !data || isEmptyWorkbenchData(data) ? (
        <Empty description="当前筛选范围暂无数据" style={{ padding: '30px 0' }} />
      ) : (
        <div className="wb-source-layout">
          <ReactECharts option={sourceOption} style={{ height: 220 }} notMerge />
          <div className="wb-source-cards">
            {sourceList.map((s) => {
              const label = s.taskSource;
              const totalParent = data.sourceList.reduce((sum, item) => sum + item.parentTaskCount, 0);
              return (
                <Tooltip
                  key={s.taskSourceCode}
                  placement="top"
                  title={
                    <div style={{ lineHeight: 1.8 }}>
                      <div style={{ fontWeight: 600 }}>{label}</div>
                      <div>
                        AI 覆盖 <b>{s.aiCoverageCount}</b> · AI 执行中 <b>{s.aiDoingCount}</b> · AI 已完成 <b>{s.aiDoneCount}</b>
                      </div>
                      <div>
                        已达标 <b>{s.achievedParentTaskCount}</b> · 未达标 <b>{s.notAchievedCount}</b>
                      </div>
                      <div>
                        已过期 <b>{s.expiredCount}</b> · 今日到期 <b>{s.todayExpireCount}</b> · 即将到期 <b>{s.soonDueCount}</b>
                      </div>
                    </div>
                  }
                >
                  <ClickableStat
                    as="div"
                    onClick={() => handleClick(s.taskSourceCode, label)}
                    style={{
                      border: `1px solid ${MT.cardBorder}`,
                      borderRadius: 9,
                      padding: '12px 10px',
                      background: 'transparent',
                      transition: 'border-color .16s ease, background .16s ease',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '8px minmax(0, 1fr) auto auto', gap: 9, alignItems: 'end' }}>
                      <i style={{ width: 8, height: 8, marginBottom: 3, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                      <span style={{ color: MT.textPrimary, fontSize: 12, lineHeight: 1.2, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {label}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'baseline', color: MT.textPrimary, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                        <strong style={{ fontSize: 17, fontWeight: 600 }}>{s.parentTaskCount}</strong>
                      </span>
                      <small style={{ minWidth: 58, display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, color: MT.textMuted, fontSize: 12, lineHeight: 1.2, textAlign: 'right' }}>
                        {s.parentTaskRate?.toFixed?.(1) ?? s.parentTaskRate}%
                        <RightOutlined style={{ color: MT.clickArrow, fontSize: 11, transition: 'transform .16s ease' }} />
                      </small>
                    </div>
                    <Progress
                      percent={s.parentTaskRate}
                      showInfo={false}
                      strokeColor={s.color}
                      trailColor="#F0F1F5"
                      style={{ display: 'block', marginTop: 9, lineHeight: 1 }}
                    />
                  </ClickableStat>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default SourceDiagnosisCard;
