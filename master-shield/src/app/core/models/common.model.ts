/**
 * Opaque, game-system specific payload. The backend persists these as JSON columns,
 * so values are only known at runtime.
 */
export type SystemData = Record<string, unknown>;
export type TemporaryEffects = Record<string, unknown>;

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface GameSystem {
  id: string;
  name: string;
  version: string;
  blueprints?: import('./content.model').SystemBlueprint[];
  templates?: SystemEntityTemplate[];
}

/** Kinds of ready-made content a game system can ship. */
export type TemplateKind = 'Actor' | 'Location' | 'Rule' | 'Note';

export const TEMPLATE_KINDS: readonly TemplateKind[] = ['Actor', 'Location', 'Rule', 'Note'];

/** A resource bar declared by an actor template. */
export interface TemplateResource {
  nome: string;
  currentValue: number;
  maxValue: number;
  colorHwx: string;
}

/**
 * A ready-made entity belonging to a game system. The GM authors these once and copies
 * them into any campaign that adopts the system.
 */
export interface SystemEntityTemplate {
  id: string;
  gameSystemId: string;
  kind: TemplateKind;
  name: string;
  description: string;
  imageUri: string;
  /** Actor type, or the rule/note category name. */
  category: string;
  sortOrder: number;
  resources: TemplateResource[];
  systemData: SystemData;
}

/** Counts returned when a system's templates are seeded into a campaign. */
export interface SystemSeedResult {
  actors: number;
  locations: number;
  rules: number;
  notes: number;
  total: number;
}

/** Portable document produced by the game-system export endpoint. */
export interface GameSystemExport {
  name: string;
  version: string | null;
  blueprints: {
    kind: string;
    actorType: string | null;
    name: string;
    resources: import('./content.model').BlueprintResource[];
    attributes: import('./content.model').BlueprintAttribute[];
    ruleCategories: string[];
    noteCategories: string[];
  }[];
  templates: {
    kind: string;
    name: string;
    description: string | null;
    imageUri: string | null;
    category: string | null;
    sortOrder: number;
    resources: TemplateResource[];
    systemData: SystemData;
  }[];
}

/** A file attached to an actor, rule, location or note. */
export interface Attachment {
  id: string;
  fileName: string;
  fileUri: string;
  contentType: string;
  sizeInBytes: number;
}

export type AttachmentOwner = 'actor' | 'rule' | 'location' | 'note';
