import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { concat, last, Observable, of, toArray } from 'rxjs';
import { Fase, LineaBom, NuevoMovimiento, ProyectoDetalle, Tarea } from '../../core/models/models';
import { InventarioService } from '../../core/services/inventario.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { mensajeError } from '../../core/utils/http-error';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';

/** Tolerancia mostrada en la vista previa. La decisión real la toma el backend. */
const TOLERANCIA_PREVIEW = 5;

/**
 * Vista del Residente de Obra: reporta el consumo del día por tarea
 * y actualiza el porcentaje de avance real de la fase.
 */
@Component({
  selector: 'cx-field-report',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, FormsModule, ProgressBarComponent],
  templateUrl: './field-report.component.html',
  styleUrl: './field-report.component.scss',
})
export class FieldReportComponent implements OnInit {
  private readonly proyectos = inject(ProyectosService);
  private readonly inventario = inject(InventarioService);

  readonly proyectos$ = this.proyectos.proyectos$;
  readonly tolerancia = TOLERANCIA_PREVIEW;

  proyectoId = '';
  faseId = '';
  tareaId = '';
  detalle: ProyectoDetalle | null = null;

  /** Cantidad consumida hoy por material_id. */
  consumos: Record<string, number | null> = {};
  avance = 0;

  /**
   * UUIDs del envío pendiente: si falla la red y el usuario reintenta,
   * se reutilizan y el servidor no duplica el consumo (idempotencia).
   */
  private uuidsPendientes: Record<string, string> = {};

  enviando = false;
  error = '';
  exito = '';

  ngOnInit(): void {
    this.proyectos.cargar().subscribe({
      next: (lista) => {
        if (lista.length === 1) this.seleccionarProyecto(lista[0].id);
      },
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  get fase(): Fase | undefined {
    return this.detalle?.fases.find((f) => f.id === this.faseId);
  }

  get tarea(): Tarea | undefined {
    return this.fase?.tareas.find((t) => t.id === this.tareaId);
  }

  get hayCambios(): boolean {
    const hayConsumo = Object.values(this.consumos).some((v) => (v ?? 0) > 0);
    return hayConsumo || (!!this.fase && this.avance !== this.fase.porcentaje_avance_real);
  }

  seleccionarProyecto(id: string): void {
    this.proyectoId = id;
    this.faseId = '';
    this.tareaId = '';
    this.detalle = null;
    if (!id) return;
    this.recargarDetalle();
  }

  seleccionarFase(id: string): void {
    this.faseId = id;
    this.tareaId = this.fase?.tareas[0]?.id ?? '';
    this.avance = this.fase?.porcentaje_avance_real ?? 0;
    this.limpiarFormulario();
  }

  seleccionarTarea(id: string): void {
    this.tareaId = id;
    this.limpiarFormulario();
  }

  /** % de consumo proyectado (acumulado + lo que se reporta hoy). */
  consumoProyectado(l: LineaBom): number {
    const hoy = this.consumos[l.material_id] ?? 0;
    return ((l.cantidad_consumida + hoy) / l.cantidad_presupuestada) * 100;
  }

  /** Vista previa de la regla Consumo% > Avance% + 5 para guiar al residente. */
  excedeTolerancia(l: LineaBom): boolean {
    return this.consumoProyectado(l) > this.avance + TOLERANCIA_PREVIEW;
  }

  get lineasEnRiesgo(): number {
    return this.tarea?.bom.filter((l) => this.excedeTolerancia(l)).length ?? 0;
  }

  enviar(): void {
    const tarea = this.tarea;
    const fase = this.fase;
    if (!tarea || !fase || this.enviando) return;

    this.enviando = true;
    this.error = '';
    this.exito = '';

    const ahora = new Date().toISOString();
    const movimientos: NuevoMovimiento[] = tarea.bom
      .filter((l) => (this.consumos[l.material_id] ?? 0) > 0)
      .map((l) => ({
        uuid: (this.uuidsPendientes[l.material_id] ??= crypto.randomUUID()),
        tipo: 'CONSUMO_OBRA',
        material_id: l.material_id,
        cantidad: Number(this.consumos[l.material_id]),
        proyecto_id: this.proyectoId,
        tarea_id: tarea.id,
        timestamp: ahora,
      }));

    const peticiones: Observable<unknown>[] = movimientos.map((m) => this.inventario.registrar(m));
    if (this.avance !== fase.porcentaje_avance_real) {
      peticiones.push(this.proyectos.actualizarAvance(fase.id, this.avance));
    }
    if (!peticiones.length) {
      this.enviando = false;
      return;
    }

    // Secuencial: el avance se aplica al final para que el auditor vea todo el consumo.
    concat(...peticiones, of(null))
      .pipe(toArray(), last())
      .subscribe({
        next: () => {
          this.exito = `Reporte enviado: ${movimientos.length} consumo(s) registrados, avance ${this.avance}%.`;
          this.uuidsPendientes = {};
          this.consumos = {};
          this.recargarDetalle();
          this.enviando = false;
        },
        error: (e) => {
          this.error = mensajeError(e) + ' Puedes reintentar sin duplicar registros.';
          this.enviando = false;
        },
      });
  }

  private limpiarFormulario(): void {
    this.consumos = {};
    this.uuidsPendientes = {};
    this.exito = '';
    this.error = '';
  }

  private recargarDetalle(): void {
    this.proyectos.cargarDetalle(this.proyectoId).subscribe({
      next: (d) => {
        this.detalle = d;
        if (!this.faseId && d.fases.length) this.seleccionarFase(d.fases[0].id);
        else if (this.fase) this.avance = this.fase.porcentaje_avance_real;
      },
      error: (e) => (this.error = mensajeError(e)),
    });
  }
}
