// BD 任务管理相关类型定义

// 租户信息
export interface TenantDto {
  tenantId: number | string;
  tenantName: string;
}

export interface PageDto<T> {
  page: number;
  pageSize: number;
  total: number;
  data: T[];
}

// 门店联系对象类型（contactObjectType）：WM_SHOP=外卖门店，WDC_SHOP=公海门店
// 后端技术方案 §3.5（KM 2778373947）：ParentTaskOverviewDto.contactObjectType 枚举值
export const CONTACT_OBJECT_TYPE = {
  WM_SHOP: -3,
  WDC_SHOP: -1,
  SKU: -9,
  BRAND: -10,
  TS_SKU: -11,
  TS_POI: -12,
  PHF_SKU: -13,
} as const;
export type ContactObjectType = typeof CONTACT_OBJECT_TYPE[keyof typeof CONTACT_OBJECT_TYPE];

// 任务批次派生状态（derivedStatus）：用于任务列表筛选和状态标签展示。
// 保留原有三态编码，并补充 SOON_EXPIRE=3（即将到期），与工作台风险状态口径一致。
export const PARENT_TASK_DERIVED_STATUS = {
  COMPLETED: 0,
  IN_PROGRESS: 1,
  EXPIRED: 2,
  SOON_EXPIRE: 3,
} as const;
export type ParentTaskDerivedStatus = typeof PARENT_TASK_DERIVED_STATUS[keyof typeof PARENT_TASK_DERIVED_STATUS];

// 画像/检核字段展示类型（valueType）：TAG=标签样式，TEXT=文本样式
// 后端技术方案 §3.8：ShopDimensionItemDto/BdTaskDto.profileFields 动态数组元素结构
export interface ProfileFieldDto {
  /** 字段标识，如 businessStatus，前端可按 key 做少量定制（如颜色），不感知字段是否存在（不存在则数组里没有这一项） */
  key: string;
  /** 字段中文名，如"营业状态"，前端直接展示，文案变更只改后端不改前端 */
  label: string;
  /** TAG=用标签组件渲染，TEXT=用文本组件渲染 */
  valueType: 'TAG' | 'TEXT';
  /** valueType=TEXT 时的展示值；TAG 且单值时也用这个 */
  value?: string;
  /** valueType=TAG 且多值时使用（如 poiTags 一个字段对应多个标签平铺展示），单值 TAG 该字段为空 */
  tagList?: string[];
}

export type ParentTaskGoalType = 'COUNT' | 'PERCENT';

export interface ParentTaskGoalFeedback {
  phase: 'CURRENT' | 'PROCESSING' | 'UNAVAILABLE';
  targetType?: ParentTaskGoalType;
  targetPercent?: number | null;
  targetCount?: number;
  totalCount?: number;
  shortfallCount?: number;
  reason?: string;
  message?: string;
}

/** 仅用于目标配置和全批次计数，不提供页面操作权限。 */
export interface ParentTaskGoalSummary {
  parentTaskId: number;
  targetType?: ParentTaskGoalType;
  targetPercent?: number | null;
  targetCount: number;
  totalCount: number;
  goalAchieved?: boolean;
  goalFeedback?: ParentTaskGoalFeedback;
}

// 任务批次概览 DTO
export interface ParentTaskOverviewDto {
  subjectCount?: number;
  parentTaskId: number;
  name: string;
  // 0=P0紧急, 1=P1重要, 2=P2普通, 3=P3低优
  priority: number;
  taskType: number;
  expireDate: string;
  totalCount: number;
  completedCount: number;
  targetCount: number;
  targetType?: ParentTaskGoalType;
  targetPercent?: number | null;
  emptyPercentBatch?: boolean;
  achieved: boolean;
  targetCompletionRate: number;
  // key: AI_DONE | BD_DONE | IN_PROGRESS | NOT_STARTED
  distribution: Record<string, number>;
  /** 当前登录用户是否有权删除该任务（后端计算并回填，前端仅读取） */
  canDelete?: boolean;
  /** 任务批次整体说明，纯文本，最多1000字符 */
  parentTaskDescription?: string | null;
  /** 按当前截止日期计算能否直接编辑说明；已过期任务续期后可在同一次请求中同步修改 */
  canEdit?: boolean;
  /**
   * 关联的 Agent/Skill 列表（创建批次时传入）。
   * 已核实后端 ParentTaskOverviewDto.java（dove-sdk）真实存在该字段，agentId 为字符串型 skill 标识（如 "skill_delivery_fee_notify"），非数字 ID。
   * 为空/undefined 时前端不展示该标签。
   */
  agentInfos?: { agentId: string; agentName: string; contactType?: number | null }[];
  /**
   * 创建时间（epoch millis）。后端技术方案 §3.5 新增字段（ThriftField 14），DB/ES 已有数据，本次接口透出。
   */
  createdTime?: number;
  /** 是否支持 AI 直接执行；为 true 时在任务批次标题后展示标签。 */
  aiDirectExecute?: boolean;
  /**
   * 门店联系对象类型（外卖门店/公海门店）。后端技术方案 §3.5 新增字段（ThriftField 15）。
   * 同一任务批次下全部任务项门店类型唯一，用于中间层筛选字段集自动切换（AC-006-2b/AC-006-5）。
   */
  contactObjectType?: ContactObjectType;
  /**
   * 创建人 mis。后端技术方案 §3.5 新增字段（ThriftField 16）。
   */
  creatorId?: string;
  /**
   * 创建人姓名。后端分支 feature/AEGDC-2019-95987009/manager-center 新增字段（ThriftField 19），
   * 通过 creatorId 批量查询 WmEmployService 回填，用于「默认展示姓名，hover 展示 mis」的人员信息展示改造。
   */
  creatorName?: string;
  /**
   * 任务批次派生状态（已完成/进行中/已过期/即将到期）。
   * 而是通过 queryParentTaskList 的 status 入参 + 返回 total 做统计和筛选，理由见 §3.11 "统计"一节）。
   * 派生规则（查询时算，不落库）：goalAchieved=true → 已完成(0)；goalAchieved=false 且 expireDate>=今天 → 进行中(1)；
   * goalAchieved=false 且 expireDate<今天 → 已超时(2)。goalAchieved 由 BdParentTaskGoalCheckJob 定时计算，非实时。
   */
  derivedStatus?: ParentTaskDerivedStatus;
}

// 任务批次删除请求（后端技术方案 §3.13：deleteParentTask 改造为支持批量，单次 ≤50 个；单删也传 list-of-1）
export interface DeleteParentTaskReq {
  parentTaskIds: number[];
}

// 批量删除失败明细
export interface FailDetail {
  parentTaskId: number;
  reason: string;
}

// 任务批次批量删除结果（后端技术方案 §3.13，deleteParentTask 出参：successCount + failDetails，部分失败不整体拒绝）
export interface BatchDeleteResultDto {
  successCount: number;
  failDetails: FailDetail[];
}

// 任务批次更新请求（后端技术方案 §3.6：operatorId 改为可选，为空时后端 SsoUtil.getMisId() 兜底；新增 priority 字段）
export interface UpdateParentTaskReq {
  parentTaskId: number;
  /** 操作人 mis，可选。为空时后端自动从当前登录态兜底获取，前端本次不再需要自行传入 */
  operatorId?: string;
  /** 新的批次名称，null/不传=不更新 */
  name?: string;
  /** 新的任务类型，须为 listTaskTypes() 返回的合法值，null/不传=不更新 */
  taskType?: number;
  /** 新的目标完成数（绝对值），null/不传=不更新 */
  targetCount?: number;
  targetType?: ParentTaskGoalType;
  targetPercent?: number;
  /** 格式 yyyy-MM-dd，不能早于今天，null/不传=不更新 */
  expireDate?: string;
  /** 新的优先级（TaskPriority.code），后端技术方案 §3.6 新增字段，null/不传=不更新 */
  priority?: number;
  /** 任务批次整体说明；不传=不更新，空字符串=清空 */
  parentTaskDescription?: string;
}

// 任务批次更新结果摘要
export interface UpdateSummaryDto {
  /** 后端更新摘要返回的父任务ID；旧回包缺失时保持未确认。 */
  parentTaskId?: number;
  goalFeedback?: ParentTaskGoalFeedback;
  addedCount?: number;
  removedCount?: number;
  retainedCount?: number;
  failDetails?: FailDetail[];
}

// 任务项批量移除请求
export interface DeleteSubTasksReq {
  parentTaskId: number;
  taskIds: number[];
}

// 任务项 DTO
export interface TaskConditionDto {
  conditionDesc?: string | null;
  conditionDetail?: string | null;
  conditionId?: string | null;
  completedDetail?: string | null;
}

export interface BdTaskDto {
  /** 演示数据中的结果缺失说明。 */
  aiExecutionResultUnavailableReason?: string;
  /** 最近登记的外部任务ID；不能据此判断已保存结果的渠道。 */
  externalTaskId?: string;
  /** 已保存结果渠道：2/6外呼、10 IM；-101等未知渠道仅作为历史摘要。 */
  aiExecutionResultContactTypes?: number[];
  /** 任务项创建时间；商品聚合明细卡用于替代截止时间展示。 */
  createdTime?: number | string;
  /** 兼容旧接口返回的任务项创建日期。 */
  createdDate?: string;
  /** 执行实体 ID，字符串保留精度；执行入口不得使用关联 shopId 替代。 */
  objectId?: string | null;
  objectName?: string;
  contactObjectType?: ContactObjectType;
  tsPoiId?: string;
  /** 行业主体画像；商品任务中指所属行业门店。 */
  tsPoiName?: string;
  matchType?: number;
  outerAddress?: string;
  outerPic?: string;
  outerLongitude?: number;
  outerLatitude?: number;
  /** 仅用于批次详情展示：主体列表补充的关联公海商家 ID，不参与任务请求。 */
  industryWdcId?: number;
  /** 展示用聚合行本身没有真实 taskId，操作须使用 subTasks 中的任务。 */
  skuTaskAggregation?: SkuTaskAggregation;
  taskId: number;
  shopId: number;
  bdId: string;
  taskTypeDesc: string;
  taskContent: string;
  expireDate: string;
  // 0=待处理, 1=BD反馈完成, 2=BD反馈未完成, 3=已过期, 4=系统检核通过, 5=AI执行中, 6=AI执行完成
  status: number;
  feedbackResult: number;
  feedbackTime: string;
  shopName: string;
  remark: string;
  targetValue: string;
  parentTaskName: string;
  // 0=人工, 1=AI
  executorType: number;
  parentTaskId: number;
  /** 当前登录用户是否有权删除/移除该任务项（后端计算并回填，前端仅读取，与任务批次 canDelete 字段含义一致） */
  canDelete?: boolean;
  /**
   * 画像/检核字段动态数组（后端技术方案 §3.8，ThriftField 19）。
   * 含 targetValue/actualValue/businessStatus/onlineStatus/categoryName/deliveryType/poiTags/claimStatus/address/claimUid/cityId/aorName，
   * 不适用当前门店类型的字段不放入数组，前端天然只渲染有数据的字段。
   */
  profileFields?: ProfileFieldDto[];
  /** 门店 logo 图片 URL（后端技术方案 §3.8，ThriftField 20，不进 profileFields 动态数组，RPC 实时查 poiquery pic_url） */
  logo?: string;
  /** 体验分得分（后端技术方案 §3.8，ThriftField 21，仅外卖门店） */
  experienceScore?: number;
  /** 体验分是否达标（后端技术方案 §3.8，ThriftField 22，仅外卖门店，与 experienceScore 配套） */
  experienceReachTarget?: boolean;
  /** 检核指标当前值（后端技术方案 §3.1，RPC 实时查作战平台 Heimdallr，同时也会出现在 profileFields 的 actualValue key 中） */
  actualValue?: string;
  /**
   * 检核口径原始信息（bd_task.checkInfo，后端已新增透出，用于 TC-118-4 hover 浮层「检核口径：xx指标 ≥ yy」组装）。
   * bizIndicatorId 需配合 listTaskTypes() 返回的 indicators 字典反查指标中文名；operator/targetValue 直接取值拼接展示，
   * 不做二次加工（operator 后端已是可直接展示的运算符文案，如 ">="）。字段/字典任一缺失时前端均需降级不展示 hover。
   */
  checkInfo?: CheckInfoDto;
  /** 参考信息（后端新增字段），纯文本，展示在经营地址下面，超长单行省略号截断 */
  description?: string | null;
  /** 首个完整条件的兼容字段；两个值均非空时展示。 */
  conditionDesc?: string | null;
  conditionDetail?: string | null;
  completedDetail?: string | null;
  /** 多指标条件，描述与明细按同一指标项配对。 */
  conditions?: TaskConditionDto[] | null;
  /** 参考指标（后端新增字段），数组，展示在参考信息下面，行内展示数量 + 点击查看详情逐行展开具体值 */
  monitorIndicatorValues?: string[];
  /**
   * BD 姓名。后端分支 feature/AEGDC-2019-95987009/manager-center 新增字段（ThriftField 23），
   * 通过 bdId 批量查询 WmEmployService 回填，用于「默认展示姓名，hover 展示 mis」的人员信息展示改造。
   */
  bdName?: string;
  /** 是否支持 AI 直接执行；商家详情页任务卡片使用。 */
  aiDirectExecute?: boolean;

}

/** 检核口径原始信息（bd_task.checkInfo），用于组装 hover 浮层文案，非渲染用展示字段 */
export interface CheckInfoDto {
  /** 检核指标ID，对应 listTaskTypes() 返回的 indicators[].id，用于反查指标中文名 */
  bizIndicatorId?: number;
  /** 运算符（如 ">="），后端已是可直接展示的文案 */
  operator?: string;
  /** 检核目标值裸值（不含运算符），与 BdTaskDto.actualValue/profileFields.targetValue 为同一份数据的不同透出口径 */
  targetValue?: string;
}

/** 任务类型关联的检核指标字典项（listTaskTypes() 返回结构新增 indicators 字段的元素类型） */
export interface BizIndicatorDto {
  id: number;
  name: string;
}

// 任务类型配置
export interface BdTaskTypeConfigDto {
  code: number;
  name: string;
  /** 该任务类型关联的检核指标字典（后端已新增透出），用于按 bizIndicatorId 反查指标中文名，组装检核口径 hover 文案 */
  indicators?: BizIndicatorDto[];
}

// ==================== 商家列表筛选枚举字典（后端技术方案补充 KM 2779238690 §4.6/4.7）====================
// 【待后端接口就绪后联调】新增 getShopFilterOptions() 字典接口：一次性返回 businessStatus/onlineStatus/
// deliveryType/claimStatus 4 个字段的全量 {code, label} 选项 + 商家标签文案列表 + 品类树，前端进入列表页时调用一次
// 并缓存渲染下拉框/品类树，筛选请求仍传 code（List<Integer>），与现有 taskType 筛选交互方式保持一致，
// 前端不需要自行维护 code↔中文 映射表。

// 筛选枚举选项通用结构：code 用于筛选传参，label 为中文文案用于下拉框展示
export interface OptionItemDto {
  code: number;
  label: string;
}

// 品类树节点：外卖门店、公海门店共用同一套品类数据源
export interface CategoryTreeNodeDto {
  id: number;
  name: string;
  isLeaf: boolean;
  children?: CategoryTreeNodeDto[];
}

// getShopFilterOptions() 请求：按门店类型区分可用字段范围（businessStatus/onlineStatus/deliveryType 仅外卖返回非空，claimStatus 仅公海返回非空）
export interface GetShopFilterOptionsReq {
  contactObjectType: ContactObjectType;
}

// getShopFilterOptions() 响应
export interface ShopFilterOptionsDto {
  /** 行业合作标签（匹配类型）选项：1001/1002/2001。 */
  matchTypeOptions?: OptionItemDto[];
  /** 营业状态选项，仅外卖门店（WM_SHOP）返回非空 */
  businessStatusOptions?: OptionItemDto[];
  /** 上单状态选项，仅外卖门店返回非空 */
  onlineStatusOptions?: OptionItemDto[];
  /** 配送方式选项，仅外卖门店返回非空 */
  deliveryTypeOptions?: OptionItemDto[];
  /** 认领上单状态选项，仅公海门店（WDC_SHOP）返回非空 */
  claimStatusOptions?: OptionItemDto[];
  /** 商家标签文案列表（本身就是中文文案，无 code 层），外卖/公海通用 */
  poiTagsOptions?: string[];
  /** 品类树，外卖/公海通用（同一套数据源） */
  categoryTree?: CategoryTreeNodeDto[];
}

// 排序项（对应后端 SortReq）
export interface SortReq {
  field: string;
  asc: boolean;
}

// 查询任务批次列表请求
export interface BdmParentTaskPageReq {
  contactObjectType?: ContactObjectType;
  goalAchieved?: boolean;
  tenantId?: number | string;
  priority?: number;
  taskType?: number;
  page?: number;
  pageSize?: number;
  sortList?: SortReq[];
  parentTaskIdList?: number[];
  /** 过期时间下限（yyyy-MM-dd），用于"仅看未过期任务"全量过滤 */
  expireDateFrom?: string;
  /** 任务批次派生状态筛选（List<Integer>，可多选组合；0=已完成/1=进行中/2=已过期/3=即将到期） */
  status?: ParentTaskDerivedStatus[];
  /** 任务批次名称模糊搜索（后端技术方案 §3.12 新增参数） */
  name?: string;
  /** 任务批次ID精确搜索（后端技术方案 §3.12 新增参数，区别于批量查询用的 parentTaskIdList） */
  id?: number;
  /** 创建人 mis 模糊/精确搜索（后端技术方案 §3.12 新增参数，管理员视角追加过滤，BD/BDM 视角下因数据范围已受角色限制而不生效） */
  creatorId?: string;
}

// 查询任务项列表请求
export interface BdTaskDetailReq {
  contactObjectType?: ContactObjectType;
  objectId?: string;
  objectName?: string;
  tsPoiId?: string;
  /** 行业门店名称；商品任务按所属行业主体筛选。 */
  tsPoiName?: string;
  matchTypes?: number[];
  tab?: 1 | 2 | 3 | 4;
  tenantId?: number | string;
  /** 按主体查询跨批次任务时可省略，须同时提供 tab 和对应主体 ID。 */
  parentTaskId?: number;
  expireDate?: string;
  bdId?: string;
  status?: number;
  shopId?: number;
  taskType?: number;
  creatorId?: string;
  expireDateFrom?: string;
  expireDateTo?: string;
  executorType?: number;
  priority?: number;
  shopName?: string;
  page?: number;
  pageSize?: number;
  /** 排序参数（后端技术方案 §3.12 核实 QueryReq 基类本就支持，此前未被前端使用），字段名与 ES mapping 一致：priority/expireDate */
  sortList?: SortReq[];
  /** 任务批次名称模糊搜索（后端技术方案 §3.12 新增参数，对应 AC-004-3b 任务名称搜索） */
  parentTaskName?: string;
  /** 经营地址模糊搜索（后端技术方案 §3.12 新增参数，依赖 §3.7 address 字段写入 ES，对应 AC-006-2d） */
  address?: string;
  /**
   * 【待后端接口就绪后联调】以下字段均为后端技术方案（补充，KM 2779238690 §4.5）新增筛选参数，
   * ThriftField 16~24，商家详情页（任务项列表）按同一套口径补齐筛选项，与 BdShopDimensionPageReq 字段含义一致；
   * creatorId/bdId 已在上方原生定义，此处不重复。
   */
  /** 门店营业状态多选，仅外卖门店有效，ThriftField 16 */
  businessStatus?: number[];
  /** 门店上单状态多选，仅外卖门店有效，ThriftField 17 */
  onlineStatus?: number[];
  /** 门店品类多选（叶子节点ID），外卖/公海通用，ThriftField 18 */
  categoryId?: number[];
  /** 配送方式多选，仅外卖门店有效，ThriftField 19 */
  deliveryType?: number[];
  /** 体验分下限（闭区间），外卖/公海通用，ThriftField 20 */
  experienceScoreFrom?: number;
  /** 体验分上限（闭区间），外卖/公海通用，ThriftField 21 */
  experienceScoreTo?: number;
  /** 商家标签多选，命中一个即算（OR 逻辑），外卖/公海通用，ThriftField 22 */
  poiTags?: string[];
  /** 认领上单状态多选，仅公海门店有效，ThriftField 23 */
  claimStatus?: number[];
  /**
   * 任务项自身内容模糊搜索（对应 taskContent 字段），区别于上方按任务批次批次名搜索的 parentTaskName。
   * ThriftField 24。
   */
  taskName?: string;
}

// 任务反馈请求
export interface BdTaskFeedbackReq {
  taskIds: number[];
  // 1=已完成, 2=未完成
  feedbackResult: number;
  remark?: string;
}

/** 批量反馈逐条处理，外层 code=0 不代表每条任务均成功。 */
export interface BdTaskFeedbackBatchResultDto {
  successCount: number;
  failTaskIds: number[];
}

// ==================== 商家维度 ====================

// 商家维度列表查询请求（后端按角色自动决定数据范围）
export interface BdShopDimensionPageReq {
  objectId?: string;
  objectName?: string;
  tsPoiName?: string;
  /** 行业门店匹配类型多选：1001=美团独家、1002=竞对独家、2001=共有。 */
  matchTypes?: number[];
  tab?: 1 | 2 | 3 | 4;
  parentTaskId?: number;
  statuses?: number[];
  tsPoiId?: string;
  tenantId?: number | string;
  page?: number;
  pageSize?: number;
  shopId?: number;    // 按门店 ID 精确查询
  shopName?: string;  // 按门店名称模糊查询
  /** 门店类型（外卖/公海），后端技术方案 §3.9 新增参数，前端 tab 切换传对应值 */
  contactObjectType?: ContactObjectType;
  /**
   * 【待后端接口就绪后联调】以下字段均为后端技术方案（补充，KM 2779238690 §4.2）新增筛选参数，
   * ThriftField 4~15，字段名/类型已与后端最终确认，仅接口尚未开发上线，前端先按此结构接线。
   */
  /** 门店营业状态多选，仅外卖门店（contactObjectType=WM_SHOP）有效，ThriftField 4 */
  businessStatus?: number[];
  /** 门店上单状态多选，仅外卖门店有效，ThriftField 5 */
  onlineStatus?: number[];
  /** 门店品类多选（叶子节点ID），外卖/公海通用，ThriftField 6 */
  categoryId?: number[];
  /** 配送方式多选，仅外卖门店有效，ThriftField 7 */
  deliveryType?: number[];
  /** 体验分下限（闭区间），外卖/公海通用，ThriftField 8 */
  experienceScoreFrom?: number;
  /** 体验分上限（闭区间），外卖/公海通用，ThriftField 9 */
  experienceScoreTo?: number;
  /** 商家标签多选，命中一个即算（OR 逻辑），外卖/公海通用，ThriftField 10 */
  poiTags?: string[];
  /** 认领上单状态多选，仅公海门店有效，ThriftField 11 */
  claimStatus?: number[];
  /** 任务责任人（创建人）mis 精确搜索，仅管理员视角生效，主管/BD 视角因角色数据范围已收窄而静默不生效，ThriftField 12 */
  creatorId?: string;
  /** 任务责任人（跟进 BD）mis 精确搜索，仅管理员视角生效，同上，ThriftField 13 */
  bdId?: string;
  /** 经营地址模糊搜索，外卖/公海通用，ThriftField 14 */
  address?: string;
  /** 任务名称模糊搜索（按任务批次批次名称），外卖/公海通用，ThriftField 15 */
  taskName?: string;
}

// 任务项概览 DTO：商家卡片底部"任务概览"改用该结构（原 parentTaskOverviews/ParentTaskOverviewDto 已废弃）。
// 字段精简为任务项自身视角，不再包含 totalCount 等任务批次批次级统计字段。
export interface SubTaskOverviewDto {
  tsPoiId?: string;
  shopId?: number;
  shopName?: string;
  /** 商品概览直接混排在 subTaskOverviews 中（后端 TF13/16/17）。 */
  taskCount?: number;
  statusCounts?: Record<number, number>;
  subTasks?: SubTaskOverviewDto[];
  parentTaskName?: string;
  contactObjectType?: ContactObjectType;
  objectId?: string;
  objectName?: string;
  /** 任务项ID */
  subTaskId: number;
  /** 任务项名称，由「任务批次名称」-「任务项内容描述」组成 */
  name: string;
  /** 任务项状态码，TaskStatus.code：0=待处理, 1=完成, 2=未完成, 3=已过期, 4=检核通过, 5=AI执行中, 6=AI完成 */
  status: number;
  /** 任务项过期时间，格式 yyyy-MM-dd，继承自任务批次 */
  expireDate: string;
  /** 任务批次ID */
  parentTaskId: number;
  /** 优先级（继承自任务批次，0=P0紧急，1=P1重要，2=P2常规，3=P3较低），后端接口已补充下发该字段 */
  priority?: number;
  /** 任务描述；商家卡片任务信息条优先作为标题展示，缺失时回退 name。 */
  description?: string;
  /** 创建人 mis/姓名；后端未透出时前端展示占位。 */
  creatorId?: string;
  creatorName?: string;
  /** 任务创建时间，毫秒时间戳，用于与 expireDate 组成时间限制。 */
  createdTime?: number;
  /** 是否支持 AI 直接执行；商家列表任务概览使用。 */
  aiDirectExecute?: boolean;
  /** 兼容旧接口返回的任务开始/创建日期，格式 yyyy-MM-dd。 */
  createdDate?: string;
}

// 商家维度列表项
export interface ShopDimensionItemDto {
  objectId?: string;
  objectName?: string;
  achievedTaskCount?: number;
  outerId?: string;
  outerName?: string;
  wdcId?: number;
  matchType?: number;
  outerAddress?: string;
  outerPic?: string;
  outerLongitude?: number;
  outerLatitude?: number;
  aggregatedOverviews?: AggregatedTaskOverview[];
  shopId: number;
  shopName: string;
  /** 关联任务总数 */
  taskCount: number;
  /** 执行人 mis */
  executorMis: string | null;
  /**
   * 执行人姓名。后端分支 feature/AEGDC-2019-95987009/manager-center 新增字段（ThriftField 15），
   * 通过 executorMis 批量查询 WmEmployService 回填，用于「默认展示姓名，hover 展示 mis」的人员信息展示改造。
   */
  executorName?: string;
  /**
   * 画像字段动态数组（后端技术方案 §3.8，ThriftField 5）。
   * 字段集含义与 BdTaskDto.profileFields 一致（无 actualValue，因该字段仅任务项级检核指标才有）。
   */
  profileFields?: ProfileFieldDto[];
  /** 门店 logo 图片 URL（后端技术方案 §3.8，ThriftField 6） */
  logo?: string;
  /** 体验分得分（后端技术方案 §3.8，ThriftField 7，仅外卖门店） */
  experienceScore?: number;
  /** 体验分是否达标（后端技术方案 §3.8，ThriftField 8，仅外卖门店） */
  experienceReachTarget?: boolean;
  /**
   * 商家卡片底部"任务概览"：关联任务项明细（后端技术方案 §3.10，ThriftField 9，改用 SubTaskOverviewDto）。
   * 【字段调整】原 parentTaskOverviews（ParentTaskOverviewDto[]）已废弃，改为该门店自身任务项视角的精简结构。
   */
  subTaskOverviews?: SubTaskOverviewDto[];
}

export interface SkuTaskAggregation {
  taskCount: number;
  statusCounts: Record<number, number>;
  subTasks: BdTaskDto[];
}

export interface AggregatedTaskGroup {
  subjectId: number | string;
  subjectName: string;
  subjectExecutor?: { mis: string; name?: string };
  contactObjectType: ContactObjectType;
  taskCount: number;
  statusCounts: Record<number, number>;
  tasks: BdTaskDto[];
  achievedTaskCount?: number;
}

export interface AggregatedTaskOverview {
  parentTaskId: number;
  parentTaskName: string;
  priority: number;
  expireDate: string;
  taskCount: number;
  statusCounts: Record<number, number>;
}

export interface VisibleTabItem {
  tab: 1 | 2 | 3 | 4;
  tabName: string;
}

export interface VisibleObjectTypeItem {
  code: ContactObjectType;
  label: string;
}

export interface VisibleObjectTypesDto {
  tabs: VisibleTabItem[];
  /** 租户可见实体类型；-3=外卖门店，-1=公海门店，分别筛选与统计。 */
  objectTypes?: VisibleObjectTypeItem[];
}

// ==================== 统计接口相关 ====================

// 统计查询请求（queryTaskStatsSummary / queryBdStats 共用）
export interface BdTaskStatsReq {
  tenantId?: number | string;
  /** 可选组织节点，统计该节点及其下属范围，叠加后端原有权限。 */
  orgNodeId?: number;
  /** 多组织统计范围，待后端多选接口联调确认。 */
  orgNodeIds?: number[];
  createdTimeFrom?: string;   // 统计周期起始 yyyy-MM-dd
  createdTimeTo?: string;     // 统计周期截止 yyyy-MM-dd
  parentTaskId?: number;      // 可选，下钻到指定批次
}

// 单个任务类型统计项
export interface TaskTypeStatDto {
  taskType: number;
  taskTypeName: string;
  totalCount: number;
  completedCount: number;
  completionRate: string;     // 后端返回百分比字符串，如 "75.00%"
}

// 全局概览统计
export interface TaskStatsSummaryDto {
  /** 本地演示的每日完成率快照，百分数范围为 0—100。 */
  completionTrend?: { date: string; parentRate: number; taskRate: number }[];
  parentTaskCount: number;
  /** 已完成任务批次数 */
  parentCompletedTaskCount: number;
  /** 任务批次完成率，后端返回百分比字符串，如 "25.0%" */
  parentCompletionRate: string;
  /** AI 执行使用率，后端返回百分比字符串；缺失时展示占位符。 */
  aiUsageRate?: string;
  /** 关联 AI 能力批次下状态为 AI_DONE(6) 的任务项数。 */
  aiCompletedCount?: number;
  /** 未达标且截止日在今天至未来第 3 个自然日的批次数，含两端，由 summary 返回。 */
  soonDueParentTaskCount?: number;
  /** 今日到期任务批次数，由 summary 返回。 */
  todayDueParentTaskCount?: number;
  totalTaskCount: number;
  shopCount: number;
  completionRate: string;
  timeoutRate: string;
  completedCount: number;
  expiredCount: number;
  typeStats: TaskTypeStatDto[];
}

// BD 维度统计
export interface BdStatsDto {
  bdMis: string;
  /**
   * BD 姓名。后端分支 feature/AEGDC-2019-95987009/manager-center 新增字段（ThriftField 7），
   * 通过 bdMis 批量查询 WmEmployService 回填，用于「默认展示姓名，hover 展示 mis」的人员信息展示改造。
   */
  bdName?: string;
  totalCount: number;
  inProgressCount: number;
  completedCount: number;
  expiredCount: number;
  completionRate: string;
}

// 页面独立统计：总数与维度桶由服务端返回，前端不补算、不剔除筛选。
export interface StatsFieldReq {
  field: 'taskType' | 'priority' | 'status' | 'contactObjectType';
  codes: number[];
}

export type ParentTaskStatsReq = Omit<BdmParentTaskPageReq, 'page' | 'pageSize' | 'sortList'> & {
  statsFields: StatsFieldReq[];
};
export type TaskStatusStatsReq = Omit<BdTaskDetailReq, 'page' | 'pageSize' | 'sortList'> & {
  statsFields: { field: 'status'; codes: number[] }[];
};

export interface StatsBucketDto {
  code: number;
  name: string;
  count: number;
}

export interface StatsDimensionDto {
  items: StatsBucketDto[];
}

export interface ParentTaskStatsDto {
  /** 业务类型和优先级的“全部”都取此值。 */
  totalCount: number;
  taskTypeStats?: StatsDimensionDto;
  priorityStats?: StatsDimensionDto;
  statusStats?: StatsDimensionDto;
  contactObjectTypeStats?: StatsDimensionDto;
}

export interface TaskStatusStatsDto {
  totalCount: number;
  statusStats?: StatsDimensionDto;
}

/** 某次智能沟通的本地结果快照。NULL字段不推导成完成状态。 */
export interface AiExecutionResultDto {
  /** Dove原始触达状态：-101未知、1初始化、2触达中、3发起失败、4拨打完成/IM已发送、5取消；外呼缺失或未知时显示未知状态，不用executionStatus推断。 */
  status?: number | null;
  /** 仅外呼2/6：每项对应一通电话的AI总结，按新到旧返回；空数组为当前无总结，旧快照缺字段及IM可空；条数不计入发起次数。 */
  summarizing?: string[];
  /** Dove渠道：2智能外呼、6含调度流程外呼、10智能IM；旧文本可空。 */
  contactType?: number;
  /** Dove对象执行状态：-101未知、1待执行、2执行中、3已结束、4已取消；可空，结束不代表业务成功。 */
  executionStatus?: number | null;
  /** 原有意向摘要或历史文本；不是AI通话总结，新IM不采集。 */
  summary?: string;
  /** Dove IM会话状态原值，可空，不参与执行完成判断。 */
  conversationStatus?: number;
  /** Dove IM商家意向，可空。 */
  tagName?: string;
  /** Dove IM技能执行说明，可空，不用原始skillResult替代。 */
  skillResultDesc?: string;
  /** 已成功建立的IM会话退出原因，不作为外呼或任务创建失败原因，可空。 */
  releaseReasonMsg?: string;
}

export interface AiExecutionRecordDto {
  /** 本地执行关联ID，不是TaskAgent任务ID或Dove子任务ID。 */
  id: number;
  /** 已保存且渠道明确的快照按关联ID计算组内次序，含隐藏过程；空结果不占号、早先记录补回可顺延。前端不自行编号。 */
  executionNo?: number;
  /** 统计含隐藏过程的全部关联：本组至少两次为true；全部渠道已知且本组一次为false；其他为空。总结条数不计入。 */
  multipleExecutions?: boolean;
  /** 本次登记的Dove outerTaskId，使用字符串保留精度。 */
  externalTaskId: string;
  /** 本次执行最后保存的快照，不是实时Dove结果。 */
  result: AiExecutionResultDto;
}
