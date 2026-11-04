import { trackTaskAction, trackTaskView } from '@/lib/taskAnalytics';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Popover, Spin } from 'antd';
import type { AiExecutionRecordDto, BdTaskDto } from '@/types/bdTask';
import { bdTaskApi } from '@/services/bdTaskApi';
import { useTenantStore } from '@/stores/tenantStore';
import { DOVE_CONTACT_FAILED, executionResultFields, executionSummaryItems, callStatusText, imCreationText, executionGroup, groupExecutionRecords, executionNoText, type ExecutionGroup } from '../utils/aiExecutionResult';
import { MT } from '../theme';
import { DARK_POPOVER_COLOR, DARK_POPOVER_INNER_STYLE, DARK_TABLE_STYLE, darkTableCellStyle, darkTableHeaderStyle, wrapDarkTableText } from './darkPopoverTableStyle';

function ResultPopover({ taskId, parentTaskId, tenantId, group }: { taskId: number; parentTaskId?: number; tenantId: number | string; group: ExecutionGroup | 'legacy' }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AiExecutionRecordDto[]>([]);
  const opened = useRef(false);
  const requestSeq = useRef(0);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const load = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setRecords([]);
    try {
      const results = await bdTaskApi.queryAiExecutionResults({ taskId, tenantId });
      if (!Array.isArray(results)) throw new Error('接口未返回有效结果，请重试');
      if (active.current && opened.current && seq === requestSeq.current) setRecords(results);
    } catch (reason) {
      if (active.current && opened.current && seq === requestSeq.current) {
        setError(reason instanceof Error ? reason.message : '结果加载失败，请重试');
      }
    } finally {
      if (active.current && seq === requestSeq.current) setLoading(false);
    }
  };
  const changeOpen = (next: boolean) => {
    if (opened.current === next) return;
    if (next) {
      const action = group === 2 ? 'ai_result.open_call' : group === 10 ? 'ai_result.open_im' : 'ai_result.open_legacy';
      trackTaskAction(action, undefined, { taskIds: [taskId], parentTaskId });
      trackTaskView(action, undefined, { taskIds: [taskId], parentTaskId });
    } else trackTaskAction('ai_result.close');
    opened.current = next;
    setOpen(next);
    if (next) void load(); // 每次重新展开都查本地最新快照，不加定时器或长期缓存。
    else requestSeq.current++;
  };

  const rows = group === 'legacy' ? [] : groupExecutionRecords(records, group);
  const legacy = group === 'legacy' ? records.filter(record => executionGroup(record.result.contactType) == null) : [];
  // 次序列只看当前分组可见的执行记录数，不把隐藏过程或总结子行算成多次。
  const multiple = rows.length > 1;
  const label = group === 2 ? '智能外呼' : group === 10 ? '智能IM' : '历史摘要';
  const columns = rows.length ? executionResultFields(rows[0].result).map(field => field.label) : [];
  // 外呼通过拨打状态表达触达失败，创建情况列只用于IM。
  const showCreation = group === 10 && rows.some(record => record.result.status === DOVE_CONTACT_FAILED);
  const prefixColumns = (multiple ? 1 : 0) + (showCreation ? 1 : 0);
  const labels = [...(multiple ? ['发起次序'] : []), ...(showCreation ? ['任务创建情况'] : []), ...columns];
  const bodyStyle = (index: number, startsBody: boolean, endsBody: boolean): React.CSSProperties =>
    darkTableCellStyle(index, 'body', startsBody, endsBody);
  const content = (
    <div style={{ maxWidth: 'calc(100vw - 48px)', maxHeight: 360, overflow: 'auto', fontSize: 12, color: '#fff' }}>
      {loading ? <Spin size="small" /> : error ? <Alert type="error" showIcon message="结果加载失败" description={error}
        action={<Button size="small" onClick={() => { trackTaskAction('ai_result.retry'); void load(); }}>重试</Button>} /> : <>
        {rows.length === 0 && legacy.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ color: '#fff' }}>暂无已保存的{label}结果</span>} />}
        {rows.length > 0 && <table style={{ ...DARK_TABLE_STYLE, width: 'max-content', tableLayout: 'auto' }}>
          <thead><tr>{labels.map((name, index) => <th key={name} style={darkTableHeaderStyle(index)}>{name}</th>)}</tr></thead>
          <tbody>{rows.flatMap((record, recordIndex) => {
            const startsBody = recordIndex === 0;
            const endsBody = recordIndex === rows.length - 1;
            const ordinal = (rowSpan: number) => multiple ? <td key="ordinal" rowSpan={rowSpan} style={bodyStyle(0, startsBody, endsBody)}
              title={record.executionNo == null ? '更早执行的渠道尚不能确定，暂不推测次数' : undefined}>{executionNoText(record.executionNo)}</td> : null;
            const creation = (rowSpan: number) => showCreation ? <td key="creation" rowSpan={rowSpan} style={bodyStyle(multiple ? 1 : 0, startsBody, endsBody)}>{wrapDarkTableText(imCreationText(record.result) || '—')}</td> : null;
            if (group === 2) {
              const summaries = executionSummaryItems(record.result);
              const lines = summaries.length ? summaries : ['—'];
              return lines.map((summary, index) => <tr key={index === 0 ? record.id : `${record.id}:summary:${index}`}>
                {index === 0 && ordinal(lines.length)}
                {index === 0 && creation(lines.length)}
                {index === 0 && <td rowSpan={lines.length} style={bodyStyle(prefixColumns, startsBody, endsBody)}>{wrapDarkTableText(callStatusText(record.result) || '—')}</td>}
                <td style={bodyStyle(prefixColumns + 1, startsBody && index === 0, endsBody && index === lines.length - 1)}>{wrapDarkTableText(summary)}</td>
              </tr>);
            }
            const fields = executionResultFields(record.result);
            return [<tr key={record.id}>
              {ordinal(1)}
              {creation(1)}
              {fields.map((field, index) => <td key={field.label} style={bodyStyle(index + prefixColumns, startsBody, endsBody)}>{wrapDarkTableText(field.value?.trim() ? field.value : '—')}</td>)}
            </tr>];
          })}</tbody>
        </table>}
        {legacy.length > 0 && <div style={{ marginTop: 8, maxWidth: 480 }}>
          <div style={{ color: 'rgba(255, 255, 255, 0.72)' }}>历史摘要（渠道未知，不推测发起次序）</div>
          {legacy.map(record => <div key={record.id} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 6 }}>{record.result.summary || '—'}</div>)}
        </div>}
      </>}
    </div>
  );
  return <Popover content={content} trigger="click" placement="topRight" color={DARK_POPOVER_COLOR}
    overlayInnerStyle={DARK_POPOVER_INNER_STYLE} open={open} onOpenChange={changeOpen}>
    <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12, lineHeight: '18px', color: MT.brandPrimary }}>{label}</Button>
  </Popover>;
}

type ResultTask = Pick<BdTaskDto, 'taskId' | 'parentTaskId' | 'contactObjectType' | 'aiExecutionResultContactTypes' | 'aiExecutionResultUnavailableReason'>;
export default function AiExecutionResults({ task, contactObjectType = task.contactObjectType }: { task: ResultTask; contactObjectType?: number }) {
  const tenantId = useTenantStore(state => state.currentTenantId);
  if (tenantId == null || contactObjectType !== -3 || !task.taskId) return null;
  const contactTypes = task.aiExecutionResultContactTypes ?? [];
  const groups: (ExecutionGroup | 'legacy')[] = ([2, 10] as const).filter(group =>
    contactTypes.some(type => executionGroup(type) === group));
  if (contactTypes.some(type => executionGroup(type) == null)) groups.push('legacy');
  if (!groups.length) return null;
  // 身份变化直接重建浮层，旧任务/租户响应不得进入新页面；不预取每张卡的详情。
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', textAlign: 'right' }}>
    <span>AI执行结果：</span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {groups.map(group => <ResultPopover key={`${tenantId}:${task.taskId}:${group}`} tenantId={tenantId} taskId={task.taskId} parentTaskId={task.parentTaskId} group={group} />)}
    </span>
  </span>;
}
