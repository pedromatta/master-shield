import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../core/services/content-store.service';
import { ActiveGameStateService } from '../../core/services/active-game-state.service';
import { EncounterService } from '../../core/services/encounter.service';
import { WindowManagerService, WindowKind } from '../../core/windows/window-manager.service';
import { CampaignCreateComponent } from '../campaign/campaign-create.component';
import { CharacterSidebarComponent } from './character-sidebar.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ToolBarComponent } from './tool-bar.component';
import { WindowHostComponent } from './window-host.component';

/** Application shell: character sidebar, tiled work area and bottom tool bar. */
@Component({
  selector: 'app-gm-dashboard',
  imports: [
    FormsModule,
    CampaignCreateComponent,
    CharacterSidebarComponent,
    ToolBarComponent,
    WindowHostComponent,
    IconComponent,
  ],
  templateUrl: './gm-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GmDashboardComponent {
  protected readonly gameState = inject(ActiveGameStateService);
  protected readonly store = inject(ContentStoreService);
  private readonly windows = inject(WindowManagerService);
  private readonly encounters = inject(EncounterService);

  protected readonly showNewCampaign = signal(false);
  protected readonly sessionError = signal<string | null>(null);

  /** First-run: nothing to show until the GM creates an account and campaign. */
  protected readonly needsSetup = computed(
    () => !this.gameState.loading() && this.gameState.campaigns().length === 0,
  );

  constructor() {
    void this.bootstrap();

    // Reload every content collection when the active campaign changes. This effect only
    // reads signals; opening the default window is deferred to a second effect so it
    // cannot retrigger a full campaign refetch.
    effect(() => {
      const campaignId = this.gameState.activeCampaignId();

      if (campaignId) {
        void this.store.loadAll(campaignId);
      } else {
        this.store.reset();
        this.windows.closeAll();
      }
    });

    effect(() => {
      const campaignId = this.gameState.activeCampaignId();
      const loading = this.store.loading();
      if (campaignId && !loading) {
        untracked(() => this.ensureDefaultWindows());
      }
    });
  }

  private async bootstrap(): Promise<void> {
    if (this.gameState.campaigns().length === 0) {
      await this.gameState.loadCampaigns();
    }
  }

  /** Opens the encounter tracker by default so combat is one glance away. */
  private ensureDefaultWindows(): void {
    if (this.windows.windows().length === 0) {
      this.windows.open({ kind: 'encounter', colSpan: 6, rowSpan: 8, singleton: true });
    }
  }

  protected openTool(kind: WindowKind): void {
    this.windows.open({ kind, singleton: false });
  }

  /** Opens the single campaign-management window. */
  protected openCampaigns(): void {
    this.windows.open({ kind: 'campaigns', colSpan: 6, rowSpan: 6, singleton: true });
  }

  /** Opens the game-system editor window, where presets are authored. */
  protected openSystems(): void {
    this.windows.open({ kind: 'systems', colSpan: 6, rowSpan: 8, singleton: true });
  }

  /** Opens the single session-management window. */
  protected openSessions(): void {
    if (!this.gameState.activeCampaignId()) {
      this.sessionError.set('Select or create a campaign first.');
      return;
    }
    this.sessionError.set(null);
    this.windows.open({ kind: 'sessions', colSpan: 6, rowSpan: 6, singleton: true });
  }

  protected onCampaignCreated(): void {
    this.showNewCampaign.set(false);
    this.ensureDefaultWindows();
  }

  /** Creates an encounter for the active session and focuses the tracker. */
  protected async createEncounter(): Promise<void> {
    const sessionId = this.gameState.activeSessionId();
    if (!sessionId) {
      this.sessionError.set('Create or select a session first.');
      return;
    }

    try {
      const encounter = await this.encounters.create({
        sessionId,
        name: `Encounter ${(this.gameState.activeSession()?.title ?? '').trim()}`.trim(),
        isActive: true,
        currentRound: 1,
      });
      this.gameState.setActiveEncounter(encounter.id);
      this.windows.open({ kind: 'encounter', singleton: true });
    } catch {
      this.sessionError.set('Could not create the encounter.');
    }
  }
}
