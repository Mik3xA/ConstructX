import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ItemInventario, TipoMovimiento } from '../../core/models/models';
import { map } from 'rxjs';
import { InventarioService } from '../../core/services/inventario.service';
import { PanelService } from '../../core/services/panel.service';
import { SocketService } from '../../core/services/socket.service';
import { ToastService } from '../../core/services/toast.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { mensajeError } from '../../core/utils/http-error';

type Modo = Extract<TipoMovimiento, 'INGRESO_BODEGA' | 'ENVIO_OBRA'>;

/** Vista del Bodeguero: ingresos de proveedor y despachos a obra. */
@Component({
  selector: 'cx-bodega',
  standalone: true,
  imports: [AsyncPipe, DatePipe, DecimalPipe, FormsModule],
  template: `
    <div class="page">
      <header class="page__header">
        <div><span class="eyebrow">Almacén central</span><h1>Inventario y movimientos</h1><p>Entradas de proveedor, envíos a obra y puntos de reorden.</p></div>
      </header>

      <div class="layout">
        <section class="card form">
          <div class="tabs" role="tablist">
            <button type="button" role="tab" [class.is-active]="modo === 'INGRESO_BODEGA'" (click)="cambiarModo('INGRESO_BODEGA')">Ingreso de proveedor</button>
            <button type="button" role="tab" [class.is-active]="modo === 'ENVIO_OBRA'" (click)="cambiarModo('ENVIO_OBRA')">Envío a obra</button>
          </div>

          <div class="field">
            <label for="material">Material</label>
            <select id="material" class="select" [(ngModel)]="materialId">
              <option value="">Selecciona…</option>
              @for (m of inventario$ | async; track m.material_id) {
                <option [value]="m.material_id">{{ m.nombre }} — {{ m.stock_actual | number: '1.0-2' }} {{ m.unidad }}</option>
              }
            </select>
          </div>

          @if (modo === 'ENVIO_OBRA') {
            <div class="field">
              <label for="proyecto">Proyecto destino</label>
              <select id="proyecto" class="select" [(ngModel)]="proyectoId">
                <option value="">Selecciona…</option>
                @for (p of proyectos$ | async; track p.id) {
                  <option [value]="p.id">{{ p.nombre }}</option>
                }
              </select>
            </div>
          }

          <div class="field">
            <label for="cantidad">Cantidad</label>
            <input id="cantidad" class="input mono" type="number" min="0" step="any" [(ngModel)]="cantidad" placeholder="0" />
          </div>

          @if (error) { <div class="banner banner--error">{{ error }}</div> }
          @if (exito) { <div class="banner banner--ok">{{ exito }}</div> }

          <button class="btn btn--primary btn--lg btn--block" type="button" (click)="registrar()" [disabled]="!valido || enviando">
            {{ enviando ? 'Registrando…' : modo === 'INGRESO_BODEGA' ? 'Registrar ingreso' : 'Autorizar envío' }}
          </button>
        </section>

        <section class="card">
          <div class="card__head">
            <h2>Inventario</h2>
            @if (bajos$ | async; as n) { <span class="chip chip--danger" data-testid="stock-bajo-chip">{{ n }} bajo mínimo</span> }
          </div>
          <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Material</th><th class="num">Stock</th><th>Mínimo (reorden)</th></tr></thead>
            <tbody>
              @for (i of inventario$ | async; track i.id) {
                <tr [class.is-low]="i.stock_bajo">
                  <td><strong>{{ i.nombre }}</strong><div class="mono muted small">{{ i.codigo_sku }}</div></td>
                  <td class="num" [class.text-danger]="i.stock_bajo">
                    {{ i.stock_actual | number: '1.0-2' }} <span class="muted">{{ i.unidad }}</span>
                    @if (i.stock_bajo) { <div class="small">Reordenar</div> }
                  </td>
                  <td>
                    <div class="minimo">
                      <input class="input mono" type="number" min="0" [(ngModel)]="minimos[i.material_id]" [attr.aria-label]="'Stock mínimo de ' + i.nombre" />
                      @if (minimos[i.material_id] !== i.stock_minimo) {
                        <button type="button" class="btn btn--soft btn--sm" (click)="guardarMinimo(i)">Guardar</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          </div>
        </section>

        <section class="card wide">
          <h2>Últimos movimientos</h2>
          <table class="table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Material</th><th>Destino</th><th>Usuario</th><th class="num">Cantidad</th></tr></thead>
            <tbody>
              @for (m of movimientos$ | async; track m.uuid) {
                <tr>
                  <td class="mono muted">{{ m.timestamp | date: 'dd/MM HH:mm' }}</td>
                  <td><span class="chip" [class]="'chip ' + chipTipo[m.tipo]">{{ etiquetas[m.tipo] }}</span></td>
                  <td>{{ m.material_nombre }}</td>
                  <td class="muted">{{ m.tarea_nombre || m.proyecto_nombre || '—' }}</td>
                  <td class="muted">{{ m.usuario_nombre }}</td>
                  <td class="num">{{ m.tipo === 'INGRESO_BODEGA' ? '+' : '−' }}{{ m.cantidad | number: '1.0-2' }} {{ m.unidad }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      </div>
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;

    .page {
      h2 { font-size: 1.05rem; margin-bottom: 0.75rem; }
    }
    .layout {
      display: grid; gap: 1rem; grid-template-columns: minmax(0, 1fr);
      @include lg { grid-template-columns: 380px minmax(0, 1fr); }
    }
    .small { font-size: 0.72rem; }
    tr.is-low td { background: color-mix(in srgb, var(--danger-soft) 60%, transparent); }
    .minimo { display: flex; gap: 0.35rem; align-items: center; .input { width: 90px; height: 34px; text-align: right; } }
    .wide { overflow-x: auto; @include lg { grid-column: 1 / -1; } }
    .form { display: flex; flex-direction: column; gap: 1rem; }
    .tabs {
      display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px;
      background: var(--bg-subtle); border-radius: $radius;
      button {
        height: 36px; border: 0; border-radius: $radius-sm; background: transparent;
        color: var(--text-muted); font: inherit; font-weight: 600; font-size: 0.85rem; cursor: pointer;
        &.is-active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm); }
        &:not(.is-active):hover { color: var(--text); }
      }
    }
  `,
})
export class BodegaComponent implements OnInit {
  private readonly inv = inject(InventarioService);
  private readonly proyectos = inject(ProyectosService);

  private readonly panel = inject(PanelService);
  private readonly toasts = inject(ToastService);
  private readonly socket = inject(SocketService);
  readonly inventario$ = this.inv.inventario$;
  readonly bajos$ = this.inventario$.pipe(map((l) => l.filter((i) => i.stock_bajo).length));
  minimos: Record<string, number> = {};
  private readonly destroyRef = inject(DestroyRef);
  readonly movimientos$ = this.inv.movimientos$;
  readonly proyectos$ = this.proyectos.proyectos$;
  readonly etiquetas: Record<TipoMovimiento, string> = {
    INGRESO_BODEGA: 'Ingreso',
    ENVIO_OBRA: 'Envío',
    CONSUMO_OBRA: 'Consumo',
    SALIDA_FLETE: 'Flete cliente',
  };
  readonly chipTipo: Record<TipoMovimiento, string> = {
    INGRESO_BODEGA: 'chip--olive',
    ENVIO_OBRA: 'chip--amber',
    CONSUMO_OBRA: '',
    SALIDA_FLETE: 'chip--orange',
  };

  modo: Modo = 'INGRESO_BODEGA';
  materialId = '';
  proyectoId = '';
  cantidad: number | null = null;
  enviando = false;
  error = '';
  exito = '';
  /** Reutilizado en reintentos para que el servidor no duplique el movimiento. */
  private uuidPendiente: string | null = null;

  get valido(): boolean {
    return !!this.materialId && (this.cantidad ?? 0) > 0 && (this.modo === 'INGRESO_BODEGA' || !!this.proyectoId);
  }

  ngOnInit(): void {
    this.refrescar();
    this.proyectos.cargar().subscribe();
    // Los pedidos de clientes descuentan stock: refrescar en vivo
    this.socket.on('inventario_actualizado').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refrescar());
  }

  cambiarModo(m: Modo): void {
    this.modo = m;
    this.error = '';
    this.exito = '';
    this.uuidPendiente = null;
  }

  registrar(): void {
    if (!this.valido) return;
    this.enviando = true;
    this.error = '';
    this.exito = '';
    this.uuidPendiente ??= crypto.randomUUID();

    this.inv
      .registrar({
        uuid: this.uuidPendiente,
        tipo: this.modo,
        material_id: this.materialId,
        cantidad: Number(this.cantidad),
        proyecto_id: this.modo === 'ENVIO_OBRA' ? this.proyectoId : null,
      })
      .subscribe({
        next: (m) => {
          this.exito = `${this.etiquetas[m.tipo]} registrado: ${m.cantidad} ${m.material_nombre ?? ''}`.trim();
          this.cantidad = null;
          this.uuidPendiente = null;
          this.enviando = false;
          this.refrescar();
        },
        error: (e) => {
          this.error = mensajeError(e);
          // Un rechazo de negocio (p. ej. stock insuficiente) no se guardó: se puede generar un uuid nuevo.
          if (e?.status && e.status < 500) this.uuidPendiente = null;
          this.enviando = false;
        },
      });
  }

  guardarMinimo(i: ItemInventario): void {
    const n = Number(this.minimos[i.material_id]);
    this.panel.fijarStockMinimo(i.material_id, n).subscribe({
      next: () => {
        this.toasts.mostrar({ tipo: 'exito', titulo: 'Punto de reorden actualizado', mensaje: `${i.nombre}: ${n} ${i.unidad}` }, 3000);
        this.refrescar();
      },
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  private refrescar(): void {
    this.inv.cargarInventario().subscribe((l) => (this.minimos = Object.fromEntries(l.map((i) => [i.material_id, i.stock_minimo]))));
    this.inv.cargarMovimientos({ limit: 25 }).subscribe();
  }
}
