import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ActiveGameStateService } from '../../core/services/active-game-state.service';
import { GameSystemService } from '../../core/services/game-system.service';
import { CampaignService } from '../../core/services/campaign.service';
import { Campaign } from '../../core/models/campaign.model';
import { CampaignCreateComponent } from './campaign-create.component';

/**
 * Campaigns window: create, select, rename, re-system and delete campaigns from one place,
 * and copy a game system's ready-made content into the active campaign. The campaign stays
 * bound to its chosen system, but the GM can re-import entities at any time.
 */
@Component({
  selector: 'app-campaigns-window',
  imports: [FormsModule, CampaignCreateComponent],
  templateUrl: './campaigns-window.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignsWindowComponent {
  protected readonly gameState = inject(ActiveGameStateService);
  private readonly gameSystems = inject(GameSystemService);
  private readonly campaignsService = inject(CampaignService);

  protected readonly editingId = signal<string | null>(null);
  protected readonly draftName = signal('');
  protected readonly draftSystemId = signal('');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<string | null>(null);
  protected readonly showCreate = signal(false);
  /** Campaign whose content actions (import/export/system) are expanded. */
  protected readonly openContentId = signal<string | null>(null);

  protected toggleContent(campaign: Campaign): void {
    this.openContentId.update((current) => (current === campaign.id ? null : campaign.id));
  }

  protected isContentOpen(campaign: Campaign): boolean {
    return this.openContentId() === campaign.id;
  }

  protected readonly campaigns = computed(() =>
    [...this.gameState.campaigns()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  protected isActive(campaign: Campaign): boolean {
    return this.gameState.activeCampaignId() === campaign.id;
  }

  protected systemName(campaign: Campaign): string {
    if (!campaign.gameSystemId) return 'No game system';
    const system = this.gameState.gameSystems().find((s) => s.id === campaign.gameSystemId);
    return system ? `${system.name} ${system.version}`.trim() : 'Unknown system';
  }

  protected async select(campaign: Campaign): Promise<void> {
    await this.gameState.setActiveCampaign(campaign.id);
  }

  protected startEdit(campaign: Campaign): void {
    this.editingId.set(campaign.id);
    this.draftName.set(campaign.name);
    this.draftSystemId.set(campaign.gameSystemId ?? '');
    this.error.set(null);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected async saveEdit(campaign: Campaign): Promise<void> {
    const name = this.draftName().trim();
    if (!name) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.gameState.updateCampaign({
        ...campaign,
        name,
        gameSystemId: this.draftSystemId() || null,
      });
      this.editingId.set(null);
    } catch {
      this.error.set('Could not save the campaign.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(campaign: Campaign): Promise<void> {
    if (!globalThis.confirm(`Delete campaign “${campaign.name}” and everything in it?`)) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.gameState.deleteCampaign(campaign.id);
    } catch {
      this.error.set('Could not delete the campaign.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Copies the campaign's game-system content into the active campaign. */
  protected async importSystemContent(campaign: Campaign): Promise<void> {
    if (!campaign.gameSystemId) {
      this.error.set('This campaign has no game system to import from.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    this.status.set(null);
    try {
      const result = await this.gameSystems.applyToCampaign(campaign.gameSystemId, campaign.id);
      this.status.set(
        result.total === 0
          ? 'That system has no content to import.'
          : `Imported ${result.total} entit${result.total === 1 ? 'y' : 'ies'}.`,
      );
    } catch {
      this.error.set('Could not import the game system content.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Downloads every authored entity in the campaign as a portable JSON document. */
  protected async exportContent(campaign: Campaign): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.status.set(null);
    try {
      const exported = await this.campaignsService.exportContent(campaign.id);
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement('a');
      anchor.href = url;
      anchor.download = `${slug(campaign.name)}.campaign.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.status.set(`Exported “${campaign.name}”.`);
    } catch {
      this.error.set('Could not export the campaign.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Creates real entities in a campaign from a previously exported document. */
  protected async importContent(campaign: Campaign, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.busy.set(true);
    this.error.set(null);
    this.status.set(null);
    try {
      const parsed = JSON.parse(await file.text());
      await this.campaignsService.importContent(campaign.id, parsed);
      this.status.set(`Imported content into “${campaign.name}”.`);
      // Reload the active campaign's collections so the new entities appear at once.
      if (this.gameState.activeCampaignId() === campaign.id) {
        await this.gameState.setActiveCampaign(campaign.id);
      }
    } catch {
      this.error.set('That file is not a valid campaign export.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Captures the campaign's content into a game system as reusable templates. */
  protected async captureToSystem(campaign: Campaign): Promise<void> {
    if (!campaign.gameSystemId) {
      this.error.set('This campaign has no game system to capture into.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    this.status.set(null);
    try {
      const captured = await this.campaignsService.captureToSystem(campaign.id, campaign.gameSystemId);
      this.status.set(`Captured ${captured.length} template(s) into the system.`);
    } catch {
      this.error.set('Could not capture the campaign content.');
    } finally {
      this.busy.set(false);
    }
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
