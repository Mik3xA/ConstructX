import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoPedido, Pedido } from '../../core/models/models';
import { CarritoService } from '../../core/services/carrito.service';
import { PedidosService } from '../../core/services/pedidos.service';
import { PublicoService } from '../../core/services/publico.service';
import { mensajeError } from '../../core/utils/http-error';
import { EstadoPedidoComponent } from '../../shared/components/estado-pedido/estado-pedido.component';
import { MaterialImgComponent } from '../../shared/components/material-img/material-img.component';

const PASOS: EstadoPedido[] = ['PENDIENTE', 'EN_RUTA', 'ENTREGADO'];

/** Historial de pedidos del cliente. El estado se actualiza en vivo (Socket.io). */
@Component({
  selector: 'cx-mis-pedidos',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe, RouterLink, EstadoPedidoComponent, MaterialImgComponent],
  template: `
    <div class="mis-pedidos">
      @if (error) { <div class="banner banner--error">{{ error }}</div> }

      @if (pedidos$ | async; as pedidos) {
        <div class="list">
          @for (p of pedidos; track p.uuid) {
            <article class="card order" [class.is-open]="abierto === p.uuid" data-testid="mi-pedido">
              <button type="button" class="order__head" (click)="alternar(p)" [attr.aria-expanded]="abierto === p.uuid">
                <div class="order__id">
                  <span class="eyebrow">Folio</span>
                  <strong class="mono">{{ p.uuid.slice(0, 8).toUpperCase() }}</strong>
                </div>
                <div class="order__date muted">{{ p.timestamp | date: "d MMM y, HH:mm" }}</div>
                <cx-estado-pedido [estado]="p.estado" />
                <strong class="order__total mono">{{ p.total_pagar | currency: 'MXN' : 'symbol-narrow' }}</strong>
                <svg class="order__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>

              <ol class="steps" aria-label="Seguimiento">
                @for (paso of pasos; track paso; let i = $index) {
                  <li [class.is-done]="indice(p.estado) >= i" [class.is-current]="indice(p.estado) === i">
                    <span class="steps__dot"></span>{{ etiqueta[paso] }}
                  </li>
                }
              </ol>

              @if (abierto === p.uuid) {
                <div class="order__detail">
                  @if (detalle[p.uuid]; as d) {
                    @for (l of d.detalles; track l.id) {
                      <div class="line">
                        <cx-material-img class="line__img" [url]="l.imagen_url" [alt]="l.material_nombre" />
                        <div><strong>{{ l.material_nombre }}</strong><span class="muted">{{ l.cantidad | number: '1.0-2' }} {{ l.unidad }} × {{ l.precio_unitario | currency: 'MXN' : 'symbol-narrow' }}</span></div>
                        <span class="mono">{{ l.subtotal | currency: 'MXN' : 'symbol-narrow' }}</span>
                      </div>
                    }
                    <div class="sum">
                      <span>Flete: <b class="mono">{{ d.costo_flete === 0 ? 'Gratis' : (d.costo_flete | currency: 'MXN' : 'symbol-narrow') }}</b></span>
                      <span>Entrega: {{ d.direccion_entrega }}</span>
                      @if (d.chofer) { <span data-testid="chofer">Chofer: <b>{{ d.chofer }}</b> · Unidad: {{ d.vehiculo }}</span> }
                      @if (d.fecha_estimada && d.estado !== 'ENTREGADO') { <span>Entrega estimada: <b>{{ d.fecha_estimada }}</b></span> }
                      @if (d.entregado_at) { <span>Entregado: {{ d.entregado_at | date: 'd MMM y, HH:mm' }}</span> }
                    </div>
                    <div class="acciones">
                      <button type="button" class="btn btn--ghost btn--sm" (click)="pedidosSrv.abrirRecibo(d.uuid)">Ver recibo</button>
                      <button type="button" class="btn btn--soft btn--sm" (click)="repetir(d)" data-testid="repetir">Volver a pedir</button>
                    </div>
                  } @else {
                    <div class="skeleton" style="height: 80px"></div>
                  }
                </div>
              }
            </article>
          } @empty {
            <div class="card empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /></svg>
              <p>Aún no has hecho pedidos.</p>
              <a class="btn btn--primary" routerLink="/catalogo">Explorar catálogo</a>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;

    .list { display: flex; flex-direction: column; gap: 0.85rem; }
    .order { padding: 0; overflow: hidden; }

    .order__head {
      display: grid;
      grid-template-columns: 1fr auto auto;
      grid-template-areas: 'id estado chev' 'fecha total chev';
      gap: 0.25rem 1rem;
      align-items: center;
      width: 100%;
      padding: 1rem 1.25rem 0.5rem;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      @include md {
        grid-template-columns: 1fr 1.2fr auto 140px 24px;
        grid-template-areas: 'id fecha estado total chev';
      }
    }
    .order__id { grid-area: id; display: flex; flex-direction: column; .eyebrow { font-size: 0.62rem; } }
    .order__date { grid-area: fecha; font-size: 0.85rem; }
    cx-estado-pedido { grid-area: estado; justify-self: end; @include md { justify-self: start; } }
    .order__total { grid-area: total; text-align: right; font-size: 1.05rem; }
    .order__chev {
      grid-area: chev; width: 20px; height: 20px; fill: none; stroke: var(--text-faint); stroke-width: 2;
      transition: transform $transition;
    }
    .is-open .order__chev { transform: rotate(180deg); }

    .steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      list-style: none;
      margin: 0;
      padding: 0.5rem 1.25rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-faint);

      li {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        &::before {
          content: '';
          position: absolute;
          top: 5px;
          left: 12px;
          right: 0;
          height: 2px;
          background: var(--border);
        }
        &:last-child::before { display: none; }
        &.is-done { color: var(--text-muted); &::before { background: var(--primary-orange); } }
        &.is-current { color: var(--primary-orange); &::before { background: var(--border); } }
      }
      &__dot {
        position: relative;
        width: 12px; height: 12px; border-radius: 50%;
        background: var(--border-strong);
        .is-done & { background: var(--primary-orange); }
        .is-current & { box-shadow: 0 0 0 4px var(--primary-soft); }
      }
    }

    .order__detail {
      padding: 0.75rem 1.25rem 1.25rem;
      border-top: 1px solid var(--border);
      background: var(--surface-2);
      animation: abrir 250ms ease;
    }
    .line {
      display: grid;
      grid-template-columns: 44px 1fr auto;
      gap: 0.8rem;
      align-items: center;
      padding: 0.5rem 0;
      div { display: flex; flex-direction: column; font-size: 0.88rem; }
      span.muted { font-size: 0.8rem; }
    }
    .line__img { width: 44px; height: 44px; border-radius: $radius-sm; }
    .sum { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; padding-top: 0.75rem; font-size: 0.85rem; color: var(--text-muted); b { color: var(--text); } }
    .acciones { display: flex; gap: 0.5rem; margin-top: 0.9rem; }

    @keyframes abrir { from { opacity: 0; transform: translateY(-6px); } }
  `,
})
export class MisPedidosComponent implements OnInit {
  readonly pedidosSrv = inject(PedidosService);
  private readonly publico = inject(PublicoService);
  private readonly carrito = inject(CarritoService);
  private readonly router = inject(Router);
  readonly pedidos$ = this.pedidosSrv.pedidos$;
  readonly pasos = PASOS;
  readonly etiqueta: Record<EstadoPedido, string> = { PENDIENTE: 'Recibido', EN_RUTA: 'En ruta', ENTREGADO: 'Entregado' };

  abierto: string | null = null;
  detalle: Record<string, Pedido> = {};
  error = '';

  ngOnInit(): void {
    this.pedidosSrv.cargar().subscribe({ error: (e) => (this.error = mensajeError(e)) });
  }

  /** Copia las líneas del pedido al carrito con los precios ACTUALES del catálogo. */
  repetir(p: Pedido): void {
    this.publico.catalogo().subscribe((c) => {
      for (const d of p.detalles ?? []) {
        const m = c.materiales.find((x) => x.id === d.material_id);
        if (m && m.disponibilidad !== 'AGOTADO') this.carrito.agregar(m, d.cantidad);
      }
      this.router.navigateByUrl('/carrito');
    });
  }

  indice(e: EstadoPedido): number {
    return PASOS.indexOf(e);
  }

  alternar(p: Pedido): void {
    this.abierto = this.abierto === p.uuid ? null : p.uuid;
    if (this.abierto && !this.detalle[p.uuid]) {
      this.pedidosSrv.obtener(p.uuid).subscribe({
        next: (d) => (this.detalle[p.uuid] = d),
        error: (e) => (this.error = mensajeError(e)),
      });
    }
  }
}
