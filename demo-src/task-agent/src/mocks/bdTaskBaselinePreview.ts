import { DEMO_TENANTS, demoTenantId, demoObjectTypes, demoTypeAllowed, demoTabMatches } from './demoTenant';
import { getWorkbenchFocusPreview } from './workbenchFocusPreview';
import { getBatchExecutionPreview } from './batchExecutionPreview';
import type {
  AiExecutionRecordDto,
  BdTaskDto,
  BdTaskTypeConfigDto,
  PageDto,
  ParentTaskOverviewDto,
  ParentTaskGoalFeedback,
  ParentTaskStatsDto,
  ShopDimensionItemDto,
  TaskStatusStatsDto,
} from '@/types/bdTask';

import { parentTasks, tasks, previewTaskTypes, executionResults, shopRows, groupDemoTasks, insufficientGoalFeedback, demoMerchants } from './demoTaskDataset';

/** 独立演示工程始终使用本地数据，生产构建不依赖 mock 参数。 */
export function isBdTaskBaselinePreview(): boolean { return true; }

/** All filters below operate only on bundled fictitious data. */
function profileMatches(task: BdTaskDto, params: Record<string, unknown>): boolean {
  const value = (key: string) => task.profileFields?.find(f => f.key === key)?.value;
  const labels: Record<string, Record<number, string>> = { businessStatus: { 1: '门店营业', 2: '不营业' }, onlineStatus: { 1: '上线中', 2: '未上线' }, deliveryType: { 1: '专送', 2: '商家自配' }, claimStatus: { 1: '待认领', 2: '已认领' } };
  for (const key of Object.keys(labels)) {
    const selected = params[key];
    if (Array.isArray(selected) && selected.length && !selected.some(code => labels[key][Number(code)] === value(key))) return false;
  }
  if (Array.isArray(params.categoryId) && params.categoryId.length && !params.categoryId.includes(demoMerchants.find(m => m.shopId === task.shopId)?.categoryId)) return false;
  if (Array.isArray(params.poiTags) && params.poiTags.length &&
    !params.poiTags.some(tag => task.profileFields?.find(f => f.key === 'poiTags')?.tagList?.includes(String(tag)))) return false;
  if (params.experienceScoreFrom != null && (task.experienceScore ?? 0) < Number(params.experienceScoreFrom)) return false;
  if (params.experienceScoreTo != null && (task.experienceScore ?? 0) > Number(params.experienceScoreTo)) return false;
  if (typeof params.address === 'string' && !value('address')?.includes(params.address.trim())) return false;
  return true;
}

function refreshParent(parentTaskId: number) {
  const parent = parentTasks.find(p => p.parentTaskId === parentTaskId);
  if (!parent) return;
  const related = tasks.filter(t => t.parentTaskId === parentTaskId);
  parent.totalCount = related.length;
  parent.subjectCount = new Set(related.map(t => parent.contactObjectType === -10 ? t.objectId : t.shopId)).size;
  parent.completedCount = related.filter(t => [1, 4, 6].includes(t.status)).length;
  if (parent.targetType === 'PERCENT') parent.targetCount = Math.ceil(parent.totalCount * (parent.targetPercent ?? 0) / 100);
  parent.achieved = parent.completedCount >= parent.targetCount && parent.targetCount > 0;
  parent.targetCompletionRate = parent.targetCount ? parent.completedCount / parent.targetCount * 100 : 0;
  parent.distribution = { AI_DONE: related.filter(t => t.status === 6).length, BD_DONE: related.filter(t => [1, 4].includes(t.status)).length,
    IN_PROGRESS: related.filter(t => t.status === 5).length, NOT_STARTED: related.filter(t => t.status === 0).length };
  parent.derivedStatus = parent.achieved ? 0 : parent.expireDate < new Date().toLocaleDateString('sv-SE') ? 2 : 1;
}

function pageOf<T>(items: T[], params: Record<string, unknown>): PageDto<T> {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 20);
  const sort = Array.isArray(params.sortList) ? params.sortList as { field: string; asc: boolean }[] : [];
  const ordered = [...items].sort((a: any, b: any) => {
    for (const rule of sort) {
      // 样例沿用原详情地址的 ID；创建时间排序使用实际示例时间，避免旧 ID 影响首屏顺序。
      const field = rule.field === 'id' ? ('taskId' in a ? 'taskId' : 'createdTime') : rule.field;
      const left = a[field] ?? 0, right = b[field] ?? 0;
      const compare = typeof left === 'string' ? left.localeCompare(String(right)) : left - right;
      if (compare) return rule.asc ? compare : -compare;
    }
    return 0;
  });
  return { page, pageSize, total: items.length, data: ordered.slice((page - 1) * pageSize, page * pageSize) };
}

function filteredParents(params: Record<string, unknown>): ParentTaskOverviewDto[] {
  const ids = Array.isArray(params.parentTaskIdList) ? params.parentTaskIdList : null;
  const statuses = Array.isArray(params.status) ? params.status : null;
  return parentTasks.filter(task =>
    demoTypeAllowed(task.contactObjectType, params.tenantId) &&
    (!ids || ids.includes(task.parentTaskId)) &&
    (params.id == null || Number(params.id) === task.parentTaskId) &&
    (params.createdTimeFrom == null || new Date(task.createdTime!).toLocaleDateString('sv-SE') >= String(params.createdTimeFrom)) &&
    (params.createdTimeTo == null || new Date(task.createdTime!).toLocaleDateString('sv-SE') <= String(params.createdTimeTo)) &&
    (!statuses || statuses.includes(task.derivedStatus)) &&
    (params.priority == null || Number(params.priority) === task.priority) &&
    (params.taskType == null || Number(params.taskType) === task.taskType) &&
    (params.contactObjectType == null || Number(params.contactObjectType) === task.contactObjectType) &&
    (params.expireDateFrom == null || String(params.expireDateFrom) <= task.expireDate) &&
    (typeof params.name !== 'string' || task.name.includes(params.name.trim())) &&
    (typeof params.creatorId !== 'string' || task.creatorId?.includes(params.creatorId.trim()))
  );
}

function filteredTasks(params: Record<string, unknown>): BdTaskDto[] {
  return tasks.filter(task => {
    const parent = parentTasks.find(item => item.parentTaskId === task.parentTaskId);
    return (
      demoTypeAllowed(task.contactObjectType, params.tenantId) &&
      (params.parentTaskId == null || Number(params.parentTaskId) === task.parentTaskId) &&
      (params.contactObjectType == null || Number(params.contactObjectType) === task.contactObjectType) &&
      demoTabMatches(task.contactObjectType, params.tab) &&
      (params.priority == null || Number(params.priority) === parent?.priority) &&
      (params.expireDateFrom == null || (parent != null && String(params.expireDateFrom) <= parent.expireDate)) &&
      (typeof params.creatorId !== 'string' || !!parent?.creatorId?.includes(params.creatorId.trim())) &&
      (typeof params.parentTaskName !== 'string' || !!parent?.name.includes(params.parentTaskName.trim())) &&
      (params.status == null || Number(params.status) === task.status) &&
      (params.shopId == null || Number(params.shopId) === task.shopId) &&
      (params.objectId == null || String(params.objectId) === task.objectId) &&
      (typeof params.objectName !== 'string' || !!task.objectName?.includes(params.objectName.trim())) &&
      profileMatches(task, params) &&
      (params.taskType == null || Number(params.taskType) === parent?.taskType) &&
      (typeof params.shopName !== 'string' || task.shopName.includes(params.shopName.trim())) &&
      (typeof params.bdId !== 'string' || task.bdId.includes(params.bdId.trim())) &&
      (typeof params.address !== 'string' || task.profileFields?.some(field => field.key === 'address' && field.value?.includes(params.address as string)))
    );
  });
}

function parentStats(params: Record<string, unknown>): ParentTaskStatsDto {
  const matched = filteredParents(params);
  const result: ParentTaskStatsDto = { totalCount: matched.length };
  const fields = Array.isArray(params.statsFields) ? params.statsFields as { field: string; codes: number[] }[] : [];
  fields.forEach(({ field, codes }) => {
    const items = codes.map(code => ({
      code,
      name: String(code),
      count: matched.filter(task =>
        (field === 'taskType' && code === task.taskType) ||
        (field === 'priority' && code === task.priority) ||
        (field === 'status' && code === task.derivedStatus) ||
        (field === 'contactObjectType' && code === task.contactObjectType)
      ).length,
    }));
    if (field === 'taskType') result.taskTypeStats = { items };
    if (field === 'priority') result.priorityStats = { items };
    if (field === 'status') result.statusStats = { items };
    if (field === 'contactObjectType') result.contactObjectTypeStats = { items };
  });
  return result;
}

function taskStats(params: Record<string, unknown>): TaskStatusStatsDto {
  const matched = filteredTasks(params);
  const fields = Array.isArray(params.statsFields) ? params.statsFields as { codes: number[] }[] : [];
  const codes = fields[0]?.codes ?? [];
  return {
    totalCount: matched.length,
    statusStats: { items: codes.map(code => ({ code, name: String(code), count: matched.filter(task => task.status === code).length })) },
  };
}

/** 返回本地预览读取数据；未覆盖的接口由调用层阻止访问真实服务。 */
export function getBdTaskBaselinePreview(url: string, params: Record<string, unknown> = {}):
  { handled: true; data: unknown } | { handled: false } {
  if (!isBdTaskBaselinePreview()) return { handled: false };
  params = { ...params, tenantId: demoTenantId(params.tenantId) };
  const batchPreview = getBatchExecutionPreview(url, params);
  if (batchPreview.handled) return batchPreview;
  const focusPreview = getWorkbenchFocusPreview(url, params);
  if (focusPreview.handled) return focusPreview;
  switch (url) {
    case '/xianfu/api-v2/dove/bd_task/parent_task/delete': {
      const ids = params.parentTaskIds as number[] ?? [];
      let count = 0;
      for (let i = parentTasks.length - 1; i >= 0; i--) if (ids.includes(parentTasks[i].parentTaskId)) { parentTasks.splice(i, 1); count++; }
      for (let i = tasks.length - 1; i >= 0; i--) if (ids.includes(tasks[i].parentTaskId)) tasks.splice(i, 1);
      return { handled: true, data: { successCount: count, failDetails: [] } };
    }
    case '/xianfu/api-v2/dove/bd_task/parent_task/update': {
      const task = parentTasks.find(p => p.parentTaskId === Number(params.parentTaskId));
      if (task) for (const key of ['name', 'priority', 'taskType', 'expireDate', 'targetCount', 'targetType', 'targetPercent', 'parentTaskDescription']) {
        if (params[key] != null) (task as any)[key] = params[key];
      }
      if (task) refreshParent(task.parentTaskId);
      return { handled: true, data: { parentTaskId: task?.parentTaskId, retainedCount: task?.totalCount ?? 0, addedCount: 0, removedCount: 0 } };
    }
    case '/xianfu/api-v2/dove/bd_task/feed_back': {
      const ids = params.taskIds as number[] ?? [];
      const matched = tasks.filter(t => ids.includes(t.taskId));
      matched.forEach(t => { t.feedbackResult = Number(params.feedbackResult); t.status = t.feedbackResult === 1 ? 1 : 2; t.remark = String(params.remark ?? ''); });
      matched.forEach(t => refreshParent(t.parentTaskId));
      return { handled: true, data: { successCount: matched.length, failTaskIds: [] } };
    }
    case '/xianfu/api-v2/dove/bd_task/sub_task/batch_delete': {
      const ids = params.taskIds as number[] ?? [];
      let count = 0;
      for (let i = tasks.length - 1; i >= 0; i--) if (ids.includes(tasks[i].taskId)) { tasks.splice(i, 1); count++; }
      refreshParent(Number(params.parentTaskId));
      return { handled: true, data: count };
    }
    case '/xianfu/api-v2/dove/bd_task/query_user_tenants':
      return { handled: true, data: DEMO_TENANTS };
    case '/xianfu/api-v2/dove/bd_task/object_type/visible_tabs':
      return { handled: true, data: { tabs: [{ tab: 1, tabName: '外卖门店' }, { tab: 2, tabName: '公海门店' }, ...(Number(params.tenantId) === 164317 ? [{ tab: 3, tabName: '业务品牌' }] : [])], objectTypes: demoObjectTypes(params.tenantId) } };
    case '/xianfu/api-v2/dove/bd_task/task_type/list':
      return { handled: true, data: previewTaskTypes };
    case '/xianfu/api-v2/dove/bd_task/parent_task/list':
      return { handled: true, data: pageOf(filteredParents(params), params) };
    case '/xianfu/api-v2/dove/bd_task/parent_task/stats':
      return { handled: true, data: parentStats(params) };
    case '/xianfu/api-v2/dove/bd_task/parent_task/summary': {
      const task = parentTasks.find(parent => parent.parentTaskId === Number(params.parentTaskId));
      if (!task) return { handled: false };
      return { handled: true, data: {
        parentTaskId: task.parentTaskId,
        targetType: task.targetType,
        targetPercent: task.targetPercent,
        targetCount: task.targetCount,
        totalCount: tasks.filter(item => item.parentTaskId === task.parentTaskId).length,
        goalAchieved: task.achieved,
        goalFeedback: task.targetCount > task.totalCount ? { ...insufficientGoalFeedback, targetCount: task.targetCount, totalCount: task.totalCount, shortfallCount: task.targetCount - task.totalCount } : undefined,
      } };
    }
    case '/xianfu/api-v2/dove/bd_task/detail':
      return { handled: true, data: pageOf(groupDemoTasks(filteredTasks(params)), params) };
    case '/xianfu/api-v2/dove/bd_task/task/status/stats':
      return { handled: true, data: taskStats(params) };
    case '/xianfu/api-v3/bdtask/bd_task/ai_execution/results':
      return { handled: true, data: tasks.some(task => task.taskId === Number(params.taskId) && task.aiExecutionResultContactTypes?.length) ? executionResults : [] };
    case '/xianfu/api-v2/dove/bd_task/shop_dimension/filter_options':
      return { handled: true, data: {
        businessStatusOptions: [{ code: 1, label: '门店营业' }, { code: 2, label: '不营业' }],
        onlineStatusOptions: [{ code: 1, label: '上线中' }, { code: 2, label: '未上线' }],
        deliveryTypeOptions: [{ code: 1, label: '专送' }, { code: 2, label: '商家自配' }], claimStatusOptions: [{ code: 1, label: '待认领' }, { code: 2, label: '已认领' }],
        poiTagsOptions: ['重点门店', '点评高分'],
        categoryTree: ['轻食/沙拉/健康餐', '湘菜', '农家菜/家常菜', '其他东南亚菜', '湘菜小炒', '韩式烤肉', '汉堡', '沙县小吃', '咖啡', '米粉/米线'].map((name, index) => ({ id: 100 + index, name, isLeaf: true })),
      } };
    case '/xianfu/api-v2/dove/bd_task/shop_dimension/list': {
      const brand = Number(params.tab) === 3;
      const eligible = new Set(filteredTasks({ ...params, parentTaskName: params.taskName }).map(t => brand ? t.objectId : String(t.shopId)));
      const rows = shopRows(params).filter(shop => eligible.has(brand ? shop.objectId : String(shop.shopId)) &&
        
        (params.shopId == null || Number(params.shopId) === shop.shopId) &&
        (typeof params.shopName !== 'string' || shop.shopName.includes(params.shopName.trim())) &&
        (typeof params.objectName !== 'string' || !!shop.objectName?.includes(params.objectName.trim()))
      );
      return { handled: true, data: pageOf(rows, params) };
    }
    default:
      return { handled: false };
  }
}
