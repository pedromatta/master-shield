import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ActiveGameStateService } from '../../core/services/active-game-state.service';
import { GameSystemService } from '../../core/services/game-system.service';
import { GameSystem } from '../../core/models/common.model';
import { Campaign } from '../../core/models/campaign.model';
import { SystemEntityEditorComponent } from './system-entity-editor.component';
import { BlueprintEditorComponent } from './blueprint-editor.component';
import { CampaignCreateComponent } from './campaign-create.component';

/**
 * Game-system window. A master-detail browser: the left rail lists every system, the right
 * pane shows everything about the selected one — its ready-made actors, locations, rules and
 * notes (the presets authored in <see cref="SystemEntityEditorComponent"/>), the campaigns
 * already using it, and the settings to rename, version, export or delete it.
 *
 * A campaign is bound to a system, so selecting a system here surfaces its campaigns and the
 * GM can jump straight into one or create a new campaign that adopts the system.
 */
@Component({
  selector: 'app-game-system-manager',
  imports: [FormsModule, SystemEntityEditorComponent, BlueprintEditorComponent, CampaignCreateComponent],
  templateUrl: './game-system-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameSystemManagerComponent {
  protected readonly gameState = inject(ActiveGameStateService);
  private readonly gameSystems = inject(GameSystemService);

  readonly closed = output<void>();

  /** When hosted outside a modal dialog the frame already provides a close button. */
  readonly showClose = input(true);

  protected readonly selectedId = signal<string | null>(null);
  protected readonly activeTab = signal<
    'actors' | 'locations' | 'rules' | 'notes' | 'blueprints' | 'campaigns'
  >('blueprints');

  protected readonly tabs = [
    { id: 'blueprints' as const, label: 'Blueprints' },
    { id: 'actors' as const, label: 'Actors' },
    { id: 'locations' as const, label: 'Locations' },
    { id: 'rules' as const, label: 'Rules' },
    { id: 'notes' as const, label: 'Notes' },
    { id: 'campaigns' as const, label: 'Campaigns' },
  ];

  protected readonly editing = signal(false);
  protected readonly draftName = signal('');
  protected readonly draftVersion = signal('');

  protected readonly creating = signal(false);
  protected readonly newName = signal('');
  protected readonly newVersion = signal('');

  protected readonly creatingCampaign = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<string | null>(null);

  protected readonly systems = computed(() =>
    [...this.gameState.gameSystems()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  protected readonly selected = computed(
    () => this.systems().find((system) => system.id === this.selectedId()) ?? null,
  );

  /** Campaigns that already use the selected system. */
  protected readonly campaignsForSelected = computed<Campaign[]>(() => {
    const system = this.selected();
    if (!system) return [];
    return this.gameState
      .campaigns()
      .filter((campaign) => campaign.gameSystemId === system.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  constructor() {
    // Auto-select the first system once the catalogue is available.
    effect(() => {
      const systems = this.systems();
      untracked(() => {
        if (systems.length === 0) {
          this.selectedId.set(null);
          return;
        }
        if (!systems.some((system) => system.id === this.selectedId())) {
          this.selectedId.set(systems.at(0)!.id);
        }
      });
    });
  }

  protected select(system: GameSystem): void {
    this.selectedId.set(system.id);
    this.editing.set(false);
    this.error.set(null);
  }

  protected isSelected(system: GameSystem): boolean {
    return this.selectedId() === system.id;
  }

  protected isCurrentCampaign(campaign: Campaign): boolean {
    return this.gameState.activeCampaignId() === campaign.id;
  }

  protected startCreate(): void {
    this.creating.set(true);
    this.newName.set('');
    this.newVersion.set('');
  }

  protected async create(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const created = await this.gameSystems.create({ name, version: this.newVersion().trim() });
      this.gameState.registerGameSystem(created);
      this.selectedId.set(created.id);
      this.creating.set(false);
      this.status.set(`Created “${created.name}”.`);
    } catch {
      this.error.set('Could not create the game system.');
    } finally {
      this.busy.set(false);
    }
  }

  protected beginEdit(system: GameSystem): void {
    this.editing.set(true);
    this.draftName.set(system.name);
    this.draftVersion.set(system.version);
    this.error.set(null);
  }

  protected async saveEdit(system: GameSystem): Promise<void> {
    const name = this.draftName().trim();
    if (!name) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const updated: GameSystem = { ...system, name, version: this.draftVersion().trim() };
      await this.gameSystems.update(updated);
      this.gameState.replaceGameSystem(updated);
      this.editing.set(false);
      this.status.set(`Saved “${name}”.`);
    } catch {
      this.error.set('Could not update the game system.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async deleteSystem(system: GameSystem): Promise<void> {
    if (!globalThis.confirm(`Delete game system “${system.name}”?`)) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.gameSystems.delete(system.id);
      this.gameState.removeGameSystem(system.id);
      this.selectedId.set(null);
      this.status.set(`Deleted “${system.name}”.`);
    } catch {
      this.error.set('Could not delete the system. It may still be used by a campaign.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Seeds the system's content into the campaign the GM picks. */
  protected async applyToCampaign(system: GameSystem, campaign: Campaign): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.status.set(null);
    try {
      const result = await this.gameSystems.applyToCampaign(system.id, campaign.id);
      this.status.set(
        result.total === 0
          ? `“${system.name}” has no content to import.`
          : `Imported ${result.total} entit${result.total === 1 ? 'y' : 'ies'} from “${system.name}”.`,
      );
      if (this.gameState.activeCampaignId() === campaign.id) {
        await this.gameState.setActiveCampaign(campaign.id);
      }
    } catch {
      this.error.set('Could not import the system content.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Makes a campaign active and reloads its content. */
  protected async openCampaign(campaign: Campaign): Promise<void> {
    await this.gameState.setActiveCampaign(campaign.id);
  }

  protected async exportSystem(system: GameSystem): Promise<void> {
    this.error.set(null);
    try {
      const exported = await this.gameSystems.export(system.id);
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement('a');
      anchor.href = url;
      anchor.download = `${slug(system.name)}.gamesystem.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.status.set(`Exported “${system.name}”.`);
    } catch {
      this.error.set('Could not export the game system.');
    }
  }

  protected async importSystem(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error.set(null);
    this.status.set(null);
    try {
      const created = await this.gameSystems.import(JSON.parse(await file.text()));
      this.gameState.registerGameSystem(created);
      this.selectedId.set(created.id);
      this.status.set(`Imported “${created.name}”.`);
    } catch {
      this.error.set('That file is not a valid game-system export.');
    }
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
