import type { ExecutionAbilityListDto } from './types';
/** Offline capability catalog; no network transport is included in the demo. */
export async function queryExecutionAbilities(contactObjectType: number | number[] | undefined, _tenant: number | string | null, _batch: boolean): Promise<ExecutionAbilityListDto> {
  const types = Array.isArray(contactObjectType) ? contactObjectType : [contactObjectType];
  return { recommendedAbilities: types.filter(Number.isInteger).map(type => ({ id: 9, name: '智能沟通', contactObjectType: type!, sortOrder: 1, supportsBatchExecution: true, abilityType: 'AI_OUTBOUND_TASK' })), abilityGroups: [] };
}
