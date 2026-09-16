import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { AppWindow, WindowManagerService } from '../../core/windows/window-manager.service';
import { IconComponent } from '../icon/icon.component';

/**
 * Chrome for a single tiled window: title bar, minimize/maximize/close controls and a
 * resize grip. Placement is expressed as CSS grid lines so the browser handles the
 * actual pixel layout.
 */
@Component({
  selector: 'app-window-frame',
  imports: [IconComponent],
  templateUrl: './window-frame.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block relative min-h-0 min-w-0',
    '[style.grid-column]': 'gridColumn()',
    '[style.grid-row]': 'gridRow()',
    '[style.z-index]': 'window().z',
    '[class.hidden]': 'window().minimized',
    '(pointerdown)': 'onFocus()',
  },
})
export class WindowFrameComponent {
  private readonly manager = inject(WindowManagerService);

  readonly window = input.required<AppWindow>();
  readonly closable = input(true);

  readonly closed = output<void>();

  protected readonly dragging = signal(false);
  protected readonly resizing = signal(false);

  protected readonly gridColumn = computed(() => {
    const w = this.window();
    if (w.maximized) return `1 / span ${this.manager.gridColumns}`;
    return `${w.column} / span ${w.colSpan}`;
  });

  protected readonly gridRow = computed(() => {
    const w = this.window();
    if (w.maximized) return `1 / span ${this.manager.gridRows}`;
    return `${w.row} / span ${w.rowSpan}`;
  });

  protected readonly isMaximized = computed(() => this.window().maximized);

  protected readonly isMinimized = computed(() => this.window().minimized);

  protected onFocus(): void {
    this.manager.focus(this.window().id);
  }

  protected toggleMinimized(): void {
    this.manager.toggleMinimized(this.window().id);
  }

  protected toggleMaximized(): void {
    this.manager.toggleMaximized(this.window().id);
  }

  protected close(): void {
    this.manager.close(this.window().id);
    this.closed.emit();
  }

  /** Drag the title bar to another cell; dropping swaps it with the occupant. */
  protected onDragStart(event: PointerEvent): void {
    if (this.isMaximized()) return;

    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.dragging.set(true);
    event.preventDefault();

    const startColumn = this.window().column;
    const startRow = this.window().row;
    const startX = event.clientX;
    const startY = event.clientY;
    const host = (event.currentTarget as HTMLElement).closest('app-window-frame') as HTMLElement;
    const cellWidth = host.offsetWidth / this.window().colSpan;
    const cellHeight = host.offsetHeight / this.window().rowSpan;

    const move = (moveEvent: PointerEvent) => {
      const deltaColumn = Math.round((moveEvent.clientX - startX) / Math.max(cellWidth, 1));
      const deltaRow = Math.round((moveEvent.clientY - startY) / Math.max(cellHeight, 1));

      if (deltaColumn !== 0 || deltaRow !== 0) {
        this.manager.moveTo(
          this.window().id,
          startColumn + deltaColumn,
          startRow + deltaRow,
        );
      }
    };

    const end = () => {
      this.dragging.set(false);
      globalThis.removeEventListener('pointermove', move);
      globalThis.removeEventListener('pointerup', end);
    };

    globalThis.addEventListener('pointermove', move);
    globalThis.addEventListener('pointerup', end);
  }

  /** Resize grip on any edge/corner. The opposite edge stays anchored. */
  protected onResizeStart(
    event: PointerEvent,
    edges: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean },
  ): void {
    const host = (event.currentTarget as HTMLElement).closest('app-window-frame') as HTMLElement;
    const startColSpan = this.window().colSpan;
    const startRowSpan = this.window().rowSpan;
    const startX = event.clientX;
    const startY = event.clientY;
    const cellWidth = host.offsetWidth / startColSpan;
    const cellHeight = host.offsetHeight / startRowSpan;

    this.resizing.set(true);
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const dx = Math.round((moveEvent.clientX - startX) / Math.max(cellWidth, 1));
      const dy = Math.round((moveEvent.clientY - startY) / Math.max(cellHeight, 1));

      // Left/top edges grow when dragged outward (negative delta).
      const nextColSpan = startColSpan + (edges.left ? -dx : edges.right ? dx : 0);
      const nextRowSpan = startRowSpan + (edges.top ? -dy : edges.bottom ? dy : 0);

      this.manager.resizeFrom(this.window().id, edges, nextColSpan, nextRowSpan);
    };

    const end = () => {
      this.resizing.set(false);
      globalThis.removeEventListener('pointermove', move);
      globalThis.removeEventListener('pointerup', end);
    };

    globalThis.addEventListener('pointermove', move);
    globalThis.addEventListener('pointerup', end);
  }
}
