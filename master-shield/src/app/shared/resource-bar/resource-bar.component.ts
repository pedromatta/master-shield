import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Resource, resourcePercent } from '../../core/models/actor.model';
import { LOW_RESOURCE_COLOR } from '../../core/theme/theme';

export interface ResourceChange {
  readonly resourceId: string;
  /** Signed delta for relative changes, or the absolute value when `replace` is set. */
  readonly delta: number;
  /** When true the tracker should assign `delta` instead of adding it. */
  readonly replace?: boolean;
}

/**
 * A single resource as a proportional bar with inline -/+ controls. Used on the
 * sidebar character cards, inside actor sheets and in the encounter tracker.
 *
 * When <see cref="expressionInput"/> is on, an inline field accepts `+N`, `-N` or plain `N`
 * (set to N) so the GM can apply bigger changes quickly.
 */
@Component({
  selector: 'app-resource-bar',
  imports: [FormsModule],
  templateUrl: './resource-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceBarComponent {
  readonly resource = input.required<Resource>();
  readonly compact = input(false);
  readonly editable = input(true);
  /** Show the `+N / -N / N` expression field. */
  readonly expressionInput = input(false);

  readonly adjusted = output<ResourceChange>();

  protected readonly expression = signal('');

  /** Colour shown when the bar falls into its low state (theme-controlled). */
  protected readonly lowColor = LOW_RESOURCE_COLOR;

  protected readonly percent = computed(() => resourcePercent(this.resource()));

  protected readonly isLow = computed(() => this.percent() <= 25);

  protected readonly isFull = computed(() => this.resource().currentValue >= this.resource().maxValue);

  protected readonly isEmpty = computed(() => this.resource().currentValue <= 0);

  protected adjust(delta: number, event: Event): void {
    event.stopPropagation();
    this.adjusted.emit({ resourceId: this.resource().id, delta });
  }

  /**
   * Parses the expression field: `+5` adds, `-5` subtracts, `5` sets the value. Anything
   * unrecognised is ignored and the field is cleared.
   */
  protected applyExpression(event: Event): void {
    event.stopPropagation();
    const raw = this.expression().trim();
    this.expression.set('');
    if (!raw) return;

    const match = /^([+-]?)\s*(\d+)$/.exec(raw);
    if (!match) return;

    const sign = match[1];
    const value = Number(match[2]);
    if (!Number.isFinite(value)) return;

    if (sign === '+') {
      this.adjusted.emit({ resourceId: this.resource().id, delta: value });
    } else if (sign === '-') {
      this.adjusted.emit({ resourceId: this.resource().id, delta: -value });
    } else {
      this.adjusted.emit({ resourceId: this.resource().id, delta: value, replace: true });
    }
  }
}
