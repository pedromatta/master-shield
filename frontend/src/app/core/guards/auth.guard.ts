import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Blocks a route until the session cookie is confirmed. Unauthenticated visitors are sent to
 * the login screen, preserving where they were headed.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Confirm any existing cookie before deciding.
  if (!auth.ready()) {
    await auth.check();
  }

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
