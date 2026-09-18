import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../../core/services/content-store.service';
import { Note, NoteCategory } from '../../../core/models/content.model';
import { Tag } from '../../../core/models/actor.model';
import { Attachment } from '../../../core/models/common.model';
import { assetUrl } from '../../../core/services/asset-url';
import { TagEditorComponent } from '../../../shared/tag-editor/tag-editor.component';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { IconPickerComponent } from '../../../shared/icon/icon-picker.component';
import { MarkdownEditorComponent } from '../../../shared/markdown-editor/markdown-editor.component';

/** Notes panel: category sidebar on the left, note editor on the right. */
@Component({
  selector: 'app-notes-panel',
  imports: [FormsModule, TagEditorComponent, ImageUploadComponent, NgTemplateOutlet, IconComponent, IconPickerComponent, MarkdownEditorComponent],
  templateUrl: './notes-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPanelComponent {
  private readonly store = inject(ContentStoreService);

  /** `null` means "All notes"; `'uncategorised'` is the bucket without a category. */
  /** Expanded accordion buckets; several may be open at once. */
  protected readonly expandedKeys = signal<Set<string>>(new Set());
  protected readonly selectedNoteId = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly showCategoryForm = signal(false);
  protected readonly newCategoryName = signal('');
  /** Icon held in memory until the category row exists to attach it to. */
  protected readonly newCategoryIconFile = signal<File | null>(null);
  protected readonly newCategoryIconPreview = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly categories = this.store.noteCategories;

  /** The key used for the "All notes" and "Uncategorised" buckets in the accordion. */
  protected readonly allKey = 'all';
  protected readonly uncategorisedKey = 'uncategorised';

  /** Notes visible for a given bucket, honouring the search box and tag filter. */
  protected notesFor(bucket: string | null): Note[] {
    const term = this.search().trim().toLowerCase();
    const tagIds = this.activeTagIds();

    return [...this.store.notes()]
      .filter((note) => {
        if (bucket === null) return true;
        if (bucket === this.uncategorisedKey) return note.noteCategoryId === null;
        return note.noteCategoryId === bucket;
      })
      .filter((note) => !term || note.title.toLowerCase().includes(term))
      .filter(
        (note) => tagIds.size === 0 || (note.tags ?? []).some((tag) => tagIds.has(tag.id)),
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  /** The notes of the bucket that owns the open note (used by the editor pane). */
  protected readonly visibleNotes = computed(() => this.notesFor(null));

  /** The open note, kept in a computed so the editor reacts to store changes. */
  protected readonly selectedCategory = computed<NoteCategory | null>(() => {
    const note = this.selectedNote();
    return note?.noteCategoryId
      ? (this.categories().find((c) => c.id === note.noteCategoryId) ?? null)
      : null;
  });

  /** The bucket key that contains the open note, so only that pane renders the editor. */
  protected bucketForNote(note: Note): string {
    return note.noteCategoryId ?? this.uncategorisedKey;
  }

  /** Notes to show inside one expanded bucket. */
  protected bucketNotes(bucket: string): Note[] {
    return this.notesFor(bucket === this.uncategorisedKey ? this.uncategorisedKey : bucket);
  }

  protected readonly allTags = computed(() => this.store.tagsFor('Note'));
  protected readonly activeTagIds = signal<Set<string>>(new Set());

  protected isTagActive(id: string): boolean {
    return this.activeTagIds().has(id);
  }

  protected toggleTagFilter(id: string): void {
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

  protected readonly selectedNote = computed(
    () => this.store.notes().find((note) => note.id === this.selectedNoteId()) ?? null,
  );

  /** Position of the open note inside its bucket, for prev/next navigation. */
  protected readonly noteIndex = computed(() => {
    const note = this.selectedNote();
    if (!note) return -1;
    return this.notesFor(this.bucketForNote(note)).findIndex((n) => n.id === note.id);
  });

  protected readonly canGoPrevious = computed(() => this.noteIndex() > 0);

  protected readonly canGoNext = computed(() => {
    const index = this.noteIndex();
    return index >= 0 && index < this.notesFor(this.bucketForCurrentNote()).length - 1;
  });

  private bucketForCurrentNote(): string {
    const note = this.selectedNote();
    return note ? this.bucketForNote(note) : this.uncategorisedKey;
  }

  protected countForCategory(categoryId: string | null): number {
    if (categoryId === null) return this.store.notes().length;
    if (categoryId === 'uncategorised') {
      return this.store.notes().filter((note) => note.noteCategoryId === null).length;
    }
    return this.store.notes().filter((note) => note.noteCategoryId === categoryId).length;
  }

  protected isCategorySelected(id: string | null): boolean {
    const key = id ?? this.allKey;
    return this.expandedKeys().has(key);
  }

  /** Toggles one bucket open/closed without touching the others. */
  protected toggleBucket(id: string | null): void {
    const key = id ?? this.allKey;
    this.expandedKeys.update((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  /** Expands a bucket (kept for callers that need a deterministic open). */
  protected selectCategory(id: string | null): void {
    const key = id ?? this.allKey;
    this.expandedKeys.update((current) => new Set(current).add(key));
  }

  protected trackNote(_index: number, note: Note): string {
    return note.id;
  }

  protected trackCategory(_index: number, category: NoteCategory): string {
    return category.id;
  }

  /** Resolves a stored category icon against the API origin. */
  protected readonly iconUrl = assetUrl;

  /** Resolves a stored attachment URI against the API origin. */
  protected readonly attachmentUrl = assetUrl;

  protected async createNote(): Promise<void> {
    // Create inside the first expanded bucket so the new note lands where the GM is looking.
    const bucket = [...this.expandedKeys()][0] ?? this.allKey;
    const categoryId =
      bucket === this.allKey || bucket === this.uncategorisedKey ? null : bucket;

    try {
      const created = await this.store.createNote('New note', categoryId);
      this.selectedNoteId.set(created.id);
      if (categoryId) this.selectCategory(categoryId);
    } catch {
      this.error.set('Could not create the note.');
    }
  }

  protected async saveNoteField<K extends keyof Note>(field: K, value: Note[K]): Promise<void> {
    const note = this.selectedNote();
    if (!note || note[field] === value) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.updateNote({ ...note, [field]: value });
    } catch {
      this.error.set('Could not save the note.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async changeNoteCategory(categoryId: string): Promise<void> {
    const note = this.selectedNote();
    if (!note) return;

    await this.store.updateNote({
      ...note,
      noteCategoryId: categoryId === '' ? null : categoryId,
    });
  }

  protected async onTagsChange(tags: Tag[]): Promise<void> {
    const note = this.selectedNote();
    if (!note) return;

    try {
      await this.store.setNoteTags(note.id, tags.map((tag) => tag.id));
    } catch {
      this.error.set('Could not save tags.');
    }
  }

  protected async deleteNote(): Promise<void> {
    const note = this.selectedNote();
    if (!note) return;

    try {
      await this.store.deleteNote(note.id);
      this.selectedNoteId.set(this.visibleNotes().at(0)?.id ?? null);
    } catch {
      this.error.set('Could not delete the note.');
    }
  }

  protected goToPrevious(): void {
    const index = this.noteIndex();
    if (index > 0) {
      this.selectedNoteId.set(this.visibleNotes()[index - 1].id);
    }
  }

  protected goToNext(): void {
    const index = this.noteIndex();
    if (index >= 0 && index < this.visibleNotes().length - 1) {
      this.selectedNoteId.set(this.visibleNotes()[index + 1].id);
    }
  }

  protected async createCategory(): Promise<void> {
    const name = this.newCategoryName().trim();
    if (!name) return;

    try {
      const created = await this.store.createNoteCategory(name, '');
      const file = this.newCategoryIconFile();
      if (file) {
        await this.store.uploadNoteCategoryIcon(created.id, file);
      }
      this.newCategoryName.set('');
      this.newCategoryIconFile.set(null);
      this.newCategoryIconPreview.set('');
      this.showCategoryForm.set(false);
      this.expandedKeys.update((current) => new Set(current).add(created.id));
    } catch {
      this.error.set('Could not create the category.');
    }
  }

  protected onNewCategoryIconChosen(file: File): void {
    this.newCategoryIconFile.set(file);
    this.newCategoryIconPreview.set(URL.createObjectURL(file));
  }

  /** Saves the chosen catalogue icon onto the category. */
  protected async onCategoryIconChange(category: NoteCategory, iconId: string): Promise<void> {
    this.error.set(null);
    try {
      await this.store.updateNoteCategory({ ...category, iconId });
    } catch {
      this.error.set('Could not save the category icon.');
    }
  }

  /** Uploads a replacement icon directly against the persisted category. */
  protected async onCategoryIconChosen(category: NoteCategory, file: File): Promise<void> {
    this.error.set(null);
    try {
      await this.store.uploadNoteCategoryIcon(category.id, file);
    } catch {
      this.error.set('Could not upload the category icon.');
    }
  }

  protected async onAttachmentChosen(file: File): Promise<void> {
    const note = this.selectedNote();
    if (!note) return;

    this.error.set(null);
    try {
      await this.store.uploadAttachment('note', note.id, file);
    } catch {
      this.error.set('Could not upload the attachment.');
    }
  }

  protected async removeAttachment(attachment: Attachment): Promise<void> {
    const note = this.selectedNote();
    if (!note) return;

    this.error.set(null);
    try {
      await this.store.deleteAttachment('note', note.id, attachment.id);
    } catch {
      this.error.set('Could not remove the attachment.');
    }
  }

  protected async deleteCategory(category: NoteCategory, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.store.deleteNoteCategory(category.id);
      this.expandedKeys.update((current) => {
        const next = new Set(current);
        next.delete(category.id);
        return next;
      });
    } catch {
      this.error.set('Could not delete the category.');
    }
  }
}
