import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useMemo } from 'react';
import { Dropdown } from 'antd';
import { DownOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTenantStore } from '@/stores/tenantStore';
import { MT } from '../theme';

/** 侧栏底部所有低频操作共用的轻量 Hover 底色。 */
export const SIDEBAR_UTILITY_HOVER_BG = '#F5F5F7';

/** 侧栏底部低频操作统一行样式：等高、无描边、图标与文字左对齐。 */
export const SIDEBAR_UTILITY_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  height: 36,
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 10,
  padding: '0 8px',
  border: 0,
  borderRadius: 6,
  background: '#FFFFFF',
  color: MT.textMuted,
  fontSize: 13,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background 0.15s ease, color 0.15s ease',
};

/** 租户与环境切换共用的向上弹层容器。 */
export const SIDEBAR_UTILITY_POPUP_STYLE: React.CSSProperties = {
  minWidth: 180,
  maxHeight: 240,
  overflowY: 'auto',
  padding: 4,
  borderRadius: 10,
  background: '#FFFFFF',
  border: `1px solid ${MT.cardBorder}`,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
};

/** 租户与环境选项共用中性色，当前项只用浅灰底区分。 */
export const getSidebarUtilityOptionStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 10px',
  borderRadius: 6,
  cursor: active ? 'default' : 'pointer',
  color: active ? MT.textPrimary : MT.textMuted,
  background: active ? MT.pageBg : 'transparent',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  transition: 'background 0.15s ease',
});

/**
 * 租户切换器
 * - 可用租户列表由页面布局统一初始化
 * - 只有一个租户时默认选中该租户；多个时默认选中第一个
 * - 切换租户后跳转回首页并刷新页面（租户为页面级全局状态）
 */
const TenantSwitcher: React.FC<{ loading?: boolean; loadError?: boolean }> = ({ loading = false, loadError = false }) => {
  const { tenants, currentTenantId, setCurrentTenantId } = useTenantStore();
  const navigate = useNavigate();

  const handleChange = (tenantId: number | string) => {
    if (tenantId === currentTenantId) return;
    setCurrentTenantId(tenantId);
    // 租户是页面级全局状态，切换后先跳回首页（任务列表），再刷新页面让所有数据按新租户重新加载
    navigate('/bd-task', { replace: true });
    window.location.reload();
  };

  const currentTenantName = useMemo(() => {
    if (loading) return '加载中...';
    if (loadError) return '租户加载失败';
    return tenants.find(t => t.tenantId === currentTenantId)?.tenantName ?? '暂无租户';
  }, [currentTenantId, loading, loadError, tenants]);

  return (
    <Dropdown
      trigger={['click']}
                  onOpenChange={(open, info) => { if (open && info.source === 'trigger') trackTaskAction('tenant.menu_open'); }}
      placement="topLeft"
      disabled={loading || tenants.length === 0}
      popupRender={() => (
        <div style={SIDEBAR_UTILITY_POPUP_STYLE}>
          {tenants.map(tenant => {
            const active = tenant.tenantId === currentTenantId;
            return (
              <div
                key={tenant.tenantId}
                onClick={() => {
                  if (!active) { trackTaskAction('tenant.select'); handleChange(tenant.tenantId); }
                }}
                style={getSidebarUtilityOptionStyle(active)}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = MT.pageBg;
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                {tenant.tenantName}
              </div>
            );
          })}
        </div>
      )}
    >
      <button
        type="button"
        title={`切换租户：${currentTenantName}`}
        aria-label={`当前租户 ${currentTenantName}，点击切换`}
        style={{
          ...SIDEBAR_UTILITY_ROW_STYLE,
          cursor: loading || tenants.length === 0 ? 'default' : 'pointer',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = SIDEBAR_UTILITY_HOVER_BG;
          e.currentTarget.style.color = MT.textPrimary;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#FFFFFF';
          e.currentTarget.style.color = MT.textMuted;
        }}
      >
        <TeamOutlined style={{ flexShrink: 0, fontSize: 14 }} />
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTenantName}</span>
        <DownOutlined aria-hidden style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 10, color: MT.clickArrow }} />
      </button>
    </Dropdown>
  );
};

export default TenantSwitcher;
