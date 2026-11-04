import React from 'react';
import { Tooltip } from 'antd';

/**
 * 人员姓名展示公共组件 —— 全站「展示人员 mis 的位置」统一改造入口。
 *
 * 背景：后端分支 feature/AEGDC-2019-95987009/manager-center 新增批量 mis→姓名回填能力
 * （bdName/creatorName/executorName 等字段），产品要求全站所有展示人员信息的位置：
 * 默认展示姓名（name），鼠标 hover 后通过浮层展示该人员的 mis。
 *
 * 适用场景（A类）：该位置原本就是纯文本展示 mis，没有其他 hover 浮层逻辑 —— 直接用本组件包裹。
 * 不适用场景（B类）：该位置原本已有 hover 浮层、且浮层展示的是其他业务信息（如 BdQuadrantChart.tsx
 * 图表 tooltip、SupervisionConfirmModal.tsx 督办名单），这类位置不使用本组件，而是改用
 * `formatNameMis()` 拼出「name/mis」格式的纯文本，避免和已有浮层冲突/嵌套。
 */
export interface PersonNameProps {
  /** 人员姓名，可能为空（后端字段暂未回填成功、或该 mis 查无对应员工） */
  name?: string | null;
  /** 人员 mis 号 */
  mis?: string | null;
  /** mis 为空时的兜底展示文案，默认 '-'；任务项卡片等场景可传 'AI助手' */
  fallback?: React.ReactNode;
  /** 透传到最外层 span 的样式 */
  style?: React.CSSProperties;
  /** 透传到最外层 span 的 className */
  className?: string;
}

/**
 * 默认展示 name，hover 后浮层展示 mis。
 * - name 和 mis 都为空：展示 fallback，不挂浮层（如 AI 助手场景应直接用 fallback，不传本组件）。
 * - name 为空、mis 有值：展示 mis 本身（兜底，避免空白），不挂浮层（此时浮层再展示一遍 mis 无意义）。
 * - name 有值：展示 name，hover 挂浮层展示 mis。
 */
const PersonName: React.FC<PersonNameProps> = ({ name, mis, fallback = '-', style, className }) => {
  if (!mis) {
    return <span style={style} className={className}>{fallback}</span>;
  }
  if (!name) {
    return <span style={style} className={className}>{mis}</span>;
  }
  return (
    <Tooltip title={mis} placement="top">
      <span style={{ cursor: 'help', ...style }} className={className}>{name}</span>
    </Tooltip>
  );
};

export default PersonName;

/**
 * 「name/mis」格式拼接（B类场景专用：位置本身已有其他 hover 浮层，不再叠加人员浮层）。
 * 例：孟德文/mengdewen。name 为空时兜底仅展示 mis；mis 也为空时返回空字符串。
 */
export function formatNameMis(name?: string | null, mis?: string | null): string {
  if (!mis) return '';
  return name ? `${name}/${mis}` : mis;
}
