import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../core/services/content-store.service';
import { ActiveGameStateService } from '../../core/services/active-game-state.service';
import { EncounterService } from '../../core/services/encounter.service';
import { assetUrl } from '../../core/services/asset-url';
import { WindowManagerService } from '../../core/windows/window-manager.service';
import { Actor } from '../../core/models/actor.model';
import { ResourceBarComponent, ResourceChange } from '../../shared/resource-bar/resource-bar.component';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconPickerComponent } from '../../shared/icon/icon-picker.component';

/**
 * Left rail of player-character cards. Each card shows the portrait as its icon, the
 * character's resource bars (editable in place) and a button to drop them into the
 * active encounter. Clicking the card opens the full sheet in the work area.
 */
@Component({
  selector: 'app-character-sidebar',
  imports: [FormsModule, ResourceBarComponent, IconComponent, IconPickerComponent],
  templateUrl: './character-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSidebarComponent {
  protected readonly store = inject(ContentStoreService);
  protected readonly gameState = inject(ActiveGameStateService);
  private readonly windows = inject(WindowManagerService);
  private readonly encounters = inject(EncounterService);

  protected readonly collapsed = signal(false);
  protected readonly showCreate = signal(false);
  protected readonly newName = signal('');
  /** Icon chosen during creation ("" until the GM picks one). */
  protected readonly newIconId = signal('');
  /** Portrait held in memory until the actor row exists to attach it to. */
  protected readonly newImageFile = signal<File | null>(null);
  protected readonly newImagePreview = signal('');
  protected readonly status = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly characters = this.store.playerCharacters;

  protected readonly canAddToEncounter = computed(() => !!this.gameState.activeSessionId());

  protected trackCharacter(_index: number, actor: Actor): string {
    return actor.id;
  }

  /** Resolves an actor portrait stored on the API origin for the collapsed rail. */
  protected readonly portraitUrl = assetUrl;

  protected openSheet(actor: Actor): void {
    this.windows.open({
      kind: 'actor-sheet',
      contextId: actor.id,
      title: actor.name,
      icon: 'ra:hood',
      colSpan: 5,
      rowSpan: 6,
      singleton: true,
    });
  }

  protected async onResourceAdjusted(actor: Actor, change: ResourceChange): Promise<void> {
    await this.store.adjustResource(actor.id, change.resourceId, change.delta);
  }

  /** Drops the character into the session's encounter, creating one when needed. */
  protected async addToEncounter(actor: Actor, event: Event): Promise<void> {
    event.stopPropagation();

    const sessionId = this.gameState.activeSessionId();
    if (!sessionId) {
      this.error.set('Select a session first.');
      return;
    }

    this.error.set(null);
    this.status.set(null);
    try {
      let encounterId = this.gameState.activeEncounterId();

      if (!encounterId) {
        const encounter = await this.encounters.create({
          sessionId,
          name: 'Encounter',
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

      this.gameState.notifyEncounterChanged();
      this.windows.open({ kind: 'encounter', singleton: true });
      this.status.set(`${actor.name} joined the encounter.`);
    } catch {
      this.error.set(`Could not add ${actor.name} to the encounter.`);
    }
  }

  protected async createCharacter(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;

    try {
      const created = await this.store.createActor({
        name,
        type: 'PlayerCharacter',
        iconId: this.newIconId(),
        imageUri: '',
        systemData: {},
      });
      const file = this.newImageFile();
      if (file) {
        await this.store.uploadActorImage(created.id, file);
      }
      this.newName.set('');
      this.newIconId.set('');
      this.newImageFile.set(null);
      this.newImagePreview.set('');
      this.showCreate.set(false);
      this.error.set(null);
    } catch {
      this.error.set('Could not create the character.');
    }
  }

  protected onNewImageChosen(file: File): void {
    this.newImageFile.set(file);
    this.newImagePreview.set(URL.createObjectURL(file));
  }

  /** Uploads a replacement portrait directly against the persisted character. */
  protected async onPortraitChosen(actor: Actor, file: File): Promise<void> {
    this.error.set(null);
    try {
      await this.store.uploadActorImage(actor.id, file);
    } catch {
      this.error.set('Could not upload the portrait.');
    }
  }

  /** Saves a chosen catalogue icon onto a persisted character. */
  protected async onCharacterIconChange(actor: Actor, iconId: string): Promise<void> {
    this.error.set(null);
    try {
      await this.store.updateActor({ ...actor, iconId });
    } catch {
      this.error.set('Could not save the icon.');
    }
  }

  /** Removes a character's uploaded portrait so its icon shows instead. */
  protected async onCharacterImageCleared(actor: Actor): Promise<void> {
    this.error.set(null);
    try {
      await this.store.clearActorImage(actor.id);
    } catch {
      this.error.set('Could not clear the portrait.');
    }
  }
}
