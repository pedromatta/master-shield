import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Actor, Resource } from '../models/actor.model';
import { SystemData } from '../models/common.model';

@Injectable({ providedIn: 'root' })
export class ActorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/actors`;

  listByCampaign(campaignId: string): Promise<Actor[]> {
    return firstValueFrom(this.http.get<Actor[]>(`${this.baseUrl}/campaign/${campaignId}`));
  }

  getById(id: string): Promise<Actor> {
    return firstValueFrom(this.http.get<Actor>(`${this.baseUrl}/${id}`));
  }

  create(actor: Partial<Actor> & Pick<Actor, 'name' | 'campaignId'>): Promise<Actor> {
    return firstValueFrom(this.http.post<Actor>(this.baseUrl, actor));
  }

  update(actor: Actor): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl}/${actor.id}`, actor));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }

  updateSystemData(id: string, systemData: SystemData): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl}/${id}/system-data`, systemData));
  }

  setTags(actorId: string, tagIds: string[]): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl}/${actorId}/tags`, tagIds));
  }

  /** Replaces the rules linked to an actor. */
  setRules(actorId: string, ruleIds: string[]): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl}/${actorId}/rules`, ruleIds));
  }

  addResource(actorId: string, resource: Partial<Resource>): Promise<Resource> {
    return firstValueFrom(
      this.http.post<Resource>(`${this.baseUrl}/${actorId}/resources`, resource),
    );
  }

  updateResource(actorId: string, resource: Resource): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`${this.baseUrl}/${actorId}/resources/${resource.id}`, resource),
    );
  }

  deleteResource(actorId: string, resourceId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${actorId}/resources/${resourceId}`),
    );
  }
}
