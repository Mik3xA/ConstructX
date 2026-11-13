import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { Cotizacion, EstadoPedido, Pedido } from '../models/models';

interface NuevoPedido {
  uuid: string;
  items: Array<{ material_id: string; cantidad: number }>;
  direccion_entrega: string;
  telefono_contacto?: string;
  notas?: string;
}

/** Pedidos de flete: estado compartido entre vistas con BehaviorSubject. */
@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  private readonly pedidosSubject = new BehaviorSubject<Pedido[]>([]);
  readonly pedidos$ = this.pedidosSubject.asObservable();

  cargar(estado?: EstadoPedido): Observable<Pedido[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http
      .get<Pedido[]>(`${this.api}/pedidos`, { params })
      .pipe(tap((p) => this.pedidosSubject.next(p)));
  }

  obtener(uuid: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.api}/pedidos/${uuid}`);
  }

  cotizar(items: NuevoPedido['items']): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(`${this.api}/pedidos/cotizar`, { items });
  }

  /** El uuid lo genera el cliente: reintentar no duplica el pedido. */
  crear(pedido: NuevoPedido): Observable<Pedido> {
    return this.http
      .post<Pedido>(`${this.api}/pedidos`, { ...pedido, timestamp: new Date().toISOString() })
      .pipe(tap((p) => this.upsertLocal(p)));
  }

  cambiarEstado(
    uuid: string,
    estado: EstadoPedido,
    despacho?: { chofer: string; vehiculo: string; fecha_estimada?: string },
  ): Observable<Pedido> {
    return this.http
      .patch<Pedido>(`${this.api}/pedidos/${uuid}/estado`, { estado, ...despacho })
      .pipe(tap((p) => this.upsertLocal(p)));
  }

  /** Abre el recibo HTML del pedido en una pestaña nueva (lleva el token por el interceptor). */
  abrirRecibo(uuid: string): void {
    const ventana = window.open('', '_blank');
    this.http.get(`${this.api}/pedidos/${uuid}/recibo`, { responseType: 'text' }).subscribe({
      next: (html) => {
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        if (ventana) ventana.location.href = url;
        else window.location.href = url;
      },
      error: () => ventana?.close(),
    });
  }

  /** Limpia el estado al cambiar de usuario. */
  limpiar(): void {
    this.pedidosSubject.next([]);
  }

  /** Inserta o reemplaza un pedido en la lista (usado por los eventos de Socket.io). */
  upsertLocal(p: Pedido): void {
    const lista = this.pedidosSubject.value;
    const i = lista.findIndex((x) => x.uuid === p.uuid);
    const nueva = i >= 0 ? lista.map((x) => (x.uuid === p.uuid ? { ...x, ...p } : x)) : [p, ...lista];
    this.pedidosSubject.next(nueva);
  }
}
