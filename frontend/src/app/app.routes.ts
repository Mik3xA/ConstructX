import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';
import { ShellComponent } from './shared/components/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'bodega',
        canActivate: [roleGuard],
        data: { roles: ['bodeguero'] },
        loadComponent: () => import('./features/bodega/bodega.component').then((m) => m.BodegaComponent),
      },
      {
        path: 'campo',
        canActivate: [roleGuard],
        data: { roles: ['residente'] },
        loadComponent: () =>
          import('./features/field-report/field-report.component').then((m) => m.FieldReportComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
