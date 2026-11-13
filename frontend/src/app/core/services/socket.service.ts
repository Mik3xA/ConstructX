import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, filter, map } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { SOCKET_URL } from '../api.config';
import { Alerta, Pedido } from '../models/models';
import { AuthService } from './auth.service';

/** Eventos que emite el backend (ver backend/src/servicios/socket.service.js). */
export interface EventosServidor {
  nuevo_flete: Pedido;
  flete_actualizado: Pedido;
  inventario_actualizado: { materiales: string[] };
  alerta_naranja: Alerta;
}

type NombreEvento = keyof EventosServidor;

/**
 * Conexión Socket.io autenticada con el JWT de la sesión.
 * Se conecta al iniciar sesión y se desconecta al cerrarla.
 */
@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private readonly url = inject(SOCKET_URL);
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);

  private socket: Socket | null = null;
  private readonly eventos = new Subject<{ nombre: NombreEvento; payload: unknown }>();
  private readonly conectadoSubject = new BehaviorSubject<boolean>(false);
  readonly conectado$ = this.conectadoSubject.asObservable();

  private readonly sub = this.auth.user$.subscribe((u) => (u ? this.conectar() : this.desconectar()));

  on<K extends NombreEvento>(nombre: K): Observable<EventosServidor[K]> {
    return this.eventos.pipe(
      filter((e) => e.nombre === nombre),
      map((e) => e.payload as EventosServidor[K]),
    );
  }

  private conectar(): void {
    const token = this.auth.token;
    if (!token) return;
    this.desconectar();

    this.socket = io(this.url, { auth: { token }, transports: ['websocket', 'polling'] });
    this.socket.on('connect', () => this.zone.run(() => this.conectadoSubject.next(true)));
    this.socket.on('disconnect', () => this.zone.run(() => this.conectadoSubject.next(false)));
    this.socket.on('connect_error', () => this.zone.run(() => this.conectadoSubject.next(false)));

    const nombres: NombreEvento[] = ['nuevo_flete', 'flete_actualizado', 'inventario_actualizado', 'alerta_naranja'];
    for (const nombre of nombres) {
      // Re-entrar en la zona de Angular para que la vista se actualice sin recargar
      this.socket.on(nombre, (payload: unknown) => this.zone.run(() => this.eventos.next({ nombre, payload })));
    }
  }

  private desconectar(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.conectadoSubject.next(false);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.desconectar();
  }
}
