import { computed, inject, Injectable, signal } from '@angular/core';

import { ContentService } from './content.service';
import { ActorService } from './actor.service';
import { ActiveGameStateService } from './active-game-state.service';
import { Actor, Tag, TagCategory } from '../models/actor.model';
import {
  Counter,
  Location,
  Note,
  NoteCategory,
  Rule,
  RuleCategory,
  SystemBlueprint,
} from '../models/content.model';
import { Attachment, AttachmentOwner } from '../models/common.model';
import { UploadService } from './upload.service';

/**
 * Single source of truth for everything the GM authors inside the active campaign:
 * actors, notes, locations, counters, rules and blueprints.
 *
 * Every mutation writes through to the API and then updates the local signal so the
 * open windows re-render without a refetch.
 */
@Injectable({ providedIn: 'root' })
export class ContentStoreService {
  private readonly content = inject(ContentService);
  private readonly actorService = inject(ActorService);
  private readonly gameState = inject(ActiveGameStateService);
  private readonly uploads = inject(UploadService);

  private readonly _actors = signal<Actor[]>([]);
  private readonly _tags = signal<Tag[]>([]);
  private readonly _notes = signal<Note[]>([]);
  private readonly _noteCategories = signal<NoteCategory[]>([]);
  private readonly _locations = signal<Location[]>([]);
  private readonly _counters = signal<Counter[]>([]);
  private readonly _ruleCategories = signal<RuleCategory[]>([]);
  private readonly _blueprints = signal<SystemBlueprint[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly actors = this._actors.asReadonly();
  readonly tags = this._tags.asReadonly();
  readonly notes = this._notes.asReadonly();
  readonly noteCategories = this._noteCategories.asReadonly();
  readonly locations = this._locations.asReadonly();
  readonly counters = this._counters.asReadonly();
  readonly ruleCategories = this._ruleCategories.asReadonly();
  readonly blueprints = this._blueprints.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly playerCharacters = computed(() =>
    this._actors().filter((actor) => actor.type === 'PlayerCharacter'),
  );

  readonly nonPlayerCharacters = computed(() =>
    this._actors().filter((actor) => actor.type === 'NonPlayerCharacter'),
  );

  /** Rule categories the GM pinned to the bottom tool bar. */
  readonly toolbarRuleCategories = computed(() =>
    this._ruleCategories().filter((category) => category.showInToolbar),
  );

  /** Tags belonging to a single entity family (actors, rules, locations, notes, counters). */
  tagsFor(category: TagCategory): Tag[] {
    return this._tags().filter((tag) => tag.category === category);
  }

  private replaceTag(updated: Tag): void {
    this._tags.update((tags) => tags.map((tag) => (tag.id === updated.id ? updated : tag)));
  }

  actorById(id: string | null): Actor | null {
    return id ? (this._actors().find((actor) => actor.id === id) ?? null) : null;
  }

  noteById(id: string | null): Note | null {
    return id ? (this._notes().find((note) => note.id === id) ?? null) : null;
  }

  locationById(id: string | null): Location | null {
    return id ? (this._locations().find((location) => location.id === id) ?? null) : null;
  }

  ruleCategoryById(id: string | null): RuleCategory | null {
    return id ? (this._ruleCategories().find((category) => category.id === id) ?? null) : null;
  }

  /** Loads every content collection for the active campaign. */
  async loadAll(campaignId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const [
        actors,
        tags,
        notes,
        noteCategories,
        locations,
        counters,
        ruleCategories,
        blueprints,
      ] = await Promise.all([
        this.actorService.listByCampaign(campaignId),
        this.content.listTags(campaignId),
        this.content.listNotes(campaignId),
        this.content.listNoteCategories(campaignId),
        this.content.listLocations(campaignId),
        this.content.listCounters(campaignId),
        this.content.listRuleCategories(campaignId),
        this.content.listBlueprints().catch(() => []),
      ]);

      this._actors.set(actors);
      this._tags.set(tags);
      this._notes.set(notes);
      this._noteCategories.set(noteCategories);
      this._locations.set(locations);
      this._counters.set(counters);
      this._ruleCategories.set(ruleCategories);
      this._blueprints.set(blueprints);
    } catch {
      this._error.set('Could not load the campaign content.');
    } finally {
      this._loading.set(false);
    }
  }

  reset(): void {
    this._actors.set([]);
    this._tags.set([]);
    this._notes.set([]);
    this._noteCategories.set([]);
    this._locations.set([]);
    this._counters.set([]);
    this._ruleCategories.set([]);
    this._blueprints.set([]);
  }

  // ---- Actors ---------------------------------------------------------------

  async createActor(input: {
    name: string;
    type: Actor['type'];
    notes?: string;
    imageUri?: string;
    iconId?: string;
    systemData?: Actor['systemData'];
  }): Promise<Actor> {
    const campaignId = this.requireCampaign();
    const created = await this.actorService.create({
      name: input.name,
      campaignId,
      type: input.type,
      notes: input.notes ?? '',
      imageUri: input.imageUri ?? '',
      iconId: input.iconId ?? '',
      systemData: input.systemData ?? {},
    });

    this._actors.update((actors) => [...actors, created]);
    return created;
  }

  async updateActor(actor: Actor): Promise<void> {
    await this.actorService.update(actor);
    this._actors.update((actors) => actors.map((a) => (a.id === actor.id ? actor : a)));
  }

  async deleteActor(id: string): Promise<void> {
    await this.actorService.delete(id);
    this._actors.update((actors) => actors.filter((a) => a.id !== id));
  }

  /** Uploads an actor portrait and reflects the new URI locally. */
  async uploadActorImage(actorId: string, file: File): Promise<void> {
    const imageUri = await this.uploads.uploadActorImage(actorId, file);
    this._actors.update((actors) =>
      actors.map((a) => (a.id === actorId ? { ...a, imageUri } : a)),
    );
  }

  /** Clears an actor's uploaded portrait so its icon is shown instead. */
  async clearActorImage(actorId: string): Promise<void> {
    await this.uploads.clearActorImage(actorId);
    this._actors.update((actors) =>
      actors.map((a) => (a.id === actorId ? { ...a, imageUri: '' } : a)),
    );
  }

  /** Uploads a file attachment for an actor/rule/location/note and updates the local list. */
  async uploadAttachment(
    owner: AttachmentOwner,
    ownerId: string,
    file: File,
  ): Promise<Attachment> {
    const created = await this.uploads.uploadAttachment(owner, ownerId, file);
    this.attachToList(owner, ownerId, created);
    return created;
  }

  async deleteAttachment(owner: AttachmentOwner, ownerId: string, attachmentId: string): Promise<void> {
    await this.uploads.deleteAttachment(attachmentId);
    this.detachFromList(owner, ownerId, attachmentId);
  }

  private attachToList(owner: AttachmentOwner, ownerId: string, attachment: Attachment): void {
    const append = (items: Attachment[] | undefined) => [...(items ?? []), attachment];
    switch (owner) {
      case 'actor':
        this._actors.update((items) =>
          items.map((i) => (i.id === ownerId ? { ...i, attachments: append(i.attachments) } : i)),
        );
        break;
      case 'location':
        this._locations.update((items) =>
          items.map((i) => (i.id === ownerId ? { ...i, attachments: append(i.attachments) } : i)),
        );
        break;
      case 'note':
        this._notes.update((items) =>
          items.map((i) => (i.id === ownerId ? { ...i, attachments: append(i.attachments) } : i)),
        );
        break;
      case 'rule':
        this._ruleCategories.update((categories) =>
          categories.map((category) => ({
            ...category,
            rules: (category.rules ?? []).map((rule) =>
              rule.id === ownerId ? { ...rule, attachments: append(rule.attachments) } : rule,
            ),
          })),
        );
        break;
    }
  }

  private detachFromList(owner: AttachmentOwner, ownerId: string, attachmentId: string): void {
    const strip = (items: Attachment[] | undefined) =>
      (items ?? []).filter((attachment) => attachment.id !== attachmentId);
    switch (owner) {
      case 'actor':
        this._actors.update((items) =>
          items.map((i) => (i.id === ownerId ? { ...i, attachments: strip(i.attachments) } : i)),
        );
        break;
      case 'location':
        this._locations.update((items) =>
          items.map((i) => (i.id === ownerId ? { ...i, attachments: strip(i.attachments) } : i)),
        );
        break;
      case 'note':
        this._notes.update((items) =>
          items.map((i) => (i.id === ownerId ? { ...i, attachments: strip(i.attachments) } : i)),
        );
        break;
      case 'rule':
        this._ruleCategories.update((categories) =>
          categories.map((category) => ({
            ...category,
            rules: (category.rules ?? []).map((rule) =>
              rule.id === ownerId ? { ...rule, attachments: strip(rule.attachments) } : rule,
            ),
          })),
        );
        break;
    }
  }

  async setActorTags(actorId: string, tagIds: string[]): Promise<void> {
    await this.actorService.setTags(actorId, tagIds);
    const tags = this._tags().filter((tag) => tagIds.includes(tag.id));
    this._actors.update((actors) =>
      actors.map((actor) => (actor.id === actorId ? { ...actor, tags } : actor)),
    );
  }

  async addResource(
    actorId: string,
    resource: { nome: string; currentValue: number; maxValue: number; colorHwx: string },
  ): Promise<void> {
    const created = await this.actorService.addResource(actorId, resource);
    this._actors.update((actors) =>
      actors.map((actor) =>
        actor.id === actorId
          ? { ...actor, resources: [...(actor.resources ?? []), created] }
          : actor,
      ),
    );
  }

  /**
   * Adjusts a resource by a delta. Updates locally first so repeated clicks on the
   * sidebar bars stay responsive, then persists.
   */
  async adjustResource(actorId: string, resourceId: string, delta: number): Promise<void> {
    const actor = this.actorById(actorId);
    const resource = actor?.resources?.find((r) => r.id === resourceId);
    if (!actor || !resource) return;

    const next = {
      ...resource,
      currentValue: Math.max(0, Math.min(resource.maxValue, resource.currentValue + delta)),
    };

    this.patchResource(actorId, next);

    try {
      await this.actorService.updateResource(actorId, next);
    } catch {
      this.patchResource(actorId, resource);
      this._error.set('Could not save the resource change.');
    }
  }

  async updateResource(
    actorId: string,
    resource: { id: string; nome: string; currentValue: number; maxValue: number; colorHwx: string },
  ): Promise<void> {
    const actor = this.actorById(actorId);
    const existing = actor?.resources?.find((r) => r.id === resource.id);
    if (!existing) return;

    const merged = { ...existing, ...resource };
    this.patchResource(actorId, merged);
    await this.actorService.updateResource(actorId, merged);
  }

  async deleteResource(actorId: string, resourceId: string): Promise<void> {
    await this.actorService.deleteResource(actorId, resourceId);
    this._actors.update((actors) =>
      actors.map((actor) =>
        actor.id === actorId
          ? { ...actor, resources: (actor.resources ?? []).filter((r) => r.id !== resourceId) }
          : actor,
      ),
    );
  }

  private patchResource(actorId: string, resource: NonNullable<Actor['resources']>[number]): void {
    this._actors.update((actors) =>
      actors.map((actor) =>
        actor.id === actorId
          ? {
              ...actor,
              resources: (actor.resources ?? []).map((r) => (r.id === resource.id ? resource : r)),
            }
          : actor,
      ),
    );
  }

  /** Updates one resource's current value locally without a round trip. Used by the
   * encounter tracker, which persists the change through the encounter endpoint. */
  patchResourceValue(actorId: string, resourceId: string, currentValue: number): void {
    this._actors.update((actors) =>
      actors.map((actor) =>
        actor.id === actorId
          ? {
              ...actor,
              resources: (actor.resources ?? []).map((r) =>
                r.id === resourceId ? { ...r, currentValue } : r,
              ),
            }
          : actor,
      ),
    );
  }

  // ---- Tags -----------------------------------------------------------------

  async createTag(name: string, colorHex: string, category: TagCategory): Promise<Tag> {
    const created = await this.content.createTag({
      campaignId: this.requireCampaign(),
      name: name.trim(),
      colorHex,
      category,
    });
    this._tags.update((tags) => [...tags, created]);
    return created;
  }

  async deleteTag(id: string): Promise<void> {
    await this.content.deleteTag(id);
    this._tags.update((tags) => tags.filter((tag) => tag.id !== id));
    const strip = <T extends { tags?: Tag[] }>(item: T): T => ({
      ...item,
      tags: (item.tags ?? []).filter((tag) => tag.id !== id),
    });
    this._actors.update((items) => items.map(strip));
    this._notes.update((items) => items.map(strip));
    this._locations.update((items) => items.map(strip));
  }

  // ---- Notes ----------------------------------------------------------------

  async createNote(title: string, noteCategoryId: string | null): Promise<Note> {
    const created = await this.content.createNote({
      campaignId: this.requireCampaign(),
      title: title.trim(),
      noteCategoryId,
      content: '',
      tags: [],
    });
    this._notes.update((notes) => [...notes, { ...created, tags: created.tags ?? [] }]);
    return created;
  }

  async updateNote(note: Note): Promise<void> {
    await this.content.updateNote(note);
    this._notes.update((notes) => notes.map((n) => (n.id === note.id ? note : n)));
  }

  async deleteNote(id: string): Promise<void> {
    await this.content.deleteNote(id);
    this._notes.update((notes) => notes.filter((note) => note.id !== id));
  }

  async setNoteTags(noteId: string, tagIds: string[]): Promise<void> {
    await this.content.setNoteTags(noteId, tagIds);
    const tags = this._tags().filter((tag) => tagIds.includes(tag.id));
    this._notes.update((notes) => notes.map((note) => (note.id === noteId ? { ...note, tags } : note)));
  }

  async createNoteCategory(name: string, icon: string): Promise<NoteCategory> {
    const created = await this.content.createNoteCategory({
      campaignId: this.requireCampaign(),
      name: name.trim(),
      icon,
    });
    this._noteCategories.update((categories) => [...categories, created]);
    return created;
  }

  /** Uploads a note-category icon and stores the returned URI on the category. */
  async uploadNoteCategoryIcon(categoryId: string, file: File): Promise<void> {
    const iconUri = await this.uploads.uploadNoteCategoryIcon(categoryId, file);
    this._noteCategories.update((categories) =>
      categories.map((c) => (c.id === categoryId ? { ...c, iconUri } : c)),
    );
  }

  async deleteNoteCategory(id: string): Promise<void> {
    await this.content.deleteNoteCategory(id);
    this._noteCategories.update((categories) => categories.filter((c) => c.id !== id));
    this._notes.update((notes) =>
      notes.map((note) => (note.noteCategoryId === id ? { ...note, noteCategoryId: null } : note)),
    );
  }

  // ---- Locations ------------------------------------------------------------

  async createLocation(name: string, imageUri: string, description = ''): Promise<Location> {
    const created = await this.content.createLocation({
      campaignId: this.requireCampaign(),
      name: name.trim(),
      imageUri,
      description,
      tags: [],
    });
    this._locations.update((locations) => [...locations, { ...created, tags: created.tags ?? [] }]);
    return created;
  }

  async updateLocation(location: Location): Promise<void> {
    await this.content.updateLocation(location);
    this._locations.update((locations) =>
      locations.map((l) => (l.id === location.id ? location : l)),
    );
  }

  async deleteLocation(id: string): Promise<void> {
    await this.content.deleteLocation(id);
    this._locations.update((locations) => locations.filter((l) => l.id !== id));
  }

  /** Uploads the location image (thumbnail / battle map) and reflects the new URI. */
  async uploadLocationImage(locationId: string, file: File): Promise<void> {
    const imageUri = await this.uploads.uploadLocationImage(locationId, file);
    this._locations.update((locations) =>
      locations.map((l) => (l.id === locationId ? { ...l, imageUri } : l)),
    );
  }

  async setCurrentMap(locationId: string | null): Promise<void> {
    const campaignId = this.requireCampaign();
    await this.content.setCurrentMap(campaignId, locationId);
    this.gameState.setCurrentMapLocationId(locationId);
  }

  // ---- Counters -------------------------------------------------------------

  async createCounter(name: string, boxes: number, colorHex: string): Promise<Counter> {
    const created = await this.content.createCounter({
      campaignId: this.requireCampaign(),
      name: name.trim(),
      boxes,
      currentValue: 0,
      colorHex,
    });
    this._counters.update((counters) => [...counters, created]);
    return created;
  }

  /** Ticks a counter up to <paramref name="value"/> boxes. */
  async setCounterValue(counter: Counter, value: number): Promise<void> {
    const next: Counter = {
      ...counter,
      currentValue: Math.max(0, Math.min(counter.boxes, value)),
    };
    this._counters.update((counters) => counters.map((c) => (c.id === counter.id ? next : c)));

    try {
      await this.content.updateCounter(next);
    } catch {
      this._counters.update((counters) =>
        counters.map((c) => (c.id === counter.id ? counter : c)),
      );
      this._error.set('Could not save the counter.');
    }
  }

  async updateCounter(counter: Counter): Promise<void> {
    await this.content.updateCounter(counter);
    this._counters.update((counters) => counters.map((c) => (c.id === counter.id ? counter : c)));
  }

  async deleteCounter(id: string): Promise<void> {
    await this.content.deleteCounter(id);
    this._counters.update((counters) => counters.filter((c) => c.id !== id));
  }

  // ---- Rules ----------------------------------------------------------------

  async createRuleCategory(name: string, icon: string, iconId = ''): Promise<RuleCategory> {
    const created = await this.content.createRuleCategory({
      campaignId: this.requireCampaign(),
      name: name.trim(),
      icon,
      iconId,
      showInToolbar: true,
    });
    this._ruleCategories.update((categories) => [
      ...categories,
      { ...created, rules: created.rules ?? [] },
    ]);
    return created;
  }

  async updateRuleCategory(category: RuleCategory): Promise<void> {
    await this.content.updateRuleCategory(category);
    this._ruleCategories.update((categories) =>
      categories.map((c) => (c.id === category.id ? { ...category, rules: c.rules } : c)),
    );
  }

  /** Uploads a rule-category icon and stores the returned URI on the category. */
  async uploadRuleCategoryIcon(categoryId: string, file: File): Promise<void> {
    const iconUri = await this.uploads.uploadRuleCategoryIcon(categoryId, file);
    this._ruleCategories.update((categories) =>
      categories.map((c) => (c.id === categoryId ? { ...c, iconUri } : c)),
    );
  }

  async deleteRuleCategory(id: string): Promise<void> {
    await this.content.deleteRuleCategory(id);
    this._ruleCategories.update((categories) => categories.filter((c) => c.id !== id));
  }

  async createRule(ruleCategoryId: string, title: string): Promise<Rule> {
    const created = await this.content.createRule({
      ruleCategoryId,
      title: title.trim(),
      content: '',
      systemData: {},
      tags: [],
    });
    this._ruleCategories.update((categories) =>
      categories.map((category) =>
        category.id === ruleCategoryId
          ? { ...category, rules: [...(category.rules ?? []), { ...created, tags: [] }] }
          : category,
      ),
    );
    return created;
  }

  async updateRule(rule: Rule): Promise<void> {
    await this.content.updateRule(rule);
    this._ruleCategories.update((categories) =>
      categories.map((category) => ({
        ...category,
        rules: (category.rules ?? []).map((r) => (r.id === rule.id ? rule : r)),
      })),
    );
  }

  async deleteRule(ruleCategoryId: string, ruleId: string): Promise<void> {
    await this.content.deleteRule(ruleId);
    this._ruleCategories.update((categories) =>
      categories.map((category) =>
        category.id === ruleCategoryId
          ? { ...category, rules: (category.rules ?? []).filter((r) => r.id !== ruleId) }
          : category,
      ),
    );
  }

  // ---- Blueprints -----------------------------------------------------------

  /** Blueprints belonging to one game system (used by the system editor). */
  blueprintsForSystem(gameSystemId: string): SystemBlueprint[] {
    return this._blueprints().filter((b) => b.gameSystemId === gameSystemId);
  }

  async loadBlueprintsForSystem(gameSystemId: string): Promise<SystemBlueprint[]> {
    const blueprints = await this.content.listBlueprintsBySystem(gameSystemId);
    this._blueprints.update((current) => [
      ...current.filter((b) => b.gameSystemId !== gameSystemId),
      ...blueprints,
    ]);
    return blueprints;
  }

  async createBlueprint(
    input: Partial<SystemBlueprint> & Pick<SystemBlueprint, 'gameSystemId' | 'kind'>,
  ): Promise<SystemBlueprint> {
    const created = await this.content.createBlueprint(input);
    this._blueprints.update((blueprints) => [...blueprints, created]);
    return created;
  }

  async updateBlueprint(blueprint: SystemBlueprint): Promise<void> {
    await this.content.updateBlueprint(blueprint);
    this._blueprints.update((blueprints) =>
      blueprints.map((b) => (b.id === blueprint.id ? blueprint : b)),
    );
  }

  async deleteBlueprint(id: string): Promise<void> {
    await this.content.deleteBlueprint(id);
    this._blueprints.update((blueprints) => blueprints.filter((b) => b.id !== id));
  }

  /** Links a set of rules to an actor (abilities, traits, tactics, …). */
  async setActorRules(actorId: string, ruleIds: string[]): Promise<void> {
    await this.actorService.setRules(actorId, ruleIds);
    const actor = this.actorById(actorId);
    if (!actor) return;

    const allRules = this._ruleCategories().flatMap((c) => c.rules ?? []);
    const links = ruleIds
      .map((id, index) => {
        const rule = allRules.find((r) => r.id === id);
        return rule ? { id: `${actorId}:${id}`, actorId, ruleId: id, sortOrder: index, rule } : null;
      })
      .filter((link): link is NonNullable<typeof link> => link !== null);

    this._actors.update((actors) =>
      actors.map((a) => (a.id === actorId ? { ...a, ruleLinks: links } : a)),
    );
  }

  private requireCampaign(): string {
    const campaignId = this.gameState.activeCampaignId();
    if (!campaignId) {
      throw new Error('No active campaign.');
    }
    return campaignId;
  }
}
