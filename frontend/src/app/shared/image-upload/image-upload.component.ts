import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { assetUrl } from '../../core/services/asset-url';

/**
 * Reusable image picker. Shows the current image (or a placeholder) and emits the chosen
 * file through <see cref="fileChosen"/>. Persistence is owned by the parent screen.
 */
@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploadComponent {
  /** Current image URI (relative to the API), or '' when none. */
  readonly imageUri = input('');
  readonly label = input('Image');
  /** Accessible alt text for the preview. */
  readonly alt = input('');
  readonly compact = input(false);
  /** Text shown when no image is set. */
  readonly placeholder = input('No image');
  readonly disabled = input(false);

  readonly fileChosen = output<File>();

  protected readonly inputId = `image-upload-${Math.random().toString(36).slice(2, 9)}`;

  /** Uploaded URIs live on the API origin, so resolve them before rendering. */
  protected readonly resolvedUri = computed(() => assetUrl(this.imageUri()));

  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      this.fileChosen.emit(file);
    }
  }
}
