import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TemporaryEffects } from '../../core/models/common.model';
import { IconComponent } from '../../shared/icon/icon.component';

interface EffectEntry {
  readonly key: string;
  readonly value: unknown;
}

/**
 * Injects ad-hoc status effects into a participant's isolated `TemporaryEffects`
 * dictionary. Keys are free-form so any game system's conditions fit.
 */
@Component({
  selector: 'app-effect-injector',
  imports: [FormsModule, IconComponent],
  templateUrl: './effect-injector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EffectInjectorComponent {
  readonly participantId = input.required<string>();
  readonly effects = input<TemporaryEffects>({});

  readonly effectsChange = output<TemporaryEffects>();

  protected readonly draftKey = signal('');
  protected readonly draftValue = signal('');

  protected readonly entries = computed<EffectEntry[]>(() =>
    Object.entries(this.effects() ?? {}).map(([key, value]) => ({ key, value })),
  );

  protected readonly hasEntries = computed(() => this.entries().length > 0);

  protected trackKey(_index: number, entry: EffectEntry): string {
    return entry.key;
  }

  protected inject(): void {
    const key = this.draftKey().trim();
    if (!key) return;

    const raw = this.draftValue().trim();
    this.effectsChange.emit({ ...this.effects(), [key]: raw === '' ? true : coerce(raw) });
    this.draftKey.set('');
    this.draftValue.set('');
  }

  protected remove(key: string): void {
    const next: TemporaryEffects = { ...this.effects() };
    delete next[key];
    this.effectsChange.emit(next);
  }

  protected display(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}

function coerce(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? raw : parsed;
}
