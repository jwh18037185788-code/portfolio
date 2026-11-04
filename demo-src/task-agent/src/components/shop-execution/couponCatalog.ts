import type { ExecutionAbilityDto, ExecutionAbilityListDto } from './types';

/** 后端合并后直接使用 ID 1 的名称和配置；旧目录仍兼容合并展示。 */
export function normalizeCouponCatalog(catalog: ExecutionAbilityListDto): ExecutionAbilityListDto {
  const hasLegacyAbilities = [...catalog.recommendedAbilities,
    ...catalog.abilityGroups.flatMap(group => group.abilities)].some(ability => [2, 3, 4].includes(ability.id));
  if (!hasLegacyAbilities) return catalog;
  const normalize = (abilities: ExecutionAbilityDto[]): ExecutionAbilityDto[] => {
    const groups = new Map<number, ExecutionAbilityDto[]>();
    const others = abilities.filter(ability => {
      if (![1, 2, 3, 4].includes(ability.id)) return true;
      groups.set(ability.contactObjectType, [...(groups.get(ability.contactObjectType) ?? []), ability]);
      return false;
    });
    return [...others, ...[...groups.values()].map(items => {
      const first = [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)[0];
      return { ...first, id: 1, name: '新阶梯-日常神券（升级）',
        supportsBatchExecution: items.every(item => item.supportsBatchExecution) };
    })];
  };
  return {
    recommendedAbilities: normalize(catalog.recommendedAbilities),
    abilityGroups: catalog.abilityGroups.map(group => ({ ...group, abilities: normalize(group.abilities) })),
  };
}
