import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Card, Progress, Button, Empty, Typography, Tabs } from 'antd';
import dayjs from 'dayjs';
import type { ParentTaskDetailItem } from '@/types/workbench';
import { MT, MT_BTN } from '../../theme';
import { PriorityBadge, TASK_TITLE_TAG_STYLE } from '../../components/TaskCard';
import { TASK_SOURCE_CODE_TO_LABEL } from '../utils/taskSourceMap';
import { getParentTaskDetailUrl } from '../../utils/routeUrl';
import { useTaskTypeDictionary } from '../../hooks/useTaskTypeDictionary';

const { Text } = Typography;

type DetailTab = 'all' | 'p0' | 'normal' | 'soon' | 'expired' | 'completed';

export interface ParentTaskDetailModalState {
  visible: boolean;
  title: string;
  subtitle: string;
  detailList: ParentTaskDetailItem[];
  /** 到期风险卡片入口传入的初始选项卡 */
  initialTab?: DetailTab;
  /** 是否显示选项卡（仅到期风险入口需要） */
  showTabs?: boolean;
  /** P0入口标志：为true时选项卡去掉“P0任务”分类，detailList已预过滤为P0 */
  isP0Entry?: boolean;
}

export const EMPTY_DETAIL_MODAL_STATE: ParentTaskDetailModalState = {
  visible: false,
  title: '',
  subtitle: '',
  detailList: [],
};

interface ParentTaskDetailModalProps {
  state: ParentTaskDetailModalState;
  onClose: () => void;
}

/** 选项卡定义 */
const TAB_DEFS: { key: DetailTab; label: string; filter: (items: ParentTaskDetailItem[]) => ParentTaskDetailItem[] }[] = [
  { key: 'all', label: '全部', filter: (items) => items },
  { key: 'p0', label: 'P0 任务', filter: (items) => items.filter((t) => t.priority === 0) },
  { key: 'normal', label: '正常进行', filter: (items) => items.filter((t) => t.statusLabel === 0) },
  { key: 'soon', label: '即将到期', filter: (items) => items.filter((t) => t.statusLabel === 3) },
  { key: 'expired', label: '已过期', filter: (items) => items.filter((t) => t.statusLabel === 2) },
  { key: 'completed', label: '已完成', filter: (items) => items.filter((t) => t.statusLabel === 1) },
];

/** P0入口专用选项卡（去掉“P0任务”分类，因为与“全部”重复） */
const TAB_DEFS_P0: { key: DetailTab; label: string; filter: (items: ParentTaskDetailItem[]) => ParentTaskDetailItem[] }[] = [
  { key: 'all', label: '全部', filter: (items) => items },
  { key: 'normal', label: '正常进行', filter: (items) => items.filter((t) => t.statusLabel === 0) },
  { key: 'soon', label: '即将到期', filter: (items) => items.filter((t) => t.statusLabel === 3) },
  { key: 'expired', label: '已过期', filter: (items) => items.filter((t) => t.statusLabel === 2) },
  { key: 'completed', label: '已完成', filter: (items) => items.filter((t) => t.statusLabel === 1) },
];

const getTaskStatusBadge = (task: ParentTaskDetailItem) => {
  if (task.statusLabel === 1) return { label: '已完成', color: MT.successText, background: MT.successBg };
  if (task.statusLabel === 2) {
    const label = (task.riskText?.includes('·') ? task.riskText.split('·').pop() : task.riskText) || '已过期';
    return { label: label.replace(/^逾期/, '过期'), color: MT.dangerText, background: MT.dangerBg };
  }
  if (task.statusLabel === 3) {
    const label = (task.riskText?.includes('·') ? task.riskText.split('·').pop() : task.riskText) || '即将到期';
    return { label, color: MT.warningText, background: MT.warningBg };
  }
  return { label: '进行中', color: MT.infoText, background: MT.infoBg };
};

/**
 * 统一任务批次明细弹窗（3类入口共用）：推进情况「近7日新增」、到期风险四状态+P0、任务来源各分组。
 * 数据来源复用触发入口所在接口已返回的 detailList，前端本地过滤，不额外发起网络请求。
 * 不展示 BD 相关字段/筛选项（Requirement 8.5）。
 * 视觉还原：卡片式列表（非表格），每张卡片含标题行 + 元信息网格 + 任务项进度条（含目标标记）。
 * 到期风险入口支持选项卡切换（全部/P0/正常进行/即将到期/已过期/已完成），其他入口直接展示明细列表。
 */
const ParentTaskDetailModal: React.FC<ParentTaskDetailModalProps> = ({ state, onClose }) => {
  const { visible, title, subtitle, detailList, initialTab, showTabs, isP0Entry } = state;
  const { taskTypes, getTaskTypeName } = useTaskTypeDictionary();
  const [activeTab, setActiveTab] = useState<DetailTab>('all');

  // 弹窗打开时重置选项卡
  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    } else if (visible) {
      setActiveTab('all');
    }
  }, [visible, initialTab]);

  const taskMetricNameMap = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    taskTypes.forEach((type) => {
      const metricName = type.indicators?.[0]?.name;
      if (metricName) map[type.code] = metricName;
    });
    return map;
  }, [taskTypes]);

  // P0入口时预过滤 detailList 为仅含 P0 任务
  const baseList = useMemo(() => {
    if (isP0Entry) return detailList.filter((t) => t.priority === 0);
    return detailList;
  }, [detailList, isP0Entry]);

  // 当前使用的选项卡定义
  const activeTabDefs = isP0Entry ? TAB_DEFS_P0 : TAB_DEFS;

  // 选项卡过滤后的明细列表
  const displayList = useMemo(() => {
    if (!showTabs) return baseList;
    const tabDef = activeTabDefs.find((t) => t.key === activeTab);
    return tabDef ? tabDef.filter(baseList) : baseList;
  }, [baseList, activeTab, showTabs, activeTabDefs]);

  // 选项卡 items（不带数量，数量展示在标题中）
  const tabItems = useMemo(() => {
    if (!showTabs) return [];
    return activeTabDefs.map((tab) => ({
      key: tab.key,
      label: tab.label,
    }));
  }, [showTabs, activeTabDefs]);

  return (
    <Modal
      centered
      open={visible}
      title={`${title}（${displayList.length}）`}
      onCancel={() => { trackTaskAction('batch_detail.close'); onClose(); }}
      footer={
        <Button type="primary" style={{ ...MT_BTN.primary }} onClick={() => { trackTaskAction('batch_detail.done'); onClose(); }}>
          完成
        </Button>
      }
      width={1100}
      destroyOnClose
    >
      <div style={{ marginBottom: 12, fontSize: 12, color: MT.textMuted }}>{subtitle}</div>
      {showTabs && (
        <Tabs
          className="wb-detail-tabs"
          activeKey={activeTab}
          onChange={key => { trackTaskAction('batch_detail.tab'); setActiveTab(key as DetailTab); }}
          items={tabItems}
          size="small"
          style={{ marginBottom: 14 }}
        />
      )}
      {displayList.length === 0 ? (
        <Empty description="当前筛选范围暂无数据" style={{ padding: '48px 0' }} />
      ) : (
        <div style={{ display: 'grid', gap: 14, maxHeight: 640, overflowY: 'auto', overscrollBehavior: 'contain', padding: '0 6px 1px 1px' }}>
          {displayList.map((task) => {
            const percent = task.subTaskTotalCount > 0 ? Math.round((task.subTaskAchievedCount / task.subTaskTotalCount) * 100) : 0;
            const targetPercent =
              task.subTaskTotalCount > 0 ? Math.min(100, Math.round((task.targetCount / task.subTaskTotalCount) * 100)) : 0;
            const isExpired = task.statusLabel === 2;
            const isSoon = task.statusLabel === 3;
            const progressColor = isExpired ? MT.danger : isSoon ? MT.warning : percent >= 100 ? MT.success : MT.brandPrimary;
            const statusBadge = getTaskStatusBadge(task);

            return (
              <Card
                key={task.id}
                size="small"
                className="wb-detail-card"
                style={{ borderColor: MT.cardBorder, borderRadius: MT.cardRadius, boxShadow: 'none' }}
                styles={{
                  body: {
                    minHeight: 190,
                    display: 'grid',
                    gridTemplateRows: 'auto auto auto',
                    alignContent: 'space-between',
                    gap: 16,
                    padding: '18px 20px',
                  },
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <a
                      href={getParentTaskDetailUrl(task.id)}
                      onClick={() => trackTaskAction('batch_detail.open_batch', undefined, { parentTaskId: task.id })}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={task.name}
                      style={{ marginRight: 2, color: MT.textPrimary, fontSize: 17, lineHeight: 1.4, fontWeight: 600 }}
                    >
                      {task.name}
                    </a>
                    <span
                      style={{
                        ...TASK_TITLE_TAG_STYLE,
                        background: MT.pageBg,
                        color: MT.textMuted,
                      }}
                    >
                      {getTaskTypeName(task.taskType)}
                    </span>
                    <PriorityBadge priority={task.priority} />
                    <span
                      style={{
                        ...TASK_TITLE_TAG_STYLE,
                        background: statusBadge.background,
                        color: statusBadge.color,
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.15fr 1fr 0.85fr 1.55fr 0.75fr',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <MetaItem label="任务 ID" value={task.id} />
                  <MetaItem label="截止时间" value={dayjs(task.expireDate).format('YYYY-MM-DD HH:mm')} />
                  <MetaItem label="任务来源" value={TASK_SOURCE_CODE_TO_LABEL[task.taskSource] ?? '未知'} />
                  <MetaItem label="创建人" value={task.creatorName || task.creatorId} />
                  <MetaItem
                    label="检核指标"
                    value={task.checkMetricText || (taskMetricNameMap[task.taskType]
                      ? `${taskMetricNameMap[task.taskType]} · 目标 ${task.targetCount}`
                      : `任务完成数 ≥ ${task.targetCount}`)}
                  />
                  <MetaItem label="覆盖商家数" value={`${task.shopCount} 家`} />
                </div>

                <div style={{ alignSelf: 'center', display: 'grid', gridTemplateColumns: 'auto minmax(260px, 1fr) auto', alignItems: 'end', gap: 16 }}>
                  <span style={{ color: MT.textMuted, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transform: 'translateY(5px)' }}>任务项进度</span>
                  <div className="wb-detail-progress" style={{ position: 'relative', minWidth: 0, paddingTop: 22 }}>
                    {task.targetCount > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          zIndex: 1,
                          top: 0,
                          bottom: 0,
                          left: `${targetPercent}%`,
                          transform: 'translateX(-50%)',
                          pointerEvents: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 3,
                        }}
                      >
                        <em
                          style={{
                            color: MT.textTertiary,
                            fontSize: 11,
                            fontStyle: 'normal',
                            lineHeight: '16px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          目标 {task.targetCount}
                        </em>
                        <i
                          style={{
                            width: 2,
                            height: 8,
                            flex: '0 0 8px',
                            borderRadius: 1,
                            background: percent >= targetPercent ? '#FFFFFF' : MT.textTertiary,
                            display: 'block',
                          }}
                        />
                      </span>
                    )}
                    <Progress percent={percent} showInfo={false} strokeColor={progressColor} trailColor="#F0F1F5" style={{ display: 'block', margin: 0, lineHeight: 1 }} />
                  </div>
                  <b style={{ color: MT.textPrimary, fontSize: 15, lineHeight: 1, whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {task.subTaskAchievedCount}/{task.subTaskTotalCount}{' '}
                    <small style={{ color: MT.textTertiary, fontSize: 13, fontWeight: 500 }}>({percent}%)</small>
                  </b>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

const MetaItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => {
  const fullText = String(value);
  return (
    <div style={{ minWidth: 0 }}>
      <span style={{ display: 'block', marginBottom: 5, color: MT.textTertiary, fontSize: 12, lineHeight: 1.3 }}>{label}</span>
      <Text
        ellipsis={{
          tooltip: {
            title: fullText,
            color: '#1F1F1F',
            placement: 'top',
          },
        }}
        style={{ display: 'block', color: MT.textMuted, fontSize: 13, fontWeight: 500, lineHeight: 1.45, whiteSpace: 'nowrap' }}
      >
        {fullText}
      </Text>
    </div>
  );
};

export default ParentTaskDetailModal;
