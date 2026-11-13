import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, map, switchMap, tap, timer } from 'rxjs';
import { API_URL } from '../api.config';
import { Alerta, DashboardResumen } from '../models/models';

/**
 * Estado del panel del Admin. La regla de desviación vive en el backend
 * (alertas.service.js); aquí solo se consume el resultado.
 */
@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  private readonly dashboardSubject = new BehaviorSubject<DashboardResumen | null>(null);
  readonly dashboard$ = this.dashboardSubject.asObservable();
  readonly alertas$: Observable<Alerta[]> = this.dashboard$.pipe(map((d) => d?.alertas ?? []));

  private polling?: Subscription;

  cargarDashboard(): Observable<DashboardResumen> {
    return this.http
      .get<DashboardResumen>(`${this.api}/dashboard`)
      .pipe(tap((d) => this.dashboardSubject.next(d)));
  }

  /** Refresca el panel cada `ms` milisegundos mientras haya suscriptores. */
  iniciarPolling(ms = 30_000): void {
    this.detenerPolling();
    this.polling = timer(0, ms)
      .pipe(switchMap(() => this.cargarDashboard()))
      .subscribe({ error: () => this.detenerPolling() });
  }

  detenerPolling(): void {
    this.polling?.unsubscribe();
    this.polling = undefined;
  }

  marcarRevisada(id: string): Observable<Alerta> {
    return this.http
      .patch<Alerta>(`${this.api}/alertas/${id}/revisar`, {})
      .pipe(tap(() => this.cargarDashboard().subscribe()));
  }

  auditar(): Observable<unknown> {
    return this.http
      .post(`${this.api}/alertas/auditar`, {})
      .pipe(tap(() => this.cargarDashboard().subscribe()));
  }
}
