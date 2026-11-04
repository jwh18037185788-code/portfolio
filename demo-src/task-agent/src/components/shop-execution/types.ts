export type ShopExecutionAbilityType =
  | 'AI_OUTBOUND_TASK'
  | 'FULL_REDUCTION_ACTIVITY'
  | 'DELIVERY_FEE_ACTIVITY'
  | 'DELIVERY_FEE_UNIFORM'
  | 'DELIVERY_FEE_DISTANCE'
  | 'DELIVERY_FEE_PRICE'
  | 'BUSINESS_HOURS'
  | 'BUSINESS_STATUS'
  | 'PRODUCT_OPTIMIZATION'
  | 'CREATE_COMBO'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT_PRICE'
  | 'SHEN_QIANG_SHOU_REVOKE_SUBSIDY'
  | 'DISCOUNT_DISH_SIGNUP'
  | 'UPDATE_QUALIFICATION'
  | 'AOI_DELIVERY_EXPAND'
  | 'DELIVERY_PRICE'
  | 'COUPON_DAILY_UPGRADE'
  // 日常神券（升级）的二级操作。
  | 'COUPON_DAILY_UPGRADE_SIGNUP'
  | 'COUPON_DAILY_UPGRADE_CANCEL'
  | 'COUPON_DAILY_UPGRADE_ADD_SUBSIDY'
  | 'COUPON_DAILY_UPGRADE_REVOKE_SUBSIDY'
  | 'COUPON_DAILY_UPGRADE_ADD_MERCHANT_SUBSIDY';

export interface BatchExecuteItemReq {
  itemNo: string;
  wmPoiId: number;
  requestPayload?: string;
  bizParams?: Record<string, string>;
}

export interface BatchExecuteReq {
  batchNo?: string;
  items: BatchExecuteItemReq[];
}

export interface BatchExecuteItemResult {
  logId?: number;
  itemNo?: string;
  wmPoiId?: number;
  status?: number;
  message?: string;
}

export interface BatchExecuteResult {
  batchNo?: string;
  totalCount?: number;
  successCount?: number;
  failedCount?: number;
  itemResults?: BatchExecuteItemResult[];
}

export type ShopExecutionEvent =
  | { type: 'SHOP_EXECUTION_CANCEL' }
  | { type: 'SHOP_EXECUTION_SUBMIT_SUCCESS'; payload: {
    shopIdList: string[];
    abilityTypes: ShopExecutionAbilityType[];
    result: BatchExecuteResult;
  } }
  | { type: 'SHOP_EXECUTION_CRM_AI_SUBMIT_COMPLETE'; payload: {
    shopIdList: string[];
    outerTaskId?: string;
    result: unknown;
  } };

/** 后端能力目录，ID 对应内部组件的具体实现。 */
export interface ExecutionAbilityDto {
  id: number;
  name: string;
  contactObjectType: number;
  sortOrder: number;
  supportsBatchExecution: boolean;
  abilityType: string;
}

/** 推荐上下文与门店来源独立：批量传批次，单个传任务项。 */
export type ExecutionAbilityContext =
  | { parentTaskId: number; taskId?: never }
  | { taskId: number; parentTaskId?: never };

export interface ExecutionAbilityGroupDto {
  abilityType: string;
  abilities: ExecutionAbilityDto[];
}

export interface ExecutionAbilityListDto {
  recommendedAbilities: ExecutionAbilityDto[];
  abilityGroups: ExecutionAbilityGroupDto[];
}
