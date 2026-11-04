import { trackTaskAction } from '@/lib/taskAnalytics';
import React from 'react';
import { Card, Skeleton, Empty, Button, Typography, Space } from 'antd';
import {
  SendOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { AsyncCardState } from '../hooks/useAsyncCard';
import type { WorkbenchConclusionDto } from '@/types/workbench';
import { isEmptyWorkbenchData } from '../hooks/useWorkbenchData';
import PressableButton from '../../components/PressableButton';
import { MT } from '../../theme';
import riskSafeShieldImg from '@/assets/workbench/risk-safe-shield.png';
import riskLowShieldImg from '@/assets/workbench/risk-low-shield.png';
import riskMediumShieldImg from '@/assets/workbench/risk-medium-shield.png';
import riskHighShieldImg from '@/assets/workbench/risk-high-shield.png';
import riskItemDiamondImg from '@/assets/workbench/risk-item-diamond.png';

const { Text } = Typography;

interface ConclusionCardProps {
  card: AsyncCardState<WorkbenchConclusionDto>;
  onOpenSupervisionModal: () => void;
  orgSelected: boolean;
}

/**
 * 风险提示条——主结论 + 风险类型两块信息结构。
 *
 * 主结论：始终根据 riskLevel（0=正常 1=低风险 2=中风险 3=高风险）生成稳定标题，
 * 避免不同环境的后端 summary 模板差异导致标题和风险等级语义色漂移。
 * 风险类型：逾期风险 / 完成风险 / 执行风险 三种，每种前有对应 icon，文案从 DTO 统计字段构造。
 *
 * 四种状态统一复用中风险的白底布局、字体、字号和间距，仅切换盾牌插图及标题状态词颜色。
 */

/** riskLevel → 后端 summary 缺失时的主结论文案 */
const MAIN_CONCLUSION_TEXT: Record<number, string> = {
  0: '当前任务盘面整体健康，暂无已过期或即将到期的未完成任务批次，建议持续关注日常推进节奏',
  1: '当前任务盘面为低风险，部分 BD 执行偏弱，建议通过四象限定位执行偏弱的 BD 并针对性支持',
  2: '当前任务盘面为中风险，建议及时查看风险任务并督办相关 BD',
  3: '当前任务盘面为高风险，建议立即查看风险任务并重点督办相关 BD',
};

/** riskLevel → 标题状态词语义色；提示条背景统一为中风险模板的白色。 */
const RISK_LEVEL_META: Record<
  number,
  { color: string; label: string; background: string }
> = {
  0: { color: '#45BF09', label: '健康', background: '#FFFFFF' },
  1: { color: '#F69400', label: '低风险', background: '#FFFFFF' },
  2: { color: '#F36805', label: '中风险', background: '#FFFFFF' },
  3: { color: '#EF4A4C', label: '高风险', background: '#FFFFFF' },
};

/** 兼容网关把数值序列化为字符串的情况，并为未知值提供健康态兜底。 */
function normalizeRiskLevel(value: unknown): 0 | 1 | 2 | 3 {
  const level = Number(value);
  return level === 1 || level === 2 || level === 3 ? level : 0;
}

/** 将文案中的数字（含小数和百分比）高亮加粗，P0~P3 优先级标识除外 */
function renderHighlightedNumbers(text: string): React.ReactNode[] {
  return text.split(/(P[0-3]|\d+(?:\.\d+)?%?)/).map((segment, index) => (
    /^\d+(?:\.\d+)?%?$/.test(segment) ? (
      <strong key={index} style={{ fontWeight: 500, color: MT.textPrimary }}>
        {segment}
      </strong>
    ) : (
      <React.Fragment key={index}>{segment}</React.Fragment>
    )
  ));
}

/** 为后端下发的风险标题统一补齐中英文边界空格，例如“相关BD”展示为“相关 BD”。 */
function normalizeMixedTextSpacing(text: string): string {
  return text
    .replace(/([\u4e00-\u9fff])([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, '$1 $2');
}

/** riskLevel → 对应盾牌插图（绿/黄/橙/红 四张独立 PNG） */
const RISK_SHIELD_IMG: Record<number, string> = {
  0: riskSafeShieldImg,
  1: riskLowShieldImg,
  2: riskMediumShieldImg,
  3: riskHighShieldImg,
};

const RiskShield: React.FC<{ riskLevel: number }> = ({ riskLevel }) => {
  return (
    <img
      src={RISK_SHIELD_IMG[riskLevel] ?? riskMediumShieldImg}
      alt={`风险等级${riskLevel}`}
      style={{
        width: 146,
        height: 146,
        maxWidth: 'none',
        flexShrink: 0,
        objectFit: 'contain',
        position: 'absolute',
        top: '50%',
        left: '50%',
        zIndex: 0,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
};

const RISK_TITLE_FONT = "'FZLanTingHeiS-B-GB', '方正兰亭粗黑简体', 'PingFang SC', 'Microsoft YaHei', sans-serif";

const RiskDiamond: React.FC = () => (
  <img
    src={riskItemDiamondImg}
    alt=""
    aria-hidden
    style={{ width: 14, height: 14, objectFit: 'contain', marginTop: 3 }}
  />
);

function renderConclusionText(text: string, riskLevel: number): React.ReactNode {
  const riskMeta = RISK_LEVEL_META[riskLevel] ?? RISK_LEVEL_META[0];
  const statusPattern = riskLevel === 0 ? /(健康|正常)/ : new RegExp(`(${riskMeta.label})`);
  return text.split(statusPattern).map((segment, index) => (
    (segment === riskMeta.label || (riskLevel === 0 && segment === '正常'))
      ? (
        <span
          key={index}
          style={{
            color: riskMeta.color,
            fontFamily: RISK_TITLE_FONT,
            fontWeight: 900,
          }}
        >
          {segment}
        </span>
      )
      : <React.Fragment key={index}>{segment}</React.Fragment>
  ));
}

const ConclusionCard: React.FC<ConclusionCardProps> = ({ card, onOpenSupervisionModal, orgSelected }) => {
  const { data, loading, error, refetch } = card;
  const riskLevel = normalizeRiskLevel(data?.riskLevel);
  const riskMeta = RISK_LEVEL_META[riskLevel];

  /** 构造三种风险类型文案（从 DTO 统计字段直接计算） */
  const riskItems: { icon: React.ReactNode; text: string }[] = [];

  if (data) {
    // 逾期风险
    const expiredRiskText = data.expiredParentCount > 0
      ? `逾期风险：${data.expiredParentCount}\u00A0个任务批次已过期，含 ${data.p0ExpiredParentCount}\u00A0个 P0，建议立即督办`
      : `逾期风险：${data.expiredParentCount}\u00A0个任务批次已过期，暂无风险`;
    riskItems.push({
      icon: <RiskDiamond />,
      text: expiredRiskText,
    });

    // 完成风险：未完成 = 总数 - 已达标；P0 未临期未完成 = P0 未达标 - 即将到期 P0
    const notAchieved = data.parentTaskCount - data.achievedParentTaskCount;
    const p0NotYetDue = Math.max(0, data.p0NotAchievedParentCount - data.p0SoonDueCount);
    const completionRiskText = notAchieved > 0
      ? `完成风险：${notAchieved}\u00A0个任务批次未完成，其中 ${data.soonDueParentTaskCount}\u00A0个即将到期，含 ${data.p0SoonDueCount}\u00A0个 P0，另有 ${p0NotYetDue}\u00A0个 P0 尚未临期但未完成，建议重点督办`
      : `完成风险：${notAchieved}\u00A0个任务批次未完成，暂无风险`;
    riskItems.push({
      icon: <RiskDiamond />,
      text: completionRiskText,
    });

    // 执行风险：需关注 BD 数从 highlights 取或从 concernedBdRate * activeBdCount 估算
    const concernedBdCount =
      data.highlights?.find((h) => h.type === 'execution')?.count ??
      (data.activeBdCount && data.concernedBdRate
        ? Math.round((data.activeBdCount * data.concernedBdRate) / 100)
        : 0);
    const inProgressSubtasks = data.totalTaskCount - data.yesterdayCompletedSubTaskCount;
    const executionRiskText = concernedBdCount > 0
      ? `执行风险：${concernedBdCount}\u00A0个 BD 需关注，共 ${inProgressSubtasks}\u00A0个任务项处理中，建议协调资源`
      : `执行风险：${concernedBdCount}\u00A0个 BD 需关注，暂无风险`;
    riskItems.push({
      icon: <RiskDiamond />,
      text: executionRiskText,
    });
  }

  return (
    <Card
      style={{
        border: '1.6px solid #FFFFFF',
        borderRadius: MT.cardRadius,
        background: riskMeta.background,
        boxShadow: MT.cardShadow,
        overflow: 'hidden',
      }}
      styles={{ body: { padding: '32px 22px' } }}
    >
      {!orgSelected ? (
        <Empty description="请先选择组织架构" style={{ padding: '30px 0' }} />
      ) : loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 12, color: MT.danger }}>暂无法生成盘面总结</div>
          <Button icon={<ReloadOutlined />} onClick={() => { trackTaskAction('retry.conclusion'); refetch(); }}>
            重试
          </Button>
        </div>
      ) : !data || isEmptyWorkbenchData(data) ? (
        <Empty description="当前筛选范围暂无任务数据" style={{ padding: '30px 0' }} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '108px minmax(0, 1fr) auto',
            gap: 22,
            alignItems: 'start',
          }}
        >
          {/* 左侧：盾牌插图 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              minHeight: 108,
              position: 'relative',
              zIndex: 0,
            }}
          >
            <RiskShield riskLevel={riskLevel} />
          </div>

          {/* 中间：主结论 + 风险类型 */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* 主结论 */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px 12px' }}>
              <Space size={6} align="center">
                <b
                  style={{
                    color: '#222222',
                    fontFamily: RISK_TITLE_FONT,
                    fontSize: 17,
                    fontWeight: 900,
                    lineHeight: 1.4,
                  }}
                >
                  {renderConclusionText(
                    normalizeMixedTextSpacing(MAIN_CONCLUSION_TEXT[riskLevel]),
                    riskLevel,
                  )}
                </b>
              </Space>
            </div>

            {/* 风险类型：逾期风险 / 完成风险 / 执行风险 */}
            <div style={{ display: 'grid', gap: 6, marginTop: 16 }}>
              {riskItems.map((item, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto minmax(0, 1fr)',
                    alignItems: 'start',
                    gap: 7,
                    color: MT.textMuted,
                    fontSize: 13,
                  }}
                >
                  {item.icon}
                  <Text style={{ fontSize: 13, color: MT.textMuted, lineHeight: 1.55 }}>
                    {renderHighlightedNumbers(item.text)}
                  </Text>
                </span>
              ))}
            </div>
          </div>

          {/* 右侧：一键督办按钮 */}
          <PressableButton style={{ position: 'relative', zIndex: 1 }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              disabled={!data.supervisionEnabled}
              style={{
                alignSelf: 'center',
                whiteSpace: 'nowrap',
              }}
              onClick={() => { trackTaskAction('focus.supervision_open'); onOpenSupervisionModal(); }}
            >
              {data.supervisionEnabled ? '一键督办' : '当前无紧急督办事项'}
            </Button>
          </PressableButton>
        </div>
      )}
    </Card>
  );
};

export default ConclusionCard;
