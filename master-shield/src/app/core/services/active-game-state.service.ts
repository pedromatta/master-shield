import { inject, Injectable, signal, computed } from '@angular/core';
import { CampaignService } from './campaign.service';
import { SessionService } from './session.service';
import { Campaign, CampaignCreate } from '../models/campaign.model';
import { Session } from '../models/session.model';
import { Encounter } from '../models/encounter.model';
import { EncounterService } from './encounter.service';
import { UserService, UserSummary } from './user.service';
import { GameSystemService } from './game-system.service';
import { GameSystem } from '../models/common.model';

const ACTIVE_CAMPAIGN_KEY = 'master-shield.activeCampaignId';
const ACTIVE_ENCOUNTER_KEY = 'master-shield.activeEncounterId';
const ACTIVE_USER_KEY = 'master-shield.activeUserId';

/**
 * Globally tracks the campaign/encounter the GM is currently running.
 * Selections are persisted so a reload resumes the same table state.
 */
@Injectable({ providedIn: 'root' })
export class ActiveGameStateService {
  private readonly campaignService = inject(CampaignService);
  private readonly encounterService = inject(EncounterService);
  private readonly sessionService = inject(SessionService);
  private readonly userService = inject(UserService);
  private readonly gameSystemService = inject(GameSystemService);

  private readonly _campaigns = signal<Campaign[]>([]);
  private readonly _users = signal<UserSummary[]>([]);
  private readonly _gameSystems = signal<GameSystem[]>([]);
  private readonly _sessions = signal<Session[]>([]);
  private readonly _activeCampaignId = signal<string | null>(readStorage(ACTIVE_CAMPAIGN_KEY));
  private readonly _activeUserId = signal<string | null>(readStorage(ACTIVE_USER_KEY));
  private readonly _activeEncounterId = signal<string | null>(readStorage(ACTIVE_ENCOUNTER_KEY));
  /**
   * Bumped whenever encounter membership changes elsewhere (adding a combatant from a sheet,
   * creating an encounter, editing resources). The tracker watches this so an open window
   * refreshes without the GM having to minimize and restore it.
   */
  private readonly _encounterRevision = signal(0);
  private readonly _activeSessionId = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly campaigns = this._campaigns.asReadonly();
  readonly users = this._users.asReadonly();
  readonly gameSystems = this._gameSystems.asReadonly();
  readonly sessions = this._sessions.asReadonly();
  readonly activeCampaignId = this._activeCampaignId.asReadonly();
  readonly activeUserId = this._activeUserId.asReadonly();
  readonly activeEncounterId = this._activeEncounterId.asReadonly();
  readonly encounterRevision = this._encounterRevision.asReadonly();
  readonly activeSessionId = this._activeSessionId.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly activeCampaign = computed(
    () => this._campaigns().find((c) => c.id === this._activeCampaignId()) ?? null,
  );

  readonly activeUser = computed(
    () => this._users().find((u) => u.id === this._activeUserId()) ?? this._users().at(0) ?? null,
  );

  readonly hasNoCampaigns = computed(() => !this._loading() && this._campaigns().length === 0);

  readonly activeSession = computed(
    () => this._sessions().find((s) => s.id === this._activeSessionId()) ?? null,
  );

  async loadCampaigns(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [campaigns, users, gameSystems] = await Promise.all([
        this.campaignService.list(),
        this.userService.list().catch(() => []),
        this.gameSystemService.list().catch(() => []),
      ]);

      this._campaigns.set(campaigns);
      this._users.set(users);
      this._gameSystems.set(gameSystems);

      if (users.length > 0 && !users.some((u) => u.id === this._activeUserId())) {
        this.setActiveUser(users.at(0)!.id);
      }

      if (!campaigns.some((c) => c.id === this._activeCampaignId())) {
        await this.setActiveCampaign(campaigns.at(0)?.id ?? null);
      } else if (this._activeCampaignId()) {
        await this.loadSessions(this._activeCampaignId()!);
      }
    } catch {
      this._error.set('Could not reach the Master Shield API.');
    } finally {
      this._loading.set(false);
    }
  }

  setActiveUser(userId: string | null): void {
    this._activeUserId.set(userId);
    writeStorage(ACTIVE_USER_KEY, userId);
  }

  /** Updates an account's profile fields and reflects the change locally. */
  async updateUser(id: string, changes: { username?: string; email?: string; displayName?: string }): Promise<UserSummary> {
    const updated = await this.userService.update(id, changes);
    this._users.update((users) => users.map((u) => (u.id === id ? updated : u)));
    return updated;
  }

  /** Removes an account. The active selection falls back to the first remaining user. */
  async deleteUser(id: string): Promise<void> {
    await this.userService.delete(id);
    this._users.update((users) => users.filter((u) => u.id !== id));
    if (this._activeUserId() === id) {
      this.setActiveUser(this._users().at(0)?.id ?? null);
    }
  }

  /** Creates a user account, makes it active and returns it. */
  async createUser(username: string, email: string, password: string): Promise<UserSummary> {
    const created = await this.userService.create({
      username: username.trim(),
      email: email.trim(),
      password,
    });

    this._users.update((users) => [...users, created]);
    this.setActiveUser(created.id);
    return created;
  }

  /**
   * Creates a campaign for the active user, then makes it the active campaign.
   * Without a user account the campaign has no owner, so one is created first if needed.
   */
  async createCampaign(input: {
    name: string;
    gameSystemId?: string | null;
    userId?: string | null;
  }): Promise<Campaign> {
    const owner = input.userId ?? this.activeUser()?.id ?? null;
    if (!owner) {
      throw new Error('An account is required before a campaign can be created.');
    }

    const created = await this.campaignService.create({
      userId: owner,
      name: input.name.trim(),
      gameSystemId: input.gameSystemId ?? null,
      systemData: {},
    } satisfies CampaignCreate);

    this._campaigns.update((campaigns) => [...campaigns, created]);
    this.setActiveUser(owner);
    await this.setActiveCampaign(created.id);
    return created;
  }

  /** Adds a game system to the local cache after it is created. */
  registerGameSystem(system: GameSystem): void {
    this._gameSystems.update((systems) => [...systems, system]);
  }

  /** Replaces a cached game system after it is edited. */
  replaceGameSystem(system: GameSystem): void {
    this._gameSystems.update((systems) =>
      systems.map((s) => (s.id === system.id ? system : s)),
    );
  }

  /** Drops a system from the cache after deletion. */
  removeGameSystem(id: string): void {
    this._gameSystems.update((systems) => systems.filter((s) => s.id !== id));
  }

  async setActiveCampaign(campaignId: string | null): Promise<void> {
    this._activeCampaignId.set(campaignId);
    this._activeEncounterId.set(null);
    this._activeSessionId.set(null);
    this._sessions.set([]);
    writeStorage(ACTIVE_CAMPAIGN_KEY, campaignId);
    writeStorage(ACTIVE_ENCOUNTER_KEY, null);
    if (campaignId) {
      await this.loadSessions(campaignId);
    }
  }

  /** Creates a session in the active campaign and selects it. */
  async createSession(title?: string): Promise<Session> {
    const campaignId = this._activeCampaignId();
    if (!campaignId) {
      throw new Error('Select a campaign before creating a session.');
    }

    // Sessions are numbered and named by the API ("Session #N"); the title is optional.
    const created = await this.sessionService.create({
      campaignId,
      title: title?.trim() ?? '',
    });

    this._sessions.update((sessions) =>
      [...sessions, created].sort((a, b) => b.sessionNumber - a.sessionNumber),
    );
    this._activeSessionId.set(created.id);
    this._activeEncounterId.set(null);
    writeStorage(ACTIVE_ENCOUNTER_KEY, null);

    // A fresh session always has an encounter to drop combatants into.
    await this.loadActiveEncounter(created.id);
    return created;
  }

  /** Persists edits to a session and refreshes the cached list. */
  async updateSession(session: Session): Promise<void> {
    await this.sessionService.update(session);
    this._sessions.update((sessions) =>
      sessions
        .map((s) => (s.id === session.id ? session : s))
        .sort((a, b) => b.sessionNumber - a.sessionNumber),
    );
  }

  /** Deletes a session and re-points the active session at the newest remaining one. */
  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionService.delete(sessionId);
    this._sessions.update((sessions) => sessions.filter((s) => s.id !== sessionId));

    if (this._activeSessionId() === sessionId) {
      const next = this._sessions().at(0) ?? null;
      this._activeSessionId.set(next?.id ?? null);
      this.setActiveEncounter(null);
      if (next) {
        await this.loadActiveEncounter(next.id);
      }
    }
  }

  async loadSessions(campaignId: string): Promise<void> {
    try {
      let sessions = await this.sessionService.listByCampaign(campaignId);

      // The GM is never left without a session: ask the API to provision the first one.
      if (sessions.length === 0) {
        sessions = [await this.sessionService.ensure(campaignId)];
      }

      this._sessions.set([...sessions].sort((a, b) => b.sessionNumber - a.sessionNumber));

      // Keep the GM on their current session when it still exists.
      const current = this._sessions().find((s) => s.id === this._activeSessionId());
      const target = current ?? this._sessions().at(0) ?? null;
      this._activeSessionId.set(target?.id ?? null);

      if (target) {
        await this.loadActiveEncounter(target.id);
      }
    } catch {
      this._sessions.set([]);
      this._activeSessionId.set(null);
    }
  }

  async loadActiveEncounter(sessionId: string): Promise<Encounter | null> {
    try {
      let encounters = await this.encounterService.listBySession(sessionId);

      // Every session keeps at least one encounter, created on demand.
      if (encounters.length === 0) {
        encounters = [await this.encounterService.ensure(sessionId)];
      }

      const active = encounters.find((e) => e.isActive) ?? encounters.at(-1) ?? null;
      this.setActiveEncounter(active?.id ?? null);
      return active;
    } catch {
      this.setActiveEncounter(null);
      return null;
    }
  }

  setActiveEncounter(encounterId: string | null): void {
    this._activeEncounterId.set(encounterId);
    this._encounterRevision.update((value) => value + 1);
    writeStorage(ACTIVE_ENCOUNTER_KEY, encounterId);
  }

  /** Persists edits to a campaign (name, game system, system data) and refreshes the cache. */
  async updateCampaign(campaign: Campaign): Promise<void> {
    await this.campaignService.update(campaign);
    this._campaigns.update((campaigns) =>
      campaigns.map((c) => (c.id === campaign.id ? campaign : c)),
    );
  }

  /** Deletes a campaign and activates another one, or clears the selection entirely. */
  async deleteCampaign(campaignId: string): Promise<void> {
    await this.campaignService.delete(campaignId);
    this._campaigns.update((campaigns) => campaigns.filter((c) => c.id !== campaignId));

    if (this._activeCampaignId() === campaignId) {
      await this.setActiveCampaign(this._campaigns().at(0)?.id ?? null);
    }
  }

  /** Reflects a map switch locally so the locations grid highlights the new current map. */  setCurrentMapLocationId(locationId: string | null): void {
    const campaignId = this._activeCampaignId();
    if (!campaignId) return;

    this._campaigns.update((campaigns) =>
      campaigns.map((campaign) =>
        campaign.id === campaignId
          ? { ...campaign, currentMapLocationId: locationId }
          : campaign,
      ),
    );
  }

  /** Signals that an encounter's participants or their state changed elsewhere. */
  notifyEncounterChanged(): void {
    this._encounterRevision.update((value) => value + 1);
  }

  setActiveSession(sessionId: string | null): void {
    this._activeSessionId.set(sessionId);
  }
}

function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      globalThis.localStorage?.removeItem(key);
    } else {
      globalThis.localStorage?.setItem(key, value);
    }
  } catch {
    /* storage unavailable (SSR / private mode) — state stays in-memory */
  }
}
