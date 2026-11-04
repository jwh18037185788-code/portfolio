import React from 'react';
import { FILTER_FIELD_LABEL_STYLE } from './FilterFieldLabel';

export interface StatGroupProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  /** 单独使用时可显式指定标题宽度；默认按标题内容自适应。 */
  titleWidth?: number;
  /** 需要根据可用宽度动态排布标签时，用于读取内容区尺寸。 */
  contentRef?: React.Ref<HTMLDivElement>;
}

export interface StatGroupStackProps {
  children: React.ReactNode;
  rowGap?: number;
}

const StatGroupGridContext = React.createContext(false);
const STAT_GROUP_LABEL_GAP = 18;
export const STAT_GROUP_CHIP_GAP = 8;

/**
 * 多行筛选分组容器：两列共享同一套网格轨道。
 * 第一列按区域内最长标题自适应，第二列承载左对齐的筛选标签。
 */
export const StatGroupStack: React.FC<StatGroupStackProps> = ({ children, rowGap = 14 }) => (
  <StatGroupGridContext.Provider value>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'max-content minmax(0, 1fr)',
        alignItems: 'center',
        columnGap: STAT_GROUP_LABEL_GAP,
        rowGap,
      }}
    >
      {children}
    </div>
  </StatGroupGridContext.Provider>
);

/**
 * 统计筛选分组：图标+标题+chips 一行，复用当前任务模块筛选布局。
 * 【全面排查修复】此前仅在 ParentTaskList.tsx 内部私有定义，导致 ShopTaskListPage.tsx（商家详情页）、
 * SubTaskList.tsx（任务详情页）等其余页面的同类统计筛选分组各自用 div+文字手写，缺少 icon、样式细节
 * （标题字重/宽度/间距）容易跑偏。现抽取为公共组件，全站统计筛选分组统一复用同一套视觉规范。
 */
// 标题直接复用输入框上方标题样式，图标由 flex 居中对齐。
const StatGroup: React.FC<StatGroupProps> = ({ icon, title, children, titleWidth, contentRef }) => {
  const inSharedGrid = React.useContext(StatGroupGridContext);

  return (
    <div
      style={inSharedGrid ? { display: 'contents' } : {
        display: 'grid',
        gridTemplateColumns: `${titleWidth ? `${titleWidth}px` : 'max-content'} minmax(0, 1fr)`,
        alignItems: 'center',
        columnGap: STAT_GROUP_LABEL_GAP,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, ...FILTER_FIELD_LABEL_STYLE, fontWeight: 600 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.75, fontSize: 12, lineHeight: 1, verticalAlign: 'middle' }}>{icon}</span>
        <span>{title}</span>
      </div>
      <div ref={contentRef} style={{ position: 'relative', display: 'flex', minWidth: 0, flexWrap: 'wrap', gap: STAT_GROUP_CHIP_GAP }}>{children}</div>
    </div>
  );
};

export default StatGroup;
