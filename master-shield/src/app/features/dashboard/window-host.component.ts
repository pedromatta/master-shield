import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AppWindow, WindowManagerService } from '../../core/windows/window-manager.service';
import { WindowFrameComponent } from '../../shared/window-frame/window-frame.component';
import { ActorSheetComponent } from '../tools/actor-sheet/actor-sheet.component';
import { NpcGridComponent } from '../tools/npc-grid/npc-grid.component';
import { NotesPanelComponent } from '../tools/notes-panel/notes-panel.component';
import { CountersPanelComponent } from '../tools/counters-panel/counters-panel.component';
import { LocationsPanelComponent } from '../tools/locations-panel/locations-panel.component';
import { RulesPanelComponent } from '../tools/rules-panel/rules-panel.component';
import { MapPanelComponent } from '../tools/map-panel/map-panel.component';
import { EncounterTrackerComponent } from '../encounter/encounter-tracker.component';
import { SessionsWindowComponent } from '../campaign/sessions-window.component';
import { CampaignsWindowComponent } from '../campaign/campaigns-window.component';
import { GameSystemManagerComponent } from '../campaign/game-system-manager.component';
import { ActiveGameStateService } from '../../core/services/active-game-state.service';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * The tiled work area. Windows share one CSS grid and can be minimized to the dock at
 * the bottom, maximized over the whole area, or closed.
 */
@Component({
  selector: 'app-window-host',
  imports: [
    WindowFrameComponent,
    ActorSheetComponent,
    NpcGridComponent,
    NotesPanelComponent,
    CountersPanelComponent,
    LocationsPanelComponent,
    RulesPanelComponent,
    MapPanelComponent,
    EncounterTrackerComponent,
    SessionsWindowComponent,
    CampaignsWindowComponent,
    GameSystemManagerComponent,
    IconComponent,
  ],
  templateUrl: './window-host.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-0 min-w-0',
    '[style.grid-template-columns]': 'gridColumns()',
    '[style.grid-template-rows]': 'gridRows()',
  },
})
export class WindowHostComponent {
  protected readonly windows = inject(WindowManagerService);
  private readonly gameState = inject(ActiveGameStateService);

  protected readonly visible = this.windows.visibleWindows;
  protected readonly minimized = this.windows.minimizedWindows;
  protected readonly activeEncounterId = this.gameState.activeEncounterId;

  protected readonly gridColumns = computed(
    () => `repeat(${this.windows.gridColumns}, minmax(0, 1fr))`,
  );

  protected readonly gridRows = computed(() => `repeat(${this.windows.gridRows}, minmax(0, 1fr))`);

  protected readonly hasWindows = computed(() => this.windows.windows().length > 0);

  protected trackWindow(_index: number, window: AppWindow): string {
    return window.id;
  }

  protected restore(id: string): void {
    this.windows.restore(id);
    this.windows.focus(id);
  }
}
