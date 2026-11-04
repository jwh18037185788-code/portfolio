import React, { useCallback, useEffect } from 'react';
import { Alert, Button, Space } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import type { ParentTaskOverviewDto, ParentTaskGoalSummary } from '@/types/bdTask';
import { bdTaskApi } from '@/services/bdTaskApi';
import { useTenantStore } from '@/stores/tenantStore';
import { useTaskQuery } from '../hooks/useTaskQuery';
import { validateParentGoalSummary } from '../utils/parentGoal';
import { MT } from '../theme';

/** 不足提示基于整批主库计数；操作权限仍来自当前授权概览。 */
const ParentGoalNotice: React.FC<{
  task: ParentTaskOverviewDto;
  onAdd: () => void;
  onAdjust: () => void;
}> = ({ task, onAdd, onAdjust }) => {
  const tenantId = useTenantStore(state => state.currentTenantId);
  const { data, error, loading, run } = useTaskQuery<ParentTaskGoalSummary>(JSON.stringify([tenantId, task.parentTaskId]));
  const refresh = useCallback(() => {
    if (tenantId == null) return;
    void run(async () => validateParentGoalSummary(
      await bdTaskApi.queryParentTaskSummary({ parentTaskId: task.parentTaskId }), task.parentTaskId,
    ));
  }, [tenantId, task.parentTaskId, run]);
  // 保存、反馈及任务变更刷新父概览后，同步重取主库目标；只依赖ID会保留旧不足提示。
  useEffect(() => { refresh(); }, [task, refresh]);
  if (tenantId == null) return null;
  if (loading) return null;
  const warningStyle = { marginBottom: 12, background: MT.warningBg, borderColor: MT.warningBorder };
  const warningIcon = <ExclamationCircleFilled style={{ color: MT.warning }} />;
  if (error) return <Alert type="warning" showIcon icon={warningIcon} style={warningStyle}
    message="目标核对暂不可用，任务操作结果不受影响"
    action={<Button type="text" size="small" style={{ color: MT.warningText }} onClick={refresh}>重新核对</Button>} />;
  const feedback = data?.goalFeedback;
  const insufficient = feedback?.reason === 'INSUFFICIENT_ITEMS';
  const noticeMessage = insufficient && data
    ? `当前批次目标数量 ${data.targetCount} 项，任务项总量仅 ${data.totalCount} 项，无法达标，请添加任务项或调整目标`
    : feedback?.message;
  if (!noticeMessage) return null;
  const warning = insufficient || feedback?.phase === 'UNAVAILABLE';
  return <Alert type={warning ? 'warning' : 'info'} showIcon
    icon={warning ? warningIcon : undefined}
    style={warning ? warningStyle : { marginBottom: 12 }}
    message={noticeMessage}
    action={insufficient && task.canDelete
      ? <Space size={8} wrap>
        <Button type="text" size="small" style={{ color: MT.warningText }} onClick={onAdd}>添加任务项</Button>
        <Button type="text" size="small" style={{ color: MT.warningText }} onClick={onAdjust}>调整目标</Button>
      </Space> : undefined} />;
};

export default ParentGoalNotice;
