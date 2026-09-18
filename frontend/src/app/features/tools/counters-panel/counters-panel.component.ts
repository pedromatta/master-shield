import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../../core/services/content-store.service';
import { Counter } from '../../../core/models/content.model';
import { IconComponent } from '../../../shared/icon/icon.component';
import { DEFAULT_RESOURCE_COLOR } from '../../../core/theme/theme';

/** Checkbox-style progress tracks (clocks, doom counters, ammo). */
@Component({
  selector: 'app-counters-panel',
  imports: [FormsModule, IconComponent],
  templateUrl: './counters-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountersPanelComponent {
  private readonly store = inject(ContentStoreService);

  protected readonly counters = this.store.counters;
  protected readonly showCreate = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly newName = signal('');
  protected readonly newBoxes = signal(4);
  protected readonly newColor = signal(DEFAULT_RESOURCE_COLOR);

  protected readonly draftName = signal('');
  protected readonly draftBoxes = signal(4);

  protected readonly hasCounters = computed(() => this.counters().length > 0);

  protected trackCounter(_index: number, counter: Counter): string {
    return counter.id;
  }

  /** Box indices for a counter, used by @for. */
  protected boxesOf(counter: Counter): number[] {
    return Array.from({ length: Math.max(counter.boxes, 0) }, (_, index) => index);
  }

  protected isChecked(counter: Counter, index: number): boolean {
    return index < counter.currentValue;
  }

  /** Clicking a box fills up to it, or clears it if it is already the last ticked box. */
  protected async toggleBox(counter: Counter, index: number): Promise<void> {
    const nextValue = counter.currentValue === index + 1 ? index : index + 1;
    await this.store.setCounterValue(counter, nextValue);
  }

  protected async adjust(counter: Counter, delta: number): Promise<void> {
    await this.store.setCounterValue(counter, counter.currentValue + delta);
  }

  protected async createCounter(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;

    await this.store.createCounter(name, Math.max(1, this.newBoxes()), this.newColor());
    this.newName.set('');
    this.newBoxes.set(4);
    this.showCreate.set(false);
  }

  protected startEditing(counter: Counter): void {
    this.editingId.set(counter.id);
    this.draftName.set(counter.name);
    this.draftBoxes.set(counter.boxes);
  }

  protected cancelEditing(): void {
    this.editingId.set(null);
  }

  protected async saveEdit(counter: Counter): Promise<void> {
    const name = this.draftName().trim();
    if (!name) return;

    const boxes = Math.max(1, this.draftBoxes());
    await this.store.updateCounter({
      ...counter,
      name,
      boxes,
      currentValue: Math.min(counter.currentValue, boxes),
    });
    this.editingId.set(null);
  }

  protected async deleteCounter(counter: Counter): Promise<void> {
    await this.store.deleteCounter(counter.id);
  }
}
