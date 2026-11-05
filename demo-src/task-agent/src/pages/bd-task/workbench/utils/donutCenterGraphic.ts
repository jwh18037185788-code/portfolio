import { MT } from '../../theme';

/** 到期风险与业务类型环形图共用字体和固定文字间距，不随图表高度拉大。 */
export function donutCenterGraphic(value: string, label: string, chartHeight: number, raiseGroupingComma = false) {
  const numberStyle = { text: value, textAlign: 'center', fill: MT.brandPrimary, fontSize: 25, fontWeight: 700 };
  const hasRaisedComma = raiseGroupingComma && value.includes(',');
  const groupedNumberStyle = hasRaisedComma ? {
    ...numberStyle,
    text: value.replace(/,/g, '{comma|,}'),
    // Raise only the comma without changing the line height or digit baseline.
    rich: { comma: { padding: [-2, 0, 2, 0] } },
  } : numberStyle;
  return [
    // Compensate for the different baseline used by ECharts rich text.
    { type: 'text', left: 'center', top: chartHeight / 2 - (hasRaisedComma ? 26.2 : 24.2), style: groupedNumberStyle },
    { type: 'text', left: 'center', top: chartHeight / 2 + 8.8,
      style: { text: label, textAlign: 'center', fill: MT.textTertiary, fontSize: 12, fontWeight: 600 } },
  ];
}
