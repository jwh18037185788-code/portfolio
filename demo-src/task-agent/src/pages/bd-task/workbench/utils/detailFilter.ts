import type { ParentTaskDetailItem } from '@/types/workbench';

// 明细弹窗本地过滤纯函数集合：所有卡片接口不支持服务端按状态细分查询明细，一次性返回全量 detailList，
// 前端根据用户点击的具体数字在本地过滤后展示对应弹窗（见 01 需求文档 Glossary "明细全量返回、前端本地过滤"）。

/** 按 statusLabel（任务批次四态）过滤，可选叠加 priority（用于 P0 数字入口），用于到期风险卡片 */
export function filterByStatusLabel(
  detailList: ParentTaskDetailItem[],
  statusLabel: 0 | 1 | 2 | 3,
  priority?: 0,
): ParentTaskDetailItem[] {
  return detailList.filter(
    (item) => item.statusLabel === statusLabel && (priority === undefined || item.priority === priority),
  );
}

/** 按 recentNew 过滤，用于推进情况卡片"近7日新增任务批次数"入口 */
export function filterByRecentNew(detailList: ParentTaskDetailItem[]): ParentTaskDetailItem[] {
  return detailList.filter((item) => item.recentNew === true);
}

/**
 * 按任务类型编码过滤，用于推进情况卡片的业务类型入口。
 * 对接口数据做数值归一化，兼容运行时将 taskType 序列化为字符串的情况。
 */
export function filterByTaskType(
  detailList: ParentTaskDetailItem[],
  taskType: number,
): ParentTaskDetailItem[] {
  const normalizedTaskType = Number(taskType);
  return detailList.filter((item) => Number(item.taskType) === normalizedTaskType);
}

/**
 * 按 taskSourceCode（数值编码，来自 SourceItem.taskSourceCode）过滤，用于任务来源卡片各分组入口。
 * 🆕 后端契约变更后 SourceItem.taskSourceCode 与 ParentTaskDetailItem.taskSource 已是同一套数值编码，
 * 直接数值比较即可，不再需要字符串→数值的转换匹配（原 matchTaskSource 已废弃）。
 */
export function filterByTaskSource(
  detailList: ParentTaskDetailItem[],
  taskSourceCode: number,
): ParentTaskDetailItem[] {
  return detailList.filter((item) => item.taskSource === taskSourceCode);
}
