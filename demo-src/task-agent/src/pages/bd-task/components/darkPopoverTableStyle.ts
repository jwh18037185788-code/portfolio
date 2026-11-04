import type { CSSProperties } from 'react';

export const DARK_POPOVER_COLOR = '#1f1f1f';
const DIVIDER_COLOR = '#5A5A5A';
const MAX_LINE_CHARACTERS = 30;
export const DARK_TABLE_MAX_CELL_WIDTH = 'calc(30em + 44px)';
const DIVIDED_CELL_MAX_WIDTH = 'calc(30em + 57px)';

/** 按 Unicode 字符截行，保留原始换行；列宽仍由实际内容决定。 */
export function wrapDarkTableText(value: string): string {
  return value.split(/\r?\n/).map(line => {
    const characters = Array.from(line);
    const chunks: string[] = [];
    for (let index = 0; index < characters.length; index += MAX_LINE_CHARACTERS) {
      chunks.push(characters.slice(index, index + MAX_LINE_CHARACTERS).join(''));
    }
    return chunks.join('\n');
  }).join('\n');
}

export const DARK_POPOVER_INNER_STYLE: CSSProperties = {
  background: DARK_POPOVER_COLOR,
  color: '#fff',
  padding: '8px 18px 14px',
};

export const DARK_TABLE_STYLE: CSSProperties = {
  borderCollapse: 'separate',
  borderSpacing: 0,
  lineHeight: '24px',
  paddingLeft: 0,
};

/** 竖线仅在横线两侧断开，起止点比所在分区的文字各多 4px。 */
export function darkTableCellStyle(index: number, section: 'header' | 'body', startsBody = false, endsBody = false): CSSProperties {
  // 竖线绘制在单元格内部，占去 1px；多留 1px 才能保证线右缘到文字为 12px。
  const leftPadding = index ? 13 : 0;
  return {
    padding: section === 'header' ? `0 44px 1.5px ${leftPadding}px` : `${startsBody ? 8.5 : 0}px 44px ${endsBody ? 0.5 : 0}px ${leftPadding}px`,
    maxWidth: index ? DIVIDED_CELL_MAX_WIDTH : DARK_TABLE_MAX_CELL_WIDTH,
    lineHeight: section === 'body' ? '21.5px' : undefined,
    textAlign: 'left',
    verticalAlign: 'top',
    backgroundImage: index ? `linear-gradient(${DIVIDER_COLOR}, ${DIVIDER_COLOR})` : undefined,
    backgroundSize: index ? (section === 'header' ? '1px 22.5px' : startsBody ? '1px calc(100% - 8px)' : '1px 100%') : undefined,
    backgroundPosition: index ? (section === 'header' ? 'left 6px' : startsBody ? 'left bottom' : 'left top') : undefined,
    backgroundRepeat: 'no-repeat',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  };
}

export function darkTableHeaderStyle(index: number): CSSProperties {
  return {
    ...darkTableCellStyle(index, 'header'),
    lineHeight: '35px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 500,
    borderBottom: `1px solid ${DIVIDER_COLOR}`,
  };
}
