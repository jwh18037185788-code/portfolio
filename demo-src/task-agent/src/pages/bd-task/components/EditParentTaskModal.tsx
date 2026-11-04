import { useTaskAnalyticsView } from '@/lib/useTaskAnalyticsView';
import { trackTaskAction, captureTaskView } from '@/lib/taskAnalytics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, Alert, ConfigProvider, message, theme } from 'antd';
import dayjs from 'dayjs';
import { bdTaskApi, BdTaskApiError } from '@/services/bdTaskApi';
import type { ParentTaskOverviewDto, ParentTaskGoalSummary, ParentTaskGoalType, BdTaskTypeConfigDto } from '@/types/bdTask';
import { PRIORITY_CONFIG } from './TaskCard';
import { resolveTaskTypeName, type TaskTypeNameMap } from '../utils/taskTypeName';

import { buildParentGoalEdit, parentGoalChanged, validateParentGoalSummary } from '../utils/parentGoal';
import { useTenantStore } from '@/stores/tenantStore';

const MAX_DESCRIPTION_LENGTH = 1000;

export interface EditParentTaskModalProps {
  open: boolean;
  task: ParentTaskOverviewDto | null;
  taskTypes: BdTaskTypeConfigDto[];
  taskTypeNameMap: TaskTypeNameMap;
  onClose: () => void;
  onSuccess: (updatedFields?: Partial<ParentTaskOverviewDto>) => void;
}

/**
 * 任务批次基础信息编辑弹窗：任务名称/截止时间/业务类型/目标值/优先级/任务说明均可编辑。
 * 后端技术方案 §3.6（KM 2778373947）：operatorId 已改为可选，为空时后端 SsoUtil.getMisId() 自动兜底；
 * priority 字段本次由后端补充支持，事务内联动更新活跃任务项优先级（照 taskType 现有同步模式实现）。
 */
const EditParentTaskModal: React.FC<EditParentTaskModalProps> = ({ open, task, taskTypes, taskTypeNameMap, onClose, onSuccess }) => {
  useTaskAnalyticsView(open, 'edit.dialog');
  const analyticsRequest = useRef(0);
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const [submitting, setSubmitting] = useState(false);
  const taskTypeOptions: { label: string; value: number; disabled?: boolean }[] = taskTypes.map(t => ({
    label: resolveTaskTypeName(t.code, taskTypeNameMap, t.name),
    value: t.code,
  }));
  // 存量任务类型可能不在当前实体的推荐范围中；补全当前值名称，不扩展可选业务类型。
  if (task && !taskTypeOptions.some(option => option.value === task.taskType)) {
    taskTypeOptions.push({
      label: resolveTaskTypeName(task.taskType, taskTypeNameMap),
      value: task.taskType,
      disabled: true,
    });
  }
  const tenantId = useTenantStore(state => state.currentTenantId);
  const parentId = task?.parentTaskId;
  const [goalType, setGoalType] = useState<ParentTaskGoalType>('COUNT');
  const [goalValue, setGoalValue] = useState('');
  const [initialGoal, setInitialGoal] = useState<ParentTaskOverviewDto | ParentTaskGoalSummary>();
  const [goalSummary, setGoalSummary] = useState<ParentTaskGoalSummary>();
  const [goalReadState, setGoalReadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const goalTouched = useRef(false);
  const readSequence = useRef(0);
  const editSession = useRef(0);
  const scope = open ? JSON.stringify([tenantId, parentId]) : '';
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const readGoal = useCallback(async () => {
    if (!open || !parentId || tenantId == null) return;
    const sequence = ++readSequence.current;
    const expectedScope = JSON.stringify([tenantId, parentId]);
    setGoalReadState('loading');
    try {
      const summary = validateParentGoalSummary(await bdTaskApi.queryParentTaskSummary({ parentTaskId: parentId }), parentId);
      if (sequence !== readSequence.current || scopeRef.current !== expectedScope) return;
      setGoalSummary(summary);
      if (!goalTouched.current) {
        const type = summary.targetType ?? 'COUNT';
        const raw = String(type === 'PERCENT' ? summary.targetPercent : summary.targetCount);
        setInitialGoal(summary);
        setGoalType(type);
        setGoalValue(raw);
        form.setFieldsValue({ goalType: type, goalValue: raw });
      }
      setGoalReadState('ready');
    } catch {
      if (sequence === readSequence.current && scopeRef.current === expectedScope) setGoalReadState('error');
    }
  }, [open, parentId, tenantId, form]);
  const goalChanged = Boolean(goalTouched.current && initialGoal && parentGoalChanged(initialGoal, goalType, goalValue));
  // 日期变更同时决定过期任务的说明是否可编辑。
  const values = Form.useWatch([], form);
  // canEdit 由后端基于更新前的截止日期计算。已过期任务在同一次请求中续期后允许同步修改说明，
  // 因此这里还需结合表单中的新截止日期和基础编辑权限（canDelete 与创建人/管理员权限口径一致）动态解禁。
  const descriptionEditable = Boolean(
    task?.canEdit ||
      (task?.canDelete &&
        values?.expireDate &&
        !values.expireDate.isBefore(dayjs().startOf('day'), 'day')),
  );
  const goalError = (() => {
    if (!goalChanged) return undefined;
    if (goalReadState !== 'ready') return '全批次目标信息暂不可用，请重试';
    try { buildParentGoalEdit(initialGoal!, goalType, goalValue, goalSummary?.totalCount); return undefined; }
    catch (error) { return (error as Error).message; }
  })();
  const goalHelp = goalType === 'COUNT'
    && goalError?.startsWith('数量目标不能超过整个批次实际任务项数')
    ? '目标数量不能超过任务项总量' : goalError;
  const goalHint = goalReadState === 'loading' ? '正在核对全批次目标…'
    : goalReadState === 'ready' ? `当前批次任务项总量为${goalSummary?.totalCount}项` : undefined;

  useEffect(() => {
    ++editSession.current;
    ++readSequence.current;
    goalTouched.current = false;
    setSubmitting(false);
    setGoalSummary(undefined);
    setGoalReadState('loading');
    if (open && task) {
      const type = task.targetType ?? 'COUNT';
      const raw = String(type === 'PERCENT' ? task.targetPercent ?? '' : task.targetCount);
      form.resetFields();
      form.setFieldsValue({
        name: task.name, taskType: task.taskType, goalType: type, goalValue: raw,
        expireDate: task.expireDate ? dayjs(task.expireDate) : undefined,
        priority: task.priority, parentTaskDescription: task.parentTaskDescription ?? '',
      });
      setInitialGoal(task);
      setGoalType(type);
      setGoalValue(raw);
      void readGoal();
    }
    return () => { ++editSession.current; ++readSequence.current; }; // eslint-disable-line react-hooks/exhaustive-deps
    // 仅新编辑作用域重置草稿，后台列表刷新不覆盖当前输入。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parentId, tenantId, form, readGoal]);

  const handleSubmit = async () => {
    if (!task) return;
    const submittedScope = scope;
    const submittedSession = editSession.current;
    const isCurrentSubmission = () => scopeRef.current === submittedScope && editSession.current === submittedSession;
    const reportView = captureTaskView({ parentTaskId: task.parentTaskId });
    const request = ++analyticsRequest.current;
    const isCurrentReport = () => isCurrentSubmission() && analyticsRequest.current === request;
    const reportResult: typeof reportView = (...args) => {
      if (isCurrentReport()) reportView(...args);
    };
    try {
      const values = await form.validateFields();
      if (!isCurrentSubmission()) return;
      let targetFields: ReturnType<typeof buildParentGoalEdit> = {};
      try {
        if (goalChanged && goalReadState !== 'ready') throw new Error('全批次目标信息暂不可用，请重试');
        if (goalChanged) targetFields = buildParentGoalEdit(initialGoal!, goalType, goalValue, goalSummary?.totalCount);
      } catch (error) {
        form.setFields([{ name: 'goalValue', errors: [(error as Error).message] }]);
        return;
      }

      const originalDescription = task.parentTaskDescription?.trim() ?? '';
      const currentDescription = String(values.parentTaskDescription ?? '');
      const normalizedDescription = currentDescription.trim();
      const descriptionChanged = normalizedDescription !== originalDescription;

      const changedFields = [
        ...(values.name !== task.name ? ['name'] : []),
        ...(values.taskType !== task.taskType ? ['taskType'] : []),
        ...(targetFields.targetType && targetFields.targetType !== (initialGoal?.targetType ?? 'COUNT') ? ['targetType'] : []),
        ...(targetFields.targetCount !== undefined && targetFields.targetCount !== initialGoal?.targetCount ? ['targetCount'] : []),
        ...(targetFields.targetPercent !== undefined && targetFields.targetPercent !== initialGoal?.targetPercent ? ['targetPercent'] : []),
        ...(values.expireDate && values.expireDate.format('YYYY-MM-DD') !== (task.expireDate ? dayjs(task.expireDate).format('YYYY-MM-DD') : undefined) ? ['expireDate'] : []),
        ...(values.priority !== task.priority ? ['priority'] : []),
        ...(descriptionChanged ? ['parentTaskDescription'] : []),
      ];
      const persist = async () => {
        if (!isCurrentSubmission()) return;
        setSubmitting(true);
        try {
          const result = await bdTaskApi.updateParentTask({
            parentTaskId: task.parentTaskId,
            name: values.name,
            taskType: values.taskType,
            ...targetFields,
            expireDate: values.expireDate ? values.expireDate.format('YYYY-MM-DD') : undefined,
            priority: values.priority,
            // 未修改时不传；空字符串表示明确清空任务说明。
            ...(descriptionChanged ? { parentTaskDescription: currentDescription } : {}),
            // operatorId 不再传入，后端自动从当前登录态兜底获取（后端技术方案 §3.6）
          }).catch(error => {
            reportResult('edit.unconfirmed', { changedFields });
            throw error;
          });
          if (!isCurrentSubmission()) return;
          reportResult(result?.parentTaskId === task.parentTaskId && Array.isArray(result.failDetails) && result.failDetails.length === 0
            ? 'edit.saved' : 'edit.unconfirmed', { changedFields });
          if (result?.goalFeedback?.message) message.warning(result.goalFeedback.message);
          message.success(goalChanged ? '修改成功，达标状态稍后更新' : '修改成功');
          onSuccess();
          onClose();
        } catch (error) {
          if (isCurrentSubmission() && error instanceof BdTaskApiError
            && /目标|比例|数量/.test(error.message)) {
            form.setFields([{ name: 'goalValue', errors: [error.message] }]);
            void readGoal();
          }
        } finally {
          if (isCurrentSubmission()) setSubmitting(false);
        }
      };

      if (descriptionChanged && originalDescription && !normalizedDescription) {
        Modal.confirm({
          title: '确认清空任务说明？',
          content: '清空后，任务详情页将不再展示该内容。',
          okText: '确认清空',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: () => { if (isCurrentReport()) trackTaskAction('edit.clear_description_confirm'); return persist(); },
          onCancel: () => { if (isCurrentReport()) trackTaskAction('edit.clear_description_cancel'); },
        });
        return;
      }

      await persist();
    } catch (err: any) {
      // 表单校验失败时 err 无 message，接口失败已由 bdTaskApi 内部 message.error 提示
      if (err?.errorFields) return;
    }
  };

  return (
    <Modal
      open={open}
      title="修改基础信息"
      onCancel={() => { trackTaskAction('edit.close'); onClose(); }}
      footer={null}
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="任务名称"
          rules={[{ required: true, message: '任务名称不能为空' }]}
        >
          <Input placeholder="请输入任务名称" maxLength={50} showCount />
        </Form.Item>

        <Form.Item
          name="taskType"
          label="业务类型"
          rules={[{ required: true, message: '请选择业务类型' }]}
        >
          <Select
            placeholder="请选择业务类型"
            options={taskTypeOptions}
          />
        </Form.Item>

        <Form.Item
          name="priority"
          label="优先级"
          rules={[{ required: true, message: '请选择优先级' }]}
        >
          <Select
            placeholder="请选择优先级"
            options={Object.entries(PRIORITY_CONFIG).map(([code, cfg]) => ({
              label: cfg.label,
              value: Number(code),
            }))}
          />
        </Form.Item>

        {goalReadState === 'error' && (
          <Alert type="warning" showIcon message="全批次目标信息暂不可用"
            description="可继续修改其他信息；修改目标前请重试。"
            action={<Button size="small" onClick={() => { void readGoal(); }}>重新核对</Button>}
            style={{ marginBottom: 16 }} />
        )}
        <Form.Item name="goalType" label="目标类型" rules={[{ required: true }]}>
          <Select aria-label="目标类型" disabled={goalReadState !== 'ready' || submitting}
            options={[{ value: 'COUNT', label: '数量（项）' }, { value: 'PERCENT', label: '比例（%）' }]}
            onChange={type => {
              goalTouched.current = true;
              setGoalType(type);
              setGoalValue('');
              form.setFieldsValue({ goalValue: '' });
            }} />
        </Form.Item>
        {/* 目标提示直接随当前状态切换，避免离场动画保留旧提示及其高度。 */}
        <ConfigProvider theme={{ token: { motion: false }, components: { Form: { verticalLabelPadding: '0 0 6px' } } }}>
          <Form.Item label={goalType === 'PERCENT' ? '目标比例' : '目标数量'} htmlFor="goalValue" required
            className="bd-task-goal-field"
            validateStatus={goalError ? 'error' : undefined}
            help={goalHelp && <div id="goalValue_help" style={{ color: token.colorError }}>
              {goalHelp}
            </div>}
          >
            {goalHint && <div id="goalValue_hint" className="bd-task-goal-hint"
              style={{ color: token.colorTextDescription, fontSize: token.fontSize, lineHeight: token.lineHeight, marginBottom: token.marginXS }}>
              {goalHint}
            </div>}
            {/* noStyle 字段由外层 Form.Item 展示错误，沿用任务名称的默认间距补偿。 */}
            <Form.Item name="goalValue" noStyle validateTrigger="onChange" required
              rules={[{ validator: (_, raw) => {
                if (!goalTouched.current || !initialGoal || !parentGoalChanged(initialGoal, goalType, String(raw ?? ''))) return Promise.resolve();
                try { buildParentGoalEdit(initialGoal, goalType, String(raw ?? ''), goalSummary?.totalCount); return Promise.resolve(); }
                catch (error) { return Promise.reject(error); }
              } }]}
            >
              <Input aria-label={goalType === 'PERCENT' ? '目标比例' : '目标数量'}
                aria-describedby={[goalHint && 'goalValue_hint', goalHelp && 'goalValue_help'].filter(Boolean).join(' ') || undefined}
                aria-details={goalHint ? 'goalValue_hint' : undefined}
                inputMode={goalType === 'PERCENT' ? 'decimal' : 'numeric'}
                disabled={goalReadState !== 'ready' || submitting}
                placeholder={goalType === 'PERCENT' ? '0至100，最多一位小数' : '非负整数，不能超过任务项总量'}
                suffix={goalType === 'PERCENT' ? '%' : '项'}
                onChange={event => { goalTouched.current = true; setGoalValue(event.target.value); }} />
            </Form.Item>
          </Form.Item>
        </ConfigProvider>

        <Form.Item
          name="expireDate"
          label="截止时间"
          rules={[{ required: true, message: '请选择截止时间' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            disabledDate={current => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <Form.Item
          name="parentTaskDescription"
          label="任务说明"
          validateTrigger="onChange"
          rules={[
            {
              validator: (_, value) =>
                Array.from(String(value ?? '')).length <= MAX_DESCRIPTION_LENGTH
                  ? Promise.resolve()
                  : Promise.reject(new Error('任务说明不能超过1000字符')),
            },
          ]}
        >
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder="可填写任务背景、整体目标或需要跟进人了解的注意事项，纯文本，支持换行"
            disabled={!descriptionEditable}
            count={{
              max: MAX_DESCRIPTION_LENGTH,
              strategy: value => Array.from(value).length,
              show: true,
            }}
            styles={{
              textarea: { paddingBottom: 28 },
              count: { bottom: 8, insetInlineEnd: 12 },
            }}
          />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button onClick={() => { trackTaskAction('edit.cancel'); onClose(); }}>取消</Button>
          {/* 存在未通过的字段校验（如目标值非整数）时置灰保存按钮，直接从交互上禁止非法提交 */}
          <Button type="primary" disabled={Boolean(goalError)} loading={submitting} onClick={() => { trackTaskAction('task.edit'); void handleSubmit(); }}>
            保存
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditParentTaskModal;
