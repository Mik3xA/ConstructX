import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { EstadoSolicitud, Material, Proyecto, SolicitudMaterial } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { PanelService } from '../../../core/services/panel.service';
import { ProyectosService } from '../../../core/services/proyectos.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeError } from '../../../core/utils/http-error';

type Filtro = EstadoSolicitud | 'TODAS';

/**
 * Solicitudes de material de obra.
 * - Residente: pide material para su obra y ve en vivo si se aprobó o rechazó.
 * - Bodeguero/Admin: aprueba (sale del inventario como ENVIO_OBRA) o rechaza con motivo.
 */
@Component({
  selector: 'cx-solicitudes',
  standalone: true,
  imports: [AsyncPipe, DatePipe, DecimalPipe, FormsModule],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <span class="eyebrow">{{ esResidente ? 'Residente de obra' : 'Almacén central' }}</span>
          <h1>Solicitudes de material</h1>
          <p>{{ esResidente ? 'Pide a la bodega el material que necesitas en obra.' : 'Aprueba los pedidos de las obras: el material sale del inventario al aprobar.' }}</p>
        </div>
      </header>

      @if (error) { <div class="banner banner--error">{{ error }}</div> }

      @if (esResidente) {
        <form class="card nueva" (ngSubmit)="solicitar()">
          <h2>Nueva solicitud</h2>
          <div class="nueva__grid">
            <div class="field"><label for="s-proy">Obra</label>
              <select id="s-proy" class="select" name="proyecto" [(ngModel)]="proyectoId" required>
                @for (p of proyectos; track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }
              </select></div>
            <div class="field"><label for="s-mat">Material</label>
              <select id="s-mat" class="select" name="material" [(ngModel)]="materialId" required>
                <option value="">Selecciona…</option>
                @for (m of materiales; track m.id) { <option [value]="m.id">{{ m.nombre }} ({{ m.unidad }})</option> }
              </select></div>
            <div class="field"><label for="s-cant">Cantidad</label><input id="s-cant" class="input mono" type="number" min="1" name="cantidad" [(ngModel)]="cantidad" required /></div>
            <div class="field"><label for="s-notas">Notas (opcional)</label><input id="s-notas" class="input" name="notas" [(ngModel)]="notas" placeholder="Para qué tarea o cuándo lo necesitas" /></div>
          </div>
          <div><button class="btn btn--primary" type="submit" [disabled]="!proyectoId || !materialId || !(cantidad > 0) || enviando">Enviar solicitud a bodega</button></div>
        </form>
      }

      <div class="tabs" role="tablist">
        @for (f of filtros; track f.valor) {
          <button type="button" role="tab" [class.is-active]="filtro === f.valor" (click)="filtro = f.valor">
            {{ f.texto }} @if (conteo$ | async; as c) { <span class="n">{{ c[f.valor] }}</span> }
          </button>
        }
      </div>

      <div class="lista">
        @for (s of visibles(solicitudes$ | async); track s.id) {
          <article class="card sol" [class]="'card sol is-' + s.estado" data-testid="solicitud">
            <div class="sol__main">
              <div class="sol__title">
                <strong>{{ s.cantidad | number: '1.0-2' }} {{ s.unidad }} · {{ s.material_nombre }}</strong>
                <span class="chip" [class.chip--amber]="s.estado === 'PENDIENTE'" [class.chip--olive]="s.estado === 'APROBADA'" [class.chip--danger]="s.estado === 'RECHAZADA'">{{ texto[s.estado] }}</span>
              </div>
              <span class="muted small">{{ s.proyecto_nombre }} · pidió {{ s.solicitante_nombre }} · {{ s.created_at | date: 'd MMM, HH:mm' }}</span>
              @if (s.notas) { <span class="small">“{{ s.notas }}”</span> }
              @if (s.estado === 'RECHAZADA') { <span class="small text-danger">Motivo: {{ s.motivo_rechazo }}</span> }
              @if (s.estado === 'APROBADA') { <span class="small muted">Aprobada por {{ s.atendido_por_nombre }} · {{ s.updated_at | date: 'd MMM, HH:mm' }}</span> }
            </div>
            @if (!esResidente && s.estado === 'PENDIENTE') {
              <div class="sol__acc">
                <span class="small" [class.text-danger]="s.stock_disponible < s.cantidad">Stock: {{ s.stock_disponible | number: '1.0-2' }} {{ s.unidad }}</span>
                @if (rechazando === s.id) {
                  <input class="input" [(ngModel)]="motivo" placeholder="Motivo del rechazo" aria-label="Motivo del rechazo" />
                  <div class="fila">
                    <button type="button" class="btn btn--danger btn--sm" (click)="rechazar(s)" [disabled]="!motivo.trim()">Confirmar rechazo</button>
                    <button type="button" class="btn btn--ghost btn--sm" (click)="rechazando = null">Cancelar</button>
                  </div>
                } @else {
                  <div class="fila">
                    <button type="button" class="btn btn--primary btn--sm" (click)="aprobar(s)" [disabled]="s.stock_disponible < s.cantidad" data-testid="aprobar">Aprobar y enviar</button>
                    <button type="button" class="btn btn--ghost btn--sm" (click)="rechazando = s.id; motivo = ''">Rechazar</button>
                  </div>
                }
              </div>
            }
          </article>
        } @empty {
          <div class="card empty"><p>No hay solicitudes en esta vista.</p></div>
        }
      </div>
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;
    .small { font-size: 0.8rem; }
    .nueva { display: flex; flex-direction: column; gap: 1rem; h2 { font-size: 1.1rem; }
      &__grid { display: grid; gap: 1rem; @include md { grid-template-columns: 1fr 1.4fr 0.6fr 1.4fr; } } }
    .tabs { display: flex; gap: 0.35rem; overflow-x: auto;
      button { display: inline-flex; gap: 0.4rem; align-items: center; height: 36px; padding: 0 0.9rem; border-radius: 999px; border: 1px solid var(--border-strong);
        background: var(--surface); color: var(--text-muted); font: inherit; font-weight: 600; font-size: 0.85rem; cursor: pointer; white-space: nowrap;
        &.is-active { background: var(--text); color: var(--bg-color); border-color: var(--text); } }
      .n { font-size: 0.72rem; font-weight: 800; } }
    .lista { display: flex; flex-direction: column; gap: 0.75rem; }
    .sol { display: flex; flex-direction: column; gap: 1rem; border-left: 4px solid var(--accent-amber);
      @include md { flex-direction: row; justify-content: space-between; align-items: center; }
      &.is-APROBADA { border-left-color: var(--accent-olive); } &.is-RECHAZADA { border-left-color: var(--danger); }
      &__main { display: flex; flex-direction: column; gap: 0.25rem; }
      &__title { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
      &__acc { display: flex; flex-direction: column; gap: 0.5rem; min-width: 260px; }
      .fila { display: flex; gap: 0.4rem; } }
  `,
})
export class SolicitudesComponent implements OnInit {
  private readonly panel = inject(PanelService);
  private readonly auth = inject(AuthService);
  private readonly proyectosSrv = inject(ProyectosService);
  private readonly inv = inject(InventarioService);
  private readonly toasts = inject(ToastService);

  readonly esResidente = this.auth.esRol('residente');
  readonly solicitudes$ = this.panel.solicitudes$;
  readonly texto: Record<EstadoSolicitud, string> = { PENDIENTE: 'Pendiente', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada' };
  readonly filtros: Array<{ valor: Filtro; texto: string }> = [
    { valor: 'PENDIENTE', texto: 'Pendientes' },
    { valor: 'APROBADA', texto: 'Aprobadas' },
    { valor: 'RECHAZADA', texto: 'Rechazadas' },
    { valor: 'TODAS', texto: 'Todas' },
  ];
  readonly conteo$ = this.solicitudes$.pipe(
    map((l) => ({
      TODAS: l.length,
      PENDIENTE: l.filter((s) => s.estado === 'PENDIENTE').length,
      APROBADA: l.filter((s) => s.estado === 'APROBADA').length,
      RECHAZADA: l.filter((s) => s.estado === 'RECHAZADA').length,
    })),
  );

  filtro: Filtro = this.esResidente ? 'TODAS' : 'PENDIENTE';
  proyectos: Proyecto[] = [];
  materiales: Material[] = [];
  proyectoId = '';
  materialId = '';
  cantidad = 1;
  notas = '';
  enviando = false;
  rechazando: string | null = null;
  motivo = '';
  error = '';

  ngOnInit(): void {
    this.panel.cargarSolicitudes().subscribe({ error: (e) => (this.error = mensajeError(e)) });
    if (this.esResidente) {
      this.proyectosSrv.cargar().subscribe((p) => {
        this.proyectos = p;
        this.proyectoId = p[0]?.id ?? '';
      });
      this.inv.cargarMateriales().subscribe((m) => (this.materiales = m));
    }
  }

  visibles(lista: SolicitudMaterial[] | null): SolicitudMaterial[] {
    const l = lista ?? [];
    return this.filtro === 'TODAS' ? l : l.filter((s) => s.estado === this.filtro);
  }

  solicitar(): void {
    this.enviando = true;
    this.panel
      .crearSolicitud({ proyecto_id: this.proyectoId, material_id: this.materialId, cantidad: Number(this.cantidad), notas: this.notas || undefined })
      .subscribe({
        next: (s) => {
          this.enviando = false;
          this.materialId = '';
          this.cantidad = 1;
          this.notas = '';
          this.filtro = 'TODAS';
          this.toasts.mostrar({ tipo: 'exito', titulo: 'Solicitud enviada a bodega', mensaje: `${s.cantidad} ${s.unidad} de ${s.material_nombre}` }, 3500);
        },
        error: (e) => {
          this.enviando = false;
          this.error = mensajeError(e);
        },
      });
  }

  aprobar(s: SolicitudMaterial): void {
    this.panel.aprobar(s.id).subscribe({
      next: () => this.toasts.mostrar({ tipo: 'exito', titulo: 'Solicitud aprobada', mensaje: `Salieron ${s.cantidad} ${s.unidad} de ${s.material_nombre} a ${s.proyecto_nombre}` }, 3500),
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  rechazar(s: SolicitudMaterial): void {
    this.panel.rechazar(s.id, this.motivo.trim()).subscribe({
      next: () => (this.rechazando = null),
      error: (e) => (this.error = mensajeError(e)),
    });
  }
}
