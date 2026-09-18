import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'Sign in · Master Shield',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/gm-dashboard.component').then((m) => m.GmDashboardComponent),
    title: 'GM Dashboard · Master Shield',
  },
  { path: '**', redirectTo: '' },
];
