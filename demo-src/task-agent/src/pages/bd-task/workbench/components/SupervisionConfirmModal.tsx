import { trackTaskAction, captureTaskView } from '@/lib/taskAnalytics';
import React, { useEffect, useState, useRef } from 'react';
import { Modal, message, Spin, Avatar, Tooltip, List, Typography, Empty } from 'antd';
import { workbenchApi } from '@/services/workbenchApi';
import type { WorkbenchStatsReq, SupervisionPreviewDto } from '@/types/workbench';
import { formatNameMis } from '../../components/PersonName';
import { MT, MT_BTN } from '../../theme';

const { Text } = Typography;

interface SupervisionConfirmModalProps {
  visible: boolean;
  req: WorkbenchStatsReq | null;
  onClose: () => void;
}

/** 头像底色/字色配色组，循环使用（与 theme.ts 图表色板保持同一套柔和饱和度基调） */
const AVATAR_BG = ['#EEE9FF', '#FFF1F0', '#FFF7E6'];
const AVATAR_COLOR = ['#6240E7', '#EC6567', '#E69233'];

/**
 * 督办汇总确认弹窗：打开时调用 querySupervisionBdList 获取预览，"确认发送"调用 sendSupervision。
 * bdCount===0 时不展示弹窗改为轻提示（由调用方在打开前判断，这里也做二次兜底）。
 * 不支持编辑文案/取消勾选单个 BD，不轮询发送结果。
 * 视觉还原：「发送对象」头像列表（前3位+更多气泡） + 「关键信息总览」摘要卡片，与视觉稿「督办概览」一致。
 */
const SupervisionConfirmModal: React.FC<SupervisionConfirmModalProps> = ({ visible, req, onClose }) => {
  const analyticsSession = useRef(0);
  useEffect(() => {
    const sessionRef = analyticsSession;
    sessionRef.current++;
    return () => { sessionRef.current++; };
  }, [visible, req]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SupervisionPreviewDto | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !req) {
      setPreview(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    workbenchApi
      .querySupervisionBdList(req)
      .then((data) => {
        if (!mounted) return;
        if (!data || data.bdCount === 0) {
          message.info('当前无需督办的 BD');
          onClose();
          return;
        }
        setPreview(data);
      })
      .catch(() => {
        if (!mounted) return;
        message.error('督办预览加载失败，请稍后重试');
        onClose();
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, req]);

  const handleSend = async () => {
    trackTaskAction('supervision.confirm_send', undefined, req ? { supervisionScope: req } : undefined);
    if (!req) return;
    const reportView = captureTaskView({ supervisionScope: req });
    const session = ++analyticsSession.current;
    const reportResult: typeof reportView = (...args) => {
      if (session === analyticsSession.current) reportView(...args);
    };
    setSending(true);
    try {
      const result = await workbenchApi.sendSupervision(req).catch(error => {
        reportResult('supervision.unknown');
        throw error;
      });
      reportResult(result?.submitted === true ? 'supervision.accepted'
        : result?.submitted === false ? 'supervision.not_submitted' : 'supervision.unknown', { estimatedBdCount: result?.estimatedBdCount });
      message.success(`模拟发送成功，示例接收对象为 ${result.estimatedBdCount} 名 BD（未发送真实消息）`);
      onClose();
    } catch {
      message.error('督办发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const bdDetailList = preview?.bdDetailList ?? [];
  const recipientPreview = bdDetailList.slice(0, 3);
  const remainingRecipientCount = Math.max(0, bdDetailList.length - recipientPreview.length);
  const riskTaskCount = (preview?.expiredParentTaskCount ?? 0) + (preview?.soonDueParentTaskCount ?? 0);

  return (
    <Modal
      centered
      open={visible}
      title="督办概览"
      onCancel={() => { trackTaskAction('supervision.cancel'); onClose(); }}
      width={620}
      destroyOnClose
      okText="模拟发送"
      cancelText="取消"
      confirmLoading={sending}
      okButtonProps={{ style: { ...MT_BTN.primary }, disabled: loading || !preview }}
      cancelButtonProps={{ disabled: sending }}
      onOk={handleSend}
    >
      <Spin spinning={loading}>
        {preview ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', gap: 12, alignItems: 'start', margin: '4px 0 18px' }}>
              <Text style={{ display: 'block', color: MT.textPrimary, fontSize: 13, fontWeight: 600, lineHeight: '34px' }}>发送对象</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {recipientPreview.map((item, index) => (
                  <span
                    key={item.bdMis}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 4px', borderRadius: 999, background: MT.pageBg }}
                  >
                    <Avatar size={26} style={{ background: AVATAR_BG[index % 3], color: AVATAR_COLOR[index % 3] }}>
                      {(item.bdName || item.bdMis).slice(0, 1)}
                    </Avatar>
                    <b style={{ fontSize: 12 }}>{formatNameMis(item.bdName, item.bdMis) || item.bdMis}</b>
                  </span>
                ))}
                {remainingRecipientCount > 0 && (
                  <Tooltip
                    placement="bottom"
                    title={
                      <div style={{ maxWidth: 300 }}>
                        <b>其余 {remainingRecipientCount} 位接收人</b>
                        <p style={{ margin: '6px 0 0', lineHeight: 1.7 }}>
                          {bdDetailList
                            .slice(3)
                            .map((item) => formatNameMis(item.bdName, item.bdMis) || item.bdMis)
                            .join('、')}
                        </p>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      style={{ height: 34, padding: '0 12px', border: 0, borderRadius: 999, background: MT.brandPrimaryLight, color: MT.brandPrimary, fontWeight: 700, cursor: 'pointer' }}
                    >
                      +{remainingRecipientCount}
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', gap: 12, alignItems: 'start', margin: '4px 0 18px' }}>
              <Text style={{ display: 'block', color: MT.textPrimary, fontSize: 13, fontWeight: 600, lineHeight: '34px' }}>关键信息总览</Text>
              <div style={{ padding: '12px 14px', borderRadius: 8, background: MT.brandPrimaryLight }}>
                <b style={{ display: 'block', color: MT.textPrimary, fontSize: 14 }}>涉及 {riskTaskCount} 个任务批次</b>
                <span style={{ display: 'block', marginTop: 6, color: MT.textMuted, fontSize: 12 }}>
                  其中 <strong style={{ color: MT.danger }}>{preview.expiredParentTaskCount} 个已过期</strong>、
                  <strong style={{ color: MT.warning }}>{preview.soonDueParentTaskCount} 个即将到期</strong>，含{' '}
                  <strong style={{ color: MT.textPrimary }}>{preview.p0NotAchievedCount} 个 P0 未达标</strong>，共涉及{' '}
                  <strong style={{ color: MT.textPrimary }}>{preview.concernedBdCount} 名</strong>需关注 BD
                </span>
              </div>
            </div>

            <div>
              <Text style={{ fontSize: 13, color: MT.textMuted }}>本次督办 BD 明细（最多展示50条）</Text>
              {bdDetailList.length ? (
                <List
                  size="small"
                  bordered
                  style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto' }}
                  dataSource={bdDetailList}
                  renderItem={(item) => (
                    <List.Item>
                      <span>{formatNameMis(item.bdName, item.bdMis)}</span>
                      <span style={{ color: MT.textMuted, fontSize: 12 }}>关联任务批次 {item.parentTaskCount} 个</span>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无明细" style={{ padding: '16px 0' }} />
              )}
            </div>
          </div>
        ) : (
          !loading && <Empty description="暂无督办预览数据" />
        )}
      </Spin>
    </Modal>
  );
};

export default SupervisionConfirmModal;
