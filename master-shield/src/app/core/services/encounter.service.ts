import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AddParticipantRequest,
  Encounter,
  EncounterParticipant,
  ParticipantStateRequest,
} from '../models/encounter.model';
import { TemporaryEffects } from '../models/common.model';

@Injectable({ providedIn: 'root' })
export class EncounterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/encounters`;

  listBySession(sessionId: string): Promise<Encounter[]> {
    return firstValueFrom(this.http.get<Encounter[]>(`${this.baseUrl}/session/${sessionId}`));
  }

  getById(id: string): Promise<Encounter> {
    return firstValueFrom(this.http.get<Encounter>(`${this.baseUrl}/${id}`));
  }

  create(
    encounter: Partial<Encounter> & Pick<Encounter, 'name' | 'sessionId'>,
  ): Promise<Encounter> {
    return firstValueFrom(this.http.post<Encounter>(this.baseUrl, encounter));
  }

  update(encounter: Encounter): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl}/${encounter.id}`, encounter));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }

  addParticipant(
    encounterId: string,
    request: AddParticipantRequest,
  ): Promise<EncounterParticipant> {
    return firstValueFrom(
      this.http.post<EncounterParticipant>(`${this.baseUrl}/${encounterId}/participants`, request),
    );
  }

  updateParticipantState(
    encounterId: string,
    participantId: string,
    temporaryHpOffset: number,
    temporaryEffects: TemporaryEffects,
  ): Promise<void> {
    const body: ParticipantStateRequest = { temporaryHpOffset, temporaryEffects };
    return firstValueFrom(
      this.http.put<void>(
        `${this.baseUrl}/${encounterId}/participants/${participantId}/state`,
        body,
      ),
    );
  }

  removeParticipant(encounterId: string, participantId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${encounterId}/participants/${participantId}`),
    );
  }

  /**
   * Applies a resource change from the tracker. PCs write through to the actor; NPCs update
   * the participant's isolated copy. <paramref name="replace"/> sets an absolute value.
   */
  adjustParticipantResource(
    encounterId: string,
    participantId: string,
    resourceId: string,
    value: number,
    replace = false,
  ): Promise<void> {
    const params = new HttpParams().set('value', value).set('replace', replace);
    return firstValueFrom(
      this.http.put<void>(
        `${this.baseUrl}/${encounterId}/participants/${participantId}/resources/${resourceId}`,
        null,
        { params },
      ),
    );
  }

  /** Persists a manual initiative order after the GM drags participants around. */
  reorderParticipants(encounterId: string, participantIds: string[]): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`${this.baseUrl}/${encounterId}/participants/order`, participantIds),
    );
  }

  advanceRound(encounterId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/${encounterId}/advance-round`, {}));
  }

  /** Sets the encounter round explicitly (step back / jump to a round). */
  setRound(encounterId: string, round: number): Promise<void> {
    const params = new HttpParams().set('round', round);
    return firstValueFrom(
      this.http.put<void>(`${this.baseUrl}/${encounterId}/round`, null, { params }),
    );
  }
}
