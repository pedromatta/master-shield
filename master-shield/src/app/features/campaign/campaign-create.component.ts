import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ActiveGameStateService } from '../../core/services/active-game-state.service';
import { GameSystemService } from '../../core/services/game-system.service';
/**
 * Creates the campaign (and, when the database has no accounts yet, the owner account)
 * so the shield is usable from a completely empty install.
 */
@Component({
  selector: 'app-campaign-create',
  imports: [FormsModule],
  templateUrl: './campaign-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignCreateComponent {
  protected readonly gameState = inject(ActiveGameStateService);
  private readonly gameSystemService = inject(GameSystemService);

  /** Renders as a modal dialog instead of a full-page setup screen. */
  readonly asDialog = input(false);

  /** Pre-selects a game system when launched from the game-system window. */
  readonly presetGameSystemId = input<string | null>(null);

  readonly created = output<void>();
  readonly cancelled = output<void>();

  protected readonly name = signal('');
  protected readonly gameSystemId = signal('');

  constructor() {
    // Adopt the system the hosting window preselected (game-system window flow).
    effect(() => {
      const preset = this.presetGameSystemId();
      if (preset) this.gameSystemId.set(preset);
    });
  }
  protected readonly newSystemName = signal('');
  protected readonly newSystemVersion = signal('');
  protected readonly showNewSystem = signal(false);
  /** Copy the chosen system's ready-made entities into the new campaign. */
  protected readonly seedSystemContent = signal(true);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  // Accounts are created on the sign-in screen; a campaign always belongs to the signed-in GM.
  protected readonly canSubmit = computed(
    () => this.name().trim().length > 0 && !this.saving(),
  );

  protected onName(value: string): void {
    this.name.set(value);
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    this.saving.set(true);
    this.error.set(null);

    try {
      const campaign = await this.gameState.createCampaign({
        name: this.name(),
        gameSystemId: this.gameSystemId() || null,
      });

      // Seed the fresh campaign with the system's ready-made content so bestiaries, rules,
      // locations and notes are available immediately.
      const systemId = this.gameSystemId();
      if (systemId && this.seedSystemContent()) {
        try {
          await this.gameSystemService.applyToCampaign(systemId, campaign.id);
        } catch {
          // The campaign exists; a failed seed is non-fatal and can be retried from the
          // Campaigns window.
        }
      }

      this.created.emit();
    } catch (error) {
      this.error.set('Could not create the campaign. Check the API is running and try again.');
      console.error(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async createGameSystem(): Promise<void> {
    const name = this.newSystemName().trim();
    if (!name) return;

    this.error.set(null);
    try {
      const system = await this.gameSystemService.create({
        name,
        version: this.newSystemVersion().trim(),
      });
      this.gameState.registerGameSystem(system);
      this.gameSystemId.set(system.id);
      this.newSystemName.set('');
      this.newSystemVersion.set('');
      this.showNewSystem.set(false);
    } catch {
      this.error.set('Could not create the game system.');
    }
  }
}
