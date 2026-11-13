import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeGuard, roleGuard } from './core/guards/auth.guard';
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
        path: 'fletes',
        canActivate: [roleGuard],
        data: { roles: ['bodeguero'] },
        loadComponent: () => import('./features/fletes/fletes.component').then((m) => m.FletesComponent),
      },
      {
        path: 'catalogo',
        canActivate: [roleGuard],
        data: { roles: ['cliente'] },
        loadComponent: () => import('./features/catalogo/catalogo.component').then((m) => m.CatalogoComponent),
      },
      {
        path: 'carrito',
        canActivate: [roleGuard],
        data: { roles: ['cliente'] },
        loadComponent: () => import('./features/carrito/carrito.component').then((m) => m.CarritoComponent),
      },
      {
        path: 'mis-pedidos',
        canActivate: [roleGuard],
        data: { roles: ['cliente'] },
        loadComponent: () => import('./features/mis-pedidos/mis-pedidos.component').then((m) => m.MisPedidosComponent),
      },
      {
        path: 'campo',
        canActivate: [roleGuard],
        data: { roles: ['residente'] },
        loadComponent: () =>
          import('./features/field-report/field-report.component').then((m) => m.FieldReportComponent),
      },
      { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] },
    ],
  },
  { path: '**', redirectTo: '' },
];
