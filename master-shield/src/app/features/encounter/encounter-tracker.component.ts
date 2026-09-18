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

import { EncounterService } from '../../core/services/encounter.service';
import { ContentStoreService } from '../../core/services/content-store.service';
import { ActiveGameStateService } from '../../core/services/active-game-state.service';
import { WindowManagerService } from '../../core/windows/window-manager.service';
import { Actor } from '../../core/models/actor.model';
import { Encounter, EncounterParticipant } from '../../core/models/encounter.model';
import { ParticipantCardComponent, ParticipantStateChange } from './participant-card.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ResourceChange } from '../../shared/resource-bar/resource-bar.component';

/** Initiative tracker with manual reordering, resource control and sheet access. */
@Component({
  selector: 'app-encounter-tracker',
  imports: [FormsModule, ParticipantCardComponent, IconComponent],
  templateUrl: './encounter-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterTrackerComponent {
  private readonly encounterService = inject(EncounterService);
  private readonly store = inject(ContentStoreService);
  protected readonly gameState = inject(ActiveGameStateService);
  private readonly windows = inject(WindowManagerService);

  readonly encounterId = input<string | null>(null);

  protected readonly encounter = signal<Encounter | null>(null);
  protected readonly loading = signal(false);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  /** All encounters of the active session, so the GM can switch without leaving the window. */
  protected readonly sessionEncounters = signal<Encounter[]>([]);
  /** The encounter currently shown; seeded from the input but switchable in-window. */
  private readonly currentId = signal<string | null>(null);

  protected readonly selectedActorId = signal('');
  protected readonly newInitiative = signal(0);
  protected readonly showAdd = signal(false);

  protected readonly turnIndex = signal(0);
  protected readonly dragId = signal<string | null>(null);
  protected readonly dropIndex = signal<number | null>(null);

  /** Local order override while the GM drags, so the list does not jump. */
  private readonly manualOrder = signal<string[] | null>(null);

  protected readonly participants = computed<EncounterParticipant[]>(() => {
    const list = this.encounter()?.participants ?? [];
    const order = this.manualOrder();

    // Attach the live store actor to each participant so the template reacts to edits made
    // elsewhere (resource changes in the sheet, encounter-resource selection, renames).
    const live: EncounterParticipant[] = list.map((p) => ({
      ...p,
      actor: this.store.actorById(p.actorId) ?? p.actor,
    }));

    if (order) {
      const byId = new Map(live.map((p) => [p.id, p]));
      const ordered = order.map((id) => byId.get(id)).filter((p): p is EncounterParticipant => !!p);
      const missing = live.filter((p) => !order.includes(p.id));
      return [...ordered, ...missing];
    }

    return [...live].sort(
      (a, b) =>
        b.initiative - a.initiative ||
        (a.actor?.name ?? '').localeCompare(b.actor?.name ?? '') ||
        a.id.localeCompare(b.id),
    );
  });

  protected readonly currentTurnId = computed(
    () =>
      this.participants().at(this.turnIndex() % Math.max(this.participants().length, 1))?.id ?? null,
  );

  protected readonly availableActors = computed(() => {
    const inEncounter = new Set(this.participants().map((p) => p.actorId));
    return this.store.actors().filter((actor) => !inEncounter.has(actor.id));
  });

  constructor() {
    effect(() => {
      const inputId = this.encounterId();
      // Re-fetch when the target encounter changes, or when the GM changes membership from
      // another window (adding a combatant, editing the resource selection, etc.).
      const revision = this.gameState.encounterRevision();
      void revision;

      // Everything below reads/writes signals that must not feed back into this effect, so
      // it runs untracked. Without this the effect would re-trigger on its own state writes.
      untracked(() => {
        // A different encounter requested from outside wins over the in-window selection.
        const target = inputId ?? this.currentId();
        if (!target) {
          this.encounter.set(null);
          return;
        }

        if (inputId && inputId !== this.currentId()) {
          this.currentId.set(inputId);
        }

        void this.load(target);
      });
    });
  }

  /**
   * Display label for an encounter: its name plus the 1-based index within the session, so
   * the default "Encounter" reads as "Encounter #1".
   */
  protected encounterLabel(encounter: Encounter): string {
    const index = this.sessionEncounters().findIndex((e) => e.id === encounter.id);
    return index >= 0 ? `${encounter.name} #${index + 1}` : encounter.name;
  }

  /** Switches the tracker to another encounter of the same session. */
  protected switchEncounter(id: string): void {
    if (!id) return;
    // Setting the active encounter bumps the revision, which drives the reload effect.
    this.currentId.set(id);
    this.gameState.setActiveEncounter(id);
  }

  /**
   * Adds a new encounter to the current session and switches to it. Encounters are
   * numbered server-side, so no name is required.
   */
  protected async createEncounter(): Promise<void> {
    const sessionId = this.encounter()?.sessionId ?? this.gameState.activeSessionId();
    if (!sessionId) return;

    this.pending.set(true);
    this.error.set(null);
    try {
      const created = await this.encounterService.create({ sessionId, isActive: true, currentRound: 1 });
      this.sessionEncounters.update((list) => [...list, created]);
      this.currentId.set(created.id);
      this.gameState.setActiveEncounter(created.id);
      await this.load(created.id);
    } catch {
      this.error.set('Could not create the encounter.');
    } finally {
      this.pending.set(false);
    }
  }

  /** Reloads the list of the session's encounters and the tracker body. */
  private async refreshSessionEncounters(): Promise<void> {
    const sessionId = this.encounter()?.sessionId ?? this.gameState.activeSessionId();
    if (!sessionId) {
      this.sessionEncounters.set([]);
      return;
    }

    try {
      this.sessionEncounters.set(await this.encounterService.listBySession(sessionId));
    } catch {
      this.sessionEncounters.set([]);
    }
  }

  /** Monotonic token so only the most recent load may write state. */
  private loadToken = 0;

  protected async load(encounterId: string): Promise<void> {
    // Token guard: if another load starts before this one finishes, only the latest may
    // write state. Prevents flicker from overlapping requests racing each other.
    const token = ++this.loadToken;
    // Only show the loading placeholder when there is nothing on screen yet; background
    // refreshes (membership changes) update the list in place instead of flashing.
    if (!this.encounter()) {
      this.loading.set(true);
    }
    this.error.set(null);
    try {
      const isSameEncounter = this.encounter()?.id === encounterId;
      const encounter = await this.encounterService.getById(encounterId);
      if (token !== this.loadToken) return;

      const participants = await this.hydrateActors(encounter.participants ?? []);
      if (token !== this.loadToken) return;

      this.encounter.set({ ...encounter, participants });
      this.currentId.set(encounter.id);

      // Preserve the GM's place when merely refreshing the same encounter's membership;
      // only reset turn order / manual order when switching to a different encounter.
      if (!isSameEncounter) {
        this.manualOrder.set(null);
        this.turnIndex.set(0);
      }

      await this.refreshSessionEncounters();
    } catch {
      if (token === this.loadToken) {
        this.encounter.set(null);
        this.error.set('Could not load the encounter.');
      }
    } finally {
      if (token === this.loadToken) {
        this.loading.set(false);
      }
    }
  }

  /** Participants arrive with a nested actor, but fall back to the local store. */
  private async hydrateActors(
    participants: EncounterParticipant[],
  ): Promise<EncounterParticipant[]> {
    return participants.map((participant) => ({
      ...participant,
      actor: participant.actor ?? this.store.actorById(participant.actorId) ?? undefined,
    }));
  }

  protected trackParticipant(_index: number, participant: EncounterParticipant): string {
    return participant.id;
  }

  protected actorOf(participant: EncounterParticipant): Actor | null {
    // The participant already carries the live store actor (see the participants computed).
    return participant.actor ?? this.store.actorById(participant.actorId) ?? null;
  }

  protected async addParticipant(): Promise<void> {
    const encounter = this.encounter();
    const actorId = this.selectedActorId();
    if (!encounter || !actorId) return;

    await this.mutate(async () => {
      const created = await this.encounterService.addParticipant(encounter.id, {
        actorId,
        initiative: this.newInitiative(),
        temporaryHpOffset: 0,
      });

      const actor = this.store.actorById(actorId) ?? undefined;
      this.encounter.update((current) =>
        current
          ? { ...current, participants: [...current.participants, { ...created, actor }] }
          : current,
      );
      this.manualOrder.set(null);
      this.selectedActorId.set('');
      this.newInitiative.set(0);
    });
  }

  protected async onStateChange(change: ParticipantStateChange): Promise<void> {
    const encounter = this.encounter();
    if (!encounter) return;

    this.encounter.update((current) =>
      current
        ? {
          ...current,
          participants: current.participants.map((p) =>
            p.id === change.participantId
              ? {
                ...p,
                temporaryHpOffset: change.temporaryHpOffset,
                temporaryEffects: change.temporaryEffects,
              }
              : p,
          ),
        }
        : current,
    );

    await this.mutate(() =>
      this.encounterService.updateParticipantState(
        encounter.id,
        change.participantId,
        change.temporaryHpOffset,
        change.temporaryEffects,
      ),
    );
  }

  protected async removeParticipant(participantId: string): Promise<void> {
    const encounter = this.encounter();
    if (!encounter) return;

    await this.mutate(async () => {
      await this.encounterService.removeParticipant(encounter.id, participantId);
      this.encounter.update((current) =>
        current
          ? { ...current, participants: current.participants.filter((p) => p.id !== participantId) }
          : current,
      );
      this.manualOrder.set(null);
      this.turnIndex.set(0);
    });
  }

  protected async advanceRound(): Promise<void> {
    const encounter = this.encounter();
    if (!encounter) return;

    await this.mutate(async () => {
      await this.encounterService.advanceRound(encounter.id);
      this.encounter.update((current) =>
        current ? { ...current, currentRound: current.currentRound + 1 } : current,
      );
      this.nextTurn();
    });
  }

  /** Steps the encounter back a round (round 1 is the floor). */
  protected async previousRound(): Promise<void> {
    const encounter = this.encounter();
    if (!encounter || encounter.currentRound <= 1) return;

    const target = encounter.currentRound - 1;
    await this.mutate(async () => {
      await this.encounterService.setRound(encounter.id, target);
      this.encounter.update((current) =>
        current ? { ...current, currentRound: target } : current,
      );
      this.previousTurn();
    });
  }

  protected nextTurn(): void {
    const count = this.participants().length;
    if (count === 0) {
      this.turnIndex.set(0);
      return;
    }
    this.turnIndex.update((index) => (index + 1) % count);
  }

  protected previousTurn(): void {
    const count = this.participants().length;
    if (count === 0) {
      this.turnIndex.set(0);
      return;
    }
    this.turnIndex.update((index) => (index - 1 + count) % count);
  }

  // ---- Drag reordering ------------------------------------------------------

  protected onDragStart(participantId: string, event: DragEvent): void {
    this.dragId.set(participantId);
    event.dataTransfer?.setData('text/plain', participantId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOver(index: number, event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dropIndex.set(index);
  }

  protected onDragEnd(): void {
    this.dragId.set(null);
    this.dropIndex.set(null);
  }

  protected async onDrop(index: number, event: DragEvent): Promise<void> {
    event.preventDefault();

    const draggedId = this.dragId();
    const encounter = this.encounter();
    this.dragId.set(null);
    this.dropIndex.set(null);

    if (!draggedId || !encounter) return;

    const current = this.participants().map((p) => p.id);
    const from = current.indexOf(draggedId);
    if (from === -1 || from === index) return;

    const next = [...current];
    next.splice(from, 1);
    next.splice(index, 0, draggedId);

    // Show the new order immediately, then persist it.
    this.manualOrder.set(next);
    this.renumber(next);

    try {
      await this.encounterService.reorderParticipants(encounter.id, next);
      await this.load(encounter.id);
    } catch {
      this.error.set('Could not save the new order.');
      this.manualOrder.set(null);
      await this.load(encounter.id);
    }
  }

  /** Mirrors the persisted initiative rewrite so the list reflects the drop right away. */
  private renumber(order: string[]): void {
    const participants = this.encounter()?.participants ?? [];
    const highest = participants.length === 0 ? 0 : Math.max(...participants.map((p) => p.initiative));

    this.encounter.update((current) =>
      current
        ? {
          ...current,
          participants: current.participants.map((participant) => {
            const position = order.indexOf(participant.id);
            return position === -1
              ? participant
              : { ...participant, initiative: highest - position * 0.01 };
          }),
        }
        : current,
    );
  }

  protected moveUp(index: number): void {
    if (index <= 0) return;
    void this.reorderTo(index, index - 1);
  }

  protected moveDown(index: number): void {
    if (index >= this.participants().length - 1) return;
    void this.reorderTo(index, index + 1);
  }

  /** Keyboard-accessible reordering fallback for drag and drop. */
  private async reorderTo(from: number, to: number): Promise<void> {
    const encounter = this.encounter();
    if (!encounter) return;

    const next = this.participants().map((p) => p.id);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    this.manualOrder.set(next);
    this.renumber(next);

    await this.mutate(async () => {
      await this.encounterService.reorderParticipants(encounter.id, next);
      await this.load(encounter.id);
    });
  }

  protected openSheet(participant: EncounterParticipant): void {
    const actor = this.actorOf(participant);
    if (!actor) return;

    this.windows.open({
      kind: 'actor-sheet',
      contextId: actor.id,
      title: actor.name,
      icon: actor.type === 'PlayerCharacter' ? 'ra:hood' : 'ra:monster-skull',
      colSpan: 5,
      rowSpan: 6,
      singleton: true,
    });
  }

  /** Resource bars inside an encounter row write through to the actor (PCs) or the
   * participant's isolated copy (NPCs). */
  protected async onResourceAdjusted(
    participant: EncounterParticipant,
    change: ResourceChange,
  ): Promise<void> {
    const encounter = this.encounter();
    if (!encounter) return;

    const actor = this.actorOf(participant);
    const resource = (actor?.resources ?? []).find((r) => r.id === change.resourceId);
    if (!resource) return;

    const current =
      participant.resourceOverrides?.[change.resourceId] ?? resource.currentValue;
    const next = change.replace
      ? change.delta
      : current + change.delta;
    const clamped = Math.max(0, Math.min(resource.maxValue, next));

    // NPCs keep an isolated value on the participant; PCs update the shared actor resource.
    if (actor?.type === 'PlayerCharacter') {
      this.store.patchResourceValue(actor.id, change.resourceId, clamped);
    } else {
      this.encounter.update((current) =>
        current
          ? {
            ...current,
            participants: current.participants.map((p) =>
              p.id === participant.id
                ? {
                  ...p,
                  resourceOverrides: {
                    ...(p.resourceOverrides ?? {}),
                    [change.resourceId]: clamped,
                  },
                }
                : p,
            ),
          }
          : current,
      );
    }

    await this.mutate(() =>
      this.encounterService.adjustParticipantResource(
        encounter.id,
        participant.id,
        change.resourceId,
        clamped,
        true,
      ),
    );
  }

  private async mutate(action: () => Promise<void>): Promise<void> {
    this.pending.set(true);
    this.error.set(null);
    try {
      await action();
    } catch {
      this.error.set('The last change could not be saved.');
      const id = this.encounterId();
      if (id) await this.load(id);
    } finally {
      this.pending.set(false);
    }
  }
}
