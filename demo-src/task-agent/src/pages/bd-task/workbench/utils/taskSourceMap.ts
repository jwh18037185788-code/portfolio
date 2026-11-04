// taskSource 中文映射工具
// 🆕 后端契约变更（见 `.spec/task-workbench/09_backend_data_calibration_reference.md` 3.6 节）：
// `SourceDiagnosisDto.SourceItem.taskSource` 已由后端直接返回中文名称（从 Lion `workbenchTaskSourceConfig`
// 动态读取），前端不再需要将其映射为中文，也不再需要 String→Integer 的类型转换匹配
// （原 `TASK_SOURCE_NAME_TO_LABEL`/`TASK_SOURCE_NAME_TO_CODE`/`matchTaskSource` 已废弃移除）。
// `SourceItem` 新增 `taskSourceCode`（Integer），与 `ParentTaskDetailItem.taskSource`（Integer）同一套数值编码，
// 过滤明细列表时直接用 `taskSourceCode` 做数值匹配即可，详见 `detailFilter.ts` 的 `filterByTaskSource`。
//
// 中文名以后端权威口径为准：0=未知、1=一线管理者、2=总部管理者、3=蜂窝Agent、4=下沉驾驶舱。

/** Integer 编码 → 中文，供 ParentTaskDetailModal 渲染明细表格来源列使用 */
export const TASK_SOURCE_CODE_TO_LABEL: Record<number, string> = {
  0: '未知',
  1: '一线管理者',
  2: '总部管理者',
  3: '蜂窝 Agent',
  4: '下沉驾驶舱',
};
