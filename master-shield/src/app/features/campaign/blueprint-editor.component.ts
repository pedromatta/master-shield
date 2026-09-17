import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../core/services/content-store.service';
import {
  BLUEPRINT_KINDS,
  BlueprintAttribute,
  BlueprintKind,
  BlueprintResource,
  SystemBlueprint,
} from '../../core/models/content.model';
import { ACTOR_TYPES } from '../../core/models/actor.model';
import { IconComponent } from '../../shared/icon/icon.component';
import { DEFAULT_RESOURCE_COLOR } from '../../core/theme/theme';

/**
 * Blueprint editor for one game system. A blueprint dictates how every new entity of its
 * kind is created: the resources actors start with, the game-specific attributes (AC,
 * damage thresholds, …) and whether they surface on the overview, and the default rule and
 * note categories the system expects.
 *
 * A system holds one blueprint per (kind, actor type): PCs and NPCs may differ.
 */
@Component({
  selector: 'app-blueprint-editor',
  imports: [FormsModule, IconComponent],
  templateUrl: './blueprint-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlueprintEditorComponent {
  private readonly store = inject(ContentStoreService);

  readonly gameSystemId = input.required<string>();

  protected readonly kinds = BLUEPRINT_KINDS;
  protected readonly actorTypes = ACTOR_TYPES;

  protected readonly blueprints = signal<SystemBlueprint[]>([]);
  protected readonly activeKind = signal<BlueprintKind>('Actor');
  protected readonly activeActorType = signal<string>('PlayerCharacter');
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<string | null>(null);

  protected readonly current = computed<SystemBlueprint | null>(() => {
    const kind = this.activeKind();
    return (
      this.blueprints().find(
        (b) =>
          b.kind === kind &&
          (kind !== 'Actor' || (b.actorType || '') === (this.activeActorType() || '')),
      ) ?? null
    );
  });

  constructor() {
    effect(() => {
      const id = this.gameSystemId();
      untracked(() => void this.load(id));
    });
  }

  protected async load(gameSystemId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.blueprints.set(await this.store.loadBlueprintsForSystem(gameSystemId));
    } catch {
      this.error.set('Could not load the blueprints.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Creates the blueprint for the active (kind, actor type) if it does not exist yet. */
  protected async createBlueprint(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const created = await this.store.createBlueprint({
        gameSystemId: this.gameSystemId(),
        kind: this.activeKind(),
        actorType: this.activeKind() === 'Actor' ? this.activeActorType() : '',
        name: this.defaultName(),
      });
      this.blueprints.update((list) => [...list, created]);
    } catch {
      this.error.set('Could not create the blueprint. One may already exist for this type.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async save(): Promise<void> {
    const blueprint = this.current();
    if (!blueprint) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.store.updateBlueprint(blueprint);
      this.status.set('Blueprint saved.');
    } catch {
      this.error.set('Could not save the blueprint.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const blueprint = this.current();
    if (!blueprint || !globalThis.confirm('Delete this blueprint?')) return;

    this.busy.set(true);
    try {
      await this.store.deleteBlueprint(blueprint.id);
      this.blueprints.update((list) => list.filter((b) => b.id !== blueprint.id));
    } catch {
      this.error.set('Could not delete the blueprint.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Patches the current blueprint locally; Save persists. */
  protected patch(changes: Partial<SystemBlueprint>): void {
    const blueprint = this.current();
    if (!blueprint) return;
    this.blueprints.update((list) =>
      list.map((b) => (b.id === blueprint.id ? { ...b, ...changes } : b)),
    );
  }

  // ---- Resources -------------------------------------------------------------

  protected addResource(): void {
    const blueprint = this.current();
    if (!blueprint) return;
    this.patch({
      resources: [
        ...blueprint.resources,
        { nome: 'New resource', maxValue: 10, currentValue: 10, colorHwx: DEFAULT_RESOURCE_COLOR, showInOverview: true },
      ],
    });
  }

  protected updateResource(index: number, changes: Partial<BlueprintResource>): void {
    const blueprint = this.current();
    if (!blueprint) return;
    this.patch({
      resources: blueprint.resources.map((r, i) => (i === index ? { ...r, ...changes } : r)),
    });
  }

  protected removeResource(index: number): void {
    const blueprint = this.current();
    if (!blueprint) return;
    this.patch({ resources: blueprint.resources.filter((_, i) => i !== index) });
  }

  // ---- Attributes ------------------------------------------------------------

  protected addAttribute(): void {
    const blueprint = this.current();
    if (!blueprint) return;
    this.patch({
      attributes: [
        ...blueprint.attributes,
        { key: 'New attribute', type: 'text', defaultValue: '', showInOverview: false },
      ],
    });
  }

  protected updateAttribute(index: number, changes: Partial<BlueprintAttribute>): void {
    const blueprint = this.current();
    if (!blueprint) return;
    this.patch({
      attributes: blueprint.attributes.map((a, i) => (i === index ? { ...a, ...changes } : a)),
    });
  }

  protected removeAttribute(index: number): void {
    const blueprint = this.current();
    if (!blueprint) return;
    this.patch({ attributes: blueprint.attributes.filter((_, i) => i !== index) });
  }

  // ---- Categories ------------------------------------------------------------

  protected addCategory(field: 'ruleCategories' | 'noteCategories', value: string): void {
    const blueprint = this.current();
    const name = value.trim();
    if (!blueprint || !name) return;
    if (blueprint[field].some((c) => c.toLowerCase() === name.toLowerCase())) return;
    this.patch({ [field]: [...blueprint[field], name] } as Partial<SystemBlueprint>);
  }

  protected removeCategory(field: 'ruleCategories' | 'noteCategories', index: number): void {
    const blueprint = this.current();
    if (!blueprint) return;
    this.patch({ [field]: blueprint[field].filter((_, i) => i !== index) } as Partial<SystemBlueprint>);
  }

  private defaultName(): string {
    const kind = this.activeKind();
    if (kind === 'Actor') {
      return this.activeActorType() === 'PlayerCharacter'
        ? 'Player character defaults'
        : 'NPC defaults';
    }
    return `${kind} defaults`;
  }
}
