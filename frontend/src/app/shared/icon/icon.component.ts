import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import { resolveIconId } from './icon-catalog';
import { LUCIDE_COMPONENTS } from './lucide-icons';

/**
 * Renders a single icon from an id such as `ra:crossed-swords` or `lu:shield`.
 *
 * RPG Awesome icons are font glyphs; Lucide icons are dynamically rendered SVG components.
 * Unknown or legacy values are normalised through {@link resolveIconId}, so an emoji stored
 * before the icon system existed still renders as its mapped icon.
 */
@Component({
  selector: 'app-icon',
  imports: [NgComponentOutlet],
  templateUrl: './icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // `inline-flex` + `align-middle` keeps the icon centred on the text baseline when it
    // sits inside a run of text, and `leading-none` stops the glyph from inflating the
    // line box. Hosts that lay their children out with flex still centre it.
    class: 'inline-flex shrink-0 items-center justify-center align-middle leading-none',
    '[style.font-size.px]': 'size()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class IconComponent {
  /** Canonical id, legacy emoji, or empty. */
  readonly name = input<string>('');
  readonly size = input(16);
  /** Accessible label; when omitted the icon is decorative. */
  readonly label = input<string | null>(null);

  protected readonly iconId = computed(() => resolveIconId(this.name()));

  protected readonly family = computed(() => (this.iconId().startsWith('ra:') ? 'ra' : 'lu'));

  protected readonly raClass = computed(() => `ra ra-${this.iconId().slice(3)}`);

  protected readonly lucideComponent = computed(() => {
    const key = this.iconId().slice(3);
    return LUCIDE_COMPONENTS[key] ?? LUCIDE_COMPONENTS['star'];
  });

  protected readonly lucideInputs = computed(() => ({ size: String(this.size()) }));
}
