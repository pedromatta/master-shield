import { TemporaryEffects } from './common.model';
import { Actor } from './actor.model';

export interface EncounterParticipant {
  id: string;
  encounterId: string;
  actorId: string;
  initiative: number;
  temporaryHpOffset: number;
  isHiden: boolean;
  temporaryEffects: TemporaryEffects;
  /** NPC-only isolated resource values, keyed by resource id. */
  resourceOverrides?: Record<string, number>;
  actor?: Actor;
}

export interface Encounter {
  id: string;
  sessionId: string;
  name: string;
  isActive: boolean;
  currentRound: number;
  participants: EncounterParticipant[];
}

export interface AddParticipantRequest {
  actorId: string;
  initiative: number;
  temporaryHpOffset: number;
}

export interface ParticipantStateRequest {
  temporaryHpOffset: number;
  temporaryEffects: TemporaryEffects;
}
