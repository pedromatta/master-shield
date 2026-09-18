import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../../core/services/content-store.service';
import { WindowManagerService } from '../../../core/windows/window-manager.service';
import { Actor } from '../../../core/models/actor.model';
import { ActorCardComponent } from '../../../shared/actor-card/actor-card.component';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';

/** Grid of NPCs with tag filtering; clicking a card opens its sheet. */
@Component({
  selector: 'app-npc-grid',
  imports: [FormsModule, ActorCardComponent, ImageUploadComponent],
  templateUrl: './npc-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NpcGridComponent {
  private readonly store = inject(ContentStoreService);
  private readonly windows = inject(WindowManagerService);

  protected readonly search = signal('');
  protected readonly activeTagIds = signal<Set<string>>(new Set());
  protected readonly showCreate = signal(false);

  protected readonly newName = signal('');
  /** Portrait held in memory until the actor row exists to attach it to. */
  protected readonly newImageFile = signal<File | null>(null);
  protected readonly newImagePreview = signal('');

  protected readonly allTags = computed(() => this.store.tagsFor('Actor'));

  protected readonly npcs = computed(() => {
    const term = this.search().trim().toLowerCase();
    const tagIds = this.activeTagIds();

    return this.store.nonPlayerCharacters().filter((npc) => {
      const matchesTerm = !term || npc.name.toLowerCase().includes(term);
      const matchesTags =
        tagIds.size === 0 || (npc.tags ?? []).some((tag) => tagIds.has(tag.id));
      return matchesTerm && matchesTags;
    });
  });

  protected readonly hasFilters = computed(
    () => this.activeTagIds().size > 0 || this.search().trim().length > 0,
  );

  protected trackNpc(_index: number, npc: Actor): string {
    return npc.id;
  }

  protected isTagActive(id: string): boolean {
    return this.activeTagIds().has(id);
  }

  protected toggleTag(id: string): void {
    this.activeTagIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected clearFilters(): void {
    this.activeTagIds.set(new Set());
    this.search.set('');
  }

  protected openSheet(actor: Actor): void {
    this.windows.open({
      kind: 'actor-sheet',
      contextId: actor.id,
      title: actor.name,
      icon: 'ra:monster-skull',
      colSpan: 5,
      rowSpan: 6,
      singleton: true,
    });
  }

  protected async createNpc(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;

    const created = await this.store.createActor({
      name,
      type: 'NonPlayerCharacter',
      imageUri: '',
    });

    const file = this.newImageFile();
    if (file) {
      await this.store.uploadActorImage(created.id, file);
    }

    this.newName.set('');
    this.newImageFile.set(null);
    this.newImagePreview.set('');
    this.showCreate.set(false);
    this.openSheet(created);
  }

  protected onNewImageChosen(file: File): void {
    this.newImageFile.set(file);
    this.newImagePreview.set(URL.createObjectURL(file));
  }
}
