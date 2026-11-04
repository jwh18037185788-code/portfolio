import { trackTaskAction } from '@/lib/taskAnalytics';
import React from 'react';
import { Card, DatePicker, Button, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { MT } from '../../theme';
import OrgTreeSelector from './OrgTreeSelector';
import type { WorkbenchFilters } from '../hooks/useWorkbenchFilters';
import type { OrgNode } from '../hooks/useOrgTree';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface WorkbenchFilterBarProps {
  filters: WorkbenchFilters;
  onDateRangeChange: (range: [Dayjs, Dayjs]) => void;
  onOrgIdsChange: (orgIds: number[]) => void;
  lastRefreshedAt: number | null;
  onRefresh: () => void;
  refreshing: boolean;
  /** 与 BdQuadrantCard 共享同一 useOrgTree() 实例 */
  fetchOrgChildren: (parentId: number) => Promise<OrgNode[]>;
  fetchOrgNodeById: (orgId: number) => OrgNode | undefined;
  getNodePath: (orgId: number) => OrgNode[];
}

/**
 * 顶部筛选栏：还原视觉稿 `.v2-filter-card` 单行卡片样式——
 * 创建日期 + 组织架构两个筛选项左对齐，右侧「重置」+「最近刷新时间」+ 刷新按钮。
 * orgIds 为空时展示"请先选择组织架构"提示，不触发下游 7 个统计接口请求。
 */
const WorkbenchFilterBar: React.FC<WorkbenchFilterBarProps> = ({
  filters,
  onDateRangeChange,
  onOrgIdsChange,
  lastRefreshedAt,
  onRefresh,
  refreshing,
  fetchOrgChildren,
  fetchOrgNodeById,
  getNodePath,
}) => {
  return (
    <Card
      size="small"
      style={{ border: 'none', borderRadius: MT.cardRadius, boxShadow: MT.cardShadow }}
      styles={{ body: { padding: '13px 16px' } }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: MT.textMuted, fontSize: 14, whiteSpace: 'nowrap' }}>创建日期</span>
          <RangePicker
            value={filters.dateRange}
            onChange={v => { if (v) { trackTaskAction('workbench.date_range'); onDateRangeChange(v as [Dayjs, Dayjs]); } }}
            allowClear={false}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: MT.textMuted, fontSize: 14, whiteSpace: 'nowrap' }}>组织架构</span>
          <OrgTreeSelector
            value={filters.orgIds}
            onChange={ids => { trackTaskAction('workbench.org_select'); onOrgIdsChange(ids); }}
            fetchOrgChildren={fetchOrgChildren}
            fetchOrgNodeById={fetchOrgNodeById}
            getNodePath={getNodePath}
          />
        </label>

        <div style={{ flex: 1 }} />

        {filters.orgIds.length === 0 && (
          <Text style={{ fontSize: 12, color: MT.warning }}>请先选择组织架构</Text>
        )}

        <Space size={12} align="center">
          <Text style={{ fontSize: 12, color: MT.textTertiary, whiteSpace: 'nowrap' }}>
            {lastRefreshedAt ? `数据更新于 ${dayjs(lastRefreshedAt).format('HH:mm')}` : ''}
          </Text>
          <Button
            type="text"
            shape="circle"
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => { trackTaskAction('workbench.refresh'); onRefresh(); }}
            aria-label="刷新数据"
            style={{ color: MT.textTertiary }}
          />
        </Space>
      </div>
    </Card>
  );
};

export default WorkbenchFilterBar;
