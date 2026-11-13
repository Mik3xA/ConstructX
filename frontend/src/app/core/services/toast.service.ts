import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TipoToast = 'pedido' | 'exito' | 'alerta' | 'info';

export interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  mensaje?: string;
  enlace?: string;
}

/** Notificaciones tipo "toast" (estado con BehaviorSubject). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly toastsSubject = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  mostrar(t: Omit<Toast, 'id'>, duracionMs = 6000): number {
    const id = ++this.seq;
    // Máximo 4 visibles: se descarta el más antiguo
    this.toastsSubject.next([...this.toastsSubject.value.slice(-3), { ...t, id }]);
    if (duracionMs > 0) setTimeout(() => this.cerrar(id), duracionMs);
    return id;
  }

  cerrar(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((t) => t.id !== id));
  }
}
