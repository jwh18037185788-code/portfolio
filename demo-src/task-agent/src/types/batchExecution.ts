// 工作台 Tab 1 契约：（原业务契约参考已移除）
/** 前端目标展示模型，不代表后端字段命名。比例统一使用 0~1。 */
export interface BatchTarget {
  rate: number;
  /** 父任务目标数量及总量；仅在接口确实提供时展示，不用当前组织总量反推。 */
  count?: number | null;
  total?: number | null;
}

export interface BatchColumn {
  parentTaskId: number;
  parentTaskName: string;
  taskSource: number;
  taskSourceName: string;
  sourceGroup: number;
  sourceGroupName: string;
  contactObjectType: number;
  contactObjectTypeName: string;
  /** 父任务目标数，比例目标由后端向上取整。 */
  targetCount?: number | null;
  /** 全批次未删除任务项总数，不是当前 BD/组织行的任务总数。 */
  totalTaskCount?: number | null;
  /** 父任务目标比例，0.1 表示 10%；不以取整后的目标数重新计算。 */
  targetRate?: number | null;
  /** 由统一接口适配层填充；未设置目标或目标比例无效时为空。 */
  target?: BatchTarget;
}

export interface MatrixOrgType {
  orgType: number;
  orgTypeName: string;
  displayCode: string;
  displayName: string;
  entityTypes: ('org' | 'bd')[];
  toOrgTypes: number[];
}

export interface MatrixOrgOptions {
  tenantId: number;
  source: number;
  orgTypes: MatrixOrgType[];
}

export interface BatchScope {
  tenantId: number;
  createTimeFrom: number;
  createTimeTo: number;
}

export interface BatchSummary {
  tenantId: number;
  generatedAt: number;
  availableColumns: BatchColumn[];
}

export interface BatchMatrixReq extends BatchScope {
  dimension: 1 | 2;
  /** 纯 BD 本人模式省略，由后端按登录态限权；其他岗位必传。 */
  orgNodeIds?: number[];
  orgTypeList?: number[];
  parentTaskIds: number[];
  completeTimeFrom?: number;
  completeTimeTo?: number;
}

export interface BatchMatrixCell {
  parentTaskId: number;
  totalTaskCount: number | null;
  completedTaskCount: number | null;
  completionRate: number | null;
  yesterdayCompletedCount: number | null;
  yesterdayCompletionRate: number | null;
  todayCompletedCount: number | null;
  todayCompletionRate: number | null;
  weekCompletedCount: number | null;
  weekCompletionRate: number | null;
  monthCompletedCount: number | null;
  monthCompletionRate: number | null;
}

export interface BatchMatrixRow {
  rowKey: string;
  rowKind: 0;
  displayName: string;
  bdMis: string | null;
  uid: number | null;
  orgNodeId: number | null;
  orgType: number | null;
  parentOrgNodeId: number | null;
  cells: BatchMatrixCell[];
}

export interface BatchMatrix {
  tenantId: number;
  dimension: 1 | 2;
  businessDate: string;
  generatedAt: number;
  columns: BatchColumn[];
  rows: BatchMatrixRow[];
}

export type BatchPeriod = 'all' | 'month' | 'week' | 'yesterday';
