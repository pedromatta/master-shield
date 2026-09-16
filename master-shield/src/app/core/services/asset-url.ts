import { environment } from '../../../environments/environment';

/**
 * Resolves a server-stored asset URI (e.g. `/uploads/actors/abc.png`) to a URL the
 * browser can actually fetch.
 *
 * Uploaded files are served by the API's static-file middleware, not by the Angular
 * app. When `apiBaseUrl` is absolute (a separate API origin) the asset must be prefixed
 * with that origin; when it is relative (the dev proxy, or a same-origin production
 * deployment) the URI already resolves and is returned untouched.
 *
 * Absolute URLs, data URIs and blob URLs are passed through unchanged.
 */
export function assetUrl(uri: string | null | undefined): string {
  if (!uri) return '';

  // Already absolute (http/https), or an inline/preview source we must not rewrite.
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(uri) || uri.startsWith('data:') || uri.startsWith('blob:')) {
    return uri;
  }

  const base = environment.apiBaseUrl;
  if (!/^https?:\/\//i.test(base)) {
    // Relative API base: same origin as the app, so a rooted URI is fine.
    return uri;
  }

  return new URL(uri, base).href;
}
