import type { BatchDeleteResultDto } from '../../../types/bdTask';
import { resolveFeedbackResult, type FeedbackOutcome } from './feedbackResult';

/** 删除摘要与反馈共享完整集合校验；缺失、重复或不属于本次提交的失败ID均不能推断成功。 */
export function resolveParentDeleteResult(parentTaskIds: number[], response: unknown): FeedbackOutcome['kind'] {
  const result = response as Partial<BatchDeleteResultDto> | null | undefined;
  return resolveFeedbackResult(parentTaskIds, {
    successCount: result?.successCount,
    failTaskIds: Array.isArray(result?.failDetails) ? result.failDetails.map(detail => detail?.parentTaskId) : undefined,
  }).kind;
}
