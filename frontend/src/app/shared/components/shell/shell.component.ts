import { AsyncPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Rol } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth.service';
import { CarritoService } from '../../../core/services/carrito.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { SocketService } from '../../../core/services/socket.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastContainerComponent } from '../toast-container/toast-container.component';

interface NavItem {
  ruta: string;
  etiqueta: string;
  icono: string; // path SVG 24x24
  roles: Rol[]; // coincidencia exacta
  badgeCarrito?: boolean;
}

const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  bodeguero: 'Almacén central',
  residente: 'Residente de obra',
  cliente: 'Cliente',
};

const ICONOS = {
  dashboard: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z',
  fletes: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  bodega: 'M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm6 12V12h6v9',
  campo: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4',
  catalogo: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  carrito: 'M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  pedidos: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  reportes: 'M3 3v18h18M7 15v2M11 11v6M15 7v10M19 13v4',
  solicitudes: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15h6',
  usuarios: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  mensajes: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
};

/** Layout Full-Page: barra lateral + área de contenido + toasts globales. */
@Component({
  selector: 'cx-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, ToastContainerComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly socket = inject(SocketService);
  readonly carrito = inject(CarritoService);
  private readonly notificaciones = inject(NotificacionesService);
  readonly etiquetaRol = ETIQUETA_ROL;

  private readonly nav: NavItem[] = [
    { ruta: '/panel/dashboard', etiqueta: 'Dashboard', roles: ['admin'], icono: ICONOS.dashboard },
    { ruta: '/panel/reportes', etiqueta: 'Reportes de ventas', roles: ['admin'], icono: ICONOS.reportes },
    { ruta: '/panel/fletes', etiqueta: 'Pedidos de flete', roles: ['admin', 'bodeguero'], icono: ICONOS.fletes },
    { ruta: '/panel/bodega', etiqueta: 'Inventario', roles: ['admin', 'bodeguero'], icono: ICONOS.bodega },
    { ruta: '/panel/solicitudes', etiqueta: 'Solicitudes de obra', roles: ['admin', 'bodeguero', 'residente'], icono: ICONOS.solicitudes },
    { ruta: '/panel/campo', etiqueta: 'Reporte de campo', roles: ['admin', 'residente'], icono: ICONOS.campo },
    { ruta: '/panel/productos', etiqueta: 'Productos', roles: ['admin'], icono: ICONOS.catalogo },
    { ruta: '/panel/usuarios', etiqueta: 'Usuarios', roles: ['admin'], icono: ICONOS.usuarios },
    { ruta: '/panel/mensajes', etiqueta: 'Mensajes', roles: ['admin'], icono: ICONOS.mensajes },
  ];

  get items(): NavItem[] {
    return this.nav.filter((n) => this.auth.esRol(...n.roles));
  }

  ngOnInit(): void {
    this.notificaciones.iniciar();
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }
}
