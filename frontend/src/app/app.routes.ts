import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '',          redirectTo: 'infra', pathMatch: 'full' },
  {
    path: 'infra',
    loadComponent: () => import('./features/infra/infra.component').then(m => m.InfraComponent)
  },
  {
    path: 'pipelines',
    loadComponent: () => import('./features/pipelines/pipelines.component').then(m => m.PipelinesComponent)
  },
  {
    path: 'kpis',
    loadComponent: () => import('./features/kpis/kpis.component').then(m => m.KpisComponent)
  }
];
