import { Routes } from '@angular/router';
import { authGuard, roleGuard, staffGuard } from './core/guards/auth.guard';
import { TiendaLayoutComponent } from './features/tienda/layout/tienda-layout.component';
import { ShellComponent } from './shared/components/shell/shell.component';

const cargar = {
  inicio: () => import('./features/tienda/inicio/inicio.component').then((m) => m.InicioComponent),
  catalogo: () => import('./features/tienda/catalogo/tienda-catalogo.component').then((m) => m.TiendaCatalogoComponent),
  producto: () => import('./features/tienda/producto/producto.component').then((m) => m.ProductoComponent),
  nosotros: () => import('./features/tienda/nosotros/nosotros.component').then((m) => m.NosotrosComponent),
  faq: () => import('./features/tienda/faq/faq.component').then((m) => m.FaqComponent),
  contacto: () => import('./features/tienda/contacto/contacto.component').then((m) => m.ContactoComponent),
  carrito: () => import('./features/carrito/carrito.component').then((m) => m.CarritoComponent),
  miCuenta: () => import('./features/tienda/mi-cuenta/mi-cuenta.component').then((m) => m.MiCuentaComponent),
};

export const routes: Routes = [
  // Acceso (clientes y personal)
  { path: 'acceso', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'login', redirectTo: 'acceso' },

  // ===== Tienda pública (página de inicio) =====
  {
    path: '',
    component: TiendaLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', loadComponent: cargar.inicio, title: 'ConstructX · Materiales para construcción' },
      { path: 'catalogo', loadComponent: cargar.catalogo, title: 'Catálogo · ConstructX' },
      { path: 'producto/:sku', loadComponent: cargar.producto, title: 'Producto · ConstructX' },
      { path: 'nosotros', loadComponent: cargar.nosotros, title: 'Nosotros · ConstructX' },
      { path: 'preguntas-frecuentes', loadComponent: cargar.faq, title: 'Preguntas frecuentes · ConstructX' },
      { path: 'contacto', loadComponent: cargar.contacto, title: 'Contacto · ConstructX' },
      { path: 'carrito', loadComponent: cargar.carrito, title: 'Carrito · ConstructX' },
      { path: 'mi-cuenta', canActivate: [authGuard, roleGuard], data: { roles: ['cliente'] }, loadComponent: cargar.miCuenta, title: 'Mi cuenta · ConstructX' },
    ],
  },

  // ===== Panel interno (Admin, Bodeguero, Residente) =====
  {
    path: 'panel',
    component: ShellComponent,
    canActivate: [staffGuard],
    children: [
      { path: 'dashboard', canActivate: [roleGuard], data: { roles: ['admin'] },
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'reportes', canActivate: [roleGuard], data: { roles: ['admin'] },
        loadComponent: () => import('./features/panel/reportes/reportes.component').then((m) => m.ReportesComponent) },
      { path: 'productos', canActivate: [roleGuard], data: { roles: ['admin'] },
        loadComponent: () => import('./features/panel/productos/productos.component').then((m) => m.ProductosComponent) },
      { path: 'usuarios', canActivate: [roleGuard], data: { roles: ['admin'] },
        loadComponent: () => import('./features/panel/usuarios/usuarios.component').then((m) => m.UsuariosComponent) },
      { path: 'mensajes', canActivate: [roleGuard], data: { roles: ['admin'] },
        loadComponent: () => import('./features/panel/mensajes/mensajes.component').then((m) => m.MensajesComponent) },
      { path: 'fletes', canActivate: [roleGuard], data: { roles: ['bodeguero'] },
        loadComponent: () => import('./features/fletes/fletes.component').then((m) => m.FletesComponent) },
      { path: 'bodega', canActivate: [roleGuard], data: { roles: ['bodeguero'] },
        loadComponent: () => import('./features/bodega/bodega.component').then((m) => m.BodegaComponent) },
      { path: 'solicitudes', canActivate: [roleGuard], data: { roles: ['bodeguero', 'residente'] },
        loadComponent: () => import('./features/panel/solicitudes/solicitudes.component').then((m) => m.SolicitudesComponent) },
      { path: 'campo', canActivate: [roleGuard], data: { roles: ['residente'] },
        loadComponent: () => import('./features/field-report/field-report.component').then((m) => m.FieldReportComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },

  { path: '**', redirectTo: '' },
];
