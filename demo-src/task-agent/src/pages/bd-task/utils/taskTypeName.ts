import type { BdTaskTypeConfigDto } from '@/types/bdTask';

export type TaskTypeNameMap = Record<number, string>;

/** 展示名称来自租户完整字典，不能使用按实体裁剪的可选业务类型。 */
export function buildTaskTypeNameMap(types: BdTaskTypeConfigDto[]): TaskTypeNameMap {
  const names: TaskTypeNameMap = {};
  types.forEach(type => {
    const name = type.name?.trim();
    if (name) names[type.code] = name;
  });
  return names;
}

export function resolveTaskTypeName(
  code: number | null | undefined,
  names: TaskTypeNameMap,
  suppliedName?: string | null,
): string {
  if (code == null || String(code).trim() === '') return suppliedName?.trim() || '未设置业务类型';
  return names[code] || suppliedName?.trim() || `类型${code}`;
}
