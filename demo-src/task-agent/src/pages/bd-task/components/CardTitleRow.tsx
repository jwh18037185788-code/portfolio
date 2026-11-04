import React from 'react';
import { MT } from '../theme';

export interface CardTitleRowProps {
  title: React.ReactNode;
  id?: React.ReactNode;
  idFontSize?: React.CSSProperties['fontSize'];
  tags?: React.ReactNode;
  style?: React.CSSProperties;
  /** 长主体 ID 在窄卡片中换行，避免挤掉名称。 */
  wrapIdentity?: boolean;
}

/**
 * 卡片标题公共结构：标题与 ID 使用 8px 小间距，名称组与标签组使用 16px 大间距，
 * 标签组内部继续使用 8px 小间距。任务批次与商家相关页面统一复用该层级关系。
 */
const CardTitleRow: React.FC<CardTitleRowProps> = ({ title, id, idFontSize = 12, tags, style, wrapIdentity }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 16,
      minWidth: 0,
      ...style,
    }}
  >
    <div style={{ display: 'inline-flex', flexWrap: wrapIdentity ? 'wrap' : undefined, alignItems: 'center', gap: 8, minWidth: 0, maxWidth: wrapIdentity ? '100%' : undefined }}>
      {title}
      {id !== undefined && id !== null && (
        <span style={{ flexShrink: wrapIdentity ? 1 : 0, maxWidth: wrapIdentity ? '100%' : undefined, fontSize: idFontSize, color: MT.textTertiary, whiteSpace: wrapIdentity ? 'normal' : 'nowrap', overflowWrap: wrapIdentity ? 'anywhere' : undefined }}>
          #{id}
        </span>
      )}
    </div>
    {tags && (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {tags}
      </div>
    )}
  </div>
);

export default CardTitleRow;
