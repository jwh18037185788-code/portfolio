import type { ExecutionAbilityDto, ExecutionAbilityListDto } from './types';

export const BATCH_EXECUTION_UNSUPPORTED_MESSAGE = '不支持批量执行，请前往任务详情页依次执行各商家任务';

/** 只展示服务端启用且前端已实现的能力，名称及顺序均以服务端为准。 */
export function resolveExecutionAbilities<T extends { id: number }>(
  catalog: readonly ExecutionAbilityDto[], implementations: readonly T[], contactObjectType: number,
  batchExecution = false,
  unsupportedBatchMessage = BATCH_EXECUTION_UNSUPPORTED_MESSAGE,
): (T & { title: string; disabledReason?: string })[] {
  const byId = new Map(implementations.map(ability => [ability.id, ability]));
  const seen = new Set<number>();
  return [...catalog]
    .filter(ability => ability.contactObjectType === contactObjectType)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .flatMap(ability => {
      const implementation = byId.get(ability.id);
      if (!implementation || seen.has(ability.id)) return [];
      seen.add(ability.id);
      return [{
        ...implementation,
        title: ability.name,
        ...(batchExecution && !ability.supportsBatchExecution
          ? { disabledReason: unsupportedBatchMessage } : {}),
      }];
    });
}

export function parseExecutionAbilityList(data: unknown): ExecutionAbilityListDto {
  const validAbility = (value: any) => value && Number.isSafeInteger(value.id) && value.id > 0
    && typeof value.name === 'string' && value.name.trim()
    && Number.isInteger(value.contactObjectType) && Number.isInteger(value.sortOrder)
    && typeof value.supportsBatchExecution === 'boolean' && typeof value.abilityType === 'string';
  const value = data as ExecutionAbilityListDto | undefined;
  if (!value || !Array.isArray(value.recommendedAbilities) || !Array.isArray(value.abilityGroups)
    || !value.recommendedAbilities.every(validAbility)
    || !value.abilityGroups.every(group => group && typeof group.abilityType === 'string'
      && Array.isArray(group.abilities) && group.abilities.every(ability => validAbility(ability)
        && ability.abilityType === group.abilityType))) {
    throw new Error('接口未返回有效的执行能力列表，请重试');
  }
  return value;
}

export function resolveExecutionSections<T extends { id: number }>(
  catalog: ExecutionAbilityListDto, implementations: readonly T[], contactObjectType: number,
  batchExecution = false, unsupportedBatchMessage = BATCH_EXECUTION_UNSUPPORTED_MESSAGE,
) {
  // 推荐和其他能力统一使用后端能力目录的 sortOrder，不对特定能力置顶。
  const recommendedAbilities = resolveExecutionAbilities(catalog.recommendedAbilities, implementations,
    contactObjectType, batchExecution, unsupportedBatchMessage);
  const seen = new Set(recommendedAbilities.map(ability => ability.id));
  const mergedGroups = new Map<string, ExecutionAbilityDto[]>();
  catalog.abilityGroups.forEach(group => mergedGroups.set(group.abilityType,
    [...(mergedGroups.get(group.abilityType) ?? []), ...group.abilities]));
  // 后端按能力目录排序后分组，沿用其分组顺序。
  const abilityGroups = [...mergedGroups].map(([abilityType, items]) => ({
    abilityType,
    abilities: resolveExecutionAbilities(items, implementations, contactObjectType, batchExecution,
      unsupportedBatchMessage).filter(ability => {
      if (seen.has(ability.id)) return false;
      seen.add(ability.id);
      return true;
    }),
  })).filter(group => group.abilities.length > 0);
  return { recommendedAbilities, abilityGroups };
}
