import { SystemData, Attachment } from './common.model';

export type ActorType = 'PlayerCharacter' | 'NonPlayerCharacter';

export const ACTOR_TYPES: readonly ActorType[] = ['PlayerCharacter', 'NonPlayerCharacter'];

/** Entity family a tag belongs to. Tags are never shared across families. */
export type TagCategory = 'Actor' | 'Rule' | 'Location' | 'Note' | 'Counter';

export const TAG_CATEGORIES: readonly TagCategory[] = [
  'Actor',
  'Rule',
  'Location',
  'Note',
  'Counter',
];

export interface Tag {
  id: string;
  campaignId: string;
  name: string;
  colorHex: string;
  category: TagCategory;
}

export interface Actor {
  id: string;
  campaignId: string;
  type: ActorType;
  name: string;
  notes: string;
  /** Portrait/icon URI shown on cards, grids and encounter rows. */
  imageUri: string;
  /** Icon id (`ra:*` / `lu:*`) used when no image has been uploaded. */
  iconId?: string;
  systemData: SystemData;
  resources?: Resource[];
  tags?: Tag[];
  attachments?: Attachment[];
  /** Rules linked to this actor (abilities, traits, tactics, …). */
  ruleLinks?: ActorRuleLink[];
  /** Resource ids the GM chose to surface in the encounter tracker (empty = all). */
  encounterResourceIds?: string[];
}

/** A rule linked to an actor. */
export interface ActorRuleLink {
  id: string;
  actorId: string;
  ruleId: string;
  sortOrder: number;
  rule?: RuleSummary;
}

/** Minimal rule shape returned on an actor's rule links. */
export interface RuleSummary {
  id: string;
  title: string;
  content: string;
  iconId?: string;
  imageUri?: string;
}

export interface Resource {
  id: string;
  actorId: string;
  nome: string;
  currentValue: number;
  maxValue: number;
  colorHwx: string;
  systemData: SystemData;
}

export function actorTypeLabel(type: ActorType): string {
  return type === 'PlayerCharacter' ? 'Player Character' : 'NPC';
}

/** Percentage filled for a resource bar, clamped to 0–100. */
export function resourcePercent(resource: Resource): number {
  if (!resource.maxValue) return 0;
  return Math.max(0, Math.min(100, Math.round((resource.currentValue / resource.maxValue) * 100)));
}
