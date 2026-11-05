import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useMemo } from 'react';
import { Card, Skeleton, Empty, Button, Typography, Space, Tooltip, Progress } from 'antd';
import { ReloadOutlined, CalendarOutlined, QuestionCircleOutlined, RightOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { AsyncCardState } from '../hooks/useAsyncCard';
import type { ExpireRiskPageDto } from '@/types/workbench';
import { isEmptyWorkbenchData } from '../hooks/useWorkbenchData';
import { MT } from '../../theme';
import { donutCenterGraphic } from '../utils/donutCenterGraphic';
import './workbench-responsive.css';

const { Title } = Typography;

interface ExpireRiskCardProps {
  card: AsyncCardState<ExpireRiskPageDto>;
  orgSelected: boolean;
  /** 拼装明细弹窗副标题所需的当前创建时间区间 + 组织架构范围文案（Requirement 8.3） */
  scopeText: string;
  onOpenDetailModal: (params: { title: string; subtitle: string; detailList: ExpireRiskPageDto['detailList']; initialTab?: string; showTabs?: boolean; isP0Entry?: boolean }) => void;
}

/** 展示顺序统一为：进行中 → 即将到期 → 已过期 → 已完成，颜色对齐视觉稿风险色规范 */
const GROUPS: { statusLabel: 0 | 1 | 2 | 3; mainKey: keyof ExpireRiskPageDto; p0Key: keyof ExpireRiskPageDto; name: string; color: string }[] = [
  { statusLabel: 0, mainKey: 'normalParentCount', p0Key: 'p0NormalParentCount', name: '进行中', color: MT.chart.riskColors.normal },
  { statusLabel: 3, mainKey: 'soonExpireParentCount', p0Key: 'p0SoonExpireParentCount', name: '即将到期', color: MT.chart.riskColors.soon },
  { statusLabel: 2, mainKey: 'expiredParentCount', p0Key: 'p0ExpiredParentCount', name: '已过期', color: MT.chart.riskColors.expired },
  { statusLabel: 1, mainKey: 'achievedParentCount', p0Key: 'p0AchievedParentCount', name: '已完成', color: MT.chart.riskColors.completed },
];

/**
 * 任务项4组状态配置：口径与任务批次四态完全对齐（V1.2 后端新增），展示名/顺序/颜色与任务批次保持一致；
 * 后端未提供任务项明细列表，故任务项数字仅展示不可点击。
 */
const SUB_TASK_GROUPS: { mainKey: keyof ExpireRiskPageDto; p0Key: keyof ExpireRiskPageDto; name: string; color: string }[] = [
  { mainKey: 'normalSubTaskCount', p0Key: 'p0NormalSubTaskCount', name: '进行中', color: MT.chart.riskColors.normal },
  { mainKey: 'soonExpireSubTaskCount', p0Key: 'p0SoonExpireSubTaskCount', name: '即将到期', color: MT.chart.riskColors.soon },
  { mainKey: 'expiredSubTaskCount', p0Key: 'p0ExpiredSubTaskCount', name: '已过期', color: MT.chart.riskColors.expired },
  { mainKey: 'achievedSubTaskCount', p0Key: 'p0AchievedSubTaskCount', name: '已完成', color: MT.chart.riskColors.completed },
];

function createRiskDonutOption(data: Array<{ name: string; value: number; color: string }>, total: number, totalLabel: string, unit: string, raiseGroupingComma = false) {
  return {
    animationDuration: 520,
    aria: { enabled: true, description: `${totalLabel}状态分布` },
    tooltip: {
      trigger: 'item' as const,
      appendToBody: true,
      confine: false,
      borderWidth: 0,
      backgroundColor: '#FFFFFF',
      padding: [10, 12] as [number, number],
      extraCssText: 'z-index:1000;border-radius:8px;box-shadow:none;',
      formatter: (params: any) => `${params.marker}${params.name}<br/><b>${params.value}</b> ${unit} · ${params.percent}%`,
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '80%'],
        center: ['50%', '50%'],
        startAngle: 90,
        clockwise: true,
        label: { show: false },
        emphasis: { scale: true, scaleSize: 5 },
        itemStyle: { borderColor: '#FFFFFF', borderWidth: 3, borderRadius: 4 },
        data: data.map((item) => ({ value: item.value, name: item.name, itemStyle: { color: item.color } })),
      },
    ],
    graphic: donutCenterGraphic(total.toLocaleString(), totalLabel, 220, raiseGroupingComma),
  };
}

/** 到期风险卡片：还原视觉稿「到期风险」——任务批次/任务项双环形图并排 + 分隔线 + 状态图例（可点击）。 */
const ExpireRiskCard: React.FC<ExpireRiskCardProps> = ({ card, orgSelected, scopeText, onOpenDetailModal }) => {
  const { data, loading, error, refetch } = card;

  const parentTotal = data
    ? data.normalParentCount + data.soonExpireParentCount + data.expiredParentCount + data.achievedParentCount
    : 0;
  const subTaskTotal = data
    ? data.normalSubTaskCount + data.soonExpireSubTaskCount + data.expiredSubTaskCount + data.achievedSubTaskCount
    : 0;

  const parentRiskOption = useMemo(
    () =>
      createRiskDonutOption(
        GROUPS.map((g) => ({ name: g.name, value: (data?.[g.mainKey] as number) ?? 0, color: g.color })),
        parentTotal,
        '任务批次',
        '个任务批次',
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(data), parentTotal],
  );

  const subTaskRiskOption = useMemo(
    () =>
      createRiskDonutOption(
        SUB_TASK_GROUPS.map((g) => ({ name: g.name, value: (data?.[g.mainKey] as number) ?? 0, color: g.color })),
        subTaskTotal,
        '任务项',
        '个任务项',
        true,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(data), subTaskTotal],
  );

  const handleClick = (statusLabel: 0 | 1 | 2 | 3, name: string, isP0: boolean) => {
    trackTaskAction(isP0 ? 'focus.expire_p0_detail' : 'focus.expire_status_detail');
    if (!data) return;
    onOpenDetailModal({
      title: isP0 ? 'P0 任务批次明细' : '任务批次明细',
      subtitle: scopeText,
      detailList: data.detailList,
      initialTab: isP0 ? 'all' : statusLabel === 0 ? 'normal' : statusLabel === 3 ? 'soon' : statusLabel === 2 ? 'expired' : 'completed',
      showTabs: true,
      isP0Entry: isP0,
    });
  };

  return (
    <Card
      style={{ border: 'none', borderRadius: MT.cardRadius, boxShadow: MT.cardShadow, height: '100%' }}
      styles={{ body: { padding: '10px 18px 18px' } }}
    >
      <Space size={7} align="center" style={{ marginBottom: 12, marginTop: 8 }}>
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
          <CalendarOutlined />
        </span>
        <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 600, color: MT.textPrimary }}>
          到期风险
        </Title>
        <Tooltip title="分别展示任务批次和任务项状态分布；点击任务批次状态或 P0 标签查看任务明细。">
          <QuestionCircleOutlined style={{ color: MT.textTertiary, fontSize: 13, cursor: 'help' }} />
        </Tooltip>
      </Space>

      {!orgSelected ? (
        <Empty description="请先选择组织架构" style={{ padding: '30px 0' }} />
      ) : loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 12, color: MT.danger }}>加载失败，点击重试</div>
          <Button icon={<ReloadOutlined />} onClick={() => { trackTaskAction('retry.expire_risk'); refetch(); }}>
            重试
          </Button>
        </div>
      ) : !data || isEmptyWorkbenchData(data) ? (
        <Empty description="当前筛选范围暂无数据" style={{ padding: '30px 0' }} />
      ) : (
        <div className="wb-risk-donuts">
          {/* 任务批次状态分布 */}
          <section
            className="wb-risk-donut-panel"
            style={{
              paddingRight: 24,
            }}
          >
            <div style={{ transform: 'translateY(18px)' }}>
              <h4 style={{ margin: '2px 0 -6px', color: MT.textPrimary, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                任务批次状态分布
              </h4>
              <ReactECharts option={parentRiskOption} style={{ height: 220 }} notMerge />
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {GROUPS.map((g) => {
                const value = (data[g.mainKey] as number) ?? 0;
                const p0 = (data[g.p0Key] as number) ?? 0;
                const pct = parentTotal > 0 ? (value / parentTotal) * 100 : 0;
                const openStatus = () => handleClick(g.statusLabel, g.name, false);
                return (
                  <div key={g.statusLabel} style={{ padding: '5px 8px 7px', borderRadius: 8 }} className="wb-risk-legend-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={openStatus}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', flex: '0 0 auto' }}
                      >
                        <i style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, display: 'inline-block' }} />
                        <span style={{ fontSize: 12, color: MT.textMuted, whiteSpace: 'nowrap' }}>{g.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClick(g.statusLabel, g.name, true)}
                        style={{
                          width: 'max-content',
                          flex: '0 0 auto',
                          height: 20,
                          padding: '0 5px',
                          border: `1px solid ${MT.danger}`,
                          background: '#FFFFFF',
                          color: MT.danger,
                          fontSize: 12,
                          lineHeight: '18px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          borderRadius: 4,
                          transition: 'color .16s ease,background-color .16s ease,border-color .16s ease,box-shadow .16s ease,transform .16s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = MT.dangerBorder;
                          e.currentTarget.style.background = MT.dangerBg;
                          e.currentTarget.style.color = MT.danger;
                          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(249,83,85,.1)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = MT.danger;
                          e.currentTarget.style.background = '#FFFFFF';
                          e.currentTarget.style.color = MT.danger;
                          e.currentTarget.style.boxShadow = '';
                          e.currentTarget.style.transform = '';
                        }}
                      >
                        P0 任务批次 {p0}
                      </button>
                      <button
                        type="button"
                        onClick={openStatus}
                        style={{ marginLeft: 'auto', flex: '0 0 32px', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'right' }}
                      >
                        <b style={{ color: MT.textPrimary, fontSize: 14, fontWeight: 600 }}>{value}</b>
                      </button>
                      <button
                        type="button"
                        onClick={openStatus}
                        style={{ flex: '0 0 66px', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'right' }}
                      >
                        <small style={{ color: MT.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>{pct.toFixed(1)}%</small>
                        <RightOutlined style={{ color: MT.clickArrow, fontSize: 11, transition: 'transform .16s ease' }} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={openStatus}
                      style={{ width: 'calc(100% - 16px)', display: 'block', margin: '3px 0 0 16px', padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
                    >
                      <Progress percent={Number(pct.toFixed(1))} showInfo={false} strokeColor={g.color} trailColor="#F0F1F5" size="small" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <i aria-hidden className="wb-risk-divider" style={{ alignSelf: 'stretch', width: 1, flexShrink: 0, marginBlock: '6px 12px', background: MT.cardBorder }} />

          {/* 任务项状态分布 */}
          <section
            className="wb-risk-donut-panel"
            style={{
              paddingLeft: 24,
            }}
          >
            <div style={{ transform: 'translateY(18px)' }}>
              <h4 style={{ margin: '2px 0 -6px', color: MT.textPrimary, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                任务项状态分布
              </h4>
              <ReactECharts option={subTaskRiskOption} style={{ height: 220 }} notMerge />
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {SUB_TASK_GROUPS.map((g) => {
                const value = (data[g.mainKey] as number) ?? 0;
                const p0 = (data[g.p0Key] as number) ?? 0;
                const pct = subTaskTotal > 0 ? (value / subTaskTotal) * 100 : 0;
                return (
                  <div key={g.mainKey} style={{ padding: '5px 8px 7px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: MT.textMuted, whiteSpace: 'nowrap' }}>{g.name}</span>
                      <span
                        style={{
                          width: 'max-content',
                          flex: '0 0 auto',
                          height: 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0 5px',
                        border: `1px solid ${MT.danger}`,
                        background: '#FFFFFF',
                        color: MT.danger,
                        fontSize: 12,
                        lineHeight: '18px',
                        whiteSpace: 'nowrap',
                        borderRadius: 4,
                        }}
                      >
                        P0 任务项 {p0}
                      </span>
                      <span style={{ marginLeft: 'auto', flex: '0 0 32px', textAlign: 'right' }}>
                        <b style={{ color: MT.textPrimary, fontSize: 14, fontWeight: 600 }}>{value}</b>
                      </span>
                      <span style={{ flex: '0 0 52px', textAlign: 'right' }}>
                        <small style={{ color: MT.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>{pct.toFixed(1)}%</small>
                      </span>
                    </div>
                    <div style={{ width: 'calc(100% - 16px)', margin: '3px 0 0 16px' }}>
                      <Progress percent={Number(pct.toFixed(1))} showInfo={false} strokeColor={g.color} trailColor="#F0F1F5" size="small" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </Card>
  );
};

export default ExpireRiskCard;
