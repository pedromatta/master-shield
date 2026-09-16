import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SystemData } from '../../core/models/common.model';
import { IconComponent } from '../icon/icon.component';

interface SystemDataEntry {
  readonly key: string;
  readonly value: unknown;
}

type EntryType = 'text' | 'number' | 'boolean' | 'json';

/**
 * Renders an arbitrary `SystemData` dictionary as editable key/value rows.
 * Game-system agnostic: keys and value types are discovered at runtime.
 */
@Component({
  selector: 'app-system-data-editor',
  imports: [FormsModule, IconComponent],
  templateUrl: './system-data-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemDataEditorComponent {
  readonly systemData = input<SystemData>({});
  readonly label = input('System Data');
  readonly readonlyMode = input(false, { alias: 'readonly' });

  readonly systemDataChange = output<SystemData>();

  protected readonly newKey = signal('');
  protected readonly invalidKey = signal(false);

  protected readonly entries = computed<SystemDataEntry[]>(() =>
    Object.entries(this.systemData() ?? {})
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  );

  protected readonly isEmpty = computed(() => this.entries().length === 0);

  protected trackKey(_index: number, entry: SystemDataEntry): string {
    return entry.key;
  }

  protected typeOf(value: unknown): EntryType {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value !== null && typeof value === 'object') return 'json';
    return 'text';
  }

  protected displayValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  protected coerce(raw: string, current: unknown): unknown {
    switch (typeof current) {
      case 'number': {
        const parsed = Number(raw);
        return raw.trim() === '' || Number.isNaN(parsed) ? 0 : parsed;
      }
      case 'boolean':
        return raw === 'true';
      case 'object':
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          return raw;
        }
      default: {
        if (raw === 'true' || raw === 'false') return raw === 'true';
        const parsed = Number(raw);
        return raw.trim() !== '' && !Number.isNaN(parsed) && current === undefined ? parsed : raw;
      }
    }
  }

  protected updateValue(key: string, raw: string): void {
    const current = this.systemData()[key];
    this.emit({ ...this.systemData(), [key]: this.coerce(raw, current) });
  }

  protected updateBoolean(key: string, checked: boolean): void {
    this.emit({ ...this.systemData(), [key]: checked });
  }

  protected renameKey(oldKey: string, rawKey: string): void {
    const key = rawKey.trim();
    if (!key || key === oldKey) return;

    const next: SystemData = {};
    for (const [k, v] of Object.entries(this.systemData())) {
      next[k === oldKey ? key : k] = v;
    }
    this.emit(next);
  }

  protected removeEntry(key: string): void {
    const next: SystemData = { ...this.systemData() };
    delete next[key];
    this.emit(next);
  }

  protected addEntry(): void {
    const key = this.newKey().trim();
    if (!key) return;

    if (Object.hasOwn(this.systemData(), key)) {
      this.invalidKey.set(true);
      return;
    }

    this.invalidKey.set(false);
    this.newKey.set('');
    this.emit({ ...this.systemData(), [key]: '' });
  }

  protected onNewKeyInput(value: string): void {
    this.newKey.set(value);
    this.invalidKey.set(false);
  }

  private emit(next: SystemData): void {
    this.systemDataChange.emit(next);
  }
}
