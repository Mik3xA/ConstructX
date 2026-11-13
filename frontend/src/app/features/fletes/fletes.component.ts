import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, map } from 'rxjs';
import { EstadoPedido, Pedido } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { PedidosService } from '../../core/services/pedidos.service';
import { SocketService } from '../../core/services/socket.service';
import { mensajeError } from '../../core/utils/http-error';
import { EstadoPedidoComponent } from '../../shared/components/estado-pedido/estado-pedido.component';

type Filtro = EstadoPedido | 'TODOS';

const ACCION: Partial<Record<EstadoPedido, { siguiente: EstadoPedido; texto: string }>> = {
  PENDIENTE: { siguiente: 'EN_RUTA', texto: 'Despachar' },
  EN_RUTA: { siguiente: 'ENTREGADO', texto: 'Marcar entregado' },
};

/**
 * Tablero de pedidos de flete para Admin y Bodeguero.
 * Los pedidos nuevos llegan por Socket.io (`nuevo_flete`) y se insertan sin recargar.
 */
@Component({
  selector: 'cx-fletes',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe, EstadoPedidoComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <span class="eyebrow">Almacén central</span>
          <h1>Pedidos de flete</h1>
          <p>Los pedidos nuevos aparecen aquí en tiempo real.</p>
        </div>
        <span class="chip" [class.chip--olive]="socket.conectado$ | async">
          <span class="dot" [class.dot--pulse]="socket.conectado$ | async"></span>
          {{ (socket.conectado$ | async) ? 'Escuchando pedidos en vivo' : 'Reconectando…' }}
        </span>
      </header>

      <div class="tabs" role="tablist">
        @for (f of filtros; track f.valor) {
          <button type="button" role="tab" [attr.aria-selected]="filtro === f.valor" [class.is-active]="filtro === f.valor" (click)="filtro = f.valor">
            {{ f.texto }}
            @if (conteo$ | async; as c) { <span class="tabs__n">{{ c[f.valor] }}</span> }
          </button>
        }
      </div>

      @if (error) { <div class="banner banner--error">{{ error }}</div> }

      <section class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Folio</th><th>Cliente</th><th>Recibido</th><th>Entrega</th><th>Estado</th><th class="num">Total</th><th></th></tr>
            </thead>
            <tbody>
              @for (p of visibles(pedidos$ | async); track p.uuid) {
                <tr [class.is-new]="nuevos.has(p.uuid)" data-testid="fila-flete">
                  <td>
                    <button type="button" class="link mono" (click)="verDetalle(p)">{{ p.uuid.slice(0, 8).toUpperCase() }}</button>
                    @if (nuevos.has(p.uuid)) { <span class="chip chip--orange new">Nuevo</span> }
                  </td>
                  <td><strong>{{ p.cliente_nombre }}</strong>@if (p.cliente_empresa) {<div class="muted small">{{ p.cliente_empresa }}</div>}</td>
                  <td class="muted nowrap">{{ p.timestamp | date: 'd MMM, HH:mm' }}</td>
                  <td class="muted addr">{{ p.direccion_entrega }}</td>
                  <td><cx-estado-pedido [estado]="p.estado" /></td>
                  <td class="num"><strong>{{ p.total_pagar | currency: 'MXN' : 'symbol-narrow' }}</strong></td>
                  <td class="actions">
                    @if (accion(p); as a) {
                      <button type="button" class="btn btn--sm" [class.btn--primary]="p.estado === 'PENDIENTE'" [class.btn--soft]="p.estado !== 'PENDIENTE'"
                              (click)="avanzar(p, a.siguiente)" [disabled]="procesando === p.uuid">{{ a.texto }}</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7"><div class="empty"><p>No hay pedidos en esta vista.</p></div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    @if (seleccionado; as s) {
      <div class="backdrop" (click)="seleccionado = null"></div>
      <aside class="drawer" role="dialog" aria-label="Detalle del pedido">
        <header>
          <div><span class="eyebrow">Pedido</span><h2 class="mono">{{ s.uuid.slice(0, 8).toUpperCase() }}</h2></div>
          <button type="button" class="btn btn--ghost btn--icon" (click)="seleccionado = null" aria-label="Cerrar">×</button>
        </header>
        <cx-estado-pedido [estado]="s.estado" />
        <dl>
          <dt>Cliente</dt><dd>{{ s.cliente_nombre }} · {{ s.cliente_email }}</dd>
          <dt>Entrega</dt><dd>{{ s.direccion_entrega }}</dd>
          @if (s.telefono_contacto) { <dt>Teléfono</dt><dd>{{ s.telefono_contacto }}</dd> }
          @if (s.notas) { <dt>Notas</dt><dd>{{ s.notas }}</dd> }
          <dt>Recibo por email</dt><dd>{{ s.recibo_enviado_at ? 'Enviado ' + (s.recibo_enviado_at | date: 'HH:mm') : 'Pendiente' }}</dd>
        </dl>
        <table class="table">
          <thead><tr><th>Material</th><th class="num">Cant.</th><th class="num">Importe</th></tr></thead>
          <tbody>
            @for (d of s.detalles; track d.id) {
              <tr><td>{{ d.material_nombre }}</td><td class="num">{{ d.cantidad | number: '1.0-2' }} {{ d.unidad }}</td><td class="num">{{ d.subtotal | currency: 'MXN' : 'symbol-narrow' }}</td></tr>
            }
          </tbody>
        </table>
        <div class="drawer__total">
          <span>Flete {{ s.costo_flete === 0 ? '(gratis)' : (s.costo_flete | currency: 'MXN' : 'symbol-narrow') }}</span>
          <strong class="mono">{{ s.total_pagar | currency: 'MXN' : 'symbol-narrow' }}</strong>
        </div>
        @if (accion(s); as a) {
          <button type="button" class="btn btn--primary btn--block btn--lg" (click)="avanzar(s, a.siguiente)">{{ a.texto }}</button>
        }
      </aside>
    }
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;

    .small { font-size: 0.78rem; }
    .nowrap { white-space: nowrap; }
    .addr { max-width: 260px; font-size: 0.82rem; }
    .new { margin-left: 0.4rem; font-size: 0.65rem; }
    .actions { text-align: right; white-space: nowrap; }
    .link {
      border: 0; background: none; padding: 0; font: inherit; font-weight: 700;
      color: var(--primary-orange); cursor: pointer;
      &:hover { text-decoration: underline; }
    }

    .tabs {
      display: flex; gap: 0.35rem; overflow-x: auto;
      button {
        display: inline-flex; align-items: center; gap: 0.45rem;
        height: 38px; padding: 0 0.95rem; border-radius: 999px;
        border: 1px solid var(--border-strong); background: var(--surface);
        color: var(--text-muted); font: inherit; font-weight: 600; font-size: 0.86rem;
        white-space: nowrap; cursor: pointer;
        &.is-active { background: var(--text); color: var(--bg-color); border-color: var(--text); }
      }
      &__n {
        min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px;
        display: grid; place-items: center; font-size: 0.72rem; font-weight: 800;
        background: var(--bg-subtle); color: var(--text);
      }
    }

    .backdrop {
      position: fixed; inset: 0; z-index: 900; background: var(--overlay);
      animation: fade 200ms ease;
    }
    .drawer {
      position: fixed; z-index: 901; top: 0; right: 0; bottom: 0;
      width: min(440px, 100%); overflow-y: auto;
      display: flex; flex-direction: column; gap: 1rem;
      padding: 1.5rem; background: var(--surface); box-shadow: var(--shadow-lg);
      animation: deslizar 280ms cubic-bezier(0.2, 0.9, 0.25, 1);

      header { display: flex; justify-content: space-between; align-items: start; }
      h2 { font-size: 1.4rem; }
      dl { display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1rem; margin: 0; font-size: 0.88rem; }
      dt { color: var(--text-muted); }
      dd { margin: 0; }
      &__total {
        display: flex; justify-content: space-between; align-items: center;
        padding-top: 0.75rem; border-top: 1px solid var(--border);
        strong { font-size: 1.4rem; color: var(--primary-orange); }
      }
    }
    @keyframes fade { from { opacity: 0; } }
    @keyframes deslizar { from { transform: translateX(100%); } }
  `,
})
export class FletesComponent implements OnInit, OnDestroy {
  private readonly pedidosSrv = inject(PedidosService);
  readonly socket = inject(SocketService);
  readonly auth = inject(AuthService);

  readonly pedidos$ = this.pedidosSrv.pedidos$;
  readonly conteo$ = this.pedidos$.pipe(
    map((ps) => ({
      TODOS: ps.length,
      PENDIENTE: ps.filter((p) => p.estado === 'PENDIENTE').length,
      EN_RUTA: ps.filter((p) => p.estado === 'EN_RUTA').length,
      ENTREGADO: ps.filter((p) => p.estado === 'ENTREGADO').length,
    })),
  );

  readonly filtros: Array<{ valor: Filtro; texto: string }> = [
    { valor: 'PENDIENTE', texto: 'Pendientes' },
    { valor: 'EN_RUTA', texto: 'En ruta' },
    { valor: 'ENTREGADO', texto: 'Entregados' },
    { valor: 'TODOS', texto: 'Todos' },
  ];

  filtro: Filtro = 'PENDIENTE';
  nuevos = new Set<string>();
  seleccionado: Pedido | null = null;
  procesando: string | null = null;
  error = '';
  private sub?: Subscription;

  ngOnInit(): void {
    this.pedidosSrv.cargar().subscribe({ error: (e) => (this.error = mensajeError(e)) });
    // La lista ya la actualiza NotificacionesService; aquí solo resaltamos la fila nueva
    this.sub = this.socket.on('nuevo_flete').subscribe((p) => {
      this.nuevos.add(p.uuid);
      setTimeout(() => this.nuevos.delete(p.uuid), 8000);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  visibles(ps: Pedido[] | null): Pedido[] {
    const lista = ps ?? [];
    return this.filtro === 'TODOS' ? lista : lista.filter((p) => p.estado === this.filtro);
  }

  accion(p: Pedido) {
    return ACCION[p.estado] ?? null;
  }

  verDetalle(p: Pedido): void {
    this.seleccionado = p.detalles ? p : null;
    this.pedidosSrv.obtener(p.uuid).subscribe({
      next: (d) => (this.seleccionado = d),
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  avanzar(p: Pedido, estado: EstadoPedido): void {
    this.procesando = p.uuid;
    this.error = '';
    this.pedidosSrv.cambiarEstado(p.uuid, estado).subscribe({
      next: (act) => {
        this.procesando = null;
        if (this.seleccionado?.uuid === act.uuid) this.seleccionado = act;
      },
      error: (e) => {
        this.procesando = null;
        this.error = mensajeError(e);
      },
    });
  }
}
