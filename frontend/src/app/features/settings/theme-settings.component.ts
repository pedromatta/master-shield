import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ThemeService, ThemeSettings } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/icon/icon.component';

/** Default values shown when the GM has not overridden a colour or font. */
const DEFAULTS = {
  accent: '#ad7223',
  secondary: '#b27d1f',
  danger: '#943f2b',
  success: '#597b32',
  surfaceBase: '#14100a',
  surfacePanel: '#2a2214',
  surfaceRaised: '#3a2f1f',
  surfaceInset: '#1c160d',
  textMain: '#dcd0b8',
  textMuted: '#a2926f',
  borderColor: '#52452e',
  fontBody: "'EB Garamond', Georgia, serif",
  fontDisplay: "'Cinzel', Georgia, serif",
  fontSizeScale: '1.0',
  headingTracking: '0.02em',
  backgroundOpacity: '1.0',
  backgroundBlur: '0',
  backgroundFit: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  panelOpacity: '1.0',
  windowOpacity: '1.0',
  chromeOpacity: '1.0',
} as const;

const PRESETS = [
  {
    name: 'Tabletop Bronze (Default)',
    settings: {
      accent: '#ad7223',
      secondary: '#b27d1f',
      danger: '#943f2b',
      success: '#597b32',
      surfaceBase: '#14100a',
      surfacePanel: '#2a2214',
      surfaceRaised: '#3a2f1f',
      surfaceInset: '#1c160d',
      textMain: '#dcd0b8',
      textMuted: '#a2926f',
      borderColor: '#52452e',
    },
  },
  {
    name: 'Dark Obsidian',
    settings: {
      accent: '#38bdf8',
      secondary: '#f59e0b',
      danger: '#f43f5e',
      success: '#10b981',
      surfaceBase: '#090d16',
      surfacePanel: '#0f172a',
      surfaceRaised: '#1e293b',
      surfaceInset: '#020617',
      textMain: '#f1f5f9',
      textMuted: '#94a3b8',
      borderColor: '#334155',
    },
  },
  {
    name: 'Emerald Forest',
    settings: {
      accent: '#34d399',
      secondary: '#fbbf24',
      danger: '#f87171',
      success: '#10b981',
      surfaceBase: '#061a14',
      surfacePanel: '#0b2920',
      surfaceRaised: '#123d30',
      surfaceInset: '#03120d',
      textMain: '#ecfdf5',
      textMuted: '#6ee7b7',
      borderColor: '#1f5443',
    },
  },
  {
    name: 'Arcane Purple',
    settings: {
      accent: '#c084fc',
      secondary: '#f472b6',
      danger: '#fb7185',
      success: '#34d399',
      surfaceBase: '#120b1c',
      surfacePanel: '#1e142d',
      surfaceRaised: '#2e1f42',
      surfaceInset: '#09050e',
      textMain: '#f3e8ff',
      textMuted: '#c084fc',
      borderColor: '#4c3068',
    },
  },
  {
    name: 'Crimson Blood',
    settings: {
      accent: '#e11d48',
      secondary: '#f59e0b',
      danger: '#9f1239',
      success: '#10b981',
      surfaceBase: '#1a0509',
      surfacePanel: '#2b0910',
      surfaceRaised: '#420d18',
      surfaceInset: '#0f0205',
      textMain: '#ffe4e6',
      textMuted: '#fda4af',
      borderColor: '#681326',
    },
  },
] as const;

/** Expanded body font stacks. */
const FONT_CHOICES = [
  { label: 'Garalde (EB Garamond)', value: "'EB Garamond', Georgia, serif" },
  { label: 'Sans Crisp (Inter)', value: "'Inter', system-ui, sans-serif" },
  { label: 'System Grotesque', value: 'system-ui, sans-serif' },
  { label: 'Monospace Technical', value: "ui-monospace, 'SFMono-Regular', Menlo, monospace" },
  { label: 'Classic Georgia', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Editorial Serif', value: "'Times New Roman', Times, serif" },
] as const;

/** Expanded display / heading font stacks. */
const DISPLAY_FONTS = [
  { label: 'Engraved (Cinzel)', value: "'Cinzel', Georgia, serif" },
  { label: 'Garalde (EB Garamond)', value: "'EB Garamond', Georgia, serif" },
  { label: 'Sans Bold (Inter)', value: "'Inter', system-ui, sans-serif" },
  { label: 'Monospace Display', value: "ui-monospace, Menlo, monospace" },
  { label: 'Classic Display (Georgia)', value: "Georgia, 'Times New Roman', serif" },
] as const;

const FONT_SCALES = [
  { label: 'Compact (90%)', value: '0.9' },
  { label: 'Standard (100%)', value: '1.0' },
  { label: 'Large (110%)', value: '1.1' },
  { label: 'Extra Large (120%)', value: '1.2' },
] as const;

const HEADING_TRACKINGS = [
  { label: 'Normal (0.02em)', value: '0.02em' },
  { label: 'Engraved Wide (0.06em)', value: '0.06em' },
  { label: 'Ultra Wide (0.12em)', value: '0.12em' },
] as const;

const FIT_MODES = [
  { label: 'Cover (Fill & Crop)', value: 'cover' },
  { label: 'Contain (Fit Inside)', value: 'contain' },
  { label: 'Original Size', value: 'auto' },
  { label: 'Stretch to Fill', value: 'stretch' },
  { label: 'Tile / Repeat Pattern', value: 'tile' },
] as const;

const POSITIONS = [
  { label: 'Center', value: 'center' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
] as const;

/**
 * Personal theme editor with complete control over colors, typography, background image, and theme export/import.
 */
@Component({
  selector: 'app-theme-settings',
  imports: [FormsModule, IconComponent],
  templateUrl: './theme-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSettingsComponent {
  protected readonly theme = inject(ThemeService);

  protected readonly presets = PRESETS;
  protected readonly fonts = FONT_CHOICES;
  protected readonly displayFonts = DISPLAY_FONTS;
  protected readonly fontScales = FONT_SCALES;
  protected readonly headingTrackings = HEADING_TRACKINGS;
  protected readonly fitModes = FIT_MODES;
  protected readonly positions = POSITIONS;

  protected readonly busy = signal(false);
  protected readonly status = signal<string | null>(null);

  /** Current values, falling back to built-in defaults for pickers. */
  protected readonly accent = computed(() => this.theme.settings().accent ?? DEFAULTS.accent);
  protected readonly secondary = computed(() => this.theme.settings().secondary ?? DEFAULTS.secondary);
  protected readonly danger = computed(() => this.theme.settings().danger ?? DEFAULTS.danger);
  protected readonly success = computed(() => this.theme.settings().success ?? DEFAULTS.success);
  protected readonly surfaceBase = computed(() => this.theme.settings().surfaceBase ?? DEFAULTS.surfaceBase);
  protected readonly surfacePanel = computed(() => this.theme.settings().surfacePanel ?? DEFAULTS.surfacePanel);
  protected readonly surfaceRaised = computed(() => this.theme.settings().surfaceRaised ?? DEFAULTS.surfaceRaised);
  protected readonly surfaceInset = computed(() => this.theme.settings().surfaceInset ?? DEFAULTS.surfaceInset);
  protected readonly textMain = computed(() => this.theme.settings().textMain ?? DEFAULTS.textMain);
  protected readonly textMuted = computed(() => this.theme.settings().textMuted ?? DEFAULTS.textMuted);
  protected readonly borderColor = computed(() => this.theme.settings().borderColor ?? DEFAULTS.borderColor);

  protected readonly fontBody = computed(() => this.theme.settings().fontBody ?? DEFAULTS.fontBody);
  protected readonly fontDisplay = computed(() => this.theme.settings().fontDisplay ?? DEFAULTS.fontDisplay);
  protected readonly fontSizeScale = computed(() => this.theme.settings().fontSizeScale ?? DEFAULTS.fontSizeScale);
  protected readonly headingTracking = computed(() => this.theme.settings().headingTracking ?? DEFAULTS.headingTracking);

  protected readonly backgroundOpacity = computed(() => this.theme.settings().backgroundOpacity ?? DEFAULTS.backgroundOpacity);
  protected readonly backgroundBlur = computed(() => this.theme.settings().backgroundBlur ?? DEFAULTS.backgroundBlur);
  protected readonly backgroundFit = computed(() => this.theme.settings().backgroundFit ?? DEFAULTS.backgroundFit);
  protected readonly backgroundPosition = computed(() => this.theme.settings().backgroundPosition ?? DEFAULTS.backgroundPosition);
  protected readonly panelOpacity = computed(() => this.theme.settings().panelOpacity ?? DEFAULTS.panelOpacity);
  protected readonly windowOpacity = computed(() => this.theme.settings().windowOpacity ?? DEFAULTS.windowOpacity);
  protected readonly chromeOpacity = computed(() => this.theme.settings().chromeOpacity ?? DEFAULTS.chromeOpacity);

  protected async setProp(key: keyof ThemeSettings, value: string): Promise<void> {
    await this.persist({ [key]: value });
  }

  protected async applyPreset(preset: typeof PRESETS[number]): Promise<void> {
    await this.persist(preset.settings, `Applied ${preset.name} theme.`);
  }

  protected async onBackgroundChosen(files: FileList | null): Promise<void> {
    const file = files?.[0];
    if (!file) return;

    this.busy.set(true);
    this.status.set(null);
    try {
      await this.theme.uploadBackground(file);
      this.status.set('Background uploaded.');
    } catch {
      this.status.set('Could not upload the background image.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async clearBackground(): Promise<void> {
    await this.persist(
      {
        backgroundUri: '',
        backgroundOpacity: '',
        backgroundBlur: '',
        backgroundFit: '',
        backgroundPosition: '',
        backgroundRepeat: '',
      },
      'Background cleared.',
    );
  }

  protected exportTheme(): void {
    const data = JSON.stringify(this.theme.settings(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daedala-theme-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.status.set('Theme exported.');
  }

  protected async importTheme(files: FileList | null): Promise<void> {
    const file = files?.[0];
    if (!file) return;

    this.busy.set(true);
    this.status.set(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<ThemeSettings>;
      await this.theme.save(parsed);
      this.status.set('Theme imported successfully.');
    } catch {
      this.status.set('Could not import the theme file. Invalid JSON payload.');
    } finally {
      this.busy.set(false);
    }
  }

  protected readonly hasOverrides = computed(() => {
    const s = this.theme.settings();
    return Object.values(s).some((val) => val !== null && val !== '');
  });

  protected async reset(): Promise<void> {
    this.busy.set(true);
    try {
      await this.theme.reset();
      this.status.set('Reset to the default theme.');
    } finally {
      this.busy.set(false);
    }
  }

  private async persist(
    patch: Parameters<ThemeService['save']>[0],
    message = 'Theme saved.',
  ): Promise<void> {
    this.busy.set(true);
    this.status.set(null);
    try {
      await this.theme.save(patch);
      this.status.set(message);
    } catch {
      this.status.set('Could not save the theme.');
    } finally {
      this.busy.set(false);
    }
  }
}
