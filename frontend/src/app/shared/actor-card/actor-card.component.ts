import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Actor, Tag, actorTypeLabel } from '../../core/models/actor.model';
import { assetUrl } from '../../core/services/asset-url';
import { IconComponent } from '../icon/icon.component';

/**
 * Compact actor tile: portrait, name and tags. Emits `opened` when the GM clicks it,
 * and `addToEncounter` from the inline battle button.
 */
@Component({
  selector: 'app-actor-card',
  imports: [IconComponent],
  templateUrl: './actor-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActorCardComponent {
  readonly actor = input.required<Actor>();
  readonly showAddToEncounter = input(false);

  readonly opened = output<void>();
  readonly addToEncounter = output<void>();

  protected readonly typeLabel = computed(() => actorTypeLabel(this.actor().type));

  protected readonly initials = computed(() =>
    this.actor()
      .name.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );

  protected readonly topTags = computed(() => (this.actor().tags ?? []).slice(0, 3));

  protected readonly portraitUri = computed(() => assetUrl(this.actor().imageUri));

  protected onAdd(event: Event): void {
    event.stopPropagation();
    this.addToEncounter.emit();
  }

  protected tagStyle(tag: Tag): string {
    return `border-color:${tag.colorHex};color:${tag.colorHex}`;
  }
}
