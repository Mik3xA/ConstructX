import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Alerta } from '../../core/models/models';
import { AlertasService } from '../../core/services/alertas.service';
import { mensajeError } from '../../core/utils/http-error';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

/** Panel del Administrador: KPIs, salud de proyectos y alertas naranjas. */
@Component({
  selector: 'bs-dashboard',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, DatePipe, StatCardComponent, ProgressBarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly alertas = inject(AlertasService);

  readonly dashboard$ = this.alertas.dashboard$;
  readonly hoy = new Date();
  error = '';
  auditando = false;

  ngOnInit(): void {
    this.alertas.iniciarPolling(30_000);
  }

  ngOnDestroy(): void {
    this.alertas.detenerPolling();
  }

  revisar(a: Alerta): void {
    this.alertas.marcarRevisada(a.id).subscribe({ error: (e) => (this.error = mensajeError(e)) });
  }

  auditar(): void {
    this.auditando = true;
    this.alertas.auditar().subscribe({
      next: () => (this.auditando = false),
      error: (e) => {
        this.error = mensajeError(e);
        this.auditando = false;
      },
    });
  }

  /** Solo para presentación: el backend ya determinó qué está en alerta. */
  enAlerta(p: { alertas_activas: number }): boolean {
    return p.alertas_activas > 0;
  }

  maxStock(stock: Array<{ stock_actual: number }>): number {
    return Math.max(1, ...stock.map((s) => s.stock_actual));
  }
}
