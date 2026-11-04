import type { ParentTaskOverviewDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';

export type ParentTaskOverviewResult =
  | { status: 'ready'; parentTask: ParentTaskOverviewDto }
  | { status: 'empty' | 'unsupported' };

/** 只接受当前批次的服务端主信息；字段缺省仅兼容存量门店，显式非法类型不能按门店处理。 */
export function resolveParentTaskOverview(result: unknown, parentId: number): ParentTaskOverviewResult {
  const rows = (result as { data?: unknown })?.data;
  if (!Array.isArray(rows)) throw new Error('任务批次信息格式错误');
  if (rows.length === 0) return { status: 'empty' };
  if (rows.length !== 1 || rows[0]?.parentTaskId !== parentId) throw new Error('任务批次信息与当前页面不匹配');
  const parentTask = rows[0] as ParentTaskOverviewDto;
  const type = parentTask.contactObjectType;
  if (type != null && (typeof type !== 'number' || !getObjectTypeMeta(type))) return { status: 'unsupported' };
  return { status: 'ready', parentTask: { ...parentTask, contactObjectType: type ?? CONTACT_OBJECT_TYPE.WM_SHOP } };
}
