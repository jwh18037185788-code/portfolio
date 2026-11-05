import type { CSSProperties } from 'react';
import type { ThemeConfig } from 'antd';

// 蜂窝任务中心设计规范 Token —— 1:1 对齐「任务管理 Agent · 任务工作台第四版」视觉稿
// （task-agent-workbench-v4-backend-handoff 交付包 app/globals.css / app/page.tsx 的精确取值）。
// 旧字段名保留以兼容既有引用，取值已整体收敛为与视觉稿完全一致的简洁企业紫体系。
export const MT = {
  // ===== 旧字段（保留字段名以兼容现有引用，取值已切换为视觉稿精确色值） =====
  yellow:       '#482AF7', // 视觉稿主色
  yellowDark:   '#3216D8', // 主色深色（hover/active）
  yellowLight:  '#EFEDFF', // 主色浅色背景
  yellowSubtle: '#F5F6FA', // 页面背景
  amber:        '#4322FF',
  pageBg:       '#F5F6FA', // 页面背景
  taskStripBg:  '#FAFAFC', // 商家卡片任务条、任务详情 AI 结果条共用浅底色
  sidebarBg:    '#101628',
  cardBorder:   '#F0F1F5', // 卡片描边/分隔线
  cardShadow:   'none', // 视觉稿卡片整体去阴影，改用浅色描边体现层次
  textPrimary:  '#222222', // 主文字
  textMuted:    '#666666', // 次文字
  textTertiary: '#999999', // 三级/说明文字

  // ===== 品牌主色系：简洁企业紫，与视觉稿 --primary 精确一致 =====
  brandPrimary:      '#482AF7',
  brandPrimaryDark:  '#3216D8', // hover/active 加深
  brandPrimaryLight: '#EFEDFF',
  brandSecondary:    '#6933D7', // 辅助紫（图表配色第二色）

  // ===== 语义色：与视觉稿风险/状态配色精确一致 =====
  success:      '#54BE20',
  successText:  '#42BC07',
  successBg:    '#EEFDED',
  successBorder:'#B7EB8F',
  warning:      '#F28C1E',
  warningText:  '#F76700',
  warningBg:    '#FFF6E9',
  warningBorder:'#FFD591',
  danger:       '#F95355',
  dangerText:   '#FF192D',
  dangerBg:     '#FFF5F6',
  dangerBorder: '#FFA39E',
  info:         '#1677FF',
  infoText:     '#198CFF',
  infoBg:       '#EDF6FF',
  infoBorder:   '#91CAFF',

  // ===== AI 强调色：用于「AI执行」相关标识 =====
  aiAccent:      '#482AF7',
  aiAccentBg:    '#EFEDFF',
  aiAccentBorder:'#D8D1FF',

  // ===== 优先级色：P0/P1/P2（视觉稿 error/orange/default 语义） =====
  priorityP0: '#FF4D4F',
  priorityP1: '#F28C1E',
  priorityP2: '#1677FF',
  priorityP3: '#999999',

  // ===== 卡片规范（视觉稿：12px 大圆角、无阴影、浅描边） =====
  cardRadius:      12,
  cardRadiusSmall: 8,
  cardBg:          '#FFFFFF',
  cardShadowHover: 'none',

  // ===== 滚动条/箭头辅助色（视觉稿 --scroll-thumb / --click-arrow） =====
  scrollThumb:  '#E5E8EF',
  clickArrow:   'rgba(0,0,0,.25)',

  // ===== 按钮规范 =====
  btnRadius: 8,

  // ===== 输入框规范 =====
  inputRadius: 8,

  // ===== 导航激活态：还原视觉稿 `.sidebar`/`.nav-menu` 白底浅紫高亮体系（不再使用深色侧栏） =====
  navActiveBg:  '#EFEDFF',
  navActiveText: '#482AF7',

  // ===== 弹层系统 =====
  drawerWidth:     720,
  modalRadius:     12,
  overlayMask:     'rgba(0,0,0,0.45)',

  // ===== 排版 =====
  fontPageTitle: { color: '#222222', fontSize: 20, fontWeight: 700 as const },
  fontSectionTitle: { color: '#222222', fontSize: 16, fontWeight: 600 as const },
  fontAux: { color: '#999999', fontSize: 12, fontWeight: 400 as const },

  // ===== 字体族：与视觉稿一致，西文优先 Inter，中文回退苹方/雅黑 =====
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",

  // ===== 图表配色（ECharts 环形图/散点图专用） =====
  // 🆕 在原始色相基础上整体降低饱和度（约 100%→55~78%，明度小幅提升），
  // 解决多色块并列展示时（尤其饼图）高饱和纯色扎堆导致的刺眼观感，同时保持色相与语义可辨识度不变，
  // 与品牌主色 brandPrimary（按钮/导航等大面积单色场景，视觉观感更克制）解耦，互不影响。
  chart: {
    /** 任务批次/任务项四态风险色：正常/即将到期/已过期/已完成 */
    riskColors: { normal: '#482AF7', soon: '#F28C1E', expired: '#F95355', completed: '#54BE20' },
    /** 任务来源分布环形图配色 */
    sourceColors: ['#482AF7', '#6933D7', '#8E71FA', '#34B9CA', '#1E78F7'],
    /** 业务类型分布环形图配色 */
    businessColors: ['#482AF7', '#6933D7', '#8E71FA', '#1E78F7', '#34B9CA', '#54BE20'],
    /** BD 四象限散点图配色：稳定/正常/偏慢/需关注 */
    quadrantColors: { stable: '#54BE20', normal: '#482AF7', slow: '#F28C1E', urgent: '#F95355' },
    /** AI 执行进展卡片 Agent 构成配色 */
    agentColors: ['#482AF7', '#6933D7', '#8E71FA', '#34B9CA', '#1E78F7', '#54BE20', '#F28C1E'],
  },
} as const;

/**
 * 业务语义类 filled 标签的统一尺寸基准。
 *
 * 任务批次、任务项、商家画像和分析页中的浅色实底标签统一复用此样式，
 * 避免体验分等局部标签因依赖 Ant 默认行高而与同组标签高度不一致。
 */
export const MT_FILLED_TAG_STYLE: CSSProperties = {
  display: 'inline-flex',
  boxSizing: 'border-box',
  alignItems: 'center',
  margin: 0,
  padding: '1px 6px',
  border: 'none',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 400,
  height: 18,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
};

/** 商家列表卡片中的商家头像基准尺寸。 */
export const SHOP_AVATAR_SIZE = 48;

/** 商家详情顶部头像需覆盖标题行与元信息行的视觉高度。 */
export const SHOP_DETAIL_HEADER_AVATAR_SIZE = 55;

/** 任务批次详情的任务项头像：底部对齐第一行元信息的顶部。 */
export const TASK_DETAIL_ITEM_AVATAR_SIZE = 36;

export const BATCH_ACTION_BUTTON_STYLE: CSSProperties = { height: 32, paddingInline: 12, fontSize: 13 };

// 简洁无边框实色按钮样式预设：贴合视觉稿的克制企业风格（纯色背景，不使用渐变）
// 使用方式：在 antd <Button style={{ ...MT_BTN.primary }} /> 等直接展开
export const MT_BTN = {
  // 主操作按钮：品牌纯色 + 白字
  primary: {
    border: 'none',
    background: '#482AF7',
    color: '#fff',
    boxShadow: 'none',
  } as CSSProperties,
  // AI执行按钮：品牌色系，与主按钮保持一致的克制风格
  ai: {
    border: 'none',
    background: '#482AF7',
    color: '#fff',
    boxShadow: 'none',
  } as CSSProperties,
  // 次要按钮（修改等）：浅紫背景 + 品牌色文字
  subtle: {
    border: 'none',
    background: '#EFEDFF',
    color: '#482AF7',
    boxShadow: 'none',
  } as CSSProperties,
  // 危险按钮（删除）：红色纯色 + 白字
  danger: {
    border: 'none',
    background: '#FF4D4F',
    color: '#fff',
    boxShadow: 'none',
  } as CSSProperties,
  // 成功按钮（已完成等正向反馈操作）：绿色纯色 + 白字
  success: {
    border: 'none',
    background: '#52C41A',
    color: '#fff',
    boxShadow: 'none',
  } as CSSProperties,
  // 中性次要按钮（无法完成等弱化操作）：浅灰背景 + 深灰文字，视觉权重低于 subtle
  neutral: {
    border: 'none',
    background: '#F0F1F5',
    color: MT.textMuted,
    boxShadow: 'none',
  } as CSSProperties,
} as const;

// 动效常量
export const MT_ANIM = {
  pressScale: 'scale(0.95)',
  transitionFast: 'all 0.15s ease',
  transitionNormal: 'all 0.2s ease',
  hoverLift: 'translateY(-1px)',
} as const;

// antd ConfigProvider 主题 token：整个「任务agent系统」下各页面（含独立渲染的 /shop-execution）
// 统一复用，保证按钮/标签/输入框等基础组件的视觉语言（主按钮品牌色、默认按钮柔和描边、大圆角）一致
export const MT_THEME: ThemeConfig = {
  token: {
    colorPrimary: MT.brandPrimary,
    colorPrimaryHover: MT.brandSecondary,
    colorPrimaryActive: MT.brandPrimaryDark,
    // 文字色系：与视觉稿 ConfigProvider 完全一致
    colorText: MT.textPrimary,
    colorTextHeading: MT.textPrimary,
    colorTextLabel: MT.textMuted,
    colorTextSecondary: MT.textMuted,
    colorTextTertiary: MT.textTertiary,
    colorTextDescription: MT.textTertiary,
    colorTextPlaceholder: MT.textTertiary,
    colorTextDisabled: MT.textTertiary,
    // 语义色
    colorWarning: MT.warning,
    colorWarningText: MT.warning,
    colorSuccess: MT.success,
    colorSuccessText: MT.success,
    // 描边
    colorBorder: MT.cardBorder,
    colorBorderSecondary: MT.cardBorder,
    // 保留聚焦时的主题色边框，但去掉边框外额外的半透明焦点光晕。
    controlOutline: 'transparent',
    controlOutlineWidth: 0,
    // 圆角：视觉稿 ConfigProvider 为 10
    borderRadius: 10,
    // 布局背景
    colorBgLayout: MT.pageBg,
    // 字体族
    fontFamily: MT.fontFamily,
  },
  components: {
    Card: {
      headerFontSize: 15,
    },
    Button: {
      controlHeight: 36,
      defaultBorderColor: MT.cardBorder,
      defaultBg: '#FFFFFF',
      defaultColor: MT.textPrimary,
      defaultShadow: 'none',
      primaryShadow: 'none',
      dangerShadow: 'none',
    },
    Menu: {
      itemBorderRadius: 8,
      itemHeight: 44,
    },
    Tag: {
      defaultBg: MT.brandPrimaryLight,
      defaultColor: MT.textPrimary,
    },
    Input: {
      colorBorder: MT.cardBorder,
      activeShadow: 'none',
    },
    Segmented: {
      trackBg: '#EEF0F4',
    },
  },
};
