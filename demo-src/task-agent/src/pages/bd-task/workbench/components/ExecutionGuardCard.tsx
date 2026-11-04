import { trackTaskAction } from '@/lib/taskAnalytics';
import React from 'react';
import { Card, Skeleton, Empty, Button, Typography, Space, Tooltip, Progress } from 'antd';
import { ReloadOutlined, ThunderboltFilled, QuestionCircleOutlined } from '@ant-design/icons';
import type { AsyncCardState } from '../hooks/useAsyncCard';
import type { ExecutionGuardDto, AgentStatItem } from '@/types/workbench';
import { isEmptyWorkbenchData } from '../hooks/useWorkbenchData';
import { MT } from '../../theme';
import './workbench-responsive.css';

const { Title, Text } = Typography;

interface ExecutionGuardCardProps {
  card: AsyncCardState<ExecutionGuardDto>;
  orgSelected: boolean;
}

const AGENT_COLORS = MT.chart.agentColors;

/**
 * AI 执行进展卡片：还原视觉稿「AI 执行进展」——
 * 左列上下两块环形进度（任务项使用率 / 任务批次覆盖率）+ 对应指标双列信息，
 * 竖直分隔线右侧为「Agent 构成及覆盖与使用情况」可滚动列表。
 */
const ExecutionGuardCard: React.FC<ExecutionGuardCardProps> = ({ card, orgSelected }) => {
  const { data, loading, error, refetch } = card;

  const agents: (AgentStatItem & { color: string })[] = (data?.agentBreakdown ?? []).map((agent, index) => ({
    ...agent,
    color: AGENT_COLORS[index % AGENT_COLORS.length],
  }));

  return (
    <Card
      style={{ border: 'none', borderRadius: MT.cardRadius, boxShadow: MT.cardShadow, height: '100%' }}
      styles={{ body: { padding: '18px' } }}
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
          <ThunderboltFilled />
        </span>
        <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 600, color: MT.textPrimary }}>
          AI 执行进展
        </Title>
        <Tooltip title="使用率衡量任务项实际使用 AI 的比例；覆盖率衡量任务批次已配置 Agent 的比例。">
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
          <Button icon={<ReloadOutlined />} onClick={() => { trackTaskAction('retry.execution_guard'); refetch(); }}>
            重试
          </Button>
        </div>
      ) : !data || isEmptyWorkbenchData(data) ? (
        <Empty description="当前筛选范围暂无数据" style={{ padding: '30px 0' }} />
      ) : (
        <div className="wb-ai-layout">
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr' }}>
            {/* 任务项 AI 使用率 */}
            <div className="wb-ai-metric-row" style={{ padding: '12px 4px 24px' }}>
              <div style={{ width: 150, display: 'grid', justifyItems: 'center' }}>
                <div className="wb-ai-metric-title" style={{ width: '100%', marginBottom: 20, textAlign: 'center', color: MT.textPrimary, fontSize: 13, fontWeight: 600, marginTop: 0 }}>
                  任务项 AI 使用率
                </div>
                <Tooltip
                  placement="top"
                  title={
                    <div style={{ display: 'grid', gap: 2 }}>
                      <div>AI 执行中任务项 <b>{data.aiInProgressCount}</b></div>
                      <div>AI 已完成任务项 <b>{data.aiCompletedCount}</b></div>
                    </div>
                  }
                >
                  <span className="wb-ai-ring" style={{ display: 'inline-flex', borderRadius: '50%', cursor: 'pointer', outline: 'none', transition: 'transform .16s ease, box-shadow .16s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px) scale(1.015)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(72,42,247,.10)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <Progress
                      type="circle"
                      percent={Number((data.aiUsageRate ?? 0).toFixed(0))}
                      strokeColor={MT.brandPrimary}
                      trailColor="#F0F1F5"
                      size={132}
                      format={() => (
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                          <b style={{ color: MT.brandPrimary, fontSize: 25, fontWeight: 600, lineHeight: 1, transform: 'translateY(-4px)' }}>{data.aiUsageRate?.toFixed?.(0)}%</b>
                          <small style={{ marginTop: 6, color: MT.textTertiary, fontSize: 12, fontWeight: 600, lineHeight: 1 }}>任务项使用率</small>
                        </span>
                      )}
                    />
                  </span>
                </Tooltip>
              </div>
              <div style={{ width: 280, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignSelf: 'center' }}>
                <ExecInfoItem value={data.aiInProgressCount} label="AI 执行中任务项" color={MT.warning} />
                <ExecInfoItem value={data.aiCompletedCount} label="AI 已完成任务项" color={MT.success} bordered />
              </div>
            </div>

            {/* 任务批次 AI 覆盖率 */}
            <div
              className="wb-ai-metric-row"
              style={{
                padding: '24px 4px 12px',
                borderTop: `1px solid ${MT.cardBorder}`,
              }}
            >
              <div style={{ width: 150, display: 'grid', justifyItems: 'center' }}>
                <div className="wb-ai-metric-title" style={{ width: '100%', marginBottom: 20, textAlign: 'center', color: MT.textPrimary, fontSize: 13, fontWeight: 600, marginTop: 0 }}>
                  任务批次 AI 覆盖率
                </div>
                <Tooltip
                  placement="top"
                  title={
                    <div style={{ display: 'grid', gap: 2 }}>
                      <div>AI 覆盖任务批次 <b>{data.aiCoveredParentTaskCount}</b></div>
                      <div>涉及 Agent <b>{data.agentCount}</b></div>
                    </div>
                  }
                >
                  <span className="wb-ai-ring" style={{ display: 'inline-flex', borderRadius: '50%', cursor: 'pointer', outline: 'none', transition: 'transform .16s ease, box-shadow .16s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px) scale(1.015)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(72,42,247,.10)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <Progress
                      type="circle"
                      percent={Number((data.aiCoverageRate ?? 0).toFixed(0))}
                      strokeColor={MT.brandSecondary}
                      trailColor="#F0F1F5"
                      size={132}
                      format={() => (
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                          <b style={{ color: MT.brandSecondary, fontSize: 25, fontWeight: 600, lineHeight: 1, transform: 'translateY(-4px)' }}>{data.aiCoverageRate?.toFixed?.(0)}%</b>
                          <small style={{ marginTop: 6, color: MT.textTertiary, fontSize: 12, fontWeight: 600, lineHeight: 1 }}>任务批次覆盖率</small>
                        </span>
                      )}
                    />
                  </span>
                </Tooltip>
              </div>
              <div style={{ width: 280, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignSelf: 'center' }}>
                <ExecInfoItem value={data.agentCount} label="Agent 总量" color={MT.brandSecondary} />
                <ExecInfoItem value={data.aiCoveredParentTaskCount} label="覆盖任务批次总量" color={MT.brandPrimary} bordered />
              </div>
            </div>
          </div>

          <i aria-hidden className="wb-ai-divider" style={{ width: 1, flexShrink: 0, alignSelf: 'stretch', marginBlock: 12, background: MT.cardBorder }} />

          <div className="wb-ai-agent-panel" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, padding: '12px 4px' }}>
            <div className="wb-ai-agent-title" style={{ margin: '0 0 14px', color: MT.textPrimary, fontSize: 13, fontWeight: 600 }}>
              Agent 构成及覆盖与使用情况
            </div>
            {agents.length === 0 ? (
              <Empty description="暂无 Agent 数据" style={{ padding: '20px 0' }} />
            ) : (
              <div
                className="wb-ai-agent-list"
                style={{
                  flex: 1,
                  minHeight: 0,
                  maxHeight: 372,
                  display: 'grid',
                  gridAutoRows: 'minmax(60px, auto)',
                  overflowY: 'auto',
                  paddingRight: 5,
                  marginTop: -8,
                }}
              >
                {agents.map((agent) => {
                  const percent = agent.subTaskUsageRate ?? 0;
                  return (
                    <div
                      key={agent.agentId}
                      style={{
                        minHeight: 60,
                        alignContent: 'center',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(108px, 1fr) 88px 90px 132px 42px',
                        columnGap: 10,
                        rowGap: 8,
                        alignItems: 'center',
                        padding: '8px 7px',
                      }}
                    >
                      <span className="wb-ai-agent-name" style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <i style={{ width: 8, height: 8, borderRadius: 3, background: agent.color, flex: '0 0 8px' }} />
                        <Text
                          ellipsis={{ tooltip: { title: agent.agentName, color: '#1F1F1F', placement: 'top' } }}
                          style={{ minWidth: 0, flex: 1, maxWidth: '100%', color: MT.textPrimary, fontSize: 12, fontWeight: 600 }}
                        >
                          {agent.agentName}
                        </Text>
                      </span>
                      <small style={{ color: MT.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>
                        覆盖任务批次 <b style={{ color: MT.textPrimary, fontSize: 12, fontWeight: 600 }}>{agent.parentTaskCount}</b>
                      </small>
                      <small style={{ color: MT.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>
                        关联任务项 <b style={{ color: MT.textPrimary, fontSize: 12, fontWeight: 600 }}>{agent.totalTaskCount}</b>
                      </small>
                      <small style={{ color: MT.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>
                        实际使用 AI 任务项 <b style={{ color: MT.textPrimary, fontSize: 12, fontWeight: 600 }}>{agent.achievedTaskCount}</b>
                      </small>
                      <b style={{ color: MT.brandPrimary, fontSize: 12, textAlign: 'right' }}>{percent?.toFixed?.(0)}%</b>
                      <Progress percent={Number(percent?.toFixed?.(1))} showInfo={false} strokeColor={agent.color} trailColor="#F0F1F5" size="small" style={{ gridColumn: '1 / -1', margin: '3px 0 0' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

const ExecInfoItem: React.FC<{ value: React.ReactNode; label: string; color: string; bordered?: boolean }> = ({
  value,
  label,
  color,
  bordered,
}) => (
  <div
    style={{
      minWidth: 0,
      minHeight: 116,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 10px',
      textAlign: 'center',
      borderLeft: bordered ? `1px solid ${MT.cardBorder}` : undefined,
    }}
  >
    <b style={{ margin: '0 0 16px', color, fontSize: 28, fontWeight: 500, lineHeight: 1 }}>{value}</b>
    <Text
      ellipsis={{ tooltip: { title: label, color: '#1F1F1F', placement: 'top' } }}
      style={{ minWidth: 0, maxWidth: '100%', color: MT.textTertiary, fontSize: 13 }}
    >{label}</Text>
  </div>
);

export default ExecutionGuardCard;
