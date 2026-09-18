import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icon/icon.component';

type Mode = 'signin' | 'signup' | 'forgot';

/**
 * Authentication screen. Covers sign-in, sign-up and the two-step password reset
 * (request a token, then set a new password). The reset token is shown to the GM because
 * this local install has no mail delivery.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule, IconComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly mode = signal<Mode>('signin');

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly email = signal('');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<string | null>(null);

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
    this.error.set(null);
    this.status.set(null);
  }

  protected canSignIn(): boolean {
    return this.username().trim().length > 0 && this.password().length > 0 && !this.busy();
  }

  protected canSignUp(): boolean {
    return (
      this.username().trim().length > 0 &&
      this.password().length >= 6 &&
      this.password() === this.confirm() &&
      !this.busy()
    );
  }


  protected async signIn(): Promise<void> {
    if (!this.canSignIn()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.username(), this.password());
      await this.enterApp();
    } catch {
      this.error.set('Invalid username or password.');
      this.password.set('');
    } finally {
      this.busy.set(false);
    }
  }

  protected async signUp(): Promise<void> {
    if (!this.canSignUp()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.signUp({
        username: this.username().trim(),
        password: this.password(),
        email: this.email().trim() || undefined,
      });
      await this.enterApp();
    } catch (error) {
      this.error.set(extractError(error) ?? 'Could not create the account.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Asks the API to email a reset link. The response is intentionally neutral. */
  protected async requestReset(): Promise<void> {
    const username = this.username().trim();
    if (!username || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);
    this.status.set(null);
    try {
      await this.auth.forgotPassword(username);
      this.status.set(
        'If that account exists and has an email address, a reset link is on its way.',
      );
      this.mode.set('signin');
    } catch {
      this.error.set('Could not start the reset. Try again later.');
    } finally {
      this.busy.set(false);
    }
  }

  private async enterApp(): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    await this.router.navigateByUrl(returnUrl);
  }
}

/** Pulls a server error message out of an HttpErrorResponse when one is present. */
function extractError(error: unknown): string | null {
  const body = (error as { error?: unknown })?.error;
  if (typeof body === 'string' && body.trim()) return body;
  return null;
}
