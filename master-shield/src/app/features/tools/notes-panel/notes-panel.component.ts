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

/** Notes panel: category sidebar on the left, note editor on the right. */
@Component({
  selector: 'app-notes-panel',
  imports: [FormsModule, TagEditorComponent, ImageUploadComponent, NgTemplateOutlet, IconComponent],
  templateUrl: './notes-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPanelComponent {
  private readonly store = inject(ContentStoreService);

  /** `null` means "All notes"; `'uncategorised'` is the bucket without a category. */
  protected readonly selectedCategoryId = signal<string | null>(null);
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

  protected readonly selectedCategory = computed<NoteCategory | null>(
    () => this.categories().find((c) => c.id === this.selectedCategoryId()) ?? null,
  );

  /** Notes visible for the active category, honouring the search box. */
  protected readonly visibleNotes = computed(() => {
    const categoryId = this.selectedCategoryId();
    const term = this.search().trim().toLowerCase();
    const tagIds = this.activeTagIds();

    return [...this.store.notes()]
      .filter((note) => {
        if (categoryId === 'uncategorised') return note.noteCategoryId === null;
        if (categoryId !== null) return note.noteCategoryId === categoryId;
        return true;
      })
      .filter((note) => !term || note.title.toLowerCase().includes(term))
      .filter(
        (note) => tagIds.size === 0 || (note.tags ?? []).some((tag) => tagIds.has(tag.id)),
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  });

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

  /** Position of the open note inside its category, for prev/next navigation. */
  protected readonly noteIndex = computed(() =>
    this.visibleNotes().findIndex((note) => note.id === this.selectedNoteId()),
  );

  protected readonly canGoPrevious = computed(() => this.noteIndex() > 0);

  protected readonly canGoNext = computed(() => {
    const index = this.noteIndex();
    return index >= 0 && index < this.visibleNotes().length - 1;
  });

  protected countForCategory(categoryId: string | null): number {
    if (categoryId === null) return this.store.notes().length;
    if (categoryId === 'uncategorised') {
      return this.store.notes().filter((note) => note.noteCategoryId === null).length;
    }
    return this.store.notes().filter((note) => note.noteCategoryId === categoryId).length;
  }

  protected isCategorySelected(id: string | null): boolean {
    return this.selectedCategoryId() === id;
  }

  protected selectCategory(id: string | null): void {
    this.selectedCategoryId.set(id);

    // Keep a note open when navigating, so the GM can page through a category.
    const notes = this.visibleNotes();
    if (!notes.some((note) => note.id === this.selectedNoteId())) {
      this.selectedNoteId.set(notes.at(0)?.id ?? null);
    }
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
    const categoryId = this.selectedCategoryId();
    const title = 'New note';

    try {
      const created = await this.store.createNote(
        title,
        categoryId && categoryId !== 'uncategorised' ? categoryId : null,
      );
      this.selectedNoteId.set(created.id);
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
      this.selectedCategoryId.set(created.id);
    } catch {
      this.error.set('Could not create the category.');
    }
  }

  protected onNewCategoryIconChosen(file: File): void {
    this.newCategoryIconFile.set(file);
    this.newCategoryIconPreview.set(URL.createObjectURL(file));
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
      if (this.selectedCategoryId() === category.id) {
        this.selectedCategoryId.set(null);
      }
    } catch {
      this.error.set('Could not delete the category.');
    }
  }
}
