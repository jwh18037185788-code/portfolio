import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useState, useMemo, useEffect } from 'react';
import { Layout, ConfigProvider, Dropdown, message, Button, Empty, Spin } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  ShopOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GlobalOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { bdTaskApi } from '@/services/bdTaskApi';
import { useTenantStore } from '@/stores/tenantStore';
import NavItem from './components/NavItem';
import TenantSwitcher, {
  SIDEBAR_UTILITY_HOVER_BG,
  SIDEBAR_UTILITY_POPUP_STYLE,
  SIDEBAR_UTILITY_ROW_STYLE,
  getSidebarUtilityOptionStyle,
} from './components/TenantSwitcher';
import { MT, MT_THEME } from './theme';
import brandMark from '@/assets/brand/tianheng-mark.png';
import brandWordmark from '@/assets/brand/tianheng-wordmark.png';

// bd-task 模块专属字体：引入 Inter / DM Sans 网络字体，并将其作用域限定在 .bd-task-app 容器内，
// 不影响项目内其他模块（events/scenes/agent-management 等）的字体表现。
// 若内网环境无法访问 Google Fonts，浏览器会静默回退到 font-family 列表中的下一个可用字体（系统字体），不影响功能。
const BD_TASK_FONT_STYLE_ID = 'bd-task-font-style';
function injectBdTaskFont() {
  if (document.getElementById(BD_TASK_FONT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BD_TASK_FONT_STYLE_ID;
  style.textContent = `
.bd-task-app, .bd-task-app * {
  font-family: ${MT.fontFamily};
}
`;
  document.head.appendChild(style);
}

const { Sider, Content } = Layout;

interface BdTaskLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { key: '/bd-task',       icon: <DashboardOutlined />,     label: '任务工作台' },
  { key: '/bd-task/batch-list', icon: <UnorderedListOutlined />, label: '任务批次列表' },
  { key: '/bd-task/shops', icon: <ShopOutlined />,          label: '任务项列表' },
];

const SIDER_WIDTH_EXPANDED = 224;
const SIDER_WIDTH_COLLAPSED = 76;

// bd-task 系列页面独立的浏览器页签标题，与左侧导航顶部标题保持一致
// 仅在进入 /bd-task/* 路由时生效，离开时恢复为全局默认标题（index.html 中的 <title>）
const BD_TASK_PAGE_TITLE = '任务管理系统';

const ENVIRONMENTS = [
  { key: 'test', label: '测试环境', shortLabel: 'Test' },
  { key: 'st', label: '预发环境', shortLabel: 'Staging' },
  { key: 'prod', label: '线上环境', shortLabel: 'Prod' },
] as const;

const BdTaskLayout: React.FC<BdTaskLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantLoadError, setTenantLoadError] = useState(false);
  const [tenantRetry, setTenantRetry] = useState(0);
  const currentTenantId = useTenantStore((state) => state.currentTenantId);
  const setTenants = useTenantStore((state) => state.setTenants);

  // 先确认真实可用租户，再挂载业务页面，避免首屏带默认或空租户发起业务请求。
  useEffect(() => {
    let mounted = true;
    (async () => {
      setTenantLoading(true);
      setTenantLoadError(false);
      try {
        const list = await bdTaskApi.queryUserTenants();
        if (!mounted) return;
        if (!Array.isArray(list)) throw new Error('租户列表数据格式错误');
        // 字段归一化：兼容后端返回 tenantName/name、tenantId/id。
        const tenants = list.map((tenant: any) => ({
          tenantId: tenant.tenantId ?? tenant.id,
          tenantName: tenant.tenantName ?? tenant.name ?? String(tenant.tenantId ?? tenant.id),
        })).filter((tenant) => (
          typeof tenant.tenantId === 'number' ? Number.isFinite(tenant.tenantId)
            : typeof tenant.tenantId === 'string' && tenant.tenantId.trim().length > 0
        ));
        setTenants(tenants);
      } catch {
        if (!mounted) return;
        setTenants([]);
        setTenantLoadError(true);
      } finally {
        if (mounted) setTenantLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [setTenants, tenantRetry]);

  const [currentEnv, setCurrentEnv] = useState<typeof ENVIRONMENTS[number]>(() =>
    ENVIRONMENTS.find(item => item.key === localStorage.getItem('portfolio-task-agent-demo-env')) ?? ENVIRONMENTS[2]);

  // 单独设置 bd-task 系列页面的浏览器页签标题，任务批次列表与页面命名保持一致。
  useEffect(() => {
    const originalTitle = document.title;
    document.title = location.pathname === '/bd-task/batch-list' ? '任务批次列表' : BD_TASK_PAGE_TITLE;
    return () => {
      document.title = originalTitle;
    };
  }, [location.pathname]);

  // 注入 bd-task 模块专属字体（作用域限定在 .bd-task-app 容器内，不影响其他模块）
  useEffect(() => {
    injectBdTaskFont();
  }, []);

  const handleEnvSwitch = (env: typeof ENVIRONMENTS[number]) => {
    setCurrentEnv(env);
    localStorage.setItem('portfolio-task-agent-demo-env', env.key);
    message.info(`已切换${env.label}展示，仍使用本地演示数据`);
  };

  const selectedKey =
    location.pathname === '/bd-task'
      ? '/bd-task'
      : ['/bd-task/shops', '/bd-task/brands/', '/bd-task/industry-shops/'].some(path => location.pathname.startsWith(path))
      ? '/bd-task/shops'
      : location.pathname.startsWith('/bd-task/batch-list')
      ? '/bd-task/batch-list'
      : location.pathname.startsWith('/bd-task/')
      ? '/bd-task/batch-list' // 任务详情页 /bd-task/:parentTaskId 归属「任务批次列表」高亮
      : location.pathname;

  return (
    <ConfigProvider theme={MT_THEME}>
      <Layout className="bd-task-app" style={{ height: '100vh', overflow: 'hidden' }}>
        {/* 侧边导航：还原视觉稿 `.sidebar` 白底 + 浅紫高亮体系，替换此前的深色侧栏方案 */}
        <Sider
          width={SIDER_WIDTH_EXPANDED}
          collapsedWidth={SIDER_WIDTH_COLLAPSED}
          collapsed={collapsed}
          trigger={null}
          style={{
            position: 'relative',
            background: '#FFFFFF',
            borderRight: 'none',
            overflow: 'hidden',
            height: '100vh',
          }}
        >
          {/* Sider 内部用 flex column 包裹整体内容，让底部功能行始终固定在视口最底部 */}
          <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
          {/* 品牌区固定 68px 高，保持底部分割线与导航位置 */}
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              height: 68,
              alignItems: 'center',
              gap: 8,
              padding: collapsed ? '0' : '0 18px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderBottom: '1px solid #F1F2F6',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 36,
                height: 36,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 11,
                background: 'linear-gradient(135deg, #4021FF 0%, #752FFF 100%)',
                boxShadow: '0 5px 14px rgba(67,34,255,.25)',
              }}
            >
              <img
                src={brandMark}
                alt={collapsed ? '天衡任务管理' : ''}
                width={22}
                height={17}
                style={{ display: 'block', height: 'auto', objectFit: 'contain', transform: 'translateY(1px)' }}
                draggable={false}
              />
            </div>
            {!collapsed && (
              <img
                src={brandWordmark}
                alt="天衡任务管理"
                width={110}
                height={29}
                style={{ display: 'block', height: 'auto', flexShrink: 0, objectFit: 'contain', transform: 'translateY(-1px)' }}
                draggable={false}
              />
            )}
          </div>

          {/* 导航菜单 */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 10px' }}>
            {menuItems.map(item => (
              <NavItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                active={selectedKey === item.key}
                collapsed={collapsed}
                onClick={() => {
                  const action = item.key === '/bd-task' ? 'nav.workbench' : item.key === '/bd-task/batch-list' ? 'nav.batch_list' : 'nav.entity_list';
                  trackTaskAction(action);
                  navigate(item.key);
                }}
              />
            ))}
          </div>

          {/* 底部低频操作：租户、环境、折叠图标使用等高左对齐行。 */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'transparent',
              padding: collapsed ? '10px 14px 14px' : '12px 14px 14px',
            }}
          >
            <div style={{ display: collapsed ? 'none' : 'block' }}>
              <TenantSwitcher loading={tenantLoading} loadError={tenantLoadError} />
            </div>
            {!collapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Dropdown
                  trigger={['click']}
                  onOpenChange={(open, info) => { if (open && info.source === 'trigger') trackTaskAction('env.menu_open'); }}
                  placement="topLeft"
                  popupRender={() => (
                    <div style={SIDEBAR_UTILITY_POPUP_STYLE}>
                      {ENVIRONMENTS.map(env => {
                        const active = env.key === currentEnv.key;
                        return (
                          <div
                            key={env.key}
                            onClick={() => {
                              if (!active) { trackTaskAction('env.select'); handleEnvSwitch(env); }
                            }}
                            style={{
                              ...getSidebarUtilityOptionStyle(active),
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={e => {
                              if (!active) e.currentTarget.style.background = MT.pageBg;
                            }}
                            onMouseLeave={e => {
                              if (!active) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span>{env.label}（{env.shortLabel}）</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                >
                  <button
                    type="button"
                    title={`切换环境：${currentEnv.label}（${currentEnv.shortLabel}）`}
                    aria-label={`当前环境 ${currentEnv.label}（${currentEnv.shortLabel}），点击切换`}
                    style={{
                      ...SIDEBAR_UTILITY_ROW_STYLE,
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
                    <GlobalOutlined style={{ flexShrink: 0, fontSize: 14, color: MT.textMuted }} />
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentEnv.label}（{currentEnv.shortLabel}）
                    </span>
                    <DownOutlined aria-hidden style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 10, color: MT.clickArrow }} />
                  </button>
                </Dropdown>
                <div style={{ width: 14, height: 1, flexShrink: 0, margin: '4px 0 4px 8px', background: '#E1E3EA' }} />
                <button
                  type="button"
                  title="收起导航"
                  onClick={() => { trackTaskAction('nav.collapse'); setCollapsed(true); }}
                  style={SIDEBAR_UTILITY_ROW_STYLE}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = SIDEBAR_UTILITY_HOVER_BG;
                    e.currentTarget.style.color = MT.textPrimary;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.color = MT.textMuted;
                  }}
                >
                  <MenuFoldOutlined style={{ flexShrink: 0, fontSize: 14 }} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                title="展开导航"
                aria-label="展开导航"
                onClick={() => { trackTaskAction('nav.expand'); setCollapsed(false); }}
                style={{ ...SIDEBAR_UTILITY_ROW_STYLE, width: 36, justifyContent: 'center', padding: 0, margin: '0 auto' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = SIDEBAR_UTILITY_HOVER_BG;
                  e.currentTarget.style.color = MT.textPrimary;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.color = MT.textMuted;
                }}
              >
                <MenuUnfoldOutlined />
              </button>
            )}
          </div>
          </div>
        </Sider>

        <Layout style={{ overflowY: 'auto', height: '100vh' }}>
          <Content style={{ background: MT.pageBg }}>
            {tenantLoading ? (
              <div style={{ padding: '72px 24px', textAlign: 'center' }}>
                <Spin />
                <div style={{ marginTop: 12, color: MT.textMuted }}>正在加载租户…</div>
              </div>
            ) : currentTenantId !== null ? children : (
              <Empty
                description={tenantLoadError ? '租户加载失败，请重试' : '当前账号暂无可用租户'}
                style={{ padding: '72px 24px' }}
              >
                <Button onClick={() => {
                  trackTaskAction('tenant.reload');
                  setTenantLoading(true);
                  setTenantRetry((value) => value + 1);
                }}>重新加载</Button>
              </Empty>
            )}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default BdTaskLayout;
