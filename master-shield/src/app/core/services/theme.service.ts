import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

/** The GM's personal theme overrides; null fields fall back to the built-in defaults. */
export interface ThemeSettings {
  accent: string | null;
  danger: string | null;
  success: string | null;
  fontBody: string | null;
  fontDisplay: string | null;
  backgroundUri: string | null;
}

/** Theme fields as the API names them on the account payload. */
export interface ApiThemeFields {
  themeAccent?: string | null;
  themeDanger?: string | null;
  themeSuccess?: string | null;
  themeFontBody?: string | null;
  themeFontDisplay?: string | null;
  themeBackgroundUri?: string | null;
}

/**
 * Applies the signed-in GM's personal theme by overriding the CSS custom properties that the
 * whole UI already reads from `styles.css`. Nothing else needs to know about theming: writing
 * the variables on the document root re-skins every component at once.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth/theme`;

  private readonly _settings = signal<ThemeSettings>({
    accent: null,
    danger: null,
    success: null,
    fontBody: null,
    fontDisplay: null,
    backgroundUri: null,
  });

  readonly settings = this._settings.asReadonly();

  /** Adopts the theme reported on the signed-in account. */
  applyFrom(user: ApiThemeFields | null): void {
    const next: ThemeSettings = {
      accent: user?.themeAccent ?? null,
      danger: user?.themeDanger ?? null,
      success: user?.themeSuccess ?? null,
      fontBody: user?.themeFontBody ?? null,
      fontDisplay: user?.themeFontDisplay ?? null,
      backgroundUri: user?.themeBackgroundUri ?? null,
    };
    this._settings.set(next);
    this.write(next);
  }

  /** Saves a partial theme change and re-applies it immediately. */
  async save(patch: Partial<ThemeSettings>): Promise<void> {
    await firstValueFrom(this.http.put<void>(this.base, patch));
    const next = { ...this._settings(), ...patch };
    this._settings.set(next);
    this.write(next);
  }

  /** Uploads a background image and applies the returned URI. */
  async uploadBackground(file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file, file.name);
    const user = await firstValueFrom(
      this.http.post<ApiThemeFields>(`${this.base}/background`, form),
    );
    this.applyFrom(user);
  }

  /** Removes every override, returning to the built-in theme. */
  async reset(): Promise<void> {
    await this.save({
      accent: '',
      danger: '',
      success: '',
      fontBody: '',
      fontDisplay: '',
      backgroundUri: '',
    });
  }

  /** Writes the overrides (or clears them) on the document root as CSS variables. */
  private write(settings: ThemeSettings): void {
    const root = globalThis.document?.documentElement;
    if (!root) return;

    setVar(root, '--color-sky-500', settings.accent);
    setVar(root, '--color-sky-600', settings.accent);
    setVar(root, '--color-rose-500', settings.danger);
    setVar(root, '--color-rose-600', settings.danger);
    setVar(root, '--color-emerald-500', settings.success);
    setVar(root, '--font-serif', settings.fontBody);
    setVar(root, '--font-display', settings.fontDisplay);

    if (settings.backgroundUri) {
      root.style.setProperty('--app-background-image', `url("${settings.backgroundUri}")`);
    } else {
      root.style.removeProperty('--app-background-image');
    }
  }
}

function setVar(root: HTMLElement, name: string, value: string | null): void {
  if (value) {
    root.style.setProperty(name, value);
  } else {
    root.style.removeProperty(name);
  }
}
