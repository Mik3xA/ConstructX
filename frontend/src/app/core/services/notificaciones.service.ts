import { CurrencyPipe } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { PedidosService } from './pedidos.service';
import { SocketService } from './socket.service';
import { ToastService } from './toast.service';

const ESTADO_TEXTO = { PENDIENTE: 'pendiente', EN_RUTA: 'en ruta', ENTREGADO: 'entregado' } as const;

/**
 * Traduce los eventos de Socket.io en toasts globales y mantiene
 * la lista de pedidos actualizada sin recargar la página.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly auth = inject(AuthService);
  private readonly socket = inject(SocketService);
  private readonly toasts = inject(ToastService);
  private readonly pedidos = inject(PedidosService);
  private readonly moneda = new CurrencyPipe('es-MX', 'MXN');
  private subs: Subscription[] = [];

  iniciar(): void {
    if (this.subs.length) return;

    this.subs.push(
      this.socket.on('nuevo_flete').subscribe((p) => {
        if (!this.auth.esRol('admin', 'bodeguero')) return;
        this.pedidos.upsertLocal(p);
        this.toasts.mostrar({
          tipo: 'pedido',
          titulo: 'Nuevo pedido de flete',
          mensaje: `${p.cliente_nombre} · ${this.moneda.transform(p.total_pagar)} · ${p.detalles?.length ?? p.total_lineas ?? 0} material(es)`,
          enlace: '/fletes',
        });
      }),

      this.socket.on('flete_actualizado').subscribe((p) => {
        this.pedidos.upsertLocal(p);
        if (this.auth.esRol('cliente')) {
          this.toasts.mostrar({
            tipo: p.estado === 'ENTREGADO' ? 'exito' : 'info',
            titulo: `Tu pedido ${p.uuid.slice(0, 8).toUpperCase()} está ${ESTADO_TEXTO[p.estado]}`,
            mensaje: p.estado === 'EN_RUTA' ? 'El flete salió del almacén rumbo a tu obra.' : 'Gracias por tu compra.',
            enlace: '/mis-pedidos',
          });
        }
      }),

      this.socket.on('alerta_naranja').subscribe((a) => {
        if (!this.auth.esRol('admin')) return;
        this.toasts.mostrar(
          { tipo: 'alerta', titulo: 'Posible merma detectada', mensaje: a.mensaje, enlace: '/dashboard' },
          9000,
        );
      }),
    );
  }
}
