import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';

import { ContentStoreService } from '../../core/services/content-store.service';
import { WindowKind, WindowManagerService } from '../../core/windows/window-manager.service';
import { RuleCategory } from '../../core/models/content.model';
import { IconComponent } from '../../shared/icon/icon.component';
import { assetUrl } from '../../core/services/asset-url';

interface ToolButton {
  readonly id: string;
  readonly kind: WindowKind;
  readonly icon: string;
  readonly label: string;
}

/**
 * Bottom icon bar. The six fixed tools cover notes, NPCs, combat, counters, maps and
 * rules; every rule category the GM pinned appears beside them as its own button.
 */
@Component({
  selector: 'app-tool-bar',
  imports: [IconComponent],
  templateUrl: './tool-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolBarComponent {
  private readonly windows = inject(WindowManagerService);
  protected readonly store = inject(ContentStoreService);

  readonly toolRequested = output<WindowKind>();

  protected readonly tools: readonly ToolButton[] = [
    { id: 'notes', kind: 'notes', icon: 'lu:notebook', label: 'Notes' },
    { id: 'npcs', kind: 'npc-grid', icon: 'ra:monster-skull', label: 'NPCs' },
    { id: 'encounter', kind: 'encounter', icon: 'ra:crossed-swords', label: 'Encounter' },
    { id: 'counters', kind: 'counters', icon: 'lu:clock', label: 'Counters' },
    { id: 'locations', kind: 'locations', icon: 'ra:compass', label: 'Locations' },
    { id: 'rules', kind: 'rules', icon: 'ra:scroll-unfurled ', label: 'Rules' },
  ];

  protected readonly pinnedCategories = computed(() =>
    this.store.ruleCategories().filter((category) => category.showInToolbar),
  );

  /** Resolves an uploaded category icon against the API origin. */
  protected readonly resolveAsset = assetUrl;

  protected trackTool(_index: number, tool: ToolButton): string {
    return tool.id;
  }

  protected trackCategory(_index: number, category: RuleCategory): string {
    return category.id;
  }

  protected isOpen(kind: WindowKind): boolean {
    return this.windows.isOpen(kind);
  }

  protected open(kind: WindowKind): void {
    this.windows.open({ kind, singleton: false });
    this.toolRequested.emit(kind);
  }

  /** Rule category buttons open the rules browser focused on that category. */
  protected openRuleCategory(): void {
    this.windows.open({ kind: 'rules', singleton: false });
  }
}
