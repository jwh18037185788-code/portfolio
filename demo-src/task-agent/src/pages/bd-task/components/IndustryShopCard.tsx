import React from 'react';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import BrandCard, { BrandCardProps } from './BrandCard';

const IndustryShopCard: React.FC<Omit<BrandCardProps, 'contactObjectType'>> = props => <BrandCard {...props} contactObjectType={CONTACT_OBJECT_TYPE.TS_POI} />;

export default IndustryShopCard;
