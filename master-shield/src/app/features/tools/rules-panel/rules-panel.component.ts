import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../../../core/services/content-store.service';
import { Rule, RuleCategory } from '../../../core/models/content.model';
import { Attachment } from '../../../core/models/common.model';
import { Tag } from '../../../core/models/actor.model';
import { assetUrl } from '../../../core/services/asset-url';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { TagEditorComponent } from '../../../shared/tag-editor/tag-editor.component';
import { IconPickerComponent } from '../../../shared/icon/icon-picker.component';
import { IconComponent } from '../../../shared/icon/icon.component';

/** Rules browser: category rail on the left, rule list + editor on the right. */
@Component({
  selector: 'app-rules-panel',
  imports: [FormsModule, ImageUploadComponent, TagEditorComponent, IconPickerComponent, IconComponent],
  templateUrl: './rules-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesPanelComponent {
  private readonly store = inject(ContentStoreService);

  protected readonly categories = this.store.ruleCategories;
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly selectedRuleId = signal<string | null>(null);
  protected readonly showCategoryForm = signal(false);
  protected readonly editingCategoryId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly newCategoryName = signal('');
  /** Icon held in memory until the category row exists to attach it to. */
  protected readonly newCategoryIconFile = signal<File | null>(null);
  protected readonly newCategoryIconPreview = signal('');

  protected readonly draftCategoryName = signal('');

  protected readonly selectedCategory = computed<RuleCategory | null>(
    () => this.categories().find((category) => category.id === this.selectedCategoryId()) ?? null,
  );

  protected readonly rules = computed(() => {
    const all = this.selectedCategory()?.rules ?? [];
    const tagIds = this.activeTagIds();
    if (tagIds.size === 0) return all;
    return all.filter((rule) => (rule.tags ?? []).some((tag) => tagIds.has(tag.id)));
  });

  protected readonly allTags = computed(() => this.store.tagsFor('Rule'));
  protected readonly activeTagIds = signal<Set<string>>(new Set());

  protected isTagActive(id: string): boolean {
    return this.activeTagIds().has(id);
  }

  protected toggleTagFilter(id: string): void {
    this.activeTagIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected readonly selectedRule = computed<Rule | null>(
    () => this.rules().find((rule) => rule.id === this.selectedRuleId()) ?? null,
  );

  protected readonly ruleIndex = computed(() =>
    this.rules().findIndex((rule) => rule.id === this.selectedRuleId()),
  );

  protected readonly canGoPrevious = computed(() => this.ruleIndex() > 0);

  protected readonly canGoNext = computed(() => {
    const index = this.ruleIndex();
    return index >= 0 && index < this.rules().length - 1;
  });

  protected trackCategory(_index: number, category: RuleCategory): string {
    return category.id;
  }

  protected trackRule(_index: number, rule: Rule): string {
    return rule.id;
  }

  /** Resolves a stored category icon against the API origin. */
  protected readonly iconUrl = assetUrl;

  /** Resolves a stored attachment URI against the API origin. */
  protected readonly attachmentUrl = assetUrl;

  protected isCategorySelected(id: string): boolean {
    return this.selectedCategoryId() === id;
  }

  protected selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
    this.selectedRuleId.set(this.categoryRules(id).at(0)?.id ?? null);
  }

  private categoryRules(id: string): Rule[] {
    return this.categories().find((category) => category.id === id)?.rules ?? [];
  }

  protected async createCategory(): Promise<void> {
    const name = this.newCategoryName().trim();
    if (!name) return;

    try {
      const created = await this.store.createRuleCategory(name, '');
      const file = this.newCategoryIconFile();
      if (file) {
        await this.store.uploadRuleCategoryIcon(created.id, file);
      }
      this.newCategoryName.set('');
      this.newCategoryIconFile.set(null);
      this.newCategoryIconPreview.set('');
      this.showCategoryForm.set(false);
      this.selectCategory(created.id);
    } catch {
      this.error.set('Could not create the category.');
    }
  }

  protected onNewCategoryIconChosen(file: File): void {
    this.newCategoryIconFile.set(file);
    this.newCategoryIconPreview.set(URL.createObjectURL(file));
  }

  protected startEditCategory(category: RuleCategory): void {
    this.editingCategoryId.set(category.id);
    this.draftCategoryName.set(category.name);
  }

  /** Uploads a replacement icon directly against the persisted category. */
  protected async onCategoryIconChosen(category: RuleCategory, file: File): Promise<void> {
    this.error.set(null);
    try {
      await this.store.uploadRuleCategoryIcon(category.id, file);
    } catch {
      this.error.set('Could not upload the category icon.');
    }
  }

  protected async saveCategory(category: RuleCategory): Promise<void> {
    const name = this.draftCategoryName().trim();
    if (!name) return;

    await this.store.updateRuleCategory({ ...category, name });
    this.editingCategoryId.set(null);
  }

  protected async deleteCategory(category: RuleCategory, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.store.deleteRuleCategory(category.id);
      if (this.selectedCategoryId() === category.id) {
        this.selectedCategoryId.set(this.categories().at(0)?.id ?? null);
      }
    } catch {
      this.error.set('Could not delete the category.');
    }
  }

  protected async toggleToolbar(category: RuleCategory): Promise<void> {
    await this.store.updateRuleCategory({ ...category, showInToolbar: !category.showInToolbar });
  }

  protected async createRule(): Promise<void> {
    const category = this.selectedCategory();
    if (!category) return;

    try {
      const created = await this.store.createRule(category.id, 'New rule');
      this.selectedRuleId.set(created.id);
    } catch {
      this.error.set('Could not create the rule.');
    }
  }

  protected async saveRuleField<K extends keyof Rule>(field: K, value: Rule[K]): Promise<void> {
    const rule = this.selectedRule();
    if (!rule || rule[field] === value) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.updateRule({ ...rule, [field]: value });
    } catch {
      this.error.set('Could not save the rule.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRule(): Promise<void> {
    const rule = this.selectedRule();
    const category = this.selectedCategory();
    if (!rule || !category) return;

    try {
      await this.store.deleteRule(category.id, rule.id);
      this.selectedRuleId.set(this.rules().at(0)?.id ?? null);
    } catch {
      this.error.set('Could not delete the rule.');
    }
  }

  /** Saves the chosen catalogue icon onto the rule. */
  protected async onRuleIconChange(iconId: string): Promise<void> {
    const rule = this.selectedRule();
    if (!rule) return;
    await this.store.updateRule({ ...rule, iconId });
  }

  /** Uploads a custom image for the rule (takes precedence over the icon). */
  protected async onRuleImageChosen(file: File): Promise<void> {
    const rule = this.selectedRule();
    if (!rule) return;
    this.error.set(null);
    try {
      await this.store.uploadAttachment('rule', rule.id, file);
    } catch {
      this.error.set('Could not upload the rule image.');
    }
  }

  protected async onAttachmentChosen(file: File): Promise<void> {    const rule = this.selectedRule();
    if (!rule) return;

    this.error.set(null);
    try {
      await this.store.uploadAttachment('rule', rule.id, file);
    } catch {
      this.error.set('Could not upload the attachment.');
    }
  }

  protected async removeAttachment(attachment: Attachment): Promise<void> {
    const rule = this.selectedRule();
    if (!rule) return;

    this.error.set(null);
    try {
      await this.store.deleteAttachment('rule', rule.id, attachment.id);
    } catch {
      this.error.set('Could not remove the attachment.');
    }
  }

  protected async onTagsChange(tags: Tag[]): Promise<void> {
    const rule = this.selectedRule();
    if (!rule) return;

    this.error.set(null);
    try {
      await this.store.updateRule({ ...rule, tags });
    } catch {
      this.error.set('Could not save tags.');
    }
  }

  protected goToPrevious(): void {
    const index = this.ruleIndex();
    if (index > 0) this.selectedRuleId.set(this.rules()[index - 1].id);
  }

  protected goToNext(): void {
    const index = this.ruleIndex();
    if (index >= 0 && index < this.rules().length - 1) {
      this.selectedRuleId.set(this.rules()[index + 1].id);
    }
  }
}
