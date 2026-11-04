import React from 'react';
import { Tag, Typography } from 'antd';
import { EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ProfileFieldDto } from '@/types/bdTask';
import { MT, MT_FILLED_TAG_STYLE } from '../theme';

const { Text } = Typography;

/** 外卖配送语义图标：用电动车轮廓替代汽车，保持与 Ant Design 线性图标一致的描边风格。 */
const DeliveryScooterIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6" cy="18" r="2.2" />
    <circle cx="18" cy="18" r="2.2" />
    <path d="M8.2 18h5.6l2.3-6.4h-5.7l-2.2 6.4Z" />
    <path d="M4.2 12h6.2M13.7 8.7h3.1l1.2 6.1M16.8 8.7h1.8" />
    <path d="M3.3 14.6h4.1" />
  </svg>
);

// 部分 key 的定制色（其余 key 使用默认中性色），仅做视觉区分，不影响是否展示的判断逻辑
const KEY_COLOR: Record<string, { color: string; bg: string }> = {
  businessStatus: { color: MT.successText, bg: MT.successBg },
  onlineStatus: { color: MT.infoText, bg: MT.infoBg },
  poiTags: { color: MT.aiAccent, bg: MT.aiAccentBg },
};

const resolveClaimStatusColor = (value?: string): { color: string; bg: string } => {
  if (!value) return { color: MT.infoText, bg: MT.infoBg };
  if (/失败|拒绝|异常|关闭/.test(value)) return { color: MT.dangerText, bg: MT.dangerBg };
  if (/待|未/.test(value)) return { color: MT.warningText, bg: MT.warningBg };
  if (/认领中|上单中|审核中|处理中/.test(value)) return { color: MT.infoText, bg: MT.infoBg };
  if (/已认领|已上单|审核通过|已完成/.test(value)) return { color: MT.successText, bg: MT.successBg };
  return { color: MT.infoText, bg: MT.infoBg };
};

// 【全面排查修复】TEXT 类型画像字段左侧补充 icon：此前 label+value 组合无任何图标，与全站其余文本描述类
// 字段（截止/创建人/责任人等均有 icon）风格不一致。按 key 做少量语义化定制（如经营地址用 EnvironmentOutlined，
// 与筛选区「经营地址」搜索框语义呼应），其余未知语义的 TEXT 字段统一兜底 InfoCircleOutlined，保证全站
// 「非标题类文本描述字段均带 icon」的规则不因后端新增字段而出现遗漏。
const TEXT_FIELD_ICON: Record<string, React.ReactNode> = {
  address: <EnvironmentOutlined />,
  deliveryType: <DeliveryScooterIcon />,
};
const resolveTextFieldIcon = (key: string): React.ReactNode => TEXT_FIELD_ICON[key] ?? <InfoCircleOutlined />;

export interface ProfileFieldsProps {
  fields?: ProfileFieldDto[];
  /** 紧凑模式：更小字号/间距，用于卡片内嵌场景 */
  size?: 'default' | 'small';
  /** 字段及多值标签之间的统一间距；标题标签行可传 8，默认信息行保持 16。 */
  gap?: number;
  /** TEXT 字段统一文字色；传入后 label/value 使用同一颜色。 */
  textColor?: string;
  /** TEXT 字段字号；用于与宿主卡片的元信息字号保持一致。 */
  fontSize?: number;
}

/**
 * 画像/检核字段通用渲染器：遍历 profileFields 数组，按 valueType(TAG/TEXT) 通用渲染。
 * 不感知具体字段含义，后端 profileFields 数组新增元素时前端自动展示，无需改动本组件。
 * 后端技术方案 §3.8（KM 2778373947）。
 */
const ProfileFields: React.FC<ProfileFieldsProps> = ({ fields, size = 'default', gap = 16, textColor, fontSize: customFontSize }) => {
  // 过滤神抢手特例字段，由专用组件 SqsProductInfo 结构化渲染
  const visibleFields = fields?.filter(f => f.key !== 'onSaleSpuInfo' && f.key !== 'hotSpuInfo');

  if (!visibleFields || visibleFields.length === 0) return null;

  const fontSize = customFontSize ?? (size === 'small' ? 11 : 12);
  const tagStyle = (field: ProfileFieldDto, value?: string): React.CSSProperties => {
    const preset = field.key === 'claimStatus' ? resolveClaimStatusColor(value ?? field.value) : KEY_COLOR[field.key];
    return {
      ...MT_FILLED_TAG_STYLE,
      background: preset?.bg ?? MT.pageBg,
      color: preset?.color ?? MT.textMuted,
    };
  };

  // 【全面排查修复】字段之间的间距统一为 16px（此前 8/6px 偏拥挤），与全站其余卡片元信息行保持一致
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, flexWrap: 'wrap' }}>
      {visibleFields.map(field => {
        if (field.valueType === 'TAG') {
          // 多值走 tagList 平铺展示；单值走 value 单个标签展示
          if (field.tagList && field.tagList.length > 0) {
            return (
              <span key={field.key} style={{ display: 'inline-flex', alignItems: 'center', gap }}>
                {field.tagList.map((v, idx) => (
                  <Tag key={`${field.key}-${idx}`} bordered={false} style={tagStyle(field, v)}>
                    {v}
                  </Tag>
                ))}
              </span>
            );
          }
          if (field.value) {
            return (
              <Tag key={field.key} bordered={false} style={tagStyle(field, field.value)}>
                {field.value}
              </Tag>
            );
          }
          return null;
        }
        // TEXT 类型：icon + label + value 组合展示；
        // 【全面排查修复】icon 与紧邻文字间距统一为 6px（此前 4px 偏拥挤）
        // 【走查修复】icon 与文本高度不对齐根因：Typography.Text 默认行高约 1.57em，比图标容器（收缩至
        // fontSize 本身）的行盒明显更高，即使都设置 alignItems:center 仍会有肉眼可见偏差；统一给外层容器
        // 及 icon 显式设置 lineHeight:1，让图标与文字收敛到同一行盒高度基准，图标再配合 verticalAlign:middle
        // 精确居中，彻底消除高度错位（而非仅靠 flex 容器包裹）
        if (!field.value) return null;
        // 【走查修复】label→冒号→value 之间的间距收敛为「仅靠冒号的 margin:0 3px 控制」，
        // 与任务描述行（taskHelpers.tsx TaskItem 的「任务描述」字段）保持同一套间距规则：
        // icon 与 label 之间用 marginRight:6 间隔，label/冒号/value 之间无 flex gap，
        // 仅靠冒号的左右 3px margin 区隔。此前 inline-flex 上额外加 gap:6，导致 label↔冒号
        // 与冒号↔value 各多出 6px（再加冒号本身的 3px margin 合计 9px），相比任务描述的 3px
        // 偏宽，「经营地址」label 与地址内容之间看上去间距明显过大，按用户要求与任务描述对齐
        return (
          <span key={field.key} style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, maxWidth: '100%', overflow: 'hidden', lineHeight: 1, whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6, fontSize, lineHeight: 1, color: MT.textMuted }}>
              {resolveTextFieldIcon(field.key)}
            </span>
            <Text style={{ fontSize, lineHeight: 1, color: textColor ?? MT.textMuted }}>{field.label}：</Text>
            <Text style={{ minWidth: 0, flex: 1, marginLeft: 0, fontSize, lineHeight: 1, color: textColor ?? MT.textPrimary }} ellipsis={{ tooltip: field.value }}>
              {field.value}
            </Text>
          </span>
        );
      })}
    </div>
  );
};

export default ProfileFields;
