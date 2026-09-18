import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ThemeService } from './theme.service';

/** The signed-in account, as reported by the API. */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  /** Personal theme overrides (null when the built-in default applies). */
  themeAccent: string | null;
  themeSecondary: string | null;
  themeDanger: string | null;
  themeSuccess: string | null;
  themeSurfaceBase: string | null;
  themeSurfacePanel: string | null;
  themeSurfaceRaised: string | null;
  themeSurfaceInset: string | null;
  themeTextMain: string | null;
  themeTextMuted: string | null;
  themeBorderColor: string | null;
  themeFontBody: string | null;
  themeFontDisplay: string | null;
  themeBackgroundUri: string | null;
  themeBackgroundOpacity: string | null;
  themeBackgroundBlur: string | null;
  themeBackgroundFit: string | null;
  themeBackgroundPosition: string | null;
  themeBackgroundRepeat: string | null;
  themeWindowOpacity: string | null;
  themeChromeOpacity: string | null;
}

/**
 * Cookie-based authentication for the SPA. The API issues an httpOnly cookie on login, so
 * this service only tracks the current account for the UI and asks the API to confirm it on
 * startup.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly theme = inject(ThemeService);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  private readonly _user = signal<AuthUser | null>(null);
  /** False until the initial `/me` probe finishes, so guards do not bounce too early. */
  private readonly _ready = signal(false);

  readonly user = this._user.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /** Confirms any existing session cookie; call once at startup. */
  async check(): Promise<AuthUser | null> {
    try {
      const user = await firstValueFrom(this.http.get<AuthUser>(`${this.base}/me`));
      this._user.set(user);
      this.theme.applyFrom(user);
    } catch {
      this._user.set(null);
      this.theme.applyFrom(null);
    } finally {
      this._ready.set(true);
    }
    return this._user();
  }

  async login(username: string, password: string): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http.post<AuthUser>(`${this.base}/login`, { username, password }),
    );
    this._user.set(user);
    this._ready.set(true);
    this.theme.applyFrom(user);
    return user;
  }

  /** Registers a new account; the API signs it in and returns it. */
  async signUp(input: {
    username: string;
    password: string;
    email?: string;
    displayName?: string;
  }): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http.post<AuthUser>(`${this.base}/signup`, input),
    );
    this._user.set(user);
    this._ready.set(true);
    this.theme.applyFrom(user);
    return user;
  }

  /** Asks the API to email a reset link. Resolves regardless of whether the account exists. */
  forgotPassword(username: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/forgot-password`, { username }),
    );
  }

  /** Completes a password reset with a token. */
  resetPassword(username: string, token: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/reset-password`, { username, token, newPassword }),
    );
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(`${this.base}/logout`, null));
    } finally {
      this._user.set(null);
      this.theme.applyFrom(null);
    }
  }
}
