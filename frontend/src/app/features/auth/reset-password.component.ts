import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * Landing page for the emailed password-reset link. The username and token arrive as query
 * parameters (`/reset-password?username=…&token=…`); the GM only chooses a new password.
 */
@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly username = signal('');
  protected readonly token = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.username.set(params.get('username') ?? '');
    this.token.set(params.get('token') ?? '');
  }

  protected readonly linkValid = () =>
    this.username().trim().length > 0 && this.token().trim().length > 0;

  protected canSubmit(): boolean {
    return (
      this.linkValid() &&
      this.password().length >= 6 &&
      this.password() === this.confirm() &&
      !this.busy()
    );
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.resetPassword(this.username().trim(), this.token().trim(), this.password());
      this.done.set(true);
    } catch (error) {
      this.error.set(extractError(error) ?? 'That reset link is not valid or has expired.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async goToSignIn(): Promise<void> {
    await this.router.navigate(['/login']);
  }
}

/** Pulls a server error message out of an HttpErrorResponse when one is present. */
function extractError(error: unknown): string | null {
  const body = (error as { error?: unknown })?.error;
  if (typeof body === 'string' && body.trim()) return body;
  return null;
}
