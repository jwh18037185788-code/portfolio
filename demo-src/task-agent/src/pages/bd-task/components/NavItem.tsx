import React from 'react';
import { MT } from '../theme';

export interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

/**
 * 自定义导航菜单项：用 div 替代 antd Menu 组件，获得完全的样式控制权。
 * 视觉还原 codex 视觉稿 `.nav-menu .ant-menu-item`：浅色侧边栏 + 选中态浅紫底/紫字，
 * 不再使用深色侧栏的白字/渐变高亮方案。
 * 折叠态：仅居中展示图标。
 */
const NavItem: React.FC<NavItemProps> = ({ icon, label, active, collapsed, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: collapsed ? '4px 8px' : '2px 0',
        padding: collapsed ? '10px 0' : '10px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active ? MT.brandPrimaryLight : 'transparent',
        color: active ? MT.brandPrimary : MT.textMuted,
        fontWeight: active ? 650 : 500,
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = '#F5F5F7';
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          flexShrink: 0,
          color: 'inherit',
        }}
      >
        {icon}
      </div>
      {!collapsed && <span style={{ fontSize: 14, flex: 1, color: 'inherit' }}>{label}</span>}
    </div>
  );
};

export default NavItem;
