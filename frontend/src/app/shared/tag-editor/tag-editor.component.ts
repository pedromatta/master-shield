import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../core/services/content-store.service';
import { Tag, TagCategory } from '../../core/models/actor.model';
import { IconComponent } from '../icon/icon.component';
import { DEFAULT_RESOURCE_COLOR } from '../../core/theme/theme';

/**
 * Chip-style tag picker shared by actors, notes, locations, rules and counters. Tags are
 * partitioned by entity family: the picker only shows (and creates) tags of its
 * <see cref="category"/>, matching the API's tag scoping.
 */
@Component({
  selector: 'app-tag-editor',
  imports: [FormsModule, IconComponent],
  templateUrl: './tag-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagEditorComponent {
  private readonly store = inject(ContentStoreService);

  /** Entity family this picker edits tags for. */
  readonly category = input.required<TagCategory>();

  /** Tags currently attached to the entity. */
  readonly selected = input<Tag[]>([]);
  readonly label = input('Tags');
  readonly compact = input(false);

  readonly selectedChange = output<Tag[]>();

  protected readonly creating = signal(false);
  /** True while a create request is in flight; separate from `creating` (form visibility). */
  protected readonly saving = signal(false);
  protected readonly draftName = signal('');
  protected readonly draftColor = signal(DEFAULT_RESOURCE_COLOR);
  protected readonly error = signal<string | null>(null);

  /** Unique per-instance ids so multiple pickers on one page never collide. */
  protected readonly inputId = `tag-name-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly colorId = `tag-color-${Math.random().toString(36).slice(2, 9)}`;

  protected readonly allTags = computed(() => this.store.tagsFor(this.category()));

  protected readonly selectedIds = computed(
    () => new Set((this.selected() ?? []).map((tag) => tag.id)),
  );

  protected isSelected(tag: Tag): boolean {
    return this.selectedIds().has(tag.id);
  }

  protected toggle(tag: Tag): void {
    const current = this.selected() ?? [];
    const next = this.isSelected(tag)
      ? current.filter((t) => t.id !== tag.id)
      : [...current, tag];
    this.selectedChange.emit(next);
  }

  protected async createTag(): Promise<void> {
    const name = this.draftName().trim();
    if (!name) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      const created = await this.store.createTag(name, this.draftColor(), this.category());
      this.draftName.set('');
      this.selectedChange.emit([...(this.selected() ?? []), created]);
    } catch {
      this.error.set('Could not create the tag.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteTag(tag: Tag, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.store.deleteTag(tag.id);
      this.selectedChange.emit((this.selected() ?? []).filter((t) => t.id !== tag.id));
    } catch {
      this.error.set('Could not delete the tag.');
    }
  }

  protected chipStyle(tag: Tag): string {
    return `border-color:${tag.colorHex}; color:${tag.colorHex}`;
  }
}
