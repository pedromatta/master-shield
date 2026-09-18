import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/icon/icon.component';

/** Default values shown when the GM has not overridden a colour or font. */
const DEFAULTS = {
  accent: '#ad7223',
  danger: '#943f2b',
  success: '#597b32',
  fontBody: "'EB Garamond', Georgia, serif",
  fontDisplay: "'Cinzel', Georgia, serif",
} as const;

/** Font stacks the GM can pick from, kept short and themed. */
const FONT_CHOICES = [
  { label: 'Garalde (EB Garamond)', value: "'EB Garamond', Georgia, serif" },
  { label: 'Sans (Inter)', value: "'Inter', system-ui, sans-serif" },
  { label: 'Grotesque (system)', value: 'system-ui, sans-serif' },
  { label: 'Monospace', value: "ui-monospace, 'SFMono-Regular', Menlo, monospace" },
] as const;

const DISPLAY_FONTS = [
  { label: 'Engraved (Cinzel)', value: "'Cinzel', Georgia, serif" },
  { label: 'Garalde (EB Garamond)', value: "'EB Garamond', Georgia, serif" },
  { label: 'Sans (Inter)', value: "'Inter', system-ui, sans-serif" },
  { label: 'Monospace', value: "ui-monospace, Menlo, monospace" },
] as const;

/**
 * Personal theme editor. Colours, fonts and a background image are written straight onto the
 * document's CSS variables and saved to the account, so the GM's shield looks how they want
 * on any machine they sign in from.
 */
@Component({
  selector: 'app-theme-settings',
  imports: [FormsModule, IconComponent],
  templateUrl: './theme-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSettingsComponent {
  protected readonly theme = inject(ThemeService);

  protected readonly fonts = FONT_CHOICES;
  protected readonly displayFonts = DISPLAY_FONTS;

  protected readonly busy = signal(false);
  protected readonly status = signal<string | null>(null);

  /** Current values, falling back to the built-in defaults for the pickers. */
  protected readonly accent = computed(() => this.theme.settings().accent ?? DEFAULTS.accent);
  protected readonly danger = computed(() => this.theme.settings().danger ?? DEFAULTS.danger);
  protected readonly success = computed(() => this.theme.settings().success ?? DEFAULTS.success);
  protected readonly fontBody = computed(
    () => this.theme.settings().fontBody ?? DEFAULTS.fontBody,
  );
  protected readonly fontDisplay = computed(
    () => this.theme.settings().fontDisplay ?? DEFAULTS.fontDisplay,
  );

  protected async setColor(key: 'accent' | 'danger' | 'success', value: string): Promise<void> {
    await this.persist({ [key]: value });
  }

  protected async setFont(key: 'fontBody' | 'fontDisplay', value: string): Promise<void> {
    await this.persist({ [key]: value });
  }

  protected async onBackgroundChosen(files: FileList | null): Promise<void> {
    const file = files?.[0];
    if (!file) return;

    this.busy.set(true);
    this.status.set(null);
    try {
      await this.theme.uploadBackground(file);
      this.status.set('Background updated.');
    } catch {
      this.status.set('Could not upload the background.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async clearBackground(): Promise<void> {
    await this.persist({ backgroundUri: '' }, 'Background cleared.');
  }

  protected readonly hasOverrides = computed(() => {
    const s = this.theme.settings();
    return Boolean(
      s.accent || s.danger || s.success || s.fontBody || s.fontDisplay || s.backgroundUri,
    );
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
