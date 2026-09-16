import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../core/services/content-store.service';
import { IconComponent } from '../icon/icon.component';
import { assetUrl } from '../../core/services/asset-url';

/**
 * Links rules to an actor. Presents every rule in the campaign grouped by category and lets
 * the GM toggle the ones that belong to this actor — abilities for a character, tactics for a
 * threat NPC. Emits the selected rule ids; the host persists them.
 */
@Component({
  selector: 'app-rule-picker',
  imports: [FormsModule, IconComponent],
  templateUrl: './rule-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulePickerComponent {
  private readonly store = inject(ContentStoreService);

  /** Currently linked rule ids. */
  readonly selectedIds = input<string[]>([]);
  readonly label = input('Linked rules');

  readonly selectedIdsChange = output<string[]>();

  protected readonly search = signal('');
  protected readonly open = signal(true);
  protected readonly resolveAsset = assetUrl;

  /** All rules in the campaign, grouped by their category. */
  protected readonly groups = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.store
      .ruleCategories()
      .map((category) => ({
        id: category.id,
        name: category.name,
        rules: (category.rules ?? []).filter(
          (rule) => !term || rule.title.toLowerCase().includes(term),
        ),
      }))
      .filter((group) => group.rules.length > 0);
  });

  protected readonly selectedSet = computed(() => new Set(this.selectedIds()));

  protected isSelected(id: string): boolean {
    return this.selectedSet().has(id);
  }

  protected toggle(id: string): void {
    const current = this.selectedIds();
    const next = this.isSelected(id)
      ? current.filter((ruleId) => ruleId !== id)
      : [...current, id];
    this.selectedIdsChange.emit(next);
  }

  protected countLabel(): string {
    const count = this.selectedIds().length;
    return count === 0 ? 'none' : `${count} linked`;
  }
}
