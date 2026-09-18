import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Campaign, CampaignContentExport, CampaignCreate } from '../models/campaign.model';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/campaigns`;

  list(): Promise<Campaign[]> {
    return firstValueFrom(this.http.get<Campaign[]>(this.baseUrl));
  }

  getById(id: string): Promise<Campaign> {
    return firstValueFrom(this.http.get<Campaign>(`${this.baseUrl}/${id}`));
  }

  create(campaign: CampaignCreate): Promise<Campaign> {
    return firstValueFrom(this.http.post<Campaign>(this.baseUrl, campaign));
  }

  update(campaign: Campaign): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl}/${campaign.id}`, campaign));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }

  /** Downloads the campaign's authored content as a portable document. */
  exportContent(campaignId: string): Promise<CampaignContentExport> {
    return firstValueFrom(
      this.http.get<CampaignContentExport>(`${this.baseUrl}/${campaignId}/content/export`),
    );
  }

  /** Creates real entities in the campaign from a previously exported document. */
  importContent(campaignId: string, document: CampaignContentExport): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/${campaignId}/content/import`, document),
    );
  }

  /** Captures the campaign's content into a game system as reusable templates. */
  captureToSystem(campaignId: string, gameSystemId: string): Promise<unknown[]> {
    return firstValueFrom(
      this.http.post<unknown[]>(
        `${this.baseUrl}/${campaignId}/content/capture-to-system/${gameSystemId}`,
        null,
      ),
    );
  }
}
