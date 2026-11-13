import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReporteVentas } from '../../../core/models/models';
import { PanelService } from '../../../core/services/panel.service';
import { mensajeError } from '../../../core/utils/http-error';
import { EstadoPedidoComponent } from '../../../shared/components/estado-pedido/estado-pedido.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

interface Barra {
  fecha: string;
  total: number;
  pedidos: number;
  x: number;
  y: number;
  alto: number;
}

/**
 * Reporte de ventas del portal (Admin).
 * Gráfica de una sola serie (ventas por día): un solo tono (--chart-bar, validado),
 * barras delgadas con extremo redondeado, eje recesivo, tooltip por barra y vista de tabla.
 */
@Component({
  selector: 'cx-reportes',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, StatCardComponent, EstadoPedidoComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <div><span class="eyebrow">Administración</span><h1>Reportes de ventas</h1><p>Ventas del portal de clientes (incluye flete).</p></div>
        <div class="rango" role="group" aria-label="Periodo">
          @for (d of rangos; track d) {
            <button type="button" [class.is-active]="dias === d" (click)="cargar(d)">{{ d }} días</button>
          }
        </div>
      </header>

      @if (error) { <div class="banner banner--error">{{ error }}</div> }

      @if (r; as r) {
        <section class="kpis">
          <cx-stat-card etiqueta="Ventas" tono="primario" [valor]="r.totales.ventas | currency: 'MXN' : 'symbol-narrow' : '1.0-0'" [detalle]="r.totales.pedidos + ' pedidos'" />
          <cx-stat-card etiqueta="Ticket promedio" [valor]="r.totales.ticket_promedio | currency: 'MXN' : 'symbol-narrow' : '1.0-0'" />
          <cx-stat-card etiqueta="Ingresos por flete" [valor]="r.totales.ingresos_flete | currency: 'MXN' : 'symbol-narrow' : '1.0-0'" />
          <cx-stat-card etiqueta="Clientes que compraron" [valor]="r.totales.clientes" />
        </section>

        <section class="card">
          <div class="card__head">
            <h2>Ventas por día</h2>
            <button type="button" class="btn btn--ghost btn--sm" (click)="verTabla = !verTabla" [attr.aria-pressed]="verTabla">
              {{ verTabla ? 'Ver gráfica' : 'Ver tabla' }}
            </button>
          </div>

          @if (!verTabla) {
            <div class="chart" (mouseleave)="hover = null">
              <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none" role="img"
                   [attr.aria-label]="'Ventas por día de los últimos ' + r.dias + ' días'">
                @for (t of ticks; track t.valor) {
                  <line class="grid" x1="0" [attr.x2]="W" [attr.y1]="t.y" [attr.y2]="t.y" />
                }
                @for (b of barras; track b.fecha) {
                  <!-- zona de captura más ancha que la barra -->
                  <rect class="hit" [attr.x]="b.x - paso / 2" y="0" [attr.width]="paso" [attr.height]="H" (mouseenter)="hover = b" />
                  @if (b.alto > 0) {
                    <path class="bar" [class.is-dim]="hover && hover !== b" [attr.d]="barra(b)" />
                  }
                }
              </svg>
              <div class="axis-y" aria-hidden="true">
                @for (t of ticks; track t.valor) { <span [style.top.%]="(t.y / H) * 100">{{ t.valor | currency: 'MXN' : 'symbol-narrow' : '1.0-0' }}</span> }
              </div>
              @if (hover; as h) {
                <div class="tip" [style.left.%]="(h.x / W) * 100">
                  <strong>{{ h.fecha | date: 'EEE d MMM' }}</strong>
                  <span class="mono">{{ h.total | currency: 'MXN' : 'symbol-narrow' }}</span>
                  <span class="muted">{{ h.pedidos }} pedido(s)</span>
                </div>
              }
            </div>
            <div class="axis-x" aria-hidden="true">
              <span>{{ r.serie[0].fecha | date: 'd MMM' }}</span>
              <span>{{ r.serie[r.serie.length - 1].fecha | date: 'd MMM' }}</span>
            </div>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Fecha</th><th class="num">Pedidos</th><th class="num">Ventas</th></tr></thead>
                <tbody>
                  @for (d of r.serie; track d.fecha) {
                    <tr><td>{{ d.fecha | date: 'EEE d MMM y' }}</td><td class="num">{{ d.pedidos }}</td><td class="num">{{ d.total | currency: 'MXN' : 'symbol-narrow' }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <div class="grid2">
          <section class="card">
            <div class="card__head"><h2>Materiales más vendidos</h2></div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Material</th><th class="num">Cantidad</th><th class="num">Importe</th></tr></thead>
                <tbody>
                  @for (t of r.top_materiales; track t.nombre) {
                    <tr><td><strong>{{ t.nombre }}</strong><div class="muted small">{{ t.categoria }}</div></td>
                      <td class="num">{{ t.cantidad | number: '1.0-2' }} {{ t.unidad }}</td>
                      <td class="num">{{ t.importe | currency: 'MXN' : 'symbol-narrow' : '1.0-0' }}</td></tr>
                  } @empty { <tr><td colspan="3" class="muted">Sin ventas en el periodo.</td></tr> }
                </tbody>
              </table>
            </div>
          </section>
          <section class="card">
            <div class="card__head"><h2>Pedidos por estado</h2></div>
            @for (e of r.por_estado; track e.estado) {
              <div class="estado-row"><cx-estado-pedido [estado]="e.estado" /><strong class="mono">{{ e.n }}</strong></div>
            } @empty { <p class="muted">Sin pedidos.</p> }
          </section>
        </div>
      } @else {
        <div class="loading">Cargando reporte…</div>
      }
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;
    .small { font-size: 0.75rem; }
    .kpis { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); @include lg { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .grid2 { display: grid; gap: 1rem; @include lg { grid-template-columns: 1.4fr 1fr; } }
    .rango { display: flex; gap: 4px; padding: 4px; border-radius: $radius; background: var(--bg-subtle);
      button { height: 34px; padding: 0 0.85rem; border: 0; border-radius: $radius-sm; background: none; color: var(--text-muted); font: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer;
        &.is-active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm); } } }

    .chart { position: relative; height: 260px; margin-left: 64px; }
    .chart svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .grid { stroke: var(--chart-grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .bar { fill: var(--chart-bar); transition: opacity 120ms ease; &.is-dim { opacity: 0.45; } }
    .hit { fill: transparent; cursor: crosshair; }
    .axis-y { position: absolute; left: -64px; top: 0; bottom: 0; width: 58px;
      span { position: absolute; right: 0; transform: translateY(-50%); font-size: 0.7rem; color: var(--text-faint); font-family: $font-mono; } }
    .axis-x { display: flex; justify-content: space-between; margin: 0.4rem 0 0 64px; font-size: 0.72rem; color: var(--text-faint); }
    .tip { position: absolute; top: 0; transform: translateX(-50%); pointer-events: none; z-index: 2;
      display: flex; flex-direction: column; gap: 0.1rem; padding: 0.55rem 0.75rem; border-radius: $radius-sm;
      background: var(--surface); border: 1px solid var(--border-strong); box-shadow: var(--shadow); font-size: 0.8rem; white-space: nowrap; }
    .estado-row { display: flex; justify-content: space-between; align-items: center; padding: 0.7rem 0; border-bottom: 1px solid var(--border); &:last-child { border: 0; } }
  `,
})
export class ReportesComponent implements OnInit {
  private readonly panel = inject(PanelService);

  readonly rangos = [7, 14, 30];
  readonly W = 700;
  readonly H = 240;
  dias = 14;
  r: ReporteVentas | null = null;
  barras: Barra[] = [];
  ticks: Array<{ valor: number; y: number }> = [];
  paso = 0;
  hover: Barra | null = null;
  verTabla = false;
  error = '';

  ngOnInit(): void {
    this.cargar(this.dias);
  }

  cargar(dias: number): void {
    this.dias = dias;
    this.hover = null;
    this.panel.reporteVentas(dias).subscribe({
      next: (r) => {
        this.r = r;
        this.calcular(r);
      },
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  /** Barra con extremo superior redondeado (4px) anclada a la línea base. */
  barra(b: Barra): string {
    const ancho = Math.max(2, Math.min(this.paso * 0.62, 26));
    const x = b.x - ancho / 2;
    const r = Math.min(4, ancho / 2, b.alto);
    const base = this.H;
    const top = base - b.alto;
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + ancho - r} Q${x + ancho},${top} ${x + ancho},${top + r} V${base} Z`;
  }

  private calcular(r: ReporteVentas): void {
    const max = Math.max(...r.serie.map((d) => d.total), 1);
    const techo = this.redondearArriba(max);
    this.paso = this.W / r.serie.length;
    this.barras = r.serie.map((d, i) => ({
      ...d,
      x: this.paso * i + this.paso / 2,
      y: 0,
      alto: (d.total / techo) * (this.H - 8),
    }));
    this.ticks = [0, 0.5, 1].map((f) => ({ valor: techo * f, y: this.H - f * (this.H - 8) }));
  }

  private redondearArriba(n: number): number {
    const p = Math.pow(10, Math.floor(Math.log10(n)));
    return Math.ceil(n / p) * p;
  }
}
