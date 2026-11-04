/** 行业门店匹配类型；筛选请求使用 matchTypes，画像返回使用 matchType。 */
export const INDUSTRY_MATCH_TYPE_OPTIONS = [
  { value: 1001, label: '美团独家' },
  { value: 1002, label: '竞对独家' },
  { value: 2001, label: '共有' },
];

export function getIndustryMatchTypeLabel(matchType?: number): string | undefined {
  return INDUSTRY_MATCH_TYPE_OPTIONS.find(option => option.value === matchType)?.label;
}
