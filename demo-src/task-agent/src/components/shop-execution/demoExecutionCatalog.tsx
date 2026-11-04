import React from 'react';
import { ClockCircleOutlined, GiftOutlined, PhoneOutlined, ShopOutlined, ShoppingOutlined, PlusCircleOutlined, TagOutlined, TruckOutlined, UndoOutlined } from '@ant-design/icons';
import { MT } from '@/pages/bd-task/theme';

/** Local display catalog: follows the original execution card icons, descriptions and groupings. */
export interface DemoExecutionAbility {
  id: number; title: string; description: string; icon: React.ReactNode;
  color: string; softColor: string; singleOnly?: boolean; external?: boolean;
}
const purple = { color: MT.brandPrimary, softColor: MT.brandPrimaryLight };
export const DEMO_EXECUTION_ABILITIES: DemoExecutionAbility[] = [
  { id: 5, title: '批量调整起送价', description: '批量设置实体目标起送价', icon: <TruckOutlined />, color: MT.info, softColor: MT.infoBg },
  { id: 9, title: 'AI 外呼沟通', description: '为当前实体批量创建 AI 外呼沟通任务', icon: <PhoneOutlined />, color: MT.aiAccent, softColor: MT.aiAccentBg },
  { id: 1, title: '新阶梯日常神券', description: '选择日常神券（升级）操作', icon: <GiftOutlined />, ...purple },
  { id: 6, title: '配送费活动', description: '选择统一立减、按距离减或按价格满减', icon: <TruckOutlined />, color: MT.info, softColor: MT.infoBg },
  { id: 8, title: '创建满减活动', description: '批量设置外卖满减活动，支持多档满减阶梯', icon: <TagOutlined />, color: MT.success, softColor: MT.successBg },
  { id: 15, title: '神抢手撤补贴', description: '通过虾蜜撤销神抢手补贴，支持批量执行', icon: <UndoOutlined />, external: true, ...purple },
  { id: 16, title: '折扣菜活动报名', description: '通过虾蜜创建商品折扣活动', icon: <TagOutlined />, singleOnly: true, external: true, ...purple },
  { id: 7, title: '商家营业时长修改', description: '批量调整实体营业时间配置', icon: <ClockCircleOutlined />, color: MT.aiAccent, softColor: MT.aiAccentBg },
  { id: 10, title: '修改营业状态', description: '打开当前实体页面修改营业状态', icon: <ShopOutlined />, singleOnly: true, external: true, ...purple },
  { id: 17, title: '修改资质信息', description: '通过虾蜜修改商家资质信息，支持批量执行', icon: <ShopOutlined />, external: true, ...purple },
  { id: 18, title: '蜂窝扩配', description: '查看商家及目标 AOI 信息', icon: <TruckOutlined />, singleOnly: true, external: true, ...purple },
  { id: 11, title: '商品优化', description: '打开当前实体商品优化页面', icon: <ShoppingOutlined />, singleOnly: true, external: true, ...purple },
  { id: 12, title: '新建套餐', description: '打开当前实体商品管理页面新建套餐', icon: <ShoppingOutlined />, singleOnly: true, external: true, ...purple },
  { id: 13, title: '新建商品', description: '打开当前实体商品管理页面新建商品', icon: <PlusCircleOutlined />, singleOnly: true, external: true, ...purple },
  { id: 14, title: '修改商品价格', description: '打开当前实体商品管理页面修改商品价格', icon: <TagOutlined />, singleOnly: true, external: true, ...purple },
];
export const DEMO_EXECUTION_GROUPS = [
  { title: '营销活动', ids: [1, 6, 8, 15, 16] },
  { title: '经营设置', ids: [7, 10, 17, 18] },
  { title: '商品运营', ids: [11, 12, 13, 14] },
];
