import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay'
import { ALL_ICONS, IconOption } from './icon-catalog';
import { IconComponent } from './icon.component';

/**
 * Icon chooser for actors, rules, categories and locations. Offers the RPG Awesome and
 * Lucide catalogues with a search box, and an optional image upload for GMs who prefer a
 * custom picture. Emits the chosen `iconId` (or the uploaded URI) to the host entity.
 *
 * The picker itself never persists: the host writes the value through its own service.
 */
@Component({
  selector: 'app-icon-picker',
  imports: [FormsModule, IconComponent, OverlayModule],
  templateUrl: './icon-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconPickerComponent {
  /** Current icon id (or empty for the default). */
  readonly value = input<string>('');
  /** Current uploaded image URI, if any. An image takes precedence over the glyph. */
  readonly imageUri = input<string>('');
  readonly label = input('Icon');

  /** Emits the selected icon id. */
  readonly iconChange = output<string>();
  /** Emits a chosen image file for upload by the host. */
  readonly imageChosen = output<File>();
  /** Emits when the GM clears an uploaded image. */
  readonly imageCleared = output<void>();

  protected readonly open = signal(false);
  protected readonly search = signal('');

  protected readonly groups = computed(() => {
    const term = this.search().trim().toLowerCase();
    const matches = ALL_ICONS.filter(
      (icon) =>
        !term ||
        icon.label.toLowerCase().includes(term) ||
        icon.name.toLowerCase().includes(term) ||
        icon.group.toLowerCase().includes(term),
    );

    const byGroup = new Map<string, IconOption[]>();
    for (const icon of matches) {
      const list = byGroup.get(icon.group) ?? [];
      list.push(icon);
      byGroup.set(icon.group, list);
    }

    return [...byGroup.entries()].map(([name, icons]) => ({ name, icons }));
  });

  protected readonly resultCount = computed(() =>
    this.groups().reduce((total, group) => total + group.icons.length, 0),
  );

  protected toggle(): void {
    this.open.update((current) => !current);
  }

  protected choose(icon: IconOption): void {
    // Choosing a glyph replaces any uploaded image, so the two never conflict.
    if (this.imageUri()) this.imageCleared.emit();
    this.iconChange.emit(icon.id);
    this.open.set(false);
  }

  /** Clears both the uploaded image and the selected glyph. */
  protected clear(): void {
    if (this.imageUri()) this.imageCleared.emit();
    this.iconChange.emit('');
  }

  protected onImageChosen(file: File): void {
    this.imageChosen.emit(file);
    this.open.set(false);
  }
}
