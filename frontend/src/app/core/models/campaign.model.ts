import { SystemData } from './common.model';

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  gameSystemId: string | null;
  gameSystem?: { id: string; name: string; version: string } | null;
  systemData: SystemData;
  /** Location whose image the campaign's stable map URI currently resolves to. */
  currentMapLocationId: string | null;
}

export type CampaignCreate = Pick<Campaign, 'userId' | 'name' | 'gameSystemId' | 'systemData'>;

// ---- Portable campaign content document -------------------------------------

export interface ExportedResource {
  nome: string;
  currentValue: number;
  maxValue: number;
  colorHwx: string;
}

export interface ExportedActor {
  name: string;
  type: string;
  notes: string;
  imageUri: string;
  systemData: import('./common.model').SystemData;
  resources: ExportedResource[];
}

export interface ExportedLocation {
  name: string;
  description: string;
  imageUri: string;
}

export interface ExportedRule {
  category: string;
  title: string;
  content: string;
  systemData: import('./common.model').SystemData;
}

export interface ExportedNote {
  category: string;
  title: string;
  content: string;
}

export interface ExportedCounter {
  name: string;
  boxes: number;
  currentValue: number;
  colorHex: string;
}

/** Everything a GM authored in a campaign, serialised for backup or transfer. */
export interface CampaignContentExport {
  name: string;
  gameSystemId: string | null;
  actors: ExportedActor[];
  locations: ExportedLocation[];
  rules: ExportedRule[];
  notes: ExportedNote[];
  counters: ExportedCounter[];
}
