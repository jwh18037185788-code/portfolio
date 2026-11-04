/** 数值型 ID 搜索允许清空；非空值必须可无精度损失地转换为请求中的 number。 */
export function isValidNumericIdSearch(value?: string): boolean {
  const id = value?.trim() ?? '';
  return id === '' || (/^\d+$/.test(id) && Number.isSafeInteger(Number(id)));
}
