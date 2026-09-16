import { SystemData, Attachment } from './common.model';
import { Tag } from './actor.model';

export interface Note {
  id: string;
  title: string;
  content: string;
  noteCategoryId: string | null;
  campaignId: string | null;
  sessionId: string | null;
  locationId: string | null;
  tags: Tag[];
  attachments: Attachment[];
}

export interface NoteCategory {
  id: string;
  campaignId: string;
  name: string;
  /** Uploaded icon under wwwroot. Empty until the GM uploads one. */
  iconUri: string;
  /** Fallback glyph shown when no icon image has been uploaded. */
  icon: string;
  sortOrder: number;
}

export interface Location {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  imageUri: string;
  tags: Tag[];
  attachments: Attachment[];
}

export interface Counter {
  id: string;
  campaignId: string;
  name: string;
  /** Total boxes to tick. */
  boxes: number;
  /** Boxes currently ticked. */
  currentValue: number;
  maxValue: number | null;
  colorHex: string;
}

export interface Rule {
  id: string;
  ruleCategoryId: string;
  title: string;
  content: string;
  /** Icon id (`ra:*` / `lu:*`) used when no image has been uploaded. */
  iconId?: string;
  /** Optional uploaded image that takes precedence over the icon. */
  imageUri?: string;
  systemData: SystemData;
  tags: Tag[];
  attachments: Attachment[];
}

export interface RuleCategory {
  id: string;
  campaignId: string;
  name: string;
  /** Uploaded icon under wwwroot. Empty until the GM uploads one. */
  iconUri: string;
  /** Fallback glyph shown when no icon image has been uploaded. */
  icon: string;
  sortOrder: number;
  showInToolbar: boolean;
  rules: Rule[];
}

/** Entity kinds a blueprint can govern. */
export const BLUEPRINT_KINDS = ['Actor', 'Rule', 'Location', 'Note'] as const;
export type BlueprintKind = (typeof BLUEPRINT_KINDS)[number];

/** A resource a blueprint seeds onto new actors. */
export interface BlueprintResource {
  nome: string;
  maxValue: number;
  currentValue: number;
  colorHwx: string;
  showInOverview: boolean;
}

/** A game-specific attribute a blueprint seeds into SystemData. */
export interface BlueprintAttribute {
  key: string;
  /** `text` | `number` | `boolean`. */
  type: string;
  defaultValue: string;
  showInOverview: boolean;
}

/**
 * A blueprint dictates how every new entity of its kind is created in a game system: the
 * resources actors start with, the game-specific attributes, which of those show on the
 * overview, and the default rule/note categories the system expects.
 */
export interface SystemBlueprint {
  id: string;
  gameSystemId: string;
  kind: BlueprintKind;
  /** Actor sub-type for Actor blueprints; empty applies to both. */
  actorType: string;
  name: string;
  resources: BlueprintResource[];
  attributes: BlueprintAttribute[];
  ruleCategories: string[];
  noteCategories: string[];
}
