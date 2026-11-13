import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_URL } from '../api.config';
import {
  EstadoSolicitud,
  MaterialCatalogo,
  MensajeContacto,
  ReporteVentas,
  Rol,
  SolicitudMaterial,
  UsuarioAdmin,
} from '../models/models';

/** Operaciones de gestión del equipo interno. Estado compartido con BehaviorSubject. */
@Injectable({ providedIn: 'root' })
export class PanelService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  private readonly solicitudesSubject = new BehaviorSubject<SolicitudMaterial[]>([]);
  readonly solicitudes$ = this.solicitudesSubject.asObservable();

  private readonly mensajesSubject = new BehaviorSubject<MensajeContacto[]>([]);
  readonly mensajes$ = this.mensajesSubject.asObservable();

  // ---------- Solicitudes ----------
  cargarSolicitudes(estado?: EstadoSolicitud): Observable<SolicitudMaterial[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http
      .get<SolicitudMaterial[]>(`${this.api}/solicitudes`, { params })
      .pipe(tap((s) => this.solicitudesSubject.next(s)));
  }

  crearSolicitud(body: { proyecto_id: string; tarea_id?: string; material_id: string; cantidad: number; notas?: string }) {
    return this.http.post<SolicitudMaterial>(`${this.api}/solicitudes`, body).pipe(tap((s) => this.upsertSolicitud(s)));
  }

  aprobar(id: string) {
    return this.http.patch<SolicitudMaterial>(`${this.api}/solicitudes/${id}/aprobar`, {}).pipe(tap((s) => this.upsertSolicitud(s)));
  }

  rechazar(id: string, motivo: string) {
    return this.http
      .patch<SolicitudMaterial>(`${this.api}/solicitudes/${id}/rechazar`, { motivo })
      .pipe(tap((s) => this.upsertSolicitud(s)));
  }

  upsertSolicitud(s: SolicitudMaterial): void {
    const lista = this.solicitudesSubject.value;
    const existe = lista.some((x) => x.id === s.id);
    this.solicitudesSubject.next(existe ? lista.map((x) => (x.id === s.id ? s : x)) : [s, ...lista]);
  }

  // ---------- Mensajes ----------
  cargarMensajes() {
    return this.http.get<MensajeContacto[]>(`${this.api}/mensajes`).pipe(tap((m) => this.mensajesSubject.next(m)));
  }

  marcarMensaje(id: string, leido: boolean) {
    return this.http.patch<MensajeContacto>(`${this.api}/mensajes/${id}`, { leido }).pipe(
      tap((m) => this.mensajesSubject.next(this.mensajesSubject.value.map((x) => (x.id === id ? m : x)))),
    );
  }

  agregarMensaje(m: MensajeContacto): void {
    this.mensajesSubject.next([m, ...this.mensajesSubject.value.filter((x) => x.id !== m.id)]);
  }

  // ---------- Reportes ----------
  reporteVentas(dias: number) {
    return this.http.get<ReporteVentas>(`${this.api}/reportes/ventas`, { params: new HttpParams().set('dias', dias) });
  }

  // ---------- Inventario / catálogo ----------
  fijarStockMinimo(materialId: string, stock_minimo: number) {
    return this.http.patch(`${this.api}/inventario/${materialId}/minimo`, { stock_minimo });
  }

  actualizarMaterial(id: string, cambios: Partial<MaterialCatalogo> & { activo?: boolean }) {
    return this.http.patch<MaterialCatalogo>(`${this.api}/materiales/${id}`, cambios);
  }

  crearMaterial(m: { codigo_sku: string; nombre: string; unidad: string; categoria: string; precio_unitario: number; imagen_url?: string; descripcion?: string }) {
    return this.http.post<MaterialCatalogo>(`${this.api}/materiales`, m);
  }

  // ---------- Usuarios ----------
  usuarios(rol?: Rol) {
    const params = rol ? new HttpParams().set('rol', rol) : undefined;
    return this.http.get<UsuarioAdmin[]>(`${this.api}/usuarios`, { params });
  }

  actualizarUsuario(id: string, cambios: { activo?: boolean; rol?: Rol; password?: string }) {
    return this.http.patch<UsuarioAdmin>(`${this.api}/usuarios/${id}`, cambios);
  }

  crearEmpleado(u: { email: string; password: string; nombre: string; rol: Rol }) {
    return this.http.post<UsuarioAdmin>(`${this.api}/auth/register`, u);
  }
}
