import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icon/icon.component';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

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

  /** Token returned by the reset request, shown for the GM to copy into the reset form. */
  protected readonly resetToken = signal('');

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

  protected canReset(): boolean {
    return (
      this.username().trim().length > 0 &&
      this.resetToken().trim().length > 0 &&
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

  /** Requests a reset token for the entered username. */
  protected async requestReset(): Promise<void> {
    const username = this.username().trim();
    if (!username || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);
    this.status.set(null);
    try {
      const ticket = await this.auth.forgotPassword(username);
      // Surfaced directly: this install has no mail delivery.
      this.resetToken.set(ticket.token);
      this.status.set('Reset token issued. Paste it below with a new password.');
      this.mode.set('reset');
    } catch {
      this.error.set('No account with that username.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async submitReset(): Promise<void> {
    if (!this.canReset()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.resetPassword(this.username().trim(), this.resetToken().trim(), this.password());
      this.status.set('Password updated. You can sign in now.');
      this.password.set('');
      this.confirm.set('');
      this.resetToken.set('');
      this.mode.set('signin');
    } catch (error) {
      this.error.set(extractError(error) ?? 'That reset token is not valid.');
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
