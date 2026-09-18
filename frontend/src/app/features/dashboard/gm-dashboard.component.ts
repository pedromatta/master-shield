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
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
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
  protected readonly auth = inject(AuthService);
  private readonly windows = inject(WindowManagerService);
  private readonly router = inject(Router);

  /** Signs the GM out and returns to the login screen. */
  protected async logout(): Promise<void> {
    if (window.confirm("Are you sure you want to log out?")) {
      await this.auth.logout();
      await this.router.navigate(['/login']);
    }
  }

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

  /** Opens the personal theme editor window. */
  protected openTheme(): void {
    this.windows.open({ kind: 'settings', colSpan: 4, rowSpan: 6, singleton: true });
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
}
