import { SystemData } from './common.model';

export type BlueprintTargetEntity = 'Actor' | 'Rule' | 'Resource';

export interface SystemBlueprint {
  id: string;
  gameSystemId: string;
  targetEntity: string;
  name: string;
  defaultPayload: SystemData;
  gameSystem?: { id: string; name: string; version: string } | null;
}
