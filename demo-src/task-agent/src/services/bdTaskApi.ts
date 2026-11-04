import { message } from 'antd';
import type {
  ParentTaskGoalSummary,
  PageDto,
  ParentTaskOverviewDto,
  BdTaskDto,
  AiExecutionRecordDto,
  BdTaskTypeConfigDto,
  TaskStatsSummaryDto,
  BdStatsDto,
  ShopDimensionItemDto,
  BatchDeleteResultDto,
  UpdateSummaryDto,
  GetShopFilterOptionsReq,
  ShopFilterOptionsDto,
  TenantDto,
  VisibleObjectTypesDto,
  ParentTaskStatsReq,
  ParentTaskStatsDto,
  TaskStatusStatsReq,
  TaskStatusStatsDto,
  BdTaskFeedbackBatchResultDto,
} from '@/types/bdTask';
import { useTenantStore } from '@/stores/tenantStore';
import { getBdTaskBaselinePreview, isBdTaskBaselinePreview } from '@/mocks/bdTaskBaselinePreview';

interface ApiResponse<T> {
  code: number;
  msg?: string;
  data?: T;
}

// 需要携带 tenantId 的接口
const TENANT_REQUIRED_URLS = new Set([
  '/xianfu/api-v2/dove/bd_task/parent_task/stats',
  '/xianfu/api-v2/dove/bd_task/task/status/stats',
  '/xianfu/api-v2/dove/bd_task/parent_task/create',
  '/xianfu/api-v2/dove/bd_task/detail',
  '/xianfu/api-v2/dove/bd_task/parent_task/list',
  '/xianfu/api-v2/dove/bd_task/task_type/list',
  '/xianfu/api-v2/dove/bd_task/shop_dimension/list',
  '/xianfu/api-v2/dove/bd_task/stats/summary',
  '/xianfu/api-v2/dove/bd_task/stats/bd',
]);

/** 后端业务拒绝与传输异常分别处理，保留可定位的真实原因。 */
export class BdTaskApiError extends Error {
  constructor(message: string, public readonly code: number) {
    super(message);
    this.name = 'BdTaskApiError';
  }
}

const call = <T = any>(url: string, _showError = true) => async (params?: any): Promise<T> => {
  const preview = getBdTaskBaselinePreview(url, { ...params, tenantId: params?.tenantId ?? useTenantStore.getState().currentTenantId ?? 164316 });
  if (preview.handled) return preview.data as T;
  throw new Error('演示暂未包含此操作');
};

export const bdTaskApi = {
  // BD 表示无管理岗位的 BD；兼任管理岗位及管理员由后端返回 other。
  queryUserPositionType: async (_tenantId: number): Promise<'BD' | 'other'> => 'other',


  // 任务项 tab 和批次实体选项分别由服务端按租户决定。
  queryVisibleObjectTypes: call<VisibleObjectTypesDto>(
    '/xianfu/api-v2/dove/bd_task/object_type/visible_tabs', false,
  ),
  // 查询当前用户可用租户列表
  queryUserTenants: call<TenantDto[]>('/xianfu/api-v2/dove/bd_task/query_user_tenants', false),

  // 创建任务批次
  createParentTask: call<any>('/xianfu/api-v2/dove/bd_task/parent_task/create', true),

  // 查询任务批次批次列表
  queryParentTaskList: call<PageDto<ParentTaskOverviewDto>>(
    '/xianfu/api-v2/dove/bd_task/parent_task/list',
    false,
  ),

  // 主库全批次目标及计数，不代替列表返回的当前用户操作权限。
  queryParentTaskSummary: call<ParentTaskGoalSummary>('/xianfu/api-v2/dove/bd_task/parent_task/summary', false),

  // 页面独立统计：总数与维度桶由服务端返回，前端不补算、不剔除筛选。
  queryParentTaskStats: (req: ParentTaskStatsReq) => call<ParentTaskStatsDto>(
    '/xianfu/api-v2/dove/bd_task/parent_task/stats', false,
  )(req),
  queryTaskStatusStats: (req: TaskStatusStatsReq) => call<TaskStatusStatsDto>(
    '/xianfu/api-v2/dove/bd_task/task/status/stats', false,
  )(req),

  // 查询任务项明细列表
  queryDetail: call<PageDto<BdTaskDto>>('/xianfu/api-v2/dove/bd_task/detail', false),

  // 必须显式携带本次打开时的租户，不被全局租户自动替换；后端复核任务可见权限。
  queryAiExecutionResults: (req: { taskId: number; tenantId: number | string }) =>
    call<AiExecutionRecordDto[]>('/xianfu/api-v3/bdtask/bd_task/ai_execution/results', false)(req),

  // 批量反馈任务结果
  feedback: call<BdTaskFeedbackBatchResultDto>('/xianfu/api-v2/dove/bd_task/feed_back', true),

  // 获取任务类型配置列表
  listTaskTypes: call<BdTaskTypeConfigDto[]>('/xianfu/api-v2/dove/bd_task/task_type/list', false),

  // 全局概览统计
  queryTaskStatsSummary: call<TaskStatsSummaryDto>('/xianfu/api-v2/dove/bd_task/stats/summary', false),

  // BD 维度统计（完成率排名 + 负载量，按完成率降序）
  queryBdStats: call<BdStatsDto[]>('/xianfu/api-v2/dove/bd_task/stats/bd', false),

  // 商家维度列表（后端按角色自动过滤数据范围；后端技术方案 §3.9 支持 contactObjectType 区分外卖/公海）
  queryShopDimensionList: call<PageDto<ShopDimensionItemDto>>(
    '/xianfu/api-v2/dove/bd_task/shop_dimension/list',
    false,
  ),

  // 任务批次删除（后端技术方案 §3.13：改造为支持批量，入参 parentTaskIds 数组，单次最多 50 个；单删也传 list-of-1；
  // 权限按任务批次逐个判断，部分失败不整体拒绝，出参 successCount + failDetails）
  deleteParentTask: call<BatchDeleteResultDto>(
    '/xianfu/api-v2/dove/bd_task/parent_task/delete',
    true,
  ),

  // 任务批次基础信息更新（后端技术方案 §3.6：operatorId 改为可选自动兜底，新增 priority 字段支持）
  updateParentTask: call<UpdateSummaryDto>(
    '/xianfu/api-v2/dove/bd_task/parent_task/update',
    true,
  ),

  // 任务项批量移除（单个或多个）
  deleteSubTasks: call<number>(
    '/xianfu/api-v2/dove/bd_task/sub_task/batch_delete',
    true,
  ),

  // 【待后端接口就绪后联调】商家列表筛选枚举字典（后端技术方案补充 KM 2779238690 §4.6/4.7）：
  // 一次性返回 businessStatus/onlineStatus/deliveryType/claimStatus 4 个字段的全量 {code, label} 选项 +
  // 商家标签文案列表 + 品类树，按 contactObjectType 区分外卖/公海可用字段范围。前端进入列表页时调用一次并缓存，
  // 筛选请求仍传 code，不需要自行维护 code↔中文 映射表，模式与现有 listTaskTypes() 一致。
  getShopFilterOptions: call<ShopFilterOptionsDto>(
    '/xianfu/api-v2/dove/bd_task/shop_dimension/filter_options',
    false,
  ),
};

export type { GetShopFilterOptionsReq };
