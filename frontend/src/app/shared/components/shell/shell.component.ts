import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Rol } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  ruta: string;
  etiqueta: string;
  icono: string; // path SVG 24x24
  roles: Rol[];
}

const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  bodeguero: 'Bodega central',
  residente: 'Residente de obra',
};

/** Layout Full-Page: barra lateral + área de contenido. */
@Component({
  selector: 'bs-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly etiquetaRol = ETIQUETA_ROL;

  private readonly nav: NavItem[] = [
    { ruta: '/dashboard', etiqueta: 'Dashboard', roles: ['admin'], icono: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z' },
    { ruta: '/bodega', etiqueta: 'Bodega', roles: ['bodeguero'], icono: 'M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm6 12V12h6v9' },
    { ruta: '/campo', etiqueta: 'Reporte de campo', roles: ['residente'], icono: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4' },
  ];

  get items(): NavItem[] {
    return this.nav.filter((n) => this.auth.hasRole(...n.roles));
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
