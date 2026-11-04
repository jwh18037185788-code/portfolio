/** 内部组件的商家 ID 边界：先校验再转字符串，防止 null 被转换为有效文本。 */
export const collectExecutionShopIds = (values: readonly unknown[]) => {
  const shopIds = new Set<string>();
  let invalidCount = 0;
  values.forEach(value => {
    const id = typeof value === 'string' ? value.trim()
      : typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : '';
    if (!/^\d+$/.test(id) || /^0+$/.test(id)) {
      invalidCount += 1;
      return;
    }
    shopIds.add(id.replace(/^0+/, ''));
  });
  return { shopIds: Array.from(shopIds), invalidCount };
};
