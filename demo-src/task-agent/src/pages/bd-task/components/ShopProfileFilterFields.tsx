import { trackTaskAction } from '@/lib/taskAnalytics';
import React from 'react';
import { Select, InputNumber, TreeSelect } from 'antd';
import type { CategoryTreeNodeDto, ContactObjectType, ShopFilterOptionsDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import FilterFieldLabel from './FilterFieldLabel';

/**
 * 【待后端接口就绪后联调】商家画像筛选字段组：营业状态/上单状态/配送方式/认领上单状态/门店品类/商家标签/体验分区间。
 * 供商家列表页（ShopListPage）、商家详情页任务项列表（ShopTaskListPage）、任务详情页（SubTaskList）三处复用，
 * 按 contactObjectType 自动切换外卖/公海门店各自可用的字段集（后端技术方案补充 KM 2779238690 §3.5/§4.2/§4.5）：
 * - 外卖门店（WM_SHOP）：营业状态、上单状态、门店品类、配送方式、体验分区间、商家标签
 * - 公海门店（WDC_SHOP）：认领上单状态、门店品类、商家标签
 * 选项数据来自 getShopFilterOptions() 字典接口（useShopFilterOptions hook），下拉框展示 label、选中回填 code，
 * 体验分为直接数值区间输入（非枚举）。
 */

// 递归转换品类树为 antd TreeSelect 需要的 treeData 结构
function toTreeSelectData(nodes?: CategoryTreeNodeDto[]): any[] {
  if (!nodes || nodes.length === 0) return [];
  return nodes.map(node => ({
    title: node.name,
    value: node.id,
    key: node.id,
    // 非叶子节点禁止直接选中（后端筛选按叶子节点ID），仅叶子节点可勾选
    selectable: node.isLeaf,
    children: toTreeSelectData(node.children),
  }));
}

export interface ShopProfileFilterValue {
  businessStatus?: number[];
  onlineStatus?: number[];
  deliveryType?: number[];
  claimStatus?: number[];
  categoryId?: number[];
  poiTags?: string[];
  experienceScoreFrom?: number;
  experienceScoreTo?: number;
}

export interface ShopProfileFilterFieldsProps {
  contactObjectType: ContactObjectType;
  options: ShopFilterOptionsDto;
  optionsLoading?: boolean;
  value: ShopProfileFilterValue;
  onChange: (patch: Partial<ShopProfileFilterValue>) => void;
  /** 控件统一宽度，默认 160；flexField=true 时会被 '100%' 覆盖，交由外层 FilterFieldLabel 的 flex 控制实际宽度 */
  width?: number;
  /**
   * 是否为每个字段单独添加标题标签（复用字段自身的 placeholder 文案作为标题文字，与
   * ShopListPage.tsx 门店ID/门店名称等字段的 FilterFieldLabel 标题样式保持一致）。
   * 默认 false：保持无标题的紧凑布局，供 SubTaskList.tsx/ShopTaskListPage.tsx 等内联搜索栏场景复用，
   * 避免新增标题后撃高行高、与同行其余无标题输入框对不齐。
   */
  withLabel?: boolean;
  /**
   * 【全面排查修复】是否作为弹性字段参与所在筛选行的自适应撑满布局，透传给内部各 FilterFieldLabel；
   * 开启后控件宽度自动改为 100% 撑满各自的弹性容器。默认 false，仅 withLabel 场景下按需开启
   * （SubTaskList.tsx 任务详情页筛选行已开启）。
   */
  flexField?: boolean;
}

const ShopProfileFilterFields: React.FC<ShopProfileFilterFieldsProps> = ({
  contactObjectType, options, optionsLoading, value, onChange, width = 160, withLabel = false, flexField = false,
}) => {
  const controlWidth = flexField ? '100%' : width;
  const controlMinWidth = flexField ? undefined : width;
  const isWdc = contactObjectType === CONTACT_OBJECT_TYPE.WDC_SHOP;

  return (
    <>
      {!isWdc && (
        <FilterFieldLabel label="营业状态" enabled={withLabel} flexField={flexField}>
          <Select
            mode="multiple"
            placeholder="营业状态"
            allowClear
            loading={optionsLoading}
            value={value.businessStatus}
            onChange={v => { trackTaskAction('filter.business_status'); onChange({ businessStatus: v }); }}
            style={{ width: controlWidth, minWidth: controlMinWidth }}
            maxTagCount="responsive"
            options={(options.businessStatusOptions ?? []).map(o => ({ label: o.label, value: o.code }))}
          />
        </FilterFieldLabel>
      )}
      {!isWdc && (
        <FilterFieldLabel label="上单状态" enabled={withLabel} flexField={flexField}>
          <Select
            mode="multiple"
            placeholder="上单状态"
            allowClear
            loading={optionsLoading}
            value={value.onlineStatus}
            onChange={v => { trackTaskAction('filter.online_status'); onChange({ onlineStatus: v }); }}
            style={{ width: controlWidth, minWidth: controlMinWidth }}
            maxTagCount="responsive"
            options={(options.onlineStatusOptions ?? []).map(o => ({ label: o.label, value: o.code }))}
          />
        </FilterFieldLabel>
      )}
      {isWdc && (
        <FilterFieldLabel label="认领上单状态" enabled={withLabel} flexField={flexField}>
          <Select
            mode="multiple"
            placeholder="认领上单状态"
            allowClear
            loading={optionsLoading}
            value={value.claimStatus}
            onChange={v => { trackTaskAction('filter.claim_status'); onChange({ claimStatus: v }); }}
            style={{ width: controlWidth, minWidth: controlMinWidth }}
            maxTagCount="responsive"
            options={(options.claimStatusOptions ?? []).map(o => ({ label: o.label, value: o.code }))}
          />
        </FilterFieldLabel>
      )}
      <FilterFieldLabel label="门店品类" enabled={withLabel} flexField={flexField}>
        <TreeSelect
          placeholder="门店品类"
          allowClear
          multiple
          treeCheckable
          showCheckedStrategy={TreeSelect.SHOW_CHILD}
          loading={optionsLoading}
          value={value.categoryId}
          onChange={v => { trackTaskAction('filter.category'); onChange({ categoryId: v }); }}
          style={{ width: controlWidth, minWidth: controlMinWidth }}
          maxTagCount="responsive"
          treeData={toTreeSelectData(options.categoryTree)}
          treeNodeFilterProp="title"
          treeDefaultExpandAll={false}
        />
      </FilterFieldLabel>
      {!isWdc && (
        <FilterFieldLabel label="配送方式" enabled={withLabel} flexField={flexField}>
          <Select
            mode="multiple"
            placeholder="配送方式"
            allowClear
            loading={optionsLoading}
            value={value.deliveryType}
            onChange={v => { trackTaskAction('filter.delivery_type'); onChange({ deliveryType: v }); }}
            style={{ width: controlWidth, minWidth: controlMinWidth }}
            maxTagCount="responsive"
            options={(options.deliveryTypeOptions ?? []).map(o => ({ label: o.label, value: o.code }))}
          />
        </FilterFieldLabel>
      )}
      {!isWdc && (
        <FilterFieldLabel label="体验分区间" enabled={withLabel} flexField={flexField}>
          <span style={{ display: 'flex', width: controlWidth, minWidth: controlMinWidth, alignItems: 'center', gap: 4 }}>
            <InputNumber
              placeholder="体验分下限"
              min={0}
              max={100}
              value={value.experienceScoreFrom}
              onChange={v => onChange({ experienceScoreFrom: v ?? undefined })}
              style={{ width: flexField ? undefined : 100, minWidth: 0, flex: flexField ? 1 : undefined }}
            />
            <span style={{ color: '#8D94A5' }}>-</span>
            <InputNumber
              placeholder="体验分上限"
              min={0}
              max={100}
              value={value.experienceScoreTo}
              onChange={v => onChange({ experienceScoreTo: v ?? undefined })}
              style={{ width: flexField ? undefined : 100, minWidth: 0, flex: flexField ? 1 : undefined }}
            />
          </span>
        </FilterFieldLabel>
      )}
      <FilterFieldLabel label="商家标签" enabled={withLabel} flexField={flexField}>
        <Select
          mode="multiple"
          placeholder="商家标签"
          allowClear
          loading={optionsLoading}
          value={value.poiTags}
          onChange={v => { trackTaskAction('filter.poi_tags'); onChange({ poiTags: v }); }}
          style={{ width: controlWidth, minWidth: controlMinWidth }}
          maxTagCount="responsive"
          options={(options.poiTagsOptions ?? []).map(tag => ({ label: tag, value: tag }))}
        />
      </FilterFieldLabel>
    </>
  );
};

export default ShopProfileFilterFields;
