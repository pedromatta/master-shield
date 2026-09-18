import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GameSystemService } from '../../core/services/game-system.service';
import {
  SystemEntityTemplate,
  TEMPLATE_KINDS,
  TemplateKind,
  TemplateResource,
} from '../../core/models/common.model';
import { ACTOR_TYPES } from '../../core/models/actor.model';
import { IconComponent } from '../../shared/icon/icon.component';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { DEFAULT_RESOURCE_COLOR } from '../../core/theme/theme';

/**
 * Full CRUD for the ready-made actors, locations, rules and notes a game system ships with,
 * plus bulk import of lists (for example a bestiary JSON) and export of the current list.
 *
 * These entities live with the system, not a campaign: when a campaign adopts the system the
 * GM copies the selection into it as real content.
 */
@Component({
  selector: 'app-system-entity-editor',
  imports: [FormsModule, ImageUploadComponent, IconComponent],
  templateUrl: './system-entity-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemEntityEditorComponent {
  private readonly gameSystems = inject(GameSystemService);

  readonly gameSystemId = input.required<string>();
  /** When set, the parent owns the kind tabs and this editor shows only that kind. */
  readonly kind = input<TemplateKind | null>(null);

  protected readonly kinds = TEMPLATE_KINDS;
  protected readonly actorTypes = ACTOR_TYPES;

  /** The kind being edited: driven by the parent when `kind` is set, else the internal tabs. */
  protected readonly editedKind = computed<TemplateKind>(() => this.kind() ?? this.activeKind());

  /** Whether this editor should render its own kind tab bar. */
  protected readonly showKindTabs = computed(() => this.kind() === null);

  protected readonly templates = signal<SystemEntityTemplate[]>([]);
  protected readonly activeKind = signal<TemplateKind>('Actor');
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<string | null>(null);
  protected readonly expandedId = signal<string | null>(null);

  protected readonly showCreate = signal(false);
  protected readonly draftName = signal('');
  protected readonly draftDescription = signal('');
  protected readonly draftCategory = signal('');
  protected readonly draftSortOrder = signal(0);
  protected readonly draftResources = signal<TemplateResource[]>([]);

  protected readonly visible = computed(() =>
    this.templates()
      .filter((template) => template.kind === this.editedKind())
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
  );

  protected readonly counts = computed(() => {
    const map = new Map<TemplateKind, number>();
    for (const template of this.templates()) {
      map.set(template.kind, (map.get(template.kind) ?? 0) + 1);
    }
    return map;
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.templates.set(await this.gameSystems.listEntities(this.gameSystemId()));
    } catch {
      this.error.set('Could not load the system content.');
    } finally {
      this.loading.set(false);
    }
  }

  protected countFor(kind: TemplateKind): number {
    return this.counts().get(kind) ?? 0;
  }

  protected categoryLabel(kind: TemplateKind): string {
    switch (kind) {
      case 'Actor':
        return 'Actor type';
      case 'Rule':
      case 'Note':
        return 'Category';
      default:
        return 'Group';
    }
  }

  protected categoryPlaceholder(kind: TemplateKind): string {
    switch (kind) {
      case 'Actor':
        return 'NonPlayerCharacter';
      case 'Rule':
        return 'Combat';
      case 'Note':
        return 'Prep';
      default:
        return 'Region';
    }
  }

  protected categoryOptions(kind: TemplateKind): readonly string[] {
    return kind === 'Actor' ? ACTOR_TYPES : [];
  }

  protected startCreate(): void {
    this.showCreate.set(true);
    this.expandedId.set(null);
    this.draftName.set('');
    this.draftDescription.set('');
    this.draftCategory.set(this.editedKind() === 'Actor' ? 'NonPlayerCharacter' : '');
    this.draftSortOrder.set(this.visible().length);
    this.draftResources.set([]);
  }

  protected cancelCreate(): void {
    this.showCreate.set(false);
  }

  protected async create(): Promise<void> {
    const name = this.draftName().trim();
    if (!name) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const created = await this.gameSystems.createEntity(this.gameSystemId(), {
        kind: this.editedKind(),
        name,
        description: this.draftDescription(),
        category: this.draftCategory(),
        sortOrder: this.draftSortOrder(),
        resources: this.editedKind() === 'Actor' ? this.draftResources() : [],
        systemData: {},
        imageUri: '',
      });
      this.templates.update((list) => [...list, created]);
      this.cancelCreate();
      this.status.set(`Added “${name}”.`);
    } catch {
      this.error.set('Could not add the entity.');
    } finally {
      this.busy.set(false);
    }
  }

  protected toggle(entry: SystemEntityTemplate): void {
    this.expandedId.update((current) => (current === entry.id ? null : entry.id));
  }

  protected isExpanded(entry: SystemEntityTemplate): boolean {
    return this.expandedId() === entry.id;
  }

  protected onImageChosen(entry: SystemEntityTemplate, file: File): void {
    void this.uploadImage(entry, file);
  }

  /** Images live under the actors/rules/notes scopes so they can be streamed like any upload. */
  private async uploadImage(entry: SystemEntityTemplate, file: File): Promise<void> {
    this.error.set(null);
    try {
      const uri = await this.gameSystems.uploadEntityImage(this.gameSystemId(), entry.id, file);
      this.templates.update((list) =>
        list.map((t) => (t.id === entry.id ? { ...t, imageUri: uri } : t)),
      );
    } catch {
      this.error.set('Could not upload the image.');
    }
  }

  protected async save(entry: SystemEntityTemplate): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.gameSystems.updateEntity(this.gameSystemId(), entry);
      this.templates.update((list) => list.map((t) => (t.id === entry.id ? entry : t)));
      this.expandedId.set(null);
      this.status.set(`Saved “${entry.name}”.`);
    } catch {
      this.error.set('Could not save the entity.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(entry: SystemEntityTemplate): Promise<void> {
    if (!globalThis.confirm(`Delete “${entry.name}” from this system?`)) return;

    this.error.set(null);
    try {
      await this.gameSystems.deleteEntity(this.gameSystemId(), entry.id);
      this.templates.update((list) => list.filter((t) => t.id !== entry.id));
    } catch {
      this.error.set('Could not delete the entity.');
    }
  }

  protected patch(entry: SystemEntityTemplate, patch: Partial<SystemEntityTemplate>): void {
    this.templates.update((list) =>
      list.map((t) => (t.id === entry.id ? { ...t, ...patch } : t)),
    );
  }

  // ---- Actor resource templates ---------------------------------------------

  protected addResource(entry: SystemEntityTemplate): void {
    this.patch(entry, {
      resources: [
        ...entry.resources,
        { nome: 'New resource', currentValue: 10, maxValue: 10, colorHwx: DEFAULT_RESOURCE_COLOR },
      ],
    });
  }

  protected updateResource(
    entry: SystemEntityTemplate,
    index: number,
    patch: Partial<TemplateResource>,
  ): void {
    const resources = entry.resources.map((r, i) => (i === index ? { ...r, ...patch } : r));
    this.patch(entry, { resources });
  }

  protected removeResource(entry: SystemEntityTemplate, index: number): void {
    this.patch(entry, { resources: entry.resources.filter((_, i) => i !== index) });
  }

  // ---- Import / export -------------------------------------------------------

  /** Imports a JSON array of entities into the active kind. */
  protected async importList(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error.set(null);
    this.status.set(null);
    try {
      const parsed = JSON.parse(await file.text());
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const payload = rows.map((row) => ({
        kind: row.kind ?? this.editedKind(),
        name: row.name ?? row.title ?? 'Untitled',
        description: row.description ?? row.content ?? row.notes ?? '',
        category: row.category ?? '',
        imageUri: row.imageUri ?? '',
        sortOrder: row.sortOrder ?? 0,
        resources: row.resources ?? [],
        systemData: row.systemData ?? {},
      }));

      const created = await this.gameSystems.importEntities(this.gameSystemId(), payload);
      this.templates.update((list) => [...list, ...created]);
      this.status.set(`Imported ${created.length} entit${created.length === 1 ? 'y' : 'ies'}.`);
    } catch {
      this.error.set('That file is not a valid entity list.');
    }
  }

  /** Downloads the active kind as a JSON array that can be re-imported later. */
  protected exportList(): void {
    const payload = this.visible().map((entry) => ({
      kind: entry.kind,
      name: entry.name,
      description: entry.description,
      category: entry.category,
      imageUri: entry.imageUri,
      sortOrder: entry.sortOrder,
      resources: entry.resources,
      systemData: entry.systemData,
    }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.editedKind().toLowerCase()}s.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
