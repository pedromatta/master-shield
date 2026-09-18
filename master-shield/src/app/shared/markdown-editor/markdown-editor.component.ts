import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import DOMPurify from 'dompurify';

import { IconComponent } from '../icon/icon.component';

/**
 * Lightweight rich-text field. The GM applies simple styling (bold, italic, headings,
 * lists, quotes) with a small toolbar; the stored value is sanitised HTML.
 *
 * The editor is uncontrolled while focused: the DOM is only re-synced from the model when
 * the incoming value differs from what the user has typed. That avoids the caret jumping to
 * the end (or character loss) when a parent echoes the value back while typing.
 */
@Component({
  selector: 'app-markdown-editor',
  imports: [FormsModule, IconComponent],
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

  /** The last value this component emitted, so we can ignore our own echo. */
  private lastEmitted = '';

  constructor() {
    // Push the model into the DOM only when it changed from outside (not our own echo) and
    // the field is not being typed into.
    effect(() => {
      const incoming = this.value() ?? '';
      const element = this.host().nativeElement;
      if (incoming === this.lastEmitted) return;
      if (element.innerHTML !== incoming) {
        element.innerHTML = DOMPurify.sanitize(incoming);
      }
    });
  }

  protected onInput(): void {
    const html = this.host().nativeElement.innerHTML;
    this.lastEmitted = html;
    this.valueChange.emit(html);
  }

  /** Applies a simple inline/block command via the browser's own editing actions. */
  protected apply(command: string, argument?: string): void {
    if (!this.editable()) return;
    this.host().nativeElement.focus();
    // execCommand is deprecated but remains the only cross-browser zero-dependency way to
    // apply inline formatting inside a contenteditable without a full editor framework.
    document.execCommand(command, false, argument);
    this.onInput();
  }

  protected formatBlock(tag: string): void {
    this.apply('formatBlock', tag);
  }

  protected isBlank(): boolean {
    return !(this.value() ?? '').trim() || (this.value() ?? '').trim() === '<br>';
  }
}
