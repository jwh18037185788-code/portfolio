import React from 'react';
import { Avatar, Tag, Typography } from 'antd';
import { UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ContactObjectType, ShopDimensionItemDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import { getIndustryMatchTypeLabel } from '@/constants/industryMatchType';
import { MT, MT_FILLED_TAG_STYLE, SHOP_AVATAR_SIZE, SHOP_DETAIL_HEADER_AVATAR_SIZE } from '../theme';
import CardTitleRow from './CardTitleRow';
import PersonName from './PersonName';
import ProfileFields from './ProfileFields';

interface EntityProfileHeaderProps {
  entity: Partial<ShopDimensionItemDto>;
  contactObjectType: ContactObjectType;
  detail?: boolean;
  actions?: React.ReactNode;
  onIdentityClick?: () => void;
  titleTags?: React.ReactNode;
  metadata?: React.ReactNode;
  /** 任务元信息与主体名称共用文字列，随头像和窄屏换行自然对齐。 */
  children?: React.ReactNode;
}

/** New entities use their own identity and supplied profile fields, without merchant profile fallbacks. */
const EntityProfileHeader: React.FC<EntityProfileHeaderProps> = ({ entity, contactObjectType, detail, actions, onIdentityClick, titleTags, metadata, children }) => {
  const industry = contactObjectType === CONTACT_OBJECT_TYPE.TS_POI;
  const name = industry ? entity.outerName ?? entity.objectName : entity.objectName;
  const id = industry ? entity.outerId ?? entity.objectId : entity.objectId;
  const image = industry ? entity.outerPic : undefined;
  const matchLabel = entity.profileFields?.find(field => field.key === 'matchType');
  const matchTypeLabel = matchLabel?.value || matchLabel?.tagList?.join('、') || getIndustryMatchTypeLabel(entity.matchType);
  const profileFields = entity.profileFields?.filter(field =>
    !['matchType', 'actualValue', 'targetValue', 'experienceScore', 'deliveryType', 'businessStatus', 'onlineStatus', 'categoryName', 'poiTags', 'claimStatus'].includes(field.key),
  );
  return <div style={detail ? {
    background: MT.cardBg, borderRadius: MT.cardRadius, border: `1px solid ${MT.cardBorder}`,
    boxShadow: MT.cardShadow, padding: '20px 24px', marginBottom: 12,
  } : undefined}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
      {image && <Avatar shape="square" size={detail ? SHOP_DETAIL_HEADER_AVATAR_SIZE : SHOP_AVATAR_SIZE} src={image} onClick={onIdentityClick} style={{ flexShrink: 0, borderRadius: MT.cardRadiusSmall, cursor: onIdentityClick ? 'pointer' : undefined }} />}
      <div style={{ minWidth: 0, flex: '1 1 240px' }}>
        <div onClick={onIdentityClick} style={{ cursor: onIdentityClick ? 'pointer' : undefined }}>
          <CardTitleRow
            wrapIdentity={industry}
            title={<Typography.Text strong ellipsis={{ tooltip: name }} style={{ minWidth: 0, fontSize: detail ? 20 : 15, fontWeight: 600, color: MT.textPrimary }}>{name || '暂无数据'}</Typography.Text>}
            id={id}
            idFontSize={detail ? 13 : 12}
            tags={titleTags || (industry && (matchTypeLabel || entity.matchType != null)) ? (
              <>
                {titleTags}
                {industry && (matchTypeLabel || entity.matchType != null) && (
                  <Tag bordered={false} style={{ ...MT_FILLED_TAG_STYLE, background: MT.pageBg, color: MT.textMuted }}>
                    {matchTypeLabel || '暂无行业合作标签信息'}
                  </Tag>
                )}
              </>
            ) : undefined}
          />
          {metadata ?? <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', fontSize: detail ? 13 : 12, lineHeight: 1.5, color: MT.textMuted, overflowWrap: 'anywhere' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <UserOutlined style={{ fontSize: 'inherit', flexShrink: 0, verticalAlign: 'middle' }} />
              <span>跟进人：<PersonName mis={entity.executorMis} name={entity.executorName} /></span>
            </span>
            {entity.taskCount != null && <span>关联任务数：{entity.taskCount}</span>}
            {entity.achievedTaskCount != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircleOutlined style={{ fontSize: 'inherit', flexShrink: 0, verticalAlign: 'middle' }} />已达标：{entity.achievedTaskCount}</span>}
            {entity.taskCount != null && entity.achievedTaskCount != null && <span>未达标：{Math.max(0, entity.taskCount - entity.achievedTaskCount)}</span>}
            {industry && entity.outerAddress && <span>地址：{entity.outerAddress}</span>}
            {industry && !!entity.shopId && <span>关联美团门店：{entity.shopId}</span>}
            {industry && entity.wdcId != null && <span>关联公海商家：{entity.wdcId}</span>}
            {!!profileFields?.length && <ProfileFields fields={profileFields} size="default" fontSize={detail ? 13 : 12} textColor={MT.textMuted} />}
          </div>}
        </div>
        {children}
      </div>
      {actions && <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginLeft: 'auto' }} onClick={event => event.stopPropagation()}>{actions}</div>}
    </div>
  </div>;
};

export default EntityProfileHeader;
