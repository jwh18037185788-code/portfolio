import { trackTaskAction } from '@/lib/taskAnalytics';
import React from 'react';
import { Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ContactObjectType, OptionItemDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import FilterFieldLabel from './FilterFieldLabel';
import { MT } from '../theme';

export interface EntityFilterValue {
    objectId?: string;
    objectName?: string;
    shopId?: string;
    shopName?: string;
    bdId?: string;
    tsPoiId?: string;
    tsPoiName?: string;
    matchTypes?: number[];
    address?: string;
    parentTaskName?: string;
    creatorId?: string;
    priority?: number;
}
export interface EntityFilterFieldsProps {
    contactObjectType: ContactObjectType;
    value: EntityFilterValue;
    onChange: (patch: Partial<EntityFilterValue>) => void;
    onSearch?: () => void;
    context?: 'batch' | 'list' | 'detail';
    matchTypeOptions?: OptionItemDto[];
    optionsLoading?: boolean;
}

const EntityFilterFields: React.FC<EntityFilterFieldsProps> = ({
    contactObjectType,
    value,
    onChange,
    onSearch,
    context = 'batch',
    matchTypeOptions,
    optionsLoading,
}) => {
    const sku =
        contactObjectType === CONTACT_OBJECT_TYPE.SKU ||
        contactObjectType === CONTACT_OBJECT_TYPE.PHF_SKU;
    const industrySku = contactObjectType === CONTACT_OBJECT_TYPE.TS_SKU;
    const brand = contactObjectType === CONTACT_OBJECT_TYPE.BRAND;
    const fields: { key: keyof EntityFilterValue; label: string }[] = [];
    if (context !== 'detail') {
        if (sku)
            fields.push(
                { key: 'shopName', label: '门店名称' },
                { key: 'shopId', label: '门店 ID' },
                { key: 'address', label: '经营地址' },
                { key: 'objectName', label: 'SKU 名称' },
                { key: 'objectId', label: 'SKU ID' },
                { key: 'bdId', label: '跟进人 mis' },
            );
        else if (brand)
            fields.push(
                { key: 'objectName', label: '品牌名称' },
                { key: 'objectId', label: '品牌 ID' },
                { key: 'bdId', label: '跟进人 mis' },
            );
        else {
            fields.push({ key: 'tsPoiName', label: '行业门店名称' });
            fields.push(
                {
                    key: industrySku ? 'tsPoiId' : 'objectId',
                    label: '行业门店 outerId',
                },
                { key: 'address', label: '行业门店地址' },
            );
            if (industrySku) fields.push({ key: 'objectId', label: '行业 SKU ID' });
        }
    }
    if (context !== 'batch')
        fields.push(
            { key: 'parentTaskName', label: '所属任务批次' },
            { key: 'creatorId', label: '创建人 mis' },
        );
    return (
        <>
            {fields.map(field => (
                <FilterFieldLabel key={field.key} label={field.label}>
                    <Input
                        value={value[field.key] as string | undefined}
                        placeholder={`输入${field.label}`}
                        prefix={<SearchOutlined style={{ color: MT.textMuted, fontSize: 13 }} />}
                        allowClear
                        onChange={event =>
                            onChange({ [field.key]: event.target.value })
                        }
                        onPressEnter={onSearch}
                        style={{ width: '100%', minWidth: 160, borderRadius: MT.inputRadius }}
                    />
                </FilterFieldLabel>
            ))}
            {((brand && context === 'list') || context === 'detail') && (
                <FilterFieldLabel label="优先级">
                    <Select
                        value={value.priority}
                        allowClear
                        placeholder="全部优先级"
                        onChange={priority => { trackTaskAction('filter.priority'); onChange({ priority }); }}
                        options={[0, 1, 2, 3].map(priority => ({
                            value: priority,
                            label: `P${priority}`,
                        }))}
                        style={{ width: '100%', minWidth: 160 }}
                    />
                </FilterFieldLabel>
            )}
            {!sku && !brand && context !== 'detail' && (
                    <FilterFieldLabel label="行业合作标签">
                        <Select
                            mode="multiple"
                            value={value.matchTypes || []}
                            options={matchTypeOptions?.map(item => ({ value: item.code, label: item.label }))}
                            loading={optionsLoading}
                            onChange={matchTypes => { trackTaskAction('filter.match_type'); onChange({ matchTypes }); }}
                            allowClear
                            placeholder="全部合作标签"
                            style={{ width: '100%', minWidth: 160 }}
                        />
                    </FilterFieldLabel>
            )}
        </>
    );
};
export default EntityFilterFields;
