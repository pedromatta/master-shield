import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Attachment, AttachmentOwner } from '../models/common.model';

/** Destination folder for an upload, matching the API's allowed scopes. */
export type UploadScope =
  | 'actors'
  | 'locations'
  | 'rules'
  | 'notes'
  | 'rule-categories'
  | 'note-categories';

export interface UploadResult {
  uri: string;
  fileName: string;
  contentType: string;
  sizeInBytes: number;
}

/**
 * Uploads user files (portraits, maps, category icons, attachments) to the API, which
 * stores them under wwwroot and returns the relative URI to persist on the entity.
 */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Stores a file under the given scope and returns its URI + metadata. */
  upload(file: File, scope: UploadScope): Promise<UploadResult> {
    const form = new FormData();
    form.append('file', file, file.name);
    const params = new HttpParams().set('scope', scope);

    return firstValueFrom(
      this.http.post<UploadResult>(`${this.base}/uploads`, form, { params }),
    );
  }

  // ---- Direct entity image setters ------------------------------------------

  /** Uploads an actor portrait and persists it on the actor. Returns the new URI. */
  uploadActorImage(actorId: string, file: File): Promise<string> {
    return this.uploadToEntity(`/actors/${actorId}/image`, file, 'imageUri');
  }

  /** Uploads a location image (thumbnail / battle map). Returns the new URI. */
  uploadLocationImage(locationId: string, file: File): Promise<string> {
    return this.uploadToEntity(`/locations/${locationId}/image`, file, 'imageUri');
  }

  /** Uploads a rule category icon. Returns the new URI. */
  uploadRuleCategoryIcon(categoryId: string, file: File): Promise<string> {
    return this.uploadToEntity(`/rules/categories/${categoryId}/icon`, file, 'iconUri');
  }

  /** Uploads a note category icon. Returns the new URI. */
  uploadNoteCategoryIcon(categoryId: string, file: File): Promise<string> {
    return this.uploadToEntity(`/notes/categories/${categoryId}/icon`, file, 'iconUri');
  }

  // ---- Attachments ----------------------------------------------------------

  listAttachments(owner: AttachmentOwner, ownerId: string): Promise<Attachment[]> {
    return firstValueFrom(
      this.http.get<Attachment[]>(`${this.base}/attachments/${owner}/${ownerId}`),
    );
  }

  uploadAttachment(owner: AttachmentOwner, ownerId: string, file: File): Promise<Attachment> {
    const form = new FormData();
    form.append('file', file, file.name);
    return firstValueFrom(
      this.http.post<Attachment>(`${this.base}/attachments/${owner}/${ownerId}`, form),
    );
  }

  deleteAttachment(attachmentId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}/attachments/${attachmentId}`),
    );
  }

  private async uploadToEntity(path: string, file: File, key: string): Promise<string> {
    const form = new FormData();
    form.append('file', file, file.name);
    const response = await firstValueFrom(
      this.http.post<Record<string, string>>(`${this.base}${path}`, form),
    );

    const uri = response[key];
    if (!uri) {
      throw new Error(`The server did not return a ${key}.`);
    }

    return uri;
  }
}
