import type { BdTaskFeedbackBatchResultDto } from '../../../types/bdTask';

export interface FeedbackOutcome {
  kind: 'success' | 'partial' | 'failed' | 'unknown';
  successCount: number | null;
  failedTaskIds: number[];
  succeededTaskIds: number[];
}

/** 只有响应完整覆盖本次提交任务时，才能判定成功或保留确切的失败集合。 */
export function resolveFeedbackResult(taskIds: number[], response: unknown): FeedbackOutcome {
  const unknown: FeedbackOutcome = {
    kind: 'unknown', successCount: null, failedTaskIds: [], succeededTaskIds: [],
  };
  const submitted = new Set(taskIds);
  if (!taskIds.length || submitted.size !== taskIds.length
    || taskIds.some(id => !Number.isSafeInteger(id) || id <= 0)
    || !response || typeof response !== 'object') return unknown;

  const { successCount, failTaskIds } = response as Partial<BdTaskFeedbackBatchResultDto>;
  if (!Number.isSafeInteger(successCount) || successCount! < 0 || successCount! > taskIds.length
    || !Array.isArray(failTaskIds) || new Set(failTaskIds).size !== failTaskIds.length
    || failTaskIds.some(id => !Number.isSafeInteger(id) || !submitted.has(id))
    || successCount! + failTaskIds.length !== taskIds.length) return unknown;

  const failed = new Set(failTaskIds);
  return {
    kind: failTaskIds.length === 0 ? 'success' : successCount === 0 ? 'failed' : 'partial',
    successCount: successCount!,
    failedTaskIds: taskIds.filter(id => failed.has(id)),
    succeededTaskIds: taskIds.filter(id => !failed.has(id)),
  };
}

export function getFeedbackResultMessage(outcome: FeedbackOutcome, feedbackResult: 1 | 2): string {
  if (outcome.kind === 'success') return feedbackResult === 1 ? '已标记为完成' : '已标记为无法完成';
  if (outcome.kind === 'partial') {
    return `成功反馈 ${outcome.successCount} 项，${outcome.failedTaskIds.length} 项失败。已保留失败任务，请核对状态后重试。`;
  }
  if (outcome.kind === 'failed') return `${outcome.failedTaskIds.length} 项任务反馈失败，请核对状态后重试。`;
  return '任务反馈结果未确认，请关闭弹窗并刷新列表核对后再操作。';
}
