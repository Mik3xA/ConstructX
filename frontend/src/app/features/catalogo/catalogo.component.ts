import { AsyncPipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { MaterialCatalogo } from '../../core/models/models';
import { CarritoService } from '../../core/services/carrito.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { SocketService } from '../../core/services/socket.service';
import { ToastService } from '../../core/services/toast.service';
import { mensajeError } from '../../core/utils/http-error';
import { MaterialImgComponent } from '../../shared/components/material-img/material-img.component';

/** Portal del cliente: catálogo visual con fotos, precios y existencias. */
@Component({
  selector: 'cx-catalogo',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DecimalPipe, FormsModule, RouterLink, MaterialImgComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
})
export class CatalogoComponent implements OnInit, OnDestroy {
  private readonly catalogoSrv = inject(CatalogoService);
  private readonly socket = inject(SocketService);
  private readonly toasts = inject(ToastService);
  readonly carrito = inject(CarritoService);

  readonly catalogo$ = this.catalogoSrv.catalogo$;
  categoria = '';
  busqueda = '';
  error = '';
  cargando = true;

  /** Cantidad elegida en cada tarjeta antes de agregar. */
  cantidades: Record<string, number> = {};

  private readonly filtros$ = new Subject<void>();
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.filtros$
        .pipe(
          debounceTime(250),
          switchMap(() => this.catalogoSrv.cargar({ categoria: this.categoria, q: this.busqueda.trim() })),
        )
        .subscribe({ next: (c) => this.alCargar(c.materiales), error: (e) => this.alFallar(e) }),
      // Si otro cliente compra, las existencias se actualizan en vivo
      this.socket.on('inventario_actualizado').subscribe(() => this.filtros$.next()),
    );
    this.catalogoSrv.cargar().subscribe({ next: (c) => this.alCargar(c.materiales), error: (e) => this.alFallar(e) });
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  filtrar(categoria?: string): void {
    if (categoria !== undefined) this.categoria = categoria;
    this.filtros$.next();
  }

  cantidad(m: MaterialCatalogo): number {
    return this.cantidades[m.id] ?? 1;
  }

  cambiar(m: MaterialCatalogo, delta: number): void {
    const max = this.disponibleParaAgregar(m);
    this.cantidades[m.id] = Math.max(1, Math.min(this.cantidad(m) + delta, Math.max(1, max)));
  }

  fijar(m: MaterialCatalogo, valor: number): void {
    this.cantidades[m.id] = Math.max(1, Math.floor(Number(valor) || 1));
  }

  disponibleParaAgregar(m: MaterialCatalogo): number {
    return m.stock_disponible - this.carrito.cantidadDe(m.id);
  }

  agregar(m: MaterialCatalogo): void {
    const n = Math.min(this.cantidad(m), this.disponibleParaAgregar(m));
    if (n <= 0) return;
    this.carrito.agregar(m, n);
    this.cantidades[m.id] = 1;
    this.toasts.mostrar(
      { tipo: 'exito', titulo: 'Agregado al carrito', mensaje: `${n} ${m.unidad} · ${m.nombre}`, enlace: '/carrito' },
      3000,
    );
  }

  private alCargar(materiales: MaterialCatalogo[]): void {
    this.cargando = false;
    this.error = '';
    this.carrito.refrescar(materiales);
  }

  private alFallar(e: unknown): void {
    this.cargando = false;
    this.error = mensajeError(e);
  }
}
