import { MT } from '../../theme';

/** 到期风险与业务类型环形图共用字体和固定文字间距，不随图表高度拉大。 */
export function donutCenterGraphic(value: string, label: string, chartHeight: number) {
  return [
    { type: 'text', left: 'center', top: chartHeight / 2 - 24.2,
      style: { text: value, textAlign: 'center', fill: MT.brandPrimary, fontSize: 25, fontWeight: 700 } },
    { type: 'text', left: 'center', top: chartHeight / 2 + 8.8,
      style: { text: label, textAlign: 'center', fill: MT.textTertiary, fontSize: 12, fontWeight: 600 } },
  ];
}
