import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../../core/services/content-store.service';
import { ContentService } from '../../../core/services/content.service';
import { ActiveGameStateService } from '../../../core/services/active-game-state.service';
import { Location } from '../../../core/models/content.model';
import { Tag } from '../../../core/models/actor.model';
import { assetUrl } from '../../../core/services/asset-url';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { TagEditorComponent } from '../../../shared/tag-editor/tag-editor.component';
import { IconComponent } from '../../../shared/icon/icon.component';

/**
 * Locations grid. The GM picks one to project as the current battle map: the campaign's
 * stable map URL keeps working, only the image it resolves to changes.
 */
@Component({
  selector: 'app-locations-panel',
  imports: [FormsModule, ImageUploadComponent, TagEditorComponent, IconComponent],
  templateUrl: './locations-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsPanelComponent {
  private readonly store = inject(ContentStoreService);
  private readonly content = inject(ContentService);
  private readonly gameState = inject(ActiveGameStateService);

  protected readonly locations = this.store.locations;
  protected readonly search = signal('');
  protected readonly activeTagIds = signal<Set<string>>(new Set());
  protected readonly showCreate = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly newName = signal('');
  /** Image of the location being created, uploaded before the record exists (kept in memory). */
  protected readonly newImageFile = signal<File | null>(null);
  protected readonly newImagePreview = signal('');

  protected readonly draftName = signal('');
  protected readonly draftDescription = signal('');
  protected readonly draftTags = signal<Tag[]>([]);

  protected readonly allTags = computed(() => this.store.tagsFor('Location'));

  protected readonly currentMapId = computed(
    () => this.gameState.activeCampaign()?.currentMapLocationId ?? null,
  );

  protected readonly stableMapUrl = computed(() => {
    const campaignId = this.gameState.activeCampaignId();
    return campaignId ? this.content.stableMapUrl(campaignId) : '';
  });

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const tagIds = this.activeTagIds();

    return this.locations().filter((location) => {
      const matchesTerm =
        !term ||
        location.name.toLowerCase().includes(term) ||
        location.description.toLowerCase().includes(term);
      const matchesTags =
        tagIds.size === 0 || (location.tags ?? []).some((tag) => tagIds.has(tag.id));
      return matchesTerm && matchesTags;
    });
  });

  protected readonly hasFilters = computed(
    () => this.activeTagIds().size > 0 || this.search().trim().length > 0,
  );

  protected trackLocation(_index: number, location: Location): string {
    return location.id;
  }

  /** Resolves a stored location image against the API origin. */
  protected readonly imageUrl = assetUrl;

  protected isCurrentMap(location: Location): boolean {
    return this.currentMapId() === location.id;
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

  /** Projects this location as the map, or clears it when already current. */
  protected async setAsMap(location: Location): Promise<void> {
    this.error.set(null);
    try {
      await this.store.setCurrentMap(this.isCurrentMap(location) ? null : location.id);
    } catch {
      this.error.set('Could not change the current map.');
    }
  }

  protected async copyMapUrl(): Promise<void> {
    const url = this.stableMapUrl();
    if (!url) return;

    try {
      await globalThis.navigator?.clipboard?.writeText(new URL(url, globalThis.location?.origin).href);
      this.copied.set(true);
      globalThis.setTimeout?.(() => this.copied.set(false), 2000);
    } catch {
      this.error.set('Could not copy the map URL.');
    }
  }

  protected async createLocation(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;

    try {
      const created = await this.store.createLocation(name, '');
      const file = this.newImageFile();
      if (file) {
        await this.store.uploadLocationImage(created.id, file);
      }
      this.newName.set('');
      this.newImageFile.set(null);
      this.newImagePreview.set('');
      this.showCreate.set(false);
      this.error.set(null);
    } catch {
      this.error.set('Could not create the location.');
    }
  }

  /** Holds the chosen image in memory until the location row exists to attach it to. */
  protected onNewImageChosen(file: File): void {
    this.newImageFile.set(file);
    this.newImagePreview.set(URL.createObjectURL(file));
  }

  protected startEditing(location: Location): void {
    this.editingId.set(location.id);
    this.draftName.set(location.name);
    this.draftDescription.set(location.description);
    this.draftTags.set(location.tags ?? []);
  }

  protected cancelEditing(): void {
    this.editingId.set(null);
  }

  /** Uploads a replacement image directly against the persisted location. */
  protected async onLocationImageChosen(location: Location, file: File): Promise<void> {
    this.error.set(null);
    try {
      await this.store.uploadLocationImage(location.id, file);
    } catch {
      this.error.set('Could not upload the location image.');
    }
  }

  protected async saveEdit(location: Location): Promise<void> {
    const name = this.draftName().trim();
    if (!name) return;

    await this.store.updateLocation({
      ...location,
      name,
      description: this.draftDescription(),
      tags: this.draftTags(),
    });
    this.editingId.set(null);
  }

  protected async deleteLocation(location: Location): Promise<void> {
    await this.store.deleteLocation(location.id);
    if (this.isCurrentMap(location)) {
      await this.store.setCurrentMap(null);
    }
  }
}
