import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GameSystem,
  GameSystemExport,
  SystemEntityTemplate,
  SystemSeedResult,
} from '../models/common.model';

@Injectable({ providedIn: 'root' })
export class GameSystemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/game-systems`;

  list(): Promise<GameSystem[]> {
    return firstValueFrom(this.http.get<GameSystem[]>(this.baseUrl));
  }

  getById(id: string): Promise<GameSystem> {
    return firstValueFrom(this.http.get<GameSystem>(`${this.baseUrl}/${id}`));
  }

  create(system: Pick<GameSystem, 'name' | 'version'>): Promise<GameSystem> {
    return firstValueFrom(this.http.post<GameSystem>(this.baseUrl, system));
  }

  update(system: GameSystem): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl}/${system.id}`, system));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }

  /** Downloads a portable document describing the system and its blueprints. */
  export(id: string): Promise<GameSystemExport> {
    return firstValueFrom(this.http.get<GameSystemExport>(`${this.baseUrl}/${id}/export`));
  }

  /** Creates a new system (and its blueprints) from an exported document. */
  import(document: GameSystemExport): Promise<GameSystem> {
    return firstValueFrom(this.http.post<GameSystem>(`${this.baseUrl}/import`, document));
  }

  // ---- Ready-made system entities -------------------------------------------

  /** Lists the actors/locations/rules/notes a system ships with. */
  listEntities(gameSystemId: string, kind?: string): Promise<SystemEntityTemplate[]> {
    const params = kind ? new HttpParams().set('kind', kind) : undefined;
    return firstValueFrom(
      this.http.get<SystemEntityTemplate[]>(`${this.baseUrl}/${gameSystemId}/entities`, { params }),
    );
  }

  createEntity(
    gameSystemId: string,
    template: Partial<SystemEntityTemplate>,
  ): Promise<SystemEntityTemplate> {
    return firstValueFrom(
      this.http.post<SystemEntityTemplate>(`${this.baseUrl}/${gameSystemId}/entities`, template),
    );
  }

  updateEntity(
    gameSystemId: string,
    template: SystemEntityTemplate,
  ): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`${this.baseUrl}/${gameSystemId}/entities/${template.id}`, template),
    );
  }

  deleteEntity(gameSystemId: string, templateId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${gameSystemId}/entities/${templateId}`),
    );
  }

  /** Uploads an image for a system entity and returns the stored URI. */
  async uploadEntityImage(
    gameSystemId: string,
    templateId: string,
    file: File,
  ): Promise<string> {
    const form = new FormData();
    form.append('file', file, file.name);
    const response = await firstValueFrom(
      this.http.post<{ imageUri: string }>(
        `${this.baseUrl}/${gameSystemId}/entities/${templateId}/image`,
        form,
      ),
    );
    return response.imageUri;
  }

  /** Bulk-creates entities, used by the import-a-list flow. */
  importEntities(
    gameSystemId: string,
    templates: Partial<SystemEntityTemplate>[],
  ): Promise<SystemEntityTemplate[]> {
    return firstValueFrom(
      this.http.post<SystemEntityTemplate[]>(
        `${this.baseUrl}/${gameSystemId}/entities/import`,
        templates,
      ),
    );
  }

  /** Seeds a campaign with the system's entities (all of them when ids is omitted). */
  applyToCampaign(
    gameSystemId: string,
    campaignId: string,
    templateIds?: string[],
  ): Promise<SystemSeedResult> {
    const params = new HttpParams().set('campaignId', campaignId);
    return firstValueFrom(
      this.http.post<SystemSeedResult>(
        `${this.baseUrl}/${gameSystemId}/entities/apply`,
        templateIds ?? null,
        { params },
      ),
    );
  }

  /** Captures existing campaign content into a system as reusable templates. */
  captureFromCampaign(
    gameSystemId: string,
    campaignId: string,
    entityIds?: string[],
  ): Promise<SystemEntityTemplate[]> {
    const params = new HttpParams().set('campaignId', campaignId);
    return firstValueFrom(
      this.http.post<SystemEntityTemplate[]>(
        `${this.baseUrl}/${gameSystemId}/entities/capture`,
        entityIds ?? null,
        { params },
      ),
    );
  }
}
