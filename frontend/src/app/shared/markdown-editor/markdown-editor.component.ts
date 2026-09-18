import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import DOMPurify from 'dompurify';


/**
 * Lightweight rich-text field. The GM applies simple styling (bold, italic, headings,
 * lists, quotes) with a small toolbar; the stored value is sanitised HTML.
 *
 * Editing is buffered: the component emits `valueChange` only when the field loses focus
 * (or the user presses the save shortcut), never per keystroke, so hosts do not fire a
 * request on every character. The DOM is re-synced from the model only when the field is
 * not focused, so the caret never jumps while typing.
 */
@Component({
  selector: 'app-markdown-editor',
  imports: [FormsModule],
  templateUrl: './markdown-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownEditorComponent {
  readonly value = input<string>('');
  readonly label = input('Content');
  readonly placeholder = input('Write…');
  readonly rows = input(6);
  readonly editable = input(true);

  readonly valueChange = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('editor');

  /** True while the field has focus; used to avoid clobbering the caret. */
  protected readonly focused = signal(false);

  /** The last value this component emitted, so we can ignore our own echo. */
  private lastEmitted = '';

  constructor() {
    effect(() => {
      const incoming = this.value() ?? '';
      const element = this.host().nativeElement;

      // Never rewrite the DOM while the user is typing into it.
      if (this.focused()) return;
      if (incoming === this.lastEmitted) return;

      if (element.innerHTML !== incoming) {
        element.innerHTML = DOMPurify.sanitize(incoming);
      }
    });
  }

  protected onFocus(): void {
    this.focused.set(true);
  }

  /** Commits the buffered HTML on blur — the single point where hosts persist. */
  protected onBlur(): void {
    this.focused.set(false);
    this.commit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Ctrl/Cmd+S saves without leaving the field.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.commit();
    }
  }

  /** Applies a simple inline/block command via the browser's own editing actions. */
  protected apply(command: string, argument?: string): void {
    if (!this.editable()) return;
    this.host().nativeElement.focus();
    // execCommand is deprecated but remains the only cross-browser zero-dependency way to
    // apply inline formatting inside a contenteditable without a full editor framework.
    document.execCommand(command, false, argument);
  }

  protected formatBlock(tag: string): void {
    this.apply('formatBlock', tag);
  }

  private commit(): void {
    const html = this.host().nativeElement.innerHTML;
    if (html === this.lastEmitted) return;

    this.lastEmitted = html;
    this.valueChange.emit(html);
  }
}
