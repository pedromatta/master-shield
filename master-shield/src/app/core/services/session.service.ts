import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Session } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/sessions`;

  listByCampaign(campaignId: string): Promise<Session[]> {
    return firstValueFrom(this.http.get<Session[]>(`${this.baseUrl}/campaign/${campaignId}`));
  }

  getById(id: string): Promise<Session> {
    return firstValueFrom(this.http.get<Session>(`${this.baseUrl}/${id}`));
  }

  create(session: Partial<Session> & Pick<Session, 'campaignId' | 'title'>): Promise<Session> {
    return firstValueFrom(this.http.post<Session>(this.baseUrl, session));
  }

  update(session: Session): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl}/${session.id}`, session));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
