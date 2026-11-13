import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { EMPRESA } from '../../../core/data/empresa';
import { AuthService } from '../../../core/services/auth.service';
import { CarritoService } from '../../../core/services/carrito.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastContainerComponent } from '../../../shared/components/toast-container/toast-container.component';

/** Layout público de la tienda: barra superior, encabezado, contenido y pie de página. */
@Component({
  selector: 'cx-tienda-layout',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, FormsModule, RouterLink, RouterLinkActive, RouterOutlet, ToastContainerComponent],
  templateUrl: './tienda-layout.component.html',
  styleUrl: './tienda-layout.component.scss',
})
export class TiendaLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly carrito = inject(CarritoService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly notificaciones = inject(NotificacionesService);
  readonly empresa = EMPRESA;
  readonly anio = new Date().getFullYear();

  busqueda = '';
  menuAbierto = false;
  cuentaAbierta = false;

  readonly categorias = ['Cementantes', 'Acero', 'Mampostería', 'Agregados', 'Madera y cimbra'];

  ngOnInit(): void {
    this.notificaciones.iniciar();
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.menuAbierto = false;
      this.cuentaAbierta = false;
    });
  }

  buscar(): void {
    const q = this.busqueda.trim();
    this.router.navigate(['/catalogo'], { queryParams: q ? { q } : {} });
  }

  salir(): void {
    this.cuentaAbierta = false;
    this.auth.logout();
  }
}
