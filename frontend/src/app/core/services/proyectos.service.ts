import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { Fase, Proyecto, ProyectoDetalle } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProyectosService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  private readonly proyectosSubject = new BehaviorSubject<Proyecto[]>([]);
  readonly proyectos$ = this.proyectosSubject.asObservable();

  private readonly detalleSubject = new BehaviorSubject<ProyectoDetalle | null>(null);
  readonly detalle$ = this.detalleSubject.asObservable();

  cargar(): Observable<Proyecto[]> {
    return this.http
      .get<Proyecto[]>(`${this.api}/proyectos`)
      .pipe(tap((p) => this.proyectosSubject.next(p)));
  }

  cargarDetalle(id: string): Observable<ProyectoDetalle> {
    return this.http
      .get<ProyectoDetalle>(`${this.api}/proyectos/${id}`)
      .pipe(tap((d) => this.detalleSubject.next(d)));
  }

  actualizarAvance(faseId: string, porcentaje: number): Observable<Fase> {
    return this.http.patch<Fase>(`${this.api}/fases/${faseId}/avance`, {
      porcentaje_avance_real: porcentaje,
    });
  }
}
