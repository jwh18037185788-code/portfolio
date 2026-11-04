import React from 'react';
import { Popover, Tooltip } from 'antd';
import { FireOutlined, ShoppingOutlined } from '@ant-design/icons';
import type { ProfileFieldDto } from '@/types/bdTask';
import { MT } from '../theme';
import { DARK_POPOVER_COLOR, DARK_POPOVER_INNER_STYLE, DARK_TABLE_STYLE, darkTableCellStyle, darkTableHeaderStyle, wrapDarkTableText } from './darkPopoverTableStyle';

export interface ParsedProductItem {
  name: string;
  spuId: string;
  orderCount: string;
}

export interface ParseResult {
  items: ParsedProductItem[];
  success: boolean;
  rawText: string;
}

/**
 * 解析商品拼接文本。
 * 每个商品格式为：商品名称(商品ID,近7日单量单)，商品之间使用顿号分隔。
 */
function parseProductInfoText(rawText?: string): ParseResult {
  if (!rawText || !rawText.trim()) {
    return { items: [], success: false, rawText: '' };
  }

  const trimmed = rawText.trim();
  const rawSegments = trimmed.split('、').map(s => s.trim()).filter(Boolean);
  const itemRegex = /^(.*)\((\d+),\s*近7日(\d+)单\)$/;
  const items: ParsedProductItem[] = [];

  for (const segment of rawSegments) {
    const match = segment.match(itemRegex);
    if (!match) {
      return { items: [], success: false, rawText: trimmed };
    }

    const [, name, spuId, orderCount] = match;
    items.push({ name: name.trim(), spuId: spuId.trim(), orderCount: orderCount.trim() });
  }

  return { items, success: true, rawText: trimmed };
}

export interface SqsProductInfoProps {
  fields?: ProfileFieldDto[];
  /** 普通元信息文字色；任务详情页用于统一卡片内信息层级。 */
  textColor?: string;
}

interface ProductSectionProps {
  label: string;
  description: string;
  parseResult: ParseResult;
  showCount?: boolean;
  icon: React.ReactNode;
  textColor?: string;
}

const ProductListContent: React.FC<{ items: ParsedProductItem[] }> = ({ items }) => (
  <div style={{ maxWidth: 'calc(100vw - 48px)', maxHeight: 360, overflow: 'auto', color: '#fff', fontSize: 12 }}>
    <table style={{ ...DARK_TABLE_STYLE, width: 'max-content', tableLayout: 'auto' }}>
      <thead>
        <tr>
          <th style={darkTableHeaderStyle(0)}>商品名称</th>
          <th style={darkTableHeaderStyle(1)}>商品 ID</th>
          <th style={darkTableHeaderStyle(2)}>近7日单量</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.spuId}-${index}`}>
            <td title={item.name} style={darkTableCellStyle(0, 'body', index === 0, index === items.length - 1)}>{wrapDarkTableText(item.name)}</td>
            <td style={darkTableCellStyle(1, 'body', index === 0, index === items.length - 1)}>{wrapDarkTableText(item.spuId)}</td>
            <td style={darkTableCellStyle(2, 'body', index === 0, index === items.length - 1)}>{wrapDarkTableText(`${item.orderCount}单`)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ProductList: React.FC<{ items: ParsedProductItem[] }> = ({ items }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, lineHeight: '12px' }}>
    <Popover
      trigger="click"
      placement="topLeft"
      color={DARK_POPOVER_COLOR}
      content={<ProductListContent items={items} />}
      overlayInnerStyle={DARK_POPOVER_INNER_STYLE}
    >
        <button
          type="button"
          title="点击查看商品详情"
          style={{
            flexShrink: 0,
            marginLeft: 4,
            padding: 0,
            border: 0,
            background: 'none',
            color: MT.brandPrimary,
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: '12px',
          }}
        >
          查看详情
        </button>
    </Popover>
  </div>
);

const ProductSection: React.FC<ProductSectionProps> = ({ label, description, parseResult, showCount = false, icon, textColor }) => {
  const countText = parseResult.success ? `共${parseResult.items.length}个` : '暂无数据';
  const metadataColor = textColor ?? MT.textMuted;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, fontSize: 12, lineHeight: '12px', color: metadataColor }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, marginRight: 6, lineHeight: '12px', color: metadataColor }}>
        {icon}
      </span>
      <span style={{ flexShrink: 0, lineHeight: '12px', color: metadataColor }}>{label}</span>
      <Tooltip title={description} placement="top">
        <span style={{ display: 'inline-flex', width: 12, height: 12, boxSizing: 'border-box', alignItems: 'center', justifyContent: 'center', marginLeft: 3, border: `1px solid ${metadataColor}`, borderRadius: '50%', color: metadataColor, cursor: 'help', fontFamily: 'Arial, sans-serif', fontSize: 8, fontWeight: 400, lineHeight: '10px', verticalAlign: 'middle' }}>?</span>
      </Tooltip>
      <span style={{ flexShrink: 0, marginLeft: 3, color: metadataColor }}>：</span>
      {showCount && (
        <span style={{ display: 'inline-block', flexShrink: 0, marginLeft: 3, lineHeight: '12px', color: metadataColor }}>
          {countText}
        </span>
      )}
      {parseResult.success ? (
        <ProductList items={parseResult.items} />
      ) : (
        <span
          title={parseResult.rawText}
          style={{ maxWidth: 180, marginLeft: 8, lineHeight: '12px', color: metadataColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {parseResult.rawText}
        </span>
      )}
    </div>
  );
};

const SqsProductInfo: React.FC<SqsProductInfoProps> = ({ fields, textColor }) => {
  const onSaleField = fields?.find(field => field.key === 'onSaleSpuInfo');
  const hotField = fields?.find(field => field.key === 'hotSpuInfo');
  const onSaleParse = parseProductInfoText(onSaleField?.value);
  const hotParse = parseProductInfoText(hotField?.value);
  const hasOnSale = Boolean(onSaleField?.value?.trim());
  const hasHot = Boolean(hotField?.value?.trim());

  if (!hasOnSale && !hasHot) return null;

  return (
    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', fontSize: 12, lineHeight: 1, color: MT.textMuted }}>
      {hasOnSale && (
        <ProductSection
          label="在售神抢手商品"
          description="昨日在线的一口价 SPU 商品"
          parseResult={onSaleParse}
          showCount
          icon={<ShoppingOutlined style={{ fontSize: 12, color: textColor ?? MT.textMuted, verticalAlign: 'middle' }} />}
          textColor={textColor}
        />
      )}
      {hasHot && (
        <ProductSection
          label="主站热销商品"
          description="近 7 日主站销量非神抢手 SPU 前 4 名"
          parseResult={hotParse}
          icon={<FireOutlined style={{ fontSize: 12, color: textColor ?? MT.textMuted, verticalAlign: 'middle' }} />}
          textColor={textColor}
        />
      )}
    </div>
  );
};

export default SqsProductInfo;
