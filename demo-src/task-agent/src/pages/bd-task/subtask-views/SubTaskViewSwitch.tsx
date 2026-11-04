import React from 'react';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import ShopSubTaskView, { SubTaskViewProps } from './ShopSubTaskView';
import SkuAggSubTaskView from './SkuAggSubTaskView';
import BrandSubTaskView from './BrandSubTaskView';
import IndustryShopSubTaskView from './IndustryShopSubTaskView';
import IndustrySkuAggSubTaskView from './IndustrySkuAggSubTaskView';

const SubTaskViewSwitch: React.FC<SubTaskViewProps> = props => {
    switch (props.contactObjectType ?? props.tasks[0]?.contactObjectType) {
        case CONTACT_OBJECT_TYPE.SKU:
        case CONTACT_OBJECT_TYPE.PHF_SKU:
            return <SkuAggSubTaskView {...props} />;
        case CONTACT_OBJECT_TYPE.BRAND:
            return <BrandSubTaskView {...props} />;
        case CONTACT_OBJECT_TYPE.TS_POI:
            return <IndustryShopSubTaskView {...props} />;
        case CONTACT_OBJECT_TYPE.TS_SKU:
            return <IndustrySkuAggSubTaskView {...props} />;
        default:
            return <ShopSubTaskView {...props} />;
    }
};
export default SubTaskViewSwitch;
