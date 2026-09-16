import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { EncounterParticipant } from '../../core/models/encounter.model';
import { Actor, Resource } from '../../core/models/actor.model';
import { TemporaryEffects } from '../../core/models/common.model';
import { EffectInjectorComponent } from './effect-injector.component';
import { ResourceBarComponent, ResourceChange } from '../../shared/resource-bar/resource-bar.component';
import { assetUrl } from '../../core/services/asset-url';
import { IconComponent } from '../../shared/icon/icon.component';

export interface ParticipantStateChange {
  readonly participantId: string;
  readonly temporaryHpOffset: number;
  readonly temporaryEffects: TemporaryEffects;
}

/** One row of the initiative tracker, with drag handle and inline controls. */
@Component({
  selector: 'app-participant-card',
  imports: [EffectInjectorComponent, ResourceBarComponent, IconComponent],
  templateUrl: './participant-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '[attr.draggable]': 'draggable()',
    '(dragstart)': 'dragStart.emit($event)',
    '(dragend)': 'dragEnd.emit()',
  },
})
export class ParticipantCardComponent {
  readonly participant = input.required<EncounterParticipant>();
  readonly actor = input<Actor | null>(null);
  readonly isCurrentTurn = input(false);
  readonly draggable = input(true);
  readonly isDropTarget = input(false);

  readonly stateChange = output<ParticipantStateChange>();
  readonly remove = output<string>();
  readonly openSheet = output<string>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly dragStart = output<DragEvent>();
  readonly dragEnd = output<void>();
  readonly resourceAdjusted = output<ResourceChange>();

  protected readonly effectCount = computed(
    () => Object.keys(this.participant().temporaryEffects ?? {}).length,
  );

  protected readonly portraitUri = computed(() => assetUrl(this.actor()?.imageUri));

  /**
   * The resources shown for this participant. The GM curates the list per actor in the
   * sheet; player characters reflect the actor's live values while NPCs use the
   * participant's isolated overrides so duplicates stay independent.
   */
  protected readonly resources = computed<Resource[]>(() => {
    const actor = this.actor();
    if (!actor) return [];

    const all = actor.resources ?? [];
    const chosen = actor.encounterResourceIds ?? [];
    const selected = chosen.length === 0 ? all : all.filter((r) => chosen.includes(r.id));

    const overrides = this.participant().resourceOverrides ?? {};
    return selected.map((resource) =>
      overrides[resource.id] === undefined
        ? resource
        : { ...resource, currentValue: overrides[resource.id] },
    );
  });

  protected onEffectsChange(temporaryEffects: TemporaryEffects): void {
    const participant = this.participant();
    this.stateChange.emit({
      participantId: participant.id,
      temporaryHpOffset: participant.temporaryHpOffset,
      temporaryEffects,
    });
  }

  protected onRemove(): void {
    this.remove.emit(this.participant().id);
  }

  protected onOpenSheet(): void {
    const actor = this.actor();
    if (actor) this.openSheet.emit(actor.id);
  }
}
