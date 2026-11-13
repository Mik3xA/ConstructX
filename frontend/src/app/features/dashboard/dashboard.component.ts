import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, merge } from 'rxjs';
import { Alerta, StockBajo } from '../../core/models/models';
import { AlertasService } from '../../core/services/alertas.service';
import { SocketService } from '../../core/services/socket.service';
import { mensajeError } from '../../core/utils/http-error';
import { EstadoPedidoComponent } from '../../shared/components/estado-pedido/estado-pedido.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

/**
 * Panel del Administrador: finanzas del portal, pedidos en vivo, salud de obras y alertas.
 * Se refresca al instante con los eventos de Socket.io (sin recargar la página).
 */
@Component({
  selector: 'cx-dashboard',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DecimalPipe, DatePipe, RouterLink, StatCardComponent, ProgressBarComponent, EstadoPedidoComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly alertas = inject(AlertasService);
  private readonly socket = inject(SocketService);

  readonly dashboard$ = this.alertas.dashboard$;
  readonly hoy = new Date();
  readonly nuevos = new Set<string>();
  error = '';
  auditando = false;
  private sub?: Subscription;

  ngOnInit(): void {
    this.alertas.iniciarPolling(60_000);
    this.sub = merge(
      this.socket.on('nuevo_flete'),
      this.socket.on('flete_actualizado'),
      this.socket.on('alerta_naranja'),
      this.socket.on('stock_bajo'),
      this.socket.on('solicitud_material'),
      this.socket.on('mensaje_contacto'),
    ).subscribe((evento) => {
      if (!Array.isArray(evento) && 'total_pagar' in evento && evento.estado === 'PENDIENTE') {
        this.nuevos.add(evento.uuid);
        setTimeout(() => this.nuevos.delete(evento.uuid), 8000);
      }
      this.alertas.cargarDashboard().subscribe({ error: (e) => (this.error = mensajeError(e)) });
    });
  }

  ngOnDestroy(): void {
    this.alertas.detenerPolling();
    this.sub?.unsubscribe();
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

  nombresBajos(l: StockBajo[]): string {
    return l.map((s) => s.nombre).slice(0, 3).join(', ') + (l.length > 3 ? '…' : '');
  }

  enAlerta(p: { alertas_activas: number }): boolean {
    return p.alertas_activas > 0;
  }

  maxStock(stock: Array<{ stock_actual: number }>): number {
    return Math.max(1, ...stock.map((s) => s.stock_actual));
  }
}
