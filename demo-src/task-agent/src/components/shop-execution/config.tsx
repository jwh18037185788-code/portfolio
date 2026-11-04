import React from 'react';
import {
    ClockCircleOutlined,
    GiftOutlined,
    PhoneOutlined,
    ShopOutlined,
    ShoppingOutlined,
    PlusCircleOutlined,
    TagOutlined,
    TruckOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import type { ShopExecutionAbilityType } from './types';
import { MT } from '@/pages/bd-task/theme';

export type AbilityFieldType =
    | 'input'
    | 'textarea'
    | 'select'
    | 'number'
    | 'date';

export interface AbilityFieldOption {
  label: string;
  value: string | number;
}

export interface AbilityFieldConfig {
  name: string;
  label: string;
  type: AbilityFieldType;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  precision?: number;
  step?: number;
  suffix?: string;
  span?: 1 | 2;
  options?: AbilityFieldOption[];
  initialValue?: string | number;
}

export interface ShopExecutionAbilityConfig {
  /** 与 bd_execution_ability.id 一致，不能随展示顺序调整。 */
  id: number;
  type: ShopExecutionAbilityType;
  /** 能力名称取自后端；日常神券使用合并分组的标题。 */
  title: string;
  description: string;
  /** 当前执行模式不可用的原因，由服务端能力目录解析生成。 */
  disabledReason?: string;
  icon: React.ReactNode;
  color: string;
  softColor: string;
  fields: AbilityFieldConfig[];
}

// 能力卡片配色统一收敛为 MT 设计系统色板（品牌主色 + 语义色 + AI强调色），
// 不再使用杂色区分能力类型，与 bd-task 任务/商家列表页视觉体系保持一致
export const SHOP_EXECUTION_ABILITIES: Omit<ShopExecutionAbilityConfig, 'title' | 'disabledReason'>[] = [
  {
    id: 1,
    type: 'COUPON_DAILY_UPGRADE',
    description: '选择日常神券（升级）操作',
    icon: <GiftOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
  {
    id: 5,
    type: 'DELIVERY_PRICE',
    description: '批量设置实体目标起送价',
    icon: <TruckOutlined />,
    color: MT.info,
    softColor: MT.infoBg,
    fields: [
      {
        name: 'initDeliveryPrice',
        label: '目标起送价',
        type: 'number',
        required: true,
        placeholder: '如：25.5',
        min: 0,
        precision: 2,
        step: 0.1,
        suffix: '元',
        span: 2,
      },
    ],
  },
  {
    id: 6,
    type: 'DELIVERY_FEE_ACTIVITY',
    description: '选择统一立减、按距离减或按价格满减',
    icon: <TruckOutlined />,
    color: MT.info,
    softColor: MT.infoBg,
    fields: [],
  },
  {
    id: 7,
    type: 'BUSINESS_HOURS',
    description: '批量调整实体营业时间配置',
    icon: <ClockCircleOutlined />,
    color: MT.aiAccent,
    softColor: MT.aiAccentBg,
    fields: [],
  },
  {
    id: 8,
    type: 'FULL_REDUCTION_ACTIVITY',
    description: '批量设置外卖满减活动，支持多档满减阶梯',
    icon: <TagOutlined />,
    color: MT.success,
    softColor: MT.successBg,
    fields: [],
  },
  {
    id: 9,
    type: 'AI_OUTBOUND_TASK',
    description: '为当前实体批量创建 AI 外呼沟通任务',
    icon: <PhoneOutlined />,
    color: MT.aiAccent,
    softColor: MT.aiAccentBg,
    fields: [],
  },
  {
    id: 10,
    type: 'BUSINESS_STATUS',
    description: '打开当前实体页面修改营业状态，仅支持单个执行',
    icon: <ShopOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
  {
    id: 11,
    type: 'PRODUCT_OPTIMIZATION',
    description: '打开当前实体商品优化页面，仅支持单个执行',
    icon: <ShoppingOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
  {
    id: 12,
    type: 'CREATE_COMBO',
    description: '打开当前实体商品管理页面新建套餐，仅支持单个执行',
    icon: <ShoppingOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
  {
    id: 13,
    type: 'CREATE_PRODUCT',
    description: '打开当前实体商品管理页面新建商品，仅支持单个执行',
    icon: <PlusCircleOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
  {
    id: 14,
    type: 'UPDATE_PRODUCT_PRICE',
    description: '打开当前实体商品管理页面修改商品价格，仅支持单个执行',
    icon: <TagOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
  {
    id: 15,
    type: 'SHEN_QIANG_SHOU_REVOKE_SUBSIDY',
    description: '通过虾蜜撤销神抢手补贴，支持批量执行',
    icon: <UndoOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
  {
    id: 16,
    type: 'DISCOUNT_DISH_SIGNUP',
    description: '通过虾蜜创建商品折扣活动，支持批量执行',
    icon: <TagOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
  {
    id: 17,
    type: 'UPDATE_QUALIFICATION',
    description: '通过虾蜜修改商家资质信息，支持批量执行',
    icon: <ShopOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
  {
    id: 18,
    type: 'AOI_DELIVERY_EXPAND',
    description: '复制商家及目标 AOI 信息后打开大象，仅支持单个商家执行',
    icon: <TruckOutlined />,
    color: MT.brandPrimary,
    softColor: MT.brandPrimaryLight,
    fields: [],
  },
];
