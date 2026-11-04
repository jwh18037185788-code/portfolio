/** 数字或旧版 ID 占位文案不是有效的业务类型名称。 */
function validName(value?: string): string | undefined {
  const name = value?.trim();
  return name && !/^(?:类型\s*)?[+-]?\d+(?:\.\d+)?$/.test(name) ? name : undefined;
}

export function groupBusinessTypes(
  stats: { taskType: number; taskTypeName?: string; totalCount: number }[],
) {
  const groups = new Map<string, { id: string; name: string; count: number }>();
  for (const item of stats) {
    const name = validName(item.taskTypeName) ?? '其他';
    const id = name === '其他' ? 'other' : String(item.taskType);
    const group = groups.get(id);
    if (group) group.count += item.totalCount;
    else groups.set(id, { id, name, count: item.totalCount });
  }
  const total = stats.reduce((sum, item) => sum + item.totalCount, 0);
  return [...groups.values()].sort((a, b) => b.count - a.count).map((item) => ({
    ...item, percent: total > 0 ? Number((item.count / total * 100).toFixed(1)) : 0,
  }));
}
