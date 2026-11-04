// 任务工作台（Task Workbench）相关类型定义
// 权威字段清单来源：`.spec/task-workbench/02_current_status_spec.md` 第 4.2 节，
// 取自远程分支 `origin/feature/AEGDC-2019-95987009/manager-center`（截至 commit `dc6b2736a`）后端源码。
// 字段命名与后端 Java 驼峰命名一致，不做转换。

// ==================== 统一请求参数 ====================

/** 工作台 8 个接口共用的统一请求参数 */
export interface WorkbenchStatsReq {
  /** 业务线租户ID，可选，未传时后端 BdTenantResolver 自动解析 */
  tenantId?: number;
  /** 创建时间起始，yyyyMMdd 整数，可选 */
  createTimeFrom?: number;
  /** 创建时间截止，yyyyMMdd 整数，可选 */
  createTimeTo?: number;
  /**
   * 组织结构ID列表，字段注释写"必传（总部用户除外）"，但后端 validateReq() 实际对全部角色强制校验非空，
   * 前端应始终保证非空后才发起请求，详见 02 现状文档 3.2.1 节。
   */
  orgIds: number[];
}

// ==================== 统一任务批次明细结构（4 个卡片 detailList 共用） ====================

/** 统一任务批次明细项，供 4 个卡片的 detailList 共用（21 个字段） */
export interface ParentTaskDetailItem {
  id: number;
  name: string;
  creatorId: string;
  /**
   * 创建人姓名。后端分支 feature/AEGDC-2019-95987009/manager-center 新增字段，
   * 通过 creatorId 批量查询 WmEmployService 回填，用于「默认展示姓名，hover 展示 mis」的人员信息展示改造。
   */
  creatorName?: string;
  /** 任务批次责任人；后端未返回时前端展示“—” */
  ownerId?: string;
  ownerName?: string;
  /** 完整检核指标文案，如“上单完成率 ≥ 90%” */
  checkMetricText?: string;
  /** 截止日期，epoch millis */
  expireDate: number;
  /** 创建时间，epoch millis */
  createdTime: number;
  /** 0=P0紧急 1=P1重要 2=P2普通 */
  priority: 0 | 1 | 2;
  goalAchieved: boolean;
  isDeleted: boolean;
  tenantId: number;
  /** 来源数值编码（0=UNKNOWN/1=一线管理者/2=总部管理者/3=蜂窝Agent/4=下沉驾驶舱），与 SourceItem.taskSourceCode 同一套编码 */
  taskSource: number;
  taskType: number;
  targetCount: number;
  /** 任务批次四态：0=进行中 1=已完成 2=已过期 3=即将到期（口径见 Glossary，服务端计算） */
  statusLabel: 0 | 1 | 2 | 3;
  /** 是否近7日新增 */
  recentNew: boolean;
  agentId?: string;
  agentName?: string;
  /** 服务端返回的覆盖商家数，不复用为品牌数或行业商家数 */
  shopCount: number;
  subTaskTotalCount: number;
  subTaskAchievedCount: number;
  subTaskAchievedRate: number;
  /** 风险文案，仅过期/即将到期时有值，如"剩余N天"/"逾期N天" */
  riskText?: string;
}

// ==================== 1. AI 总结（queryConclusionStats） ====================

/** AI 总结卡片风险高亮条目 */
export interface RiskHighlightItem {
  /** 风险类型编码 */
  type: string;
  /** 展示文案 */
  text: string;
  /** 数量 */
  count: number;
}

/** AI 总结/规则化经营结论 DTO（24 个字段） */
export interface WorkbenchConclusionDto {
  p0ExpiredParentCount: number;
  expiredParentCount: number;
  p0SoonDueCount: number;
  soonExpireParentCount: number;
  p0NotAchievedParentCount: number;
  achievedParentTaskCount: number;
  parentTaskCount: number;
  totalTaskCount: number;
  shopCount: number;
  yesterdayNewParentCount: number;
  recentSevenDayNewParentCount: number;
  yesterdayCompletedSubTaskCount: number;
  inProgressParentTaskCount: number;
  /** 任务批次达标率，double，如 65.30 表示 65.30% */
  parentTaskAchievementRate: number;
  soonDueParentTaskCount: number;
  expiredParentTaskCount: number;
  /** 风险等级：0=正常 1=低 2=中 3=高 */
  riskLevel: 0 | 1 | 2 | 3;
  /** 后端生成的建议文案；标题展示由 riskLevel 统一生成，避免环境模板差异造成视觉漂移 */
  summary: string;
  /** 命中的模板键，可用于埋点/日志，不需要在 UI 上展示 */
  templateKey?: string;
  /** 是否存在紧急督办事项 */
  supervisionEnabled: boolean;
  /** 即将到期占比，int 类型，数值含义待联调确认，见 formatIntRateField.ts */
  soonDueRate: number;
  /** 需关注BD占比，int 类型，数值含义待联调确认，见 formatIntRateField.ts */
  concernedBdRate: number;
  /** 模板参数原始值，一般不需要前端单独使用 */
  summaryParams?: Record<string, string>;
  /** 最多2条风险高亮 */
  highlights: RiskHighlightItem[];
  /** 有任务的 BD 总数，用于配合 needSupportBdCount 判断 supervisionEnabled 语义 */
  activeBdCount?: number;
}

// ==================== 2. 推进情况卡片（queryTaskProgress） ====================

/** 业务类型分布条目 */
export interface TaskTypeItem {
  taskType: number;
  parentTaskCount: number;
  rate: number;
}

/** 推进情况卡片 DTO */
export interface TaskProgressPageDto {
  parentTaskCount: number;
  achievedParentCount: number;
  notAchievedParentCount: number;
  totalTaskCount: number;
  shopCount: number;
  recentSevenDayNewParentCount: number;
  /** 较上期新增任务批次增量 */
  yesterdayNewParentCount: number;
  achievedTaskCount: number;
  detailList: ParentTaskDetailItem[];
  taskTypeDistribution: TaskTypeItem[];
}

// ==================== 3. 到期风险卡片（queryExpireRisk） ====================

/** 到期风险卡片 DTO（任务批次4状态 × (总数+P0数) 共8个统计字段 + 任务项4状态×(总数+P0数) 共8个统计字段，V1.2 新增任务项部分，口径与任务批次四态对齐） */
export interface ExpireRiskPageDto {
  expiredParentCount: number;
  p0ExpiredParentCount: number;
  soonExpireParentCount: number;
  p0SoonExpireParentCount: number;
  normalParentCount: number;
  p0NormalParentCount: number;
  achievedParentCount: number;
  p0AchievedParentCount: number;
  detailList: ParentTaskDetailItem[];
  /** 已过期任务项数（未完成且截止日早于今天），V1.2 新增 */
  expiredSubTaskCount: number;
  /** 已过期P0任务项数，V1.2 新增 */
  p0ExpiredSubTaskCount: number;
  /** 即将到期任务项数（未完成且截止日在今天~今天+3天，含两端），V1.2 新增 */
  soonExpireSubTaskCount: number;
  /** 即将到期P0任务项数，V1.2 新增 */
  p0SoonExpireSubTaskCount: number;
  /** 正常进行中任务项数（未完成且截止日距今超过3天），V1.2 新增 */
  normalSubTaskCount: number;
  /** 正常P0任务项数，V1.2 新增 */
  p0NormalSubTaskCount: number;
  /** 已完成任务项数（status为DONE/CHECK_PASSED），V1.2 新增 */
  achievedSubTaskCount: number;
  /** 已完成P0任务项数，V1.2 新增 */
  p0AchievedSubTaskCount: number;
}

// ==================== 4. AI 执行进展卡片（queryExecutionGuard） ====================

/** Agent 构成条目（7 个字段） */
export interface AgentStatItem {
  agentId: string;
  agentName: string;
  totalTaskCount: number;
  achievedTaskCount: number;
  subTaskUsageRate: number;
  parentTaskCount: number;
  achievedParentTaskCount: number;
}

/** AI 执行进展卡片 DTO（使用率 + 覆盖率双维度） */
export interface ExecutionGuardDto {
  /** AI使用率（任务项维度），double，两位小数百分比 */
  aiUsageRate: number;
  aiInProgressCount: number;
  aiCompletedCount: number;
  /** AI覆盖率（任务批次维度），double，两位小数百分比 */
  aiCoverageRate: number;
  aiCoveredParentTaskCount: number;
  agentCount: number;
  agentBreakdown: AgentStatItem[];
}

// ==================== 5. 任务来源卡片（querySourceDiagnosis） ====================

/**
 * 任务来源分组条目。
 * 🆕 后端契约变更（见 `.spec/task-workbench/09_backend_data_calibration_reference.md` 3.6 节）：
 * - `taskSource` 语义已由"英文枚举名字符串"（如 "FRONTLINE_MANAGER"）改为"来源中文名称"（从 Lion
 *   `workbenchTaskSourceConfig` 动态读取），前端直接展示即可，不再需要 `TASK_SOURCE_NAME_TO_LABEL` 映射。
 * - 新增 `taskSourceCode`：与 `ParentTaskDetailItem.taskSource`（Integer）同一套数值编码
 *   （0=UNKNOWN/1=一线管理者/2=总部管理者/3=蜂窝Agent/4=下沉驾驶舱），过滤明细列表须使用该字段做数值匹配，
 *   不再需要字符串→数值的转换映射（`matchTaskSource` 已废弃）。
 */
export interface SourceItem {
  /** 来源中文名称，后端已本地化，直接展示 */
  taskSource: string;
  /** 🆕 来源数值编码，与 ParentTaskDetailItem.taskSource 同一套编码，过滤 detailList 时使用该字段 */
  taskSourceCode: number;
  parentTaskCount: number;
  parentTaskRate: number;
  aiCoverageCount: number;
  aiDoingCount: number;
  aiDoneCount: number;
  notAchievedCount: number;
  expiredCount: number;
  todayExpireCount: number;
  achievedParentTaskCount: number;
  soonDueCount: number;
  /** 🆕 V1.2 新增，任务项维度：该来源下任务项总数 */
  subTaskCount?: number;
  /** 🆕 V1.2 新增，任务项维度：status IN (DONE, CHECK_PASSED) */
  completedSubTaskCount?: number;
  /** 🆕 V1.2 新增，任务项维度：status = AI_DOING(5) */
  aiDoingSubTaskCount?: number;
  /** 🆕 V1.2 新增，任务项维度：status = AI_DONE(6) */
  aiDoneSubTaskCount?: number;
}

/** 任务来源卡片 DTO */
export interface SourceDiagnosisDto {
  sourceList: SourceItem[];
  detailList: ParentTaskDetailItem[];
}

// ==================== 6. 需关注 BD 卡片（queryBdStats） ====================

/** BD 散点图条目（16 个字段） */
export interface WorkbenchBdStatsDto {
  bdId: string;
  /**
   * BD 姓名。后端分支 feature/AEGDC-2019-95987009/manager-center 已接入 WorkbenchEsHelper.fillBdStatsNames
   * 批量回填真实姓名（此前恒为空字符串的口径已失效），用于「默认展示姓名，hover 展示 mis」的人员信息展示改造。
   */
  bdName: string;
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  expiredCount: number;
  /** 完成率，double，🆕 分母含 expiredCount（commit dc6b2736a 最新口径） */
  completionRate: number;
  pendingCount: number;
  aiDoingCount: number;
  soonExpireSubTaskCount: number;
  /** 0=稳定 1=需关注 2=任务量大 3=需支持 */
  supportLabel: 0 | 1 | 2 | 3;
  parentTaskCount: number;
  parentTaskCompletionRate: number;
  notAchievedParentTaskCount: number;
  expiredParentTaskCount: number;
  soonExpireParentTaskCount: number;
}

/** 需关注 BD 卡片 DTO */
export interface WorkbenchBdCardDto {
  needSupportBdCount: number;
  activeBdCount: number;
  list: WorkbenchBdStatsDto[];
}

// ==================== 7/8. 督办预览与发送 ====================

/** 督办 BD 概要条目 */
export interface BdSummaryItem {
  bdMis: string;
  bdName: string;
  parentTaskCount: number;
  supportLabel: 0 | 1 | 2 | 3;
}

/** 督办预览 DTO */
export interface SupervisionPreviewDto {
  /** 已按是否存在高风险生成好的完整确认摘要文案 */
  previewText: string;
  bdCount: number;
  parentTaskCount: number;
  p0NotAchievedCount: number;
  expiredParentTaskCount: number;
  soonDueParentTaskCount: number;
  concernedBdCount: number;
  hasHighRisk: boolean;
  detailList: ParentTaskDetailItem[];
  /** 限50条 */
  bdDetailList: BdSummaryItem[];
}

/** 督办发送结果 DTO */
export interface SupervisionSendResultDto {
  submitted: boolean;
  estimatedBdCount: number;
}
