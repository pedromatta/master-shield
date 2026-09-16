import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SystemBlueprint } from '../models/blueprint.model';

@Injectable({ providedIn: 'root' })
export class BlueprintService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/blueprints`;

  listByGameSystem(gameSystemId: string): Promise<SystemBlueprint[]> {
    return firstValueFrom(
      this.http.get<SystemBlueprint[]>(`${this.baseUrl}/game-system/${gameSystemId}`),
    );
  }

  getById(id: string): Promise<SystemBlueprint> {
    return firstValueFrom(this.http.get<SystemBlueprint>(`${this.baseUrl}/${id}`));
  }

  /** POST /api/blueprints/{id}/instantiate?campaignId=... — returns the created entity. */
  instantiate(id: string, campaignId: string): Promise<unknown> {
    const params = new HttpParams().set('campaignId', campaignId);
    return firstValueFrom(
      this.http.post<unknown>(`${this.baseUrl}/${id}/instantiate`, null, { params }),
    );
  }
}
