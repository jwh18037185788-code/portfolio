import React from 'react';
import { MT } from '../theme';

/** 筛选标签组标题与输入框标题共用同一文字样式。 */
export const FILTER_FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: MT.textMuted,
  whiteSpace: 'nowrap',
};

export interface FilterFieldLabelProps {
  label: string;
  enabled?: boolean;
  children: React.ReactNode;
  /**
   * 【全面排查修复】是否作为弹性字段参与所在筛选行的自适应撑满布局：开启后外层容器 flex:1 1 auto +
   * minWidth，随筛选行可用宽度自动伸展，避免宽屏下筛选行右侧出现大片空白；不开启则保持内容自身宽度
   * （如仅有单个字段、不参与整行撑满的场景）。默认 true。
   */
  flexField?: boolean;
  /** flexField=true 时的最小宽度，防止收窄换行时控件过窄，默认 160 */
  minWidth?: number;
}

/**
 * 筛选字段带标签的包裹容器：标题在上、控件在下，1:1 对齐 NoCode FilterFieldLabel。
 * 【全面排查修复】此前 ShopListPage.tsx 私有实现一份 FilterFieldLabel，ShopProfileFilterFields.tsx
 * 又单独复制了一份同视觉规范的 FieldLabel，两处样式虽然一致但维护点分散。现抽取为公共组件，
 * 全站「输入框/下拉框上方加小标题」场景（商家列表页/任务详情页等）统一复用同一处定义。
 */
const FilterFieldLabel: React.FC<FilterFieldLabelProps> = ({
  label, enabled = true, children, flexField = true, minWidth = 160,
}) => {
  if (!enabled) return <>{children}</>;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...(flexField ? { flex: '1 1 auto', minWidth } : undefined),
    }}
    >
      <label style={FILTER_FIELD_LABEL_STYLE}>{label}</label>
      {children}
    </div>
  );
};

export default FilterFieldLabel;
