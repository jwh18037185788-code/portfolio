import type { AiExecutionResultDto, AiExecutionRecordDto } from '@/types/bdTask';

/** Dove原始触达状态，不能与对象executionStatus混用。 */
export const DOVE_CONTACT_FAILED = 3;
const DOVE_CONTACT_COMPLETED = 4;
const DOVE_CONTACT_CANCELED = 5;
/** Dove对象执行已结束/已取消；不表示触达或业务成功。 */
const DOVE_EXECUTION_DONE = 3;
const DOVE_EXECUTION_CANCEL = 4;

/** 外呼/调度仅按原始status展示；缺失、-101或未识别值统一为未知，不用executionStatus推断。 */
export function callStatusText(result: AiExecutionResultDto): string {
  if (result.status === DOVE_CONTACT_FAILED) return '拨打失败';
  if (result.status === DOVE_CONTACT_COMPLETED) return '拨打完成';
  if (result.status === DOVE_CONTACT_CANCELED) return '取消';
  return '未知状态';
}

/** 外呼通过拨打状态表达触达失败，创建结果列只适用于IM。 */
export function imCreationText(result: AiExecutionResultDto): string | undefined {
  if (result.contactType !== 10) return undefined;
  if (result.status === DOVE_CONTACT_FAILED) return '任务创建失败，失败原因请到智能沟通工具中查看';
  return result.status === DOVE_CONTACT_COMPLETED ? '任务创建成功' : undefined;
}

/** 保留Dove返回的新到旧顺序；旧快照的意向摘要不冒充AI通话总结。 */
export function executionSummaryItems(result: AiExecutionResultDto): string[] {
  if (Array.isArray(result.summarizing)) {
    return result.summarizing.filter(value => typeof value === 'string' && value.trim().length > 0);
  }
  return result.summary?.trim() ? [`历史摘要：${result.summary}`] : [];
}

export function executionResultFields(result: AiExecutionResultDto): { label: string; value?: string }[] {
  return result.contactType === 10 ? [
    { label: '商家意向', value: result.tagName },
    { label: '执行技能详情', value: result.skillResultDesc },
    { label: '退出原因', value: result.releaseReasonMsg },
  ] : [
    { label: '拨打状态', value: callStatusText(result) },
    { label: '归纳总结', value: executionSummaryItems(result).join('\n\n') },
  ];
}

export type ExecutionGroup = 2 | 10;
export function executionGroup(contactType?: number): ExecutionGroup | undefined {
  return contactType === 2 || contactType === 6 ? 2 : contactType === 10 ? 10 : undefined;
}

/** 接口已按登记id正序返回；过程快照不展示，不按结果下标重新编号。 */
export function groupExecutionRecords(records: AiExecutionRecordDto[], group: ExecutionGroup) {
  return records.filter(record => executionGroup(record.result.contactType) === group
    && (record.result.status === DOVE_CONTACT_FAILED || record.result.executionStatus === DOVE_EXECUTION_DONE || record.result.executionStatus === DOVE_EXECUTION_CANCEL));
}

export function executionNoText(number?: number) {
  if (!number || number < 1) return '—';
  const small = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  return `第${small[number - 1] || number}次`;
}
