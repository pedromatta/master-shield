import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

/** A user as returned by the API. The password hash is never sent to clients. */
export interface UserSummary {
  id: string;
  username: string;
  email: string;
  displayName: string;
}

export interface CreateUserRequest {
  username: string;
  email?: string;
  password: string;
  displayName?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  displayName?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  list(): Promise<UserSummary[]> {
    return firstValueFrom(this.http.get<UserSummary[]>(this.baseUrl));
  }

  getById(id: string): Promise<UserSummary> {
    return firstValueFrom(this.http.get<UserSummary>(`${this.baseUrl}/${id}`));
  }

  create(request: CreateUserRequest): Promise<UserSummary> {
    return firstValueFrom(this.http.post<UserSummary>(this.baseUrl, request));
  }

  update(id: string, request: UpdateUserRequest): Promise<UserSummary> {
    return firstValueFrom(this.http.put<UserSummary>(`${this.baseUrl}/${id}`, request));
  }

  changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`${this.baseUrl}/${id}/password`, { currentPassword, newPassword }),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
