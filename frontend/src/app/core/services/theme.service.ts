import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

/** The GM's personal theme overrides; null fields fall back to the built-in defaults. */
export interface ThemeSettings {
  accent: string | null;
  secondary: string | null;
  danger: string | null;
  success: string | null;
  surfaceBase: string | null;
  surfacePanel: string | null;
  surfaceRaised: string | null;
  surfaceInset: string | null;
  textMain: string | null;
  textMuted: string | null;
  borderColor: string | null;
  fontBody: string | null;
  fontDisplay: string | null;
  fontSizeScale: string | null;
  headingTracking: string | null;
  backgroundUri: string | null;
  backgroundOpacity: string | null;
  backgroundBlur: string | null;
  backgroundFit: string | null;
  backgroundPosition: string | null;
  backgroundRepeat: string | null;
  panelOpacity: string | null;
  windowOpacity: string | null;
  chromeOpacity: string | null;
}

/** Theme fields as the API names them on the account payload. */
export interface ApiThemeFields {
  themeAccent?: string | null;
  themeSecondary?: string | null;
  themeDanger?: string | null;
  themeSuccess?: string | null;
  themeSurfaceBase?: string | null;
  themeSurfacePanel?: string | null;
  themeSurfaceRaised?: string | null;
  themeSurfaceInset?: string | null;
  themeTextMain?: string | null;
  themeTextMuted?: string | null;
  themeBorderColor?: string | null;
  themeFontBody?: string | null;
  themeFontDisplay?: string | null;
  themeFontSizeScale?: string | null;
  themeHeadingTracking?: string | null;
  themeBackgroundUri?: string | null;
  themeBackgroundOpacity?: string | null;
  themeBackgroundBlur?: string | null;
  themeBackgroundFit?: string | null;
  themeBackgroundPosition?: string | null;
  themeBackgroundRepeat?: string | null;
  themePanelOpacity?: string | null;
  themeWindowOpacity?: string | null;
  themeChromeOpacity?: string | null;
}

/**
 * Applies the signed-in GM's personal theme by overriding the CSS custom properties that the
 * whole UI reads from `styles.css`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth/theme`;

  private readonly _settings = signal<ThemeSettings>({
    accent: null,
    secondary: null,
    danger: null,
    success: null,
    surfaceBase: null,
    surfacePanel: null,
    surfaceRaised: null,
    surfaceInset: null,
    textMain: null,
    textMuted: null,
    borderColor: null,
    fontBody: null,
    fontDisplay: null,
    fontSizeScale: null,
    headingTracking: null,
    backgroundUri: null,
    backgroundOpacity: null,
    backgroundBlur: null,
    backgroundFit: null,
    backgroundPosition: null,
    backgroundRepeat: null,
    panelOpacity: null,
    windowOpacity: null,
    chromeOpacity: null,
  });

  readonly settings = this._settings.asReadonly();

  /** Adopts the theme reported on the signed-in account. */
  applyFrom(user: ApiThemeFields | null): void {
    const next: ThemeSettings = {
      accent: user?.themeAccent ?? null,
      secondary: user?.themeSecondary ?? null,
      danger: user?.themeDanger ?? null,
      success: user?.themeSuccess ?? null,
      surfaceBase: user?.themeSurfaceBase ?? null,
      surfacePanel: user?.themeSurfacePanel ?? null,
      surfaceRaised: user?.themeSurfaceRaised ?? null,
      surfaceInset: user?.themeSurfaceInset ?? null,
      textMain: user?.themeTextMain ?? null,
      textMuted: user?.themeTextMuted ?? null,
      borderColor: user?.themeBorderColor ?? null,
      fontBody: user?.themeFontBody ?? null,
      fontDisplay: user?.themeFontDisplay ?? null,
      fontSizeScale: user?.themeFontSizeScale ?? null,
      headingTracking: user?.themeHeadingTracking ?? null,
      backgroundUri: user?.themeBackgroundUri ?? null,
      backgroundOpacity: user?.themeBackgroundOpacity ?? null,
      backgroundBlur: user?.themeBackgroundBlur ?? null,
      backgroundFit: user?.themeBackgroundFit ?? null,
      backgroundPosition: user?.themeBackgroundPosition ?? null,
      backgroundRepeat: user?.themeBackgroundRepeat ?? null,
      panelOpacity: user?.themePanelOpacity ?? null,
      windowOpacity: user?.themeWindowOpacity ?? null,
      chromeOpacity: user?.themeChromeOpacity ?? null,
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
      secondary: '',
      danger: '',
      success: '',
      surfaceBase: '',
      surfacePanel: '',
      surfaceRaised: '',
      surfaceInset: '',
      textMain: '',
      textMuted: '',
      borderColor: '',
      fontBody: '',
      fontDisplay: '',
      fontSizeScale: '',
      headingTracking: '',
      backgroundUri: '',
      backgroundOpacity: '',
      backgroundBlur: '',
      backgroundFit: '',
      backgroundPosition: '',
      backgroundRepeat: '',
      panelOpacity: '',
      windowOpacity: '',
      chromeOpacity: '',
    });
  }

  /** Writes the overrides (or clears them) on the document root as CSS variables. */
  private write(settings: ThemeSettings): void {
    const root = globalThis.document?.documentElement;
    if (!root) return;

    // Remap sky palette scale to accent color so all sky utilities update
    setVar(root, '--color-sky-200', settings.accent);
    setVar(root, '--color-sky-300', settings.accent);
    setVar(root, '--color-sky-400', settings.accent);
    setVar(root, '--color-sky-500', settings.accent);
    setVar(root, '--color-sky-600', settings.accent);
    setVar(root, '--color-sky-700', settings.accent);
    setVar(root, '--color-sky-800', settings.accent);

    // Remap amber palette scale to secondary/gold color
    setVar(root, '--color-amber-300', settings.secondary);
    setVar(root, '--color-amber-400', settings.secondary);
    setVar(root, '--color-amber-500', settings.secondary);
    setVar(root, '--color-amber-600', settings.secondary);

    // Remap rose palette scale to danger color
    setVar(root, '--color-rose-300', settings.danger);
    setVar(root, '--color-rose-400', settings.danger);
    setVar(root, '--color-rose-500', settings.danger);
    setVar(root, '--color-rose-600', settings.danger);

    // Remap emerald palette scale to success color
    setVar(root, '--color-emerald-400', settings.success);
    setVar(root, '--color-emerald-500', settings.success);
    setVar(root, '--color-emerald-600', settings.success);

    // Surface & Structural Colors
    setVar(root, '--color-surface-base', settings.surfaceBase);
    setVar(root, '--color-surface-panel', settings.surfacePanel);
    setVar(root, '--color-surface-raised', settings.surfaceRaised);
    setVar(root, '--color-surface-inset', settings.surfaceInset);

    // Text & Border Colors
    setVar(root, '--color-slate-100', settings.textMain);
    setVar(root, '--color-slate-200', settings.textMain);
    setVar(root, '--color-slate-300', settings.textMain);
    setVar(root, '--color-slate-400', settings.textMuted);
    setVar(root, '--color-slate-500', settings.textMuted);
    setVar(root, '--color-slate-600', settings.borderColor);
    setVar(root, '--color-slate-700', settings.borderColor);
    setVar(root, '--color-slate-800', settings.borderColor);

    // Absolute background
    setVar(root, '--color-slate-950', settings.surfaceBase);

    // Typography
    setVar(root, '--font-serif', settings.fontBody);
    setVar(root, '--font-display', settings.fontDisplay);
    setVar(root, '--font-size-scale', settings.fontSizeScale);
    setVar(root, '--heading-tracking', settings.headingTracking);
    setVar(root, '--app-panel-opacity', settings.panelOpacity);

    // Background Image
    if (settings.backgroundUri) {
      root.style.setProperty('--app-background-image', `url("${settings.backgroundUri}")`);
    } else {
      root.style.removeProperty('--app-background-image');
    }

    setVar(root, '--app-bg-opacity', settings.backgroundOpacity);
    setVar(
      root,
      '--app-bg-blur',
      settings.backgroundBlur
        ? settings.backgroundBlur.endsWith('px')
          ? settings.backgroundBlur
          : `${settings.backgroundBlur}px`
        : null,
    );
    setVar(
      root,
      '--app-bg-fit',
      settings.backgroundFit === 'stretch'
        ? '100% 100%'
        : settings.backgroundFit === 'tile'
          ? 'auto'
          : settings.backgroundFit,
    );
    setVar(
      root,
      '--app-bg-repeat',
      settings.backgroundFit === 'tile'
        ? 'repeat'
        : settings.backgroundRepeat,
    );
    setVar(root, '--app-bg-position', settings.backgroundPosition);

    // Separate Opacities for Windows vs Top/Bottom/Sidebar Chrome
    setVar(root, '--app-window-opacity', settings.windowOpacity);
    setVar(root, '--app-chrome-opacity', settings.chromeOpacity);
  }
}

function setVar(root: HTMLElement, name: string, value: string | null): void {
  if (value !== null && value !== undefined && value !== '') {
    root.style.setProperty(name, value);
  } else {
    root.style.removeProperty(name);
  }
}
