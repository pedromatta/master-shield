import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ActiveGameStateService } from '../../core/services/active-game-state.service';
import { EncounterService } from '../../core/services/encounter.service';
import { Encounter } from '../../core/models/encounter.model';
import { Session } from '../../core/models/session.model';

/**
 * Sessions window: one place to create, select, rename, schedule and delete the campaign's
 * sessions, and to see the encounters each one holds. The GM pages through their prep here
 * instead of juggling top-bar buttons.
 */
@Component({
  selector: 'app-sessions-window',
  imports: [FormsModule],
  templateUrl: './sessions-window.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsWindowComponent {
  protected readonly gameState = inject(ActiveGameStateService);
  private readonly encounters = inject(EncounterService);

  protected readonly editingId = signal<string | null>(null);
  protected readonly draftTitle = signal('');
  protected readonly draftNumber = signal(1);
  protected readonly draftDate = signal('');
  protected readonly draftLog = signal('');

  protected readonly showCreate = signal(false);
  protected readonly newTitle = signal('');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Encounters of the selected session, shown as a preview. */
  protected readonly encountersForActive = signal<Encounter[]>([]);

  protected readonly sessions = computed(() =>
    [...this.gameState.sessions()].sort((a, b) => b.sessionNumber - a.sessionNumber),
  );

  constructor() {
    // Keep the encounter preview in sync with whichever session is selected.
    void this.refreshEncounters();
  }

  protected async select(session: Session): Promise<void> {
    this.gameState.setActiveSession(session.id);
    this.gameState.setActiveEncounter(null);
    await this.gameState.loadActiveEncounter(session.id);
    await this.refreshEncounters();
  }

  protected isActive(session: Session): boolean {
    return this.gameState.activeSessionId() === session.id;
  }

  /** Renders the leading YYYY-MM-DD of an ISO timestamp without pulling in a pipe. */
  protected dateOnly(value: string | null | undefined): string {
    return value ? value.slice(0, 10) : '';
  }

  protected startEdit(session: Session): void {
    this.editingId.set(session.id);
    this.draftTitle.set(session.title);
    this.draftNumber.set(session.sessionNumber);
    this.draftDate.set(session.datePlayed ? session.datePlayed.slice(0, 10) : '');
    this.draftLog.set(session.log ?? '');
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected async saveEdit(session: Session): Promise<void> {
    const title = this.draftTitle().trim();
    if (!title) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.gameState.updateSession({
        ...session,
        title,
        sessionNumber: Math.max(1, this.draftNumber()),
        datePlayed: this.draftDate()
          ? new Date(this.draftDate()).toISOString()
          : session.datePlayed,
        log: this.draftLog(),
      });
      this.editingId.set(null);
    } catch {
      this.error.set('Could not save the session.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async create(): Promise<void> {
    const title = this.newTitle().trim();
    if (!title) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const created = await this.gameState.createSession(title);
      this.newTitle.set('');
      this.showCreate.set(false);
      await this.refreshEncounters();
      void created;
    } catch {
      this.error.set('Could not create the session.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(session: Session): Promise<void> {
    if (!globalThis.confirm(`Delete session #${session.sessionNumber} “${session.title}”?`)) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.gameState.deleteSession(session.id);
      await this.refreshEncounters();
    } catch {
      this.error.set('Could not delete the session.');
    } finally {
      this.busy.set(false);
    }
  }

  private async refreshEncounters(): Promise<void> {
    const sessionId = this.gameState.activeSessionId();
    if (!sessionId) {
      this.encountersForActive.set([]);
      return;
    }

    try {
      this.encountersForActive.set(await this.encounters.listBySession(sessionId));
    } catch {
      this.encountersForActive.set([]);
    }
  }
}
