import type {
  AgentStatItem, ExecutionGuardDto, ExpireRiskPageDto, ParentTaskDetailItem, SourceDiagnosisDto,
  SupervisionPreviewDto, TaskProgressPageDto, WorkbenchBdCardDto, WorkbenchBdStatsDto, WorkbenchConclusionDto,
} from '@/types/workbench';

import { demoFocusNames, demoTaskContents } from './demoBusinessCatalog';

const BASE = '/xianfu/api-v2/dove/bd_task/workbench';
const CITY_ID = 88000;
const teams = ['望京团队', '朝阳团队', '海淀团队', '丰台团队'];
const names = ['张明', '李婷', '王磊', '赵敏', '陈晨', '刘洋', '周颖', '吴昊', '徐悦', '孙宁', '马骏', '郑琳',
  '杨帆', '何静', '高远', '林晓', '罗宇', '唐悦', '宋佳', '谢峰', '韩雪', '曹睿', '许诺', '沈然'];
const taskNames = ['重点商家经营提升跟进', '配送体验提升专项', '秋季活动报名沟通', '门店菜单与商品信息完善', '低单量门店流量提升', '重点门店复购运营'];
const agentNames = ['商家智能外呼 Agent', '商家经营沟通 Agent', '活动报名 Agent', '体验诊断 Agent', '商品优化 Agent', '履约跟进 Agent'];
const typeCodes = [6, 5, 4, 4, 3, 2].flatMap((count, index) => Array(count).fill(9101 + index) as number[]);
const today = new Date();
today.setHours(0, 0, 0, 0);
const dateAt = (offset: number) => { const date = new Date(today); date.setDate(date.getDate() + offset); return date.getTime(); };
const dayNumber = (value: number) => { const d = new Date(value); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
const sum = (items: ParentTaskDetailItem[], key: 'subTaskTotalCount' | 'subTaskAchievedCount' | 'shopCount') => items.reduce((total, item) => total + item[key], 0);
const percent = (count: number, total: number) => total ? Number((count / total * 100).toFixed(2)) : 0;

// 每个团队都有稳定、承压、进度偏慢、需关注的示例，默认城市锚点落到团队时也能展示四象限。
export const focusDemoRecords = names.map((name, index) => {
  const slot = index % 6;
  const team = Math.floor(index / 6);
  const status = ([1, 1, 3, 2, 0, 0] as const)[slot];
  const total = [60, 200, 70, 240, 130, 100][slot] + team * [5, 11, 7, 9, 6, 4][slot];
  const achieved = Math.floor(total * ([0.9, 0.85, 0.25, 0.3, 0.55, 0.7][slot] + team * 0.005));
  const agentIndex = slot % 3 === 2 ? undefined : (Math.floor(index / 3) * 2 + slot % 3) % agentNames.length;
  const item: ParentTaskDetailItem = {
    id: 202610290201 + index, name: demoFocusNames[index],
    creatorId: `preview.manager${team + 1}`, creatorName: ['林经理', '陈经理', '刘经理', '王经理'][team],
    ownerId: `preview.bd${index + 1}`, ownerName: name, checkMetricText: demoTaskContents[typeCodes[index] - 9101],
    createdTime: dateAt(-index - 1), expireDate: dateAt(status === 2 ? -2 - team : status === 3 ? 1 + team % 3 : 7 + team),
    priority: ([7, 22].includes(index) ? 0 : index % 4 === 0 ? 2 : 1) as 0 | 1 | 2, goalAchieved: status === 1, isDeleted: false, tenantId: 164316,
    taskSource: index % 4 + 1, taskType: typeCodes[index], targetCount: Math.ceil(total * 0.8), statusLabel: status,
    recentNew: index < 7, shopCount: total, subTaskTotalCount: total, subTaskAchievedCount: achieved,
    subTaskAchievedRate: percent(achieved, total),
    agentId: agentIndex == null ? undefined : `preview-focus-agent-${agentIndex + 1}`,
    agentName: agentIndex == null ? undefined : agentNames[agentIndex],
    riskText: status === 2 ? `逾期${2 + team}天` : status === 3 ? `剩余${1 + team % 3}天` : undefined,
  };
  return { orgId: CITY_ID + team + 1, item };
});

function scopedItems(params: Record<string, unknown>): ParentTaskDetailItem[] {
  const orgs = Array.isArray(params.orgIds) ? params.orgIds.map(Number) : [CITY_ID];
  return focusDemoRecords.filter(({ orgId, item }) => (orgs.includes(CITY_ID) || orgs.includes(orgId)) &&
    (params.createTimeFrom == null || dayNumber(item.createdTime) >= Number(params.createTimeFrom)) &&
    (params.createTimeTo == null || dayNumber(item.createdTime) <= Number(params.createTimeTo))).map(record => record.item);
}
const aiDoing = (item: ParentTaskDetailItem) => item.agentId && !item.goalAchieved ? Math.floor((item.subTaskTotalCount - item.subTaskAchievedCount) * 0.35) : 0;
const aiDone = (item: ParentTaskDetailItem) => item.agentId ? Math.floor(item.subTaskAchievedCount * 0.6) : 0;
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length ? sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2 : 0;
}
function bdCard(items: ParentTaskDetailItem[]): WorkbenchBdCardDto {
  const loadMedian = median(items.map(item => item.subTaskTotalCount));
  const rateMedian = median(items.map(item => item.subTaskAchievedRate));
  const list: WorkbenchBdStatsDto[] = items.map(item => {
    const highLoad = item.subTaskTotalCount >= loadMedian;
    const stable = item.subTaskAchievedRate >= rateMedian;
    const supportLabel = highLoad ? stable ? 2 : 3 : stable ? 0 : 1;
    const pending = item.subTaskTotalCount - item.subTaskAchievedCount;
    return { bdId: item.ownerId!, bdName: item.ownerName!, totalCount: item.subTaskTotalCount, completedCount: item.subTaskAchievedCount,
      inProgressCount: item.statusLabel === 2 ? 0 : pending, expiredCount: item.statusLabel === 2 ? pending : 0,
      completionRate: item.subTaskAchievedRate, pendingCount: pending - aiDoing(item), aiDoingCount: aiDoing(item),
      soonExpireSubTaskCount: item.statusLabel === 3 ? pending : 0, supportLabel,
      parentTaskCount: 1, parentTaskCompletionRate: item.goalAchieved ? 100 : 0, notAchievedParentTaskCount: item.goalAchieved ? 0 : 1,
      expiredParentTaskCount: item.statusLabel === 2 ? 1 : 0, soonExpireParentTaskCount: item.statusLabel === 3 ? 1 : 0 };
  });
  return { list, activeBdCount: list.length, needSupportBdCount: list.filter(item => item.supportLabel === 3).length };
}
function progress(items: ParentTaskDetailItem[]): TaskProgressPageDto {
  const achieved = items.filter(item => item.goalAchieved).length;
  return { parentTaskCount: items.length, achievedParentCount: achieved, notAchievedParentCount: items.length - achieved,
    totalTaskCount: sum(items, 'subTaskTotalCount'), achievedTaskCount: sum(items, 'subTaskAchievedCount'), shopCount: sum(items, 'shopCount'),
    recentSevenDayNewParentCount: items.filter(item => item.recentNew).length,
    yesterdayNewParentCount: items.filter(item => item.createdTime === dateAt(-1)).length, detailList: items,
    taskTypeDistribution: [...new Set(items.map(item => item.taskType))].map(taskType => {
      const count = items.filter(item => item.taskType === taskType).length;
      return { taskType, parentTaskCount: count, rate: percent(count, items.length) };
    }) };
}
function expireRisk(items: ParentTaskDetailItem[]): ExpireRiskPageDto {
  const group = (status: number, p0 = false) => items.filter(item => item.statusLabel === status && (!p0 || item.priority === 0));
  const pending = (status: number, p0 = false) => sum(group(status, p0), 'subTaskTotalCount') - sum(group(status, p0), 'subTaskAchievedCount');
  return { expiredParentCount: group(2).length, p0ExpiredParentCount: group(2, true).length,
    soonExpireParentCount: group(3).length, p0SoonExpireParentCount: group(3, true).length,
    normalParentCount: group(0).length, p0NormalParentCount: group(0, true).length,
    achievedParentCount: group(1).length, p0AchievedParentCount: group(1, true).length, detailList: items,
    expiredSubTaskCount: pending(2), p0ExpiredSubTaskCount: pending(2, true),
    soonExpireSubTaskCount: pending(3), p0SoonExpireSubTaskCount: pending(3, true),
    normalSubTaskCount: pending(0) + pending(1), p0NormalSubTaskCount: pending(0, true) + pending(1, true),
    achievedSubTaskCount: sum(items, 'subTaskAchievedCount'), p0AchievedSubTaskCount: sum(items.filter(item => item.priority === 0), 'subTaskAchievedCount') };
}
function execution(items: ParentTaskDetailItem[]): ExecutionGuardDto {
  const covered = items.filter(item => item.agentId);
  const aiInProgressCount = items.reduce((total, item) => total + aiDoing(item), 0);
  const aiCompletedCount = items.reduce((total, item) => total + aiDone(item), 0);
  const agentBreakdown: AgentStatItem[] = [...new Set(covered.map(item => item.agentId!))].map(agentId => {
    const related = covered.filter(item => item.agentId === agentId);
    const usage = related.reduce((total, item) => total + aiDoing(item) + aiDone(item), 0);
    const total = sum(related, 'subTaskTotalCount');
    return { agentId, agentName: related[0].agentName!, totalTaskCount: total, achievedTaskCount: usage,
      subTaskUsageRate: percent(usage, total), parentTaskCount: related.length, achievedParentTaskCount: related.filter(item => item.goalAchieved).length };
  });
  return { aiInProgressCount, aiCompletedCount, aiUsageRate: percent(aiInProgressCount + aiCompletedCount, sum(items, 'subTaskTotalCount')),
    aiCoverageRate: percent(covered.length, items.length), aiCoveredParentTaskCount: covered.length,
    agentCount: agentBreakdown.length, agentBreakdown };
}
function sources(items: ParentTaskDetailItem[]): SourceDiagnosisDto {
  return { detailList: items, sourceList: ['一线管理者', '总部管理者', '蜂窝 Agent', '下沉驾驶舱'].map((taskSource, index) => {
    const related = items.filter(item => item.taskSource === index + 1);
    return { taskSource, taskSourceCode: index + 1, parentTaskCount: related.length, parentTaskRate: percent(related.length, items.length),
      aiCoverageCount: related.filter(item => item.agentId).length,
      aiDoingCount: related.filter(item => aiDoing(item) > 0).length, aiDoneCount: related.filter(item => item.agentId && item.goalAchieved).length,
      notAchievedCount: related.filter(item => !item.goalAchieved).length, expiredCount: related.filter(item => item.statusLabel === 2).length,
      todayExpireCount: related.filter(item => item.expireDate === dateAt(0)).length, achievedParentTaskCount: related.filter(item => item.goalAchieved).length,
      soonDueCount: related.filter(item => item.statusLabel === 3).length, subTaskCount: sum(related, 'subTaskTotalCount'), completedSubTaskCount: sum(related, 'subTaskAchievedCount'),
      aiDoingSubTaskCount: related.reduce((total, item) => total + aiDoing(item), 0), aiDoneSubTaskCount: related.reduce((total, item) => total + aiDone(item), 0) };
  }) };
}
function conclusion(items: ParentTaskDetailItem[]): WorkbenchConclusionDto {
  const p = progress(items), risk = expireRisk(items), bds = bdCard(items);
  return { p0ExpiredParentCount: risk.p0ExpiredParentCount, expiredParentCount: risk.expiredParentCount,
    p0SoonDueCount: risk.p0SoonExpireParentCount, soonExpireParentCount: risk.soonExpireParentCount,
    p0NotAchievedParentCount: items.filter(item => item.priority === 0 && !item.goalAchieved).length,
    achievedParentTaskCount: p.achievedParentCount, parentTaskCount: items.length, totalTaskCount: p.totalTaskCount, shopCount: p.shopCount,
    yesterdayNewParentCount: p.yesterdayNewParentCount, recentSevenDayNewParentCount: p.recentSevenDayNewParentCount,
    yesterdayCompletedSubTaskCount: Math.floor(p.achievedTaskCount * 0.08), inProgressParentTaskCount: risk.normalParentCount,
    parentTaskAchievementRate: percent(p.achievedParentCount, items.length), soonDueParentTaskCount: risk.soonExpireParentCount,
    expiredParentTaskCount: risk.expiredParentCount, riskLevel: risk.expiredParentCount ? 3 : risk.soonExpireParentCount ? 2 : bds.needSupportBdCount ? 1 : 0,
    summary: '建议优先跟进已过期与即将到期的任务批次，并为高负荷、低完成率的 BD 提供支持。',
    supervisionEnabled: items.some(item => !item.goalAchieved), soonDueRate: Math.round(percent(risk.soonExpireParentCount, items.length)),
    concernedBdRate: Math.round(percent(bds.needSupportBdCount, bds.activeBdCount)), activeBdCount: bds.activeBdCount,
    highlights: [{ type: 'execution', text: '高负荷且执行偏弱的 BD 需要关注', count: bds.needSupportBdCount }] };
}
function supervision(items: ParentTaskDetailItem[]): SupervisionPreviewDto {
  const bds = bdCard(items).list.filter(item => item.supportLabel === 3);
  const ids = new Set(bds.map(item => item.bdId));
  const detailList = items.filter(item => ids.has(item.ownerId!) && !item.goalAchieved);
  const expired = detailList.filter(item => item.statusLabel === 2).length;
  const soon = detailList.filter(item => item.statusLabel === 3).length;
  return { previewText: `将对 ${bds.length} 位 BD 的 ${detailList.length} 个未完成任务批次进行督办，其中 ${expired} 个已过期、${soon} 个即将到期。`,
    bdCount: bds.length, parentTaskCount: detailList.length, p0NotAchievedCount: detailList.filter(item => item.priority === 0).length,
    expiredParentTaskCount: expired, soonDueParentTaskCount: soon, concernedBdCount: bds.length, hasHighRisk: expired > 0 || soon > 0,
    detailList, bdDetailList: bds.map(bd => ({ bdMis: bd.bdId, bdName: bd.bdName, parentTaskCount: bd.notAchievedParentTaskCount, supportLabel: bd.supportLabel })) };
}

/** 独立演示本地数据；督办发送仅返回模拟结果，不传输消息。 */
export function getWorkbenchFocusPreview(url: string, params: Record<string, unknown>): { handled: true; data: unknown } | { handled: false } {
  if (!url.startsWith(`${BASE}/`)) return { handled: false };
  const items = scopedItems(params);
  switch (url) {
    case `${BASE}/queryConclusionStats`: return { handled: true, data: conclusion(items) };
    case `${BASE}/queryTaskProgress`: return { handled: true, data: progress(items) };
    case `${BASE}/queryExpireRisk`: return { handled: true, data: expireRisk(items) };
    case `${BASE}/queryExecutionGuard`: return { handled: true, data: execution(items) };
    case `${BASE}/querySourceDiagnosis`: return { handled: true, data: sources(items) };
    case `${BASE}/queryBdStats`: return { handled: true, data: bdCard(items) };
    case `${BASE}/querySupervisionBdList`: return { handled: true, data: supervision(items) };
    case `${BASE}/sendSupervision`: return { handled: true, data: { submitted: true, estimatedBdCount: supervision(items).bdCount } };
    default: return { handled: false };
  }
}
