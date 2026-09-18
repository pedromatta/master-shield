import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Tag, TagCategory } from '../models/actor.model';
import {
  Counter,
  Location,
  Note,
  NoteCategory,
  Rule,
  RuleCategory,
  SystemBlueprint,
} from '../models/content.model';

type Writable = { id?: string };

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // ---- Tags -----------------------------------------------------------------

  listTags(campaignId: string, category?: TagCategory): Promise<Tag[]> {
    const params = category ? new HttpParams().set('category', category) : undefined;
    return this.get<Tag[]>(`/tags/campaign/${campaignId}`, params);
  }

  createTag(
    tag: Partial<Tag> & Pick<Tag, 'campaignId' | 'name' | 'category'>,
  ): Promise<Tag> {
    return this.post<Tag>('/tags', tag);
  }

  updateTag(tag: Tag): Promise<void> {
    return this.put(`/tags/${tag.id}`, tag);
  }

  deleteTag(id: string): Promise<void> {
    return this.remove(`/tags/${id}`);
  }

  // ---- Notes ----------------------------------------------------------------

  listNotes(campaignId: string): Promise<Note[]> {
    return this.get<Note[]>(`/notes/campaign/${campaignId}`);
  }

  createNote(note: Partial<Note> & Pick<Note, 'campaignId' | 'title'>): Promise<Note> {
    return this.post<Note>('/notes', note);
  }

  updateNote(note: Note): Promise<void> {
    return this.put(`/notes/${note.id}`, note);
  }

  deleteNote(id: string): Promise<void> {
    return this.remove(`/notes/${id}`);
  }

  setNoteTags(noteId: string, tagIds: string[]): Promise<void> {
    return this.put(`/notes/${noteId}/tags`, tagIds);
  }

  listNoteCategories(campaignId: string): Promise<NoteCategory[]> {
    return this.get<NoteCategory[]>(`/notes/categories/campaign/${campaignId}`);
  }

  createNoteCategory(
    category: Partial<NoteCategory> & Pick<NoteCategory, 'campaignId' | 'name'>,
  ): Promise<NoteCategory> {
    return this.post<NoteCategory>('/notes/categories', category);
  }

  updateNoteCategory(category: NoteCategory): Promise<void> {
    return this.put(`/notes/categories/${category.id}`, category);
  }

  deleteNoteCategory(id: string): Promise<void> {
    return this.remove(`/notes/categories/${id}`);
  }

  // ---- Locations ------------------------------------------------------------

  listLocations(campaignId: string): Promise<Location[]> {
    return this.get<Location[]>(`/locations/campaign/${campaignId}`);
  }

  createLocation(
    location: Partial<Location> & Pick<Location, 'campaignId' | 'name'>,
  ): Promise<Location> {
    return this.post<Location>('/locations', location);
  }

  updateLocation(location: Location): Promise<void> {
    return this.put(`/locations/${location.id}`, location);
  }

  deleteLocation(id: string): Promise<void> {
    return this.remove(`/locations/${id}`);
  }

  // ---- Counters -------------------------------------------------------------

  listCounters(campaignId: string): Promise<Counter[]> {
    return this.get<Counter[]>(`/counters/campaign/${campaignId}`);
  }

  createCounter(
    counter: Partial<Counter> & Pick<Counter, 'campaignId' | 'name' | 'boxes'>,
  ): Promise<Counter> {
    return this.post<Counter>('/counters', counter);
  }

  updateCounter(counter: Counter): Promise<void> {
    return this.put(`/counters/${counter.id}`, counter);
  }

  deleteCounter(id: string): Promise<void> {
    return this.remove(`/counters/${id}`);
  }

  // ---- Rules ----------------------------------------------------------------

  listRuleCategories(campaignId: string): Promise<RuleCategory[]> {
    return this.get<RuleCategory[]>(`/rules/categories/campaign/${campaignId}`);
  }

  createRuleCategory(
    category: Partial<RuleCategory> & Pick<RuleCategory, 'campaignId' | 'name'>,
  ): Promise<RuleCategory> {
    return this.post<RuleCategory>('/rules/categories', category);
  }

  updateRuleCategory(category: RuleCategory): Promise<void> {
    return this.put(`/rules/categories/${category.id}`, {
      id: category.id,
      campaignId: category.campaignId,
      name: category.name,
      icon: category.icon,
      iconId: category.iconId,
      iconUri: category.iconUri,
      sortOrder: category.sortOrder,
      showInToolbar: category.showInToolbar,
    });
  }

  deleteRuleCategory(id: string): Promise<void> {
    return this.remove(`/rules/categories/${id}`);
  }

  createRule(rule: Partial<Rule> & Pick<Rule, 'ruleCategoryId' | 'title'>): Promise<Rule> {
    return this.post<Rule>('/rules', rule);
  }

  updateRule(rule: Rule): Promise<void> {
    return this.put(`/rules/${rule.id}`, rule);
  }

  deleteRule(id: string): Promise<void> {
    return this.remove(`/rules/${id}`);
  }

  // ---- Blueprints -----------------------------------------------------------

  listBlueprints(): Promise<SystemBlueprint[]> {
    return this.get<SystemBlueprint[]>('/blueprints');
  }

  /** Blueprints belonging to one game system. */
  listBlueprintsBySystem(gameSystemId: string): Promise<SystemBlueprint[]> {
    return this.get<SystemBlueprint[]>(`/blueprints/game-system/${gameSystemId}`);
  }

  createBlueprint(
    blueprint: Partial<SystemBlueprint> & Pick<SystemBlueprint, 'gameSystemId' | 'kind'>,
  ): Promise<SystemBlueprint> {
    return this.post<SystemBlueprint>('/blueprints', {
      actorType: '',
      name: '',
      resources: [],
      attributes: [],
      ruleCategories: [],
      noteCategories: [],
      ...blueprint,
    });
  }

  updateBlueprint(blueprint: SystemBlueprint): Promise<void> {
    return this.put(`/blueprints/${blueprint.id}`, blueprint);
  }

  deleteBlueprint(id: string): Promise<void> {
    return this.remove(`/blueprints/${id}`);
  }

  /** Creates the rule/note categories a system declares for a campaign. */
  ensureBlueprintCategories(gameSystemId: string, campaignId: string): Promise<void> {
    const params = new HttpParams().set('gameSystemId', gameSystemId).set('campaignId', campaignId);
    return firstValueFrom(
      this.http.post<void>(`${this.base}/blueprints/ensure-categories`, null, { params }),
    );
  }

  // ---- Campaign map ---------------------------------------------------------

  /** Sets the location whose image the campaign's stable map URI should serve. */
  setCurrentMap(campaignId: string, locationId: string | null): Promise<void> {
    let params: HttpParams = new HttpParams();
    if (locationId) {
      params = params.set('locationId', locationId);
    }

    return firstValueFrom(
      this.http.put<void>(`${this.base}/campaigns/${campaignId}/current-map`, null, { params }),
    );
  }

  /** The stable, never-changing URL a virtual tabletop points at. */
  stableMapUrl(campaignId: string): string {
    return `${this.base}/campaigns/${campaignId}/map/image`;
  }

  // ---- Plumbing -------------------------------------------------------------

  private get<T>(path: string, params?: HttpParams): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.base}${path}`, { params }));
  }

  private post<T>(path: string, body: Writable): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.base}${path}`, body));
  }

  private put(path: string, body: unknown): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.base}${path}`, body));
  }

  private remove(path: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}${path}`));
  }
}
