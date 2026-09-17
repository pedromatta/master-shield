import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../../core/services/content-store.service';
import { ActiveGameStateService } from '../../../core/services/active-game-state.service';
import { EncounterService } from '../../../core/services/encounter.service';
import { ContentService } from '../../../core/services/content.service';
import { Actor, Tag } from '../../../core/models/actor.model';
import { assetUrl } from '../../../core/services/asset-url';
import { Attachment, SystemData } from '../../../core/models/common.model';
import { ResourceBarComponent, ResourceChange } from '../../../shared/resource-bar/resource-bar.component';
import { TagEditorComponent } from '../../../shared/tag-editor/tag-editor.component';
import { SystemDataEditorComponent } from '../../../shared/system-data-editor/system-data-editor.component';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { IconPickerComponent } from '../../../shared/icon/icon-picker.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { RulePickerComponent } from '../../../shared/rule-picker/rule-picker.component';
import { DEFAULT_RESOURCE_COLOR } from '../../../core/theme/theme';

/** Full editable character/NPC sheet, opened in a window from any actor card. */
@Component({
  selector: 'app-actor-sheet',
  imports: [
    FormsModule,
    ResourceBarComponent,
    TagEditorComponent,
    SystemDataEditorComponent,
    ImageUploadComponent,
    IconPickerComponent,
    IconComponent,
    RulePickerComponent,
  ],
  templateUrl: './actor-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActorSheetComponent {
  private readonly store = inject(ContentStoreService);
  private readonly encounters = inject(EncounterService);
  private readonly content = inject(ContentService);
  protected readonly gameState = inject(ActiveGameStateService);

  readonly actorId = input.required<string>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<string | null>(null);
  protected readonly showResourceForm = signal(false);
  /** Which sheet tab is visible; splitting keeps each panel uncluttered. */
  protected readonly activeTab = signal<'overview' | 'details' | 'system'>('overview');
  protected readonly tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'details' as const, label: 'Details' },
    { id: 'system' as const, label: 'System' },
  ];

  protected readonly newResourceName = signal('');
  protected readonly newResourceMax = signal(10);
  protected readonly newResourceColor = signal(DEFAULT_RESOURCE_COLOR);

  protected readonly actor = computed(() => this.store.actorById(this.actorId()));

  protected readonly tags = computed(() => this.actor()?.tags ?? []);

  protected trackResource(_index: number, id: string): string {
    return id;
  }

  /** Whether a resource is currently shown in the encounter tracker for this actor. */
  protected showsInEncounter(resourceId: string): boolean {
    const ids = this.actor()?.encounterResourceIds ?? [];
    // An empty selection means "show everything".
    return ids.length === 0 || ids.includes(resourceId);
  }

  /** Toggles a resource in/out of the encounter tracker view for this actor. */
  protected async toggleEncounterResource(resourceId: string): Promise<void> {
    const actor = this.actor();
    if (!actor) return;

    const all = (actor.resources ?? []).map((r) => r.id);
    const current = actor.encounterResourceIds ?? [];

    // Materialise the full list the first time the GM curates it.
    const base = current.length === 0 ? all : current;
    const next = base.includes(resourceId)
      ? base.filter((id) => id !== resourceId)
      : [...base, resourceId];

    // Never store an empty list: that would mean "show everything" again.
    const normalized = next.length === 0 ? [] : next.filter((id) => all.includes(id));

    this.error.set(null);
    try {
      await this.store.updateActor({ ...actor, encounterResourceIds: normalized });
      // Refresh any open encounter window so the shown resources match the new selection.
      this.gameState.notifyEncounterChanged();
    } catch {
      this.error.set('Could not update the encounter resources.');
    }
  }

  protected async saveField<K extends keyof Actor>(field: K, value: Actor[K]): Promise<void> {
    const actor = this.actor();
    if (!actor || actor[field] === value) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.updateActor({ ...actor, [field]: value });
    } catch {
      this.error.set('Could not save the sheet.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveSystemData(systemData: SystemData): Promise<void> {
    const actor = this.actor();
    if (!actor) return;

    this.error.set(null);
    try {
      await this.store.updateActor({ ...actor, systemData });
    } catch {
      this.error.set('Could not save system data.');
    }
  }

  /** Uploads a new portrait for this actor. */
  protected async onImageChosen(file: File): Promise<void> {
    const actor = this.actor();
    if (!actor) return;

    this.error.set(null);
    try {
      await this.store.uploadActorImage(actor.id, file);
    } catch {
      this.error.set('Could not upload the portrait.');
    }
  }

  /** Persists the chosen catalogue icon onto the actor. */
  protected async onIconChange(iconId: string): Promise<void> {
    const actor = this.actor();
    if (!actor) return;

    this.error.set(null);
    try {
      await this.store.updateActor({ ...actor, iconId });
    } catch {
      this.error.set('Could not save the icon.');
    }
  }

  /** Replaces the actor's linked rules. */
  protected async onRulesChange(ruleIds: string[]): Promise<void> {
    const actor = this.actor();
    if (!actor) return;

    this.error.set(null);
    try {
      await this.store.setActorRules(actor.id, ruleIds);
    } catch {
      this.error.set('Could not save the linked rules.');
    }
  }

  protected readonly linkedRuleIds = computed(() =>
    (this.actor()?.ruleLinks ?? []).map((link) => link.ruleId),
  );

  protected async onAttachmentChosen(file: File): Promise<void> {
    const actor = this.actor();
    if (!actor) return;

    this.error.set(null);
    try {
      await this.store.uploadAttachment('actor', actor.id, file);
    } catch {
      this.error.set('Could not upload the attachment.');
    }
  }

  protected async removeAttachment(attachment: Attachment): Promise<void> {
    const actor = this.actor();
    if (!actor) return;

    this.error.set(null);
    try {
      await this.store.deleteAttachment('actor', actor.id, attachment.id);
    } catch {
      this.error.set('Could not remove the attachment.');
    }
  }

  protected async onTagsChange(tags: Tag[]): Promise<void> {
    const actor = this.actor();
    if (!actor) return;

    this.error.set(null);
    try {
      await this.store.setActorTags(actor.id, tags.map((tag) => tag.id));
    } catch {
      this.error.set('Could not save tags.');
    }
  }

  protected async onResourceAdjusted(change: ResourceChange): Promise<void> {
    const actor = this.actor();
    if (!actor) return;
    await this.store.adjustResource(actor.id, change.resourceId, change.delta);
  }

  protected async addResource(): Promise<void> {
    const actor = this.actor();
    const nome = this.newResourceName().trim();
    if (!actor || !nome) return;

    this.error.set(null);
    try {
      await this.store.addResource(actor.id, {
        nome,
        currentValue: this.newResourceMax(),
        maxValue: this.newResourceMax(),
        colorHwx: this.newResourceColor(),
      });
      this.newResourceName.set('');
      this.showResourceForm.set(false);
    } catch {
      this.error.set('Could not add the resource.');
    }
  }

  protected async deleteResource(resourceId: string): Promise<void> {
    const actor = this.actor();
    if (!actor) return;
    await this.store.deleteResource(actor.id, resourceId);
  }

  protected async deleteActor(): Promise<void> {
    const actor = this.actor();
    if (!actor || !globalThis.confirm?.(`Delete ${actor.name}? This cannot be undone.`)) return;

    try {
      await this.store.deleteActor(actor.id);
      this.status.set('Actor deleted.');
    } catch {
      this.error.set('Could not delete the actor.');
    }
  }

  /** Adds the actor to the session's active encounter, or creates one if none exists. */
  protected async addToEncounter(): Promise<void> {
    const actor = this.actor();
    const sessionId = this.gameState.activeSessionId();
    if (!actor || !sessionId) {
      this.error.set('Select a session before adding to an encounter.');
      return;
    }

    this.error.set(null);
    this.status.set(null);
    try {
      let encounterId = this.gameState.activeEncounterId();

      if (!encounterId) {
        const encounter = await this.encounters.create({
          sessionId,
          name: `${this.gameState.activeSession()?.title ?? 'Session'} encounter`,
          isActive: true,
          currentRound: 1,
        });
        encounterId = encounter.id;
        this.gameState.setActiveEncounter(encounter.id);
      }

      await this.encounters.addParticipant(encounterId, {
        actorId: actor.id,
        initiative: 0,
        temporaryHpOffset: 0,
      });

      // Tell any open encounter window to refresh its participant list.
      this.gameState.notifyEncounterChanged();
      this.status.set(`${actor.name} joined the encounter.`);
    } catch {
      this.error.set('Could not add to the encounter.');
    }
  }

  protected mapUrl(): string {
    const campaignId = this.gameState.activeCampaignId();
    return campaignId ? this.content.stableMapUrl(campaignId) : '';
  }

  /** Resolves a stored attachment URI against the API origin. */
  protected readonly attachmentUrl = assetUrl;
}
