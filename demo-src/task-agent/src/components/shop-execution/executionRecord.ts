export interface ExecutionRecordParams {
  executionAbilityId: number;
  tenantId: number | string | null;
  parentTaskId?: number;
  taskIds?: number[];
  entityIds: string[];
  contactObjectType: number;
  batchExecution: boolean;
  externalTaskId?: string;
}

/** 批次与勾选范围独立，不能把勾选执行降级为记录整个批次。 */
export function buildExecutionRecordRequest(params: ExecutionRecordParams) {
  const objectIds = params.entityIds.map(id => id.trim());
  const validId = (id: number) => Number.isSafeInteger(id) && id > 0;
  if (!validId(params.executionAbilityId) || !validId(Number(params.tenantId))) throw new Error('执行能力或租户无效');
  if (!objectIds.length || objectIds.some(id => !id)) throw new Error('请先填写有效实体 objectId');
  if ((params.parentTaskId == null) === (params.taskIds == null)) throw new Error('缺少或重复传入执行任务范围');
  if (params.parentTaskId != null && !validId(params.parentTaskId)) throw new Error('任务批次 ID 无效');
  if (params.taskIds && (!params.taskIds.length || params.taskIds.some(id => !validId(id)))) throw new Error('任务项 ID 无效');
  const { externalTaskId: rawExternalTaskId, ...request } = params;
  if (params.executionAbilityId === 9 && !rawExternalTaskId?.trim()) throw new Error('智能沟通缺少外部任务 ID，关联未确认');
  const externalTaskId = rawExternalTaskId?.trim() ? rawExternalTaskId : undefined;
  return { ...request, ...(externalTaskId ? { externalTaskId } : {}), tenantId: Number(params.tenantId), entityIds: [...new Set(objectIds)],
    ...(params.taskIds ? { taskIds: [...new Set(params.taskIds)] } : {}) };
}
