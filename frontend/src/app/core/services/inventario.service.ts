import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { ItemInventario, Material, Movimiento, NuevoMovimiento, TipoMovimiento } from '../models/models';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  private readonly materialesSubject = new BehaviorSubject<Material[]>([]);
  readonly materiales$ = this.materialesSubject.asObservable();

  private readonly inventarioSubject = new BehaviorSubject<ItemInventario[]>([]);
  readonly inventario$ = this.inventarioSubject.asObservable();

  private readonly movimientosSubject = new BehaviorSubject<Movimiento[]>([]);
  readonly movimientos$ = this.movimientosSubject.asObservable();

  cargarMateriales(): Observable<Material[]> {
    return this.http
      .get<Material[]>(`${this.api}/materiales`)
      .pipe(tap((m) => this.materialesSubject.next(m)));
  }

  cargarInventario(): Observable<ItemInventario[]> {
    return this.http
      .get<ItemInventario[]>(`${this.api}/inventario`)
      .pipe(tap((i) => this.inventarioSubject.next(i)));
  }

  cargarMovimientos(filtro: { tipo?: TipoMovimiento; proyecto_id?: string; limit?: number } = {}): Observable<Movimiento[]> {
    let params = new HttpParams();
    Object.entries(filtro).forEach(([k, v]) => {
      if (v != null) params = params.set(k, String(v));
    });
    return this.http
      .get<Movimiento[]>(`${this.api}/movimientos`, { params })
      .pipe(tap((m) => this.movimientosSubject.next(m)));
  }

  /**
   * Registra un movimiento. El UUIDv4 se genera en el cliente para que un reintento
   * (doble clic, red intermitente) sea idempotente en el servidor.
   */
  registrar(mov: NuevoMovimiento): Observable<Movimiento> {
    const body: NuevoMovimiento = {
      ...mov,
      uuid: mov.uuid ?? crypto.randomUUID(),
      timestamp: mov.timestamp ?? new Date().toISOString(),
    };
    return this.http.post<Movimiento>(`${this.api}/movimientos`, body);
  }
}
