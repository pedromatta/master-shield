import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/gm-dashboard.component').then((m) => m.GmDashboardComponent),
    title: 'GM Dashboard · Master Shield',
  },
  {
    path: 'compendium',
    loadComponent: () =>
      import('./features/compendium/blueprint-compendium.component').then(
        (m) => m.BlueprintCompendiumComponent,
      ),
    title: 'Blueprint Compendium · Master Shield',
  },
  { path: '**', redirectTo: '' },
];
