import type { ShopDimensionItemDto, SubTaskOverviewDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import { getObjectTypeMeta } from '@/constants/objectTypeMeta';
import dayjs from 'dayjs';

export function formatOverviewDate(value?: string | number): string {
  if (value == null || value === '') return '--';
  // createdTime is normally a number, but some gateways serialize it as a
  // 13-digit string. Passing that string directly to dayjs makes it parse as
  // a calendar year/date rather than a millisecond timestamp. Keep the
  // yyyy-MM-dd compatibility path untouched and only coerce an unambiguous
  // 13-digit timestamp.
  const normalizedValue = typeof value === 'string' && /^\d{13}$/.test(value)
    ? Number(value)
    : value;
  const date = dayjs(normalizedValue);
  return date.isValid() ? date.format('YYYY.MM.DD') : '--';
}

export function isAggregatedOverview(task: SubTaskOverviewDto): boolean {
  return !!getObjectTypeMeta(task.contactObjectType)?.aggregated &&
    (task.taskCount != null || Array.isArray(task.subTasks));
}

/**
 * The API already mixes store tasks and SKU groups in order. Only industry SKU
 * rows need grouping; place each group where its first member appeared.
 * This is local card aggregation, never a substitute for global API statistics.
 */
export function normalizeEntityOverviews(entity: ShopDimensionItemDto): SubTaskOverviewDto[] {
  const result: SubTaskOverviewDto[] = [];
  const industryGroups = new Map<number, SubTaskOverviewDto>();
  for (const task of entity.subTaskOverviews ?? []) {
    if (task.contactObjectType !== CONTACT_OBJECT_TYPE.TS_SKU) {
      result.push(task);
      continue;
    }
    const members = task.subTasks ?? [task];
    const counts = task.statusCounts ?? { [task.status]: 1 };
    const count = task.taskCount ?? members.length;
    let group = industryGroups.get(task.parentTaskId);
    if (!group) {
      group = {
        ...task,
        name: task.parentTaskName || task.name,
        taskCount: count,
        statusCounts: { ...counts },
        subTasks: [...members],
      };
      industryGroups.set(task.parentTaskId, group);
      result.push(group);
    } else {
      group.taskCount = (group.taskCount ?? 0) + count;
      group.subTasks!.push(...members);
      for (const [status, amount] of Object.entries(counts)) {
        group.statusCounts![Number(status)] = (group.statusCounts![Number(status)] ?? 0) + amount;
      }
    }
  }
  return result;
}
