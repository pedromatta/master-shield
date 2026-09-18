import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ContentStoreService } from '../../../core/services/content-store.service';
import { ContentService } from '../../../core/services/content.service';
import { ActiveGameStateService } from '../../../core/services/active-game-state.service';

/**
 * Shows whatever the campaign's stable map URI currently resolves to, plus a shortcut to
 * the locations grid for switching scenes.
 */
@Component({
  selector: 'app-map-panel',
  templateUrl: './map-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPanelComponent {
  private readonly store = inject(ContentStoreService);
  private readonly content = inject(ContentService);
  protected readonly gameState = inject(ActiveGameStateService);

  protected readonly copied = signal(false);
  /** Bumped to defeat caching when the GM switches maps. */
  protected readonly refreshToken = signal(Date.now());

  protected readonly currentLocation = computed(() =>
    this.store.locationById(this.gameState.activeCampaign()?.currentMapLocationId ?? null),
  );

  protected readonly stableUrl = computed(() => {
    const campaignId = this.gameState.activeCampaignId();
    return campaignId ? this.content.stableMapUrl(campaignId) : '';
  });

  protected readonly displayUrl = computed(() => {
    const url = this.stableUrl();
    return url ? `${url}?t=${this.refreshToken()}` : '';
  });

  protected refresh(): void {
    this.refreshToken.set(Date.now());
  }

  protected async copyUrl(): Promise<void> {
    const url = this.stableUrl();
    if (!url) return;

    try {
      await globalThis.navigator?.clipboard?.writeText(
        new URL(url, globalThis.location?.origin).href,
      );
      this.copied.set(true);
      globalThis.setTimeout?.(() => this.copied.set(false), 2000);
    } catch {
      /* clipboard unavailable; the URL is still selectable in the field */
    }
  }

  protected openLocations(): void {
    // The tool bar owns window creation; this panel stays presentational.
    globalThis.dispatchEvent(new CustomEvent('daedala:open-tool', { detail: 'locations' }));
  }
}
