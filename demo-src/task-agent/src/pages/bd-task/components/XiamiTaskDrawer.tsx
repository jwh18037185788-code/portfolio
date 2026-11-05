import React, { useState, useEffect } from 'react';
import { Drawer, Alert, Input, Button, Card, Space, Typography } from 'antd';
import { MT, MT_BTN } from '../theme';
import sessionImage from '@/assets/xiami-preview/session.png';
import homeImage from '@/assets/xiami-preview/home.png';
import './xiami-task-preview.css';
import { XIAMI_ACTION_TITLES, type XiamiTaskAction } from '../utils/xiamiUrl';
export interface XiamiTaskDrawerProps { open: boolean; action: XiamiTaskAction | null; parentTaskId?: number; prompt?: string; title?: string; onClose: () => void; }
function LocalTaskDraftDrawer({ open, action, title, onClose }: XiamiTaskDrawerProps) {
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  return <Drawer open={open} onClose={() => { setSent(false); setValue(''); onClose(); }} title={title ?? (action ? XIAMI_ACTION_TITLES[action] : '任务助手')} width="min(760px, 100vw)" destroyOnClose styles={{ body: { background: MT.pageBg } }}>
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Alert type="info" showIcon message="本地交互演示" description="此处展示任务助手流程，不调用模型或创建真实任务。" />
      <Card><Typography.Paragraph>你好，我可以协助整理任务目标、商家范围与截止时间。请描述本次任务。</Typography.Paragraph>
        <Input.TextArea rows={4} placeholder="例如：跟进重点商家完成活动报名，目标完成率80%" value={value} onChange={e => setValue(e.target.value)} />
        <Button style={{ ...MT_BTN.primary, marginTop: 16 }} disabled={!value.trim()} onClick={() => setSent(true)}>生成任务草稿</Button>
      </Card>
      {sent && <Card title="任务草稿 · 示例"><Typography.Paragraph>{value}</Typography.Paragraph><Typography.Paragraph>建议目标：有效沟通完成率 ≥ 80%<br />执行范围：望京团队示例商家<br />执行方式：AI助手与BD协同跟进</Typography.Paragraph><Alert type="success" message="草稿已生成，仅用于展示，刷新后清除。" /></Card>}
    </Space>
  </Drawer>;
}


function XiamiImageDrawer({ open, title, onClose }: XiamiTaskDrawerProps) {
  const [screen, setScreen] = useState<'session' | 'home'>('session');
  useEffect(() => { if (open) setScreen('session'); }, [open]);
  const close = () => { setScreen('session'); onClose(); };
  return <Drawer open={open} onClose={close} title={title ?? '新建任务'} width="min(100vw, calc((100dvh - 56px) * 5636 / 7492))" destroyOnClose rootClassName="xiami-task-preview" styles={{ body: { padding: 0, background: '#FFFFFF' } }}>
    <div className="xiami-preview-image" data-screen={screen}>
      <img src={screen === 'session' ? sessionImage : homeImage} alt={screen === 'session' ? '虾蜜新建任务会话截图' : '虾蜜首页截图'} draggable={false} />
      <button type="button" className="xiami-preview-close" aria-label={screen === 'session' ? '返回虾蜜首页' : '关闭虾蜜预览'} title={screen === 'session' ? '返回虾蜜首页' : '关闭虾蜜预览'} onClick={() => screen === 'session' ? setScreen('home') : close()} />
      {screen === 'home' && (
        <button
          type="button"
          className="xiami-preview-session"
          aria-label="最近会话：新建任务"
          title="新建任务"
          onClick={() => setScreen('session')}
        />
      )}
    </div>
  </Drawer>;
}

export default function XiamiTaskDrawer(props: XiamiTaskDrawerProps) {
  return props.action === 'create-task' ? <XiamiImageDrawer {...props} /> : <LocalTaskDraftDrawer {...props} />;
}
