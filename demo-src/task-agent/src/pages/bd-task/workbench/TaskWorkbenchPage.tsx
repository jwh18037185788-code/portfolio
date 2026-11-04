import { trackTaskAction } from '@/lib/taskAnalytics';
import { useTaskAnalyticsView } from '@/lib/useTaskAnalyticsView';
import React, { useState } from 'react';
import { Tabs } from 'antd';
import AnalysisPage from '../AnalysisPage';
import FocusTab from './FocusTab';
import { MT } from '../theme';
import './components/workbench-responsive.css';

/**
 * 任务工作台页面入口：顶部不展示页面标题/副标题（为提升屏效已移除），
 * 直接由 Tab 承载「重点关注」（默认选中，新工作台）与「详细数据」（原 AnalysisPage）。
 * 纯前端本地切换，不触发页面刷新；两个 Tab 各自独立请求数据、独立维护加载状态，
 * 各自的「数据更新于...」与刷新入口保留在各 Tab 内部筛选栏（两个 Tab 数据源相互独立）。
 */
const TaskWorkbenchPage: React.FC = () => {
  const [activeKey, setActiveKey] = useState('focus');
  useTaskAnalyticsView(activeKey === 'focus', 'workbench.tab_focus');
  useTaskAnalyticsView(activeKey === 'detail', 'workbench.tab_detail');

  return (
    <div className="wb-page-container" style={{ width: '100%', maxWidth: 1800, margin: '0 auto', padding: '15px 20px 20px' }}>
      <Tabs
        activeKey={activeKey}
        onChange={key => { trackTaskAction(key === 'focus' ? 'workbench.tab_focus' : 'workbench.tab_detail'); setActiveKey(key); }}
        items={[
          { key: 'focus', label: '重点关注', children: <FocusTab />, forceRender: true },
          { key: 'detail', label: '详细数据', children: <AnalysisPage />, forceRender: true },
        ]}
        className="wb-workspace-tabs"
        style={{ background: 'transparent' }}
        tabBarStyle={{ marginBottom: 18, borderBottomColor: MT.cardBorder }}
        destroyInactiveTabPane={false}
      />
    </div>
  );
};

export default TaskWorkbenchPage;
