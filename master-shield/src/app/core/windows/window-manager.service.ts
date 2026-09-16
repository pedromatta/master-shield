import { computed, Injectable, signal } from '@angular/core';

/** Which feature a window renders. Kept serialisable so layout can persist. */
export type WindowKind =
  | 'actor-sheet'
  | 'npc-grid'
  | 'notes'
  | 'encounter'
  | 'counters'
  | 'locations'
  | 'rules'
  | 'map'
  | 'sessions'
  | 'campaigns'
  | 'systems';

export interface AppWindow {
  readonly id: string;
  readonly kind: WindowKind;
  readonly title: string;
  readonly icon: string;
  /** Contextual payload, e.g. the actor id an actor-sheet window is showing. */
  readonly contextId: string | null;
  /** Grid column/row placement for the tiled layout. */
  readonly column: number;
  readonly row: number;
  readonly colSpan: number;
  readonly rowSpan: number;
  readonly minimized: boolean;
  readonly maximized: boolean;
  /** Stacking order; highest renders on top. */
  readonly z: number;
}

export interface OpenWindowOptions {
  readonly kind: WindowKind;
  readonly title?: string;
  readonly icon?: string;
  readonly contextId?: string | null;
  readonly colSpan?: number;
  readonly rowSpan?: number;
  /** Bring an existing window of this kind+context to the front instead of duplicating. */
  readonly singleton?: boolean;
}

const DEFAULT_META: Record<WindowKind, { title: string; icon: string }> = {
  'actor-sheet': { title: 'Character', icon: 'ra:player' },
  'npc-grid': { title: 'NPCs', icon: 'ra:monster-skull' },
  notes: { title: 'Notes', icon: 'lu:notebook' },
  encounter: { title: 'Encounter', icon: 'ra:crossed-swords' },
  counters: { title: 'Counters', icon: 'lu:clock' },
  locations: { title: 'Locations', icon: 'ra:compass' },
  rules: { title: 'Rules', icon: 'ra:scroll-unfurled' },
  map: { title: 'Map', icon: 'lu:compass' },
  sessions: { title: 'Sessions', icon: 'lu:calendar' },
  campaigns: { title: 'Campaigns', icon: 'ra:tower' },
  systems: { title: 'Game systems', icon: 'ra:book' },
};

/**
 * Tiled window manager. Windows live in a CSS grid; every window can be moved by
 * swapping grid cells, resized by spanning more cells, minimized to a dock and
 * maximized to fill the work area. Several windows stay visible at once so the GM can
 * watch initiative and a monster's resources together.
 */
@Injectable({ providedIn: 'root' })
export class WindowManagerService {
  /** Columns/rows of the tiling grid; also the unit used for placement. */
  readonly gridColumns = 12;
  readonly gridRows = 8;

  private readonly _windows = signal<AppWindow[]>([]);
  private readonly _nextZ = signal(1);
  private sequence = 0;

  readonly windows = this._windows.asReadonly();

  readonly visibleWindows = computed(() => this._windows().filter((w) => !w.minimized));

  readonly minimizedWindows = computed(() => this._windows().filter((w) => w.minimized));

  readonly maximizedWindow = computed(() => this._windows().find((w) => w.maximized) ?? null);

  isOpen(kind: WindowKind, contextId: string | null = null): boolean {
    return this._windows().some((w) => w.kind === kind && w.contextId === contextId);
  }

  windowFor(kind: WindowKind, contextId: string | null = null): AppWindow | null {
    return this._windows().find((w) => w.kind === kind && w.contextId === contextId) ?? null;
  }

  open(options: OpenWindowOptions): AppWindow {
    const contextId = options.contextId ?? null;

    if (options.singleton) {
      const existing = this.windowFor(options.kind, contextId);
      if (existing) {
        this.focus(existing.id);
        this.restore(existing.id);
        return { ...existing, minimized: false, maximized: existing.maximized };
      }
    }

    const meta = DEFAULT_META[options.kind];
    const window: AppWindow = {
      id: `w${++this.sequence}`,
      kind: options.kind,
      title: options.title ?? meta.title,
      icon: options.icon ?? meta.icon,
      contextId,
      column: 1,
      row: 1,
      colSpan: options.colSpan ?? 6,
      rowSpan: options.rowSpan ?? 4,
      minimized: false,
      maximized: false,
      z: this._nextZ(),
    };

    this._nextZ.update((z) => z + 1);
    this._windows.update((windows) => [...windows, window]);
    this.arrange();

    return window;
  }

  close(id: string): void {
    this._windows.update((windows) => windows.filter((w) => w.id !== id));
    this.arrange();
  }

  closeAll(): void {
    this._windows.set([]);
  }

  focus(id: string): void {
    this._windows.update((windows) =>
      windows.map((w) => (w.id === id ? { ...w, z: this._nextZ() } : w)),
    );
    this._nextZ.update((z) => z + 1);
  }

  toggleMinimized(id: string): void {
    this._windows.update((windows) =>
      windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized, maximized: false } : w,
      ),
    );
    this.arrange();
  }

  restore(id: string): void {
    this._windows.update((windows) =>
      windows.map((w) => (w.id === id ? { ...w, minimized: false } : w)),
    );
  }

  toggleMaximized(id: string): void {
    const isMaximized = this._windows().find((w) => w.id === id)?.maximized ?? false;

    // Only one window may own the work area at a time.
    this._windows.update((windows) =>
      windows.map((w) => (w.id === id ? { ...w, maximized: !isMaximized, minimized: false } : { ...w, maximized: false })),
    );
    this.arrange();
  }

  /** Moves a window to a grid cell, swapping with whatever already sits there. */
  moveTo(id: string, column: number, row: number): void {
    this._windows.update((windows) => {
      const moving = windows.find((w) => w.id === id);
      if (!moving) return windows;

      const clampedColumn = clamp(column, 1, this.gridColumns - moving.colSpan + 1);
      const clampedRow = clamp(row, 1, this.gridRows - moving.rowSpan + 1);

      const occupant = windows.find(
        (w) => w.id !== id && w.column === clampedColumn && w.row === clampedRow,
      );

      return windows.map((w) => {
        if (w.id === id) {
          return { ...w, column: clampedColumn, row: clampedRow };
        }
        if (occupant && w.id === occupant.id) {
          return { ...w, column: moving.column, row: moving.row };
        }
        return w;
      });
    });
  }

  resize(id: string, colSpan: number, rowSpan: number): void {
    this._windows.update((windows) =>
      windows.map((w) =>
        w.id === id
          ? {
            ...w,
            colSpan: clamp(colSpan, 2, this.gridColumns),
            rowSpan: clamp(rowSpan, 2, this.gridRows),
          }
          : w,
      ),
    );
    // Intentionally no arrange(): resizing must not move the window. The GM keeps full
    // control of placement, just like dragging a desktop window's edge.
  }

  /**
   * Resizes a window by dragging a specific edge/corner. The opposite edge stays anchored, so
   * dragging the top/left edges moves the origin while the bottom/right edges only change the
   * span. Columns/rows are clamped to the grid and a window never shrinks below 2x2.
   */
  resizeFrom(
    id: string,
    edges: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean },
    colSpan: number,
    rowSpan: number,
  ): void {
    this._windows.update((windows) => {
      const w = windows.find((window) => window.id === id);
      if (!w) return windows;

      const minSpan = 2;
      const right = w.column + w.colSpan;
      const bottom = w.row + w.rowSpan;

      let column = w.column;
      let nextColSpan = clamp(colSpan, minSpan, this.gridColumns);
      let row = w.row;
      let nextRowSpan = clamp(rowSpan, minSpan, this.gridRows);

      if (edges.left) {
        // Keep the right edge fixed: move the origin left/right and derive the new span.
        column = clamp(right - nextColSpan, 1, this.gridColumns - minSpan + 1);
        nextColSpan = right - column;
      } else {
        // Keep the left edge fixed: only the span may grow/shrink within the grid.
        nextColSpan = Math.min(nextColSpan, this.gridColumns - w.column + 1);
      }

      if (edges.top) {
        row = clamp(bottom - nextRowSpan, 1, this.gridRows - minSpan + 1);
        nextRowSpan = bottom - row;
      } else {
        nextRowSpan = Math.min(nextRowSpan, this.gridRows - w.row + 1);
      }

      return windows.map((window) =>
        window.id === id
          ? { ...window, column, row, colSpan: nextColSpan, rowSpan: nextRowSpan }
          : window,
      );
    });
  }

  /** Brings the topmost non-minimized window to the front. */
  focusTopmost(): void {
    const top = [...this.visibleWindows()].sort((a, b) => b.z - a.z).at(0);
    if (top) this.focus(top.id);
  }

  /**
   * Auto-tiles windows that the GM has not explicitly placed: it fills the grid left to
   * right, top to bottom, so opening several tools yields a sensible split instead of a
   * pile. Windows that already overlap keep their explicit cell.
   */
  arrange(): void {
    this._windows.update((windows) => {
      const taken = new Set<string>();
      const placed: AppWindow[] = [];

      // Keep explicitly positioned windows (those that are not overlapping) pinned.
      for (const w of windows) {
        const key = `${w.column}:${w.row}`;
        const collides = placed.some(
          (p) =>
            w.column < p.column + p.colSpan &&
            w.column + w.colSpan > p.column &&
            w.row < p.row + p.rowSpan &&
            w.row + w.rowSpan > p.row,
        );

        if (!collides && !taken.has(key) && !w.maximized) {
          placed.push(w);
          for (let c = w.column; c < w.column + w.colSpan; c++) {
            for (let r = w.row; r < w.row + w.rowSpan; r++) {
              taken.add(`${c}:${r}`);
            }
          }
        }
      }

      // Cascade the remainder into the first free strip.
      for (const w of windows) {
        if (placed.includes(w)) continue;
        if (w.maximized) {
          placed.push(w);
          continue;
        }

        const slot = this.findFreeSlot(taken, w.colSpan, w.rowSpan);
        const positioned = { ...w, column: slot.column, row: slot.row };
        placed.push(positioned);

        for (let c = slot.column; c < slot.column + w.colSpan; c++) {
          for (let r = slot.row; r < slot.row + w.rowSpan; r++) {
            taken.add(`${c}:${r}`);
          }
        }
      }

      return windows.map((w) => placed.find((p) => p.id === w.id) ?? w);
    });
  }

  private findFreeSlot(
    taken: Set<string>,
    colSpan: number,
    rowSpan: number,
  ): { column: number; row: number } {
    const width = Math.min(colSpan, this.gridColumns);
    const height = Math.min(rowSpan, this.gridRows);

    for (let row = 1; row + height - 1 <= this.gridRows; row++) {
      for (let column = 1; column + width - 1 <= this.gridColumns; column++) {
        let free = true;
        for (let c = column; c < column + width && free; c++) {
          for (let r = row; r < row + height; r++) {
            if (taken.has(`${c}:${r}`)) {
              free = false;
              break;
            }
          }
        }
        if (free) return { column, row };
      }
    }

    // Grid is full: stack on top of the last cell rather than dropping the window.
    return { column: clamp(this.gridColumns - width + 1, 1, this.gridColumns), row: 1 };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
