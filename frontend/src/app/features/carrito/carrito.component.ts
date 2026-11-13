import { AsyncPipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, catchError, debounceTime, of, switchMap } from 'rxjs';
import { Cotizacion, ItemCarrito, Pedido } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { PublicoService } from '../../core/services/publico.service';
import { CarritoService } from '../../core/services/carrito.service';
import { PedidosService } from '../../core/services/pedidos.service';
import { mensajeError } from '../../core/utils/http-error';
import { MaterialImgComponent } from '../../shared/components/material-img/material-img.component';

/** Carrito de fletes: cotización del servidor en vivo y confirmación del pedido. */
@Component({
  selector: 'cx-carrito',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DecimalPipe, FormsModule, RouterLink, MaterialImgComponent],
  templateUrl: './carrito.component.html',
  styleUrl: './carrito.component.scss',
})
export class CarritoComponent implements OnInit, OnDestroy {
  readonly carrito = inject(CarritoService);
  private readonly pedidos = inject(PedidosService);
  readonly auth = inject(AuthService);
  private readonly catalogo = inject(CatalogoService);
  readonly info$ = inject(PublicoService).info$;

  direccion = this.auth.user?.direccion ?? '';
  telefono = this.auth.user?.telefono ?? '';
  notas = '';

  cotizacion: Cotizacion | null = null;
  cotizando = false;
  enviando = false;
  error = '';
  confirmado: Pedido | null = null;

  /** Se conserva entre reintentos para que el servidor no duplique el pedido. */
  private uuidPendiente: string | null = null;
  private sub?: Subscription;

  /** Solo un cliente con sesión puede cotizar en el servidor y confirmar. */
  get esCliente(): boolean {
    return this.auth.esCliente;
  }

  /** Estimación local para visitantes (el servidor recalcula al confirmar). */
  estimarFlete(subtotal: number, t: { base: number; porcentaje: number; gratis_desde: number }): number {
    if (subtotal <= 0 || subtotal >= t.gratis_desde) return 0;
    return Math.round((t.base + subtotal * t.porcentaje) * 100) / 100;
  }

  ngOnInit(): void {
    if (!this.esCliente) return;
    // Con sesión de cliente: precios y existencias exactas del catálogo autenticado
    this.catalogo.cargar().subscribe((c) => this.carrito.refrescar(c.materiales));
    // Cada cambio del carrito pide al backend la cotización oficial (precios + flete + faltantes)
    this.sub = this.carrito.items$
      .pipe(
        debounceTime(300),
        switchMap((items) => {
          this.uuidPendiente = null; // el contenido cambió: es un pedido distinto
          if (!items.length) return of(null);
          this.cotizando = true;
          return this.pedidos.cotizar(this.aLineas(items)).pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((c) => {
        this.cotizacion = c;
        this.cotizando = false;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  cambiar(item: ItemCarrito, valor: number): void {
    this.carrito.fijarCantidad(item.material, valor);
  }

  faltante(materialId: string) {
    return this.cotizacion?.faltantes.find((f) => f.material_id === materialId);
  }

  get puedeConfirmar(): boolean {
    return (
      !!this.carrito.items.length &&
      !!this.direccion.trim() &&
      !this.enviando &&
      !this.cotizando &&
      !this.cotizacion?.faltantes.length
    );
  }

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    this.enviando = true;
    this.error = '';
    this.uuidPendiente ??= crypto.randomUUID();

    this.pedidos
      .crear({
        uuid: this.uuidPendiente,
        items: this.aLineas(this.carrito.items),
        direccion_entrega: this.direccion.trim(),
        telefono_contacto: this.telefono.trim() || undefined,
        notas: this.notas.trim() || undefined,
      })
      .subscribe({
        next: (p) => {
          this.confirmado = p;
          this.uuidPendiente = null;
          this.enviando = false;
          this.carrito.vaciar();
        },
        error: (e) => {
          this.error = mensajeError(e);
          // Rechazo de negocio (p. ej. 409 sin stock): nada se guardó, el siguiente intento es otro pedido
          if (e?.status && e.status < 500) this.uuidPendiente = null;
          this.enviando = false;
          if (e?.status === 409) this.pedidos.cotizar(this.aLineas(this.carrito.items)).subscribe((c) => (this.cotizacion = c));
        },
      });
  }

  folio(p: Pedido): string {
    return p.uuid.slice(0, 8).toUpperCase();
  }

  private aLineas(items: ItemCarrito[]) {
    return items.map((i) => ({ material_id: i.material.id, cantidad: i.cantidad }));
  }
}
