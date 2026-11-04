// 通用"前 N 项 + 其余合并为其他"纯函数，供推进情况卡片业务类型饼图使用（N=5）。
// 后端未做此合并，UI 层面按数量降序处理，见设计文档 4.5 节。

export interface MergeableItem {
  /** 用于排序/合并判定的数量值 */
  value: number;
}

/**
 * 按 value 降序排列，取前 topN 项，其余合并为一条 label 为 otherLabel 的记录。
 * @param items 原始条目
 * @param getValue 从条目中取出用于排序/求和的数值
 * @param getLabel 从条目中取出展示用 label（合并结果不使用该函数，固定用 otherLabel）
 * @param topN 保留的最大原始条目数，默认 5
 * @param otherLabel 合并条目的展示 label，默认"其他"
 */
export function mergeOthers<T>(
  items: T[],
  getValue: (item: T) => number,
  getLabel: (item: T) => string,
  topN = 5,
  otherLabel = '其他',
): { label: string; value: number; source?: T }[] {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));
  if (sorted.length <= topN) {
    return sorted.map((item) => ({ label: getLabel(item), value: getValue(item), source: item }));
  }
  const head = sorted.slice(0, topN).map((item) => ({ label: getLabel(item), value: getValue(item), source: item }));
  const tail = sorted.slice(topN);
  const otherValue = tail.reduce((sum, item) => sum + getValue(item), 0);
  return [...head, { label: otherLabel, value: otherValue }];
}
