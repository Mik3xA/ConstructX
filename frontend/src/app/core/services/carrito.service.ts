import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { ItemCarrito, MaterialCatalogo } from '../models/models';
import { ToastService } from './toast.service';

const CLAVE = 'cx_carrito';

/**
 * Carrito de fletes del cliente.
 * Los importes aquí son SOLO una vista previa: el backend recalcula precios y flete al confirmar.
 */
@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly itemsSubject = new BehaviorSubject<ItemCarrito[]>(this.leer());
  readonly items$ = this.itemsSubject.asObservable();
  readonly totalPiezas$ = this.items$.pipe(map((items) => items.length));
  readonly subtotal$ = this.items$.pipe(
    map((items) => items.reduce((s, i) => s + i.cantidad * i.material.precio_unitario, 0)),
  );

  private readonly toasts = inject(ToastService);

  /** Agrega y muestra un aviso con enlace al carrito. */
  agregarConAviso(material: MaterialCatalogo, cantidad = 1): void {
    this.agregar(material, cantidad);
    this.toasts.mostrar(
      { tipo: 'exito', titulo: 'Agregado al carrito', mensaje: `${cantidad} ${material.unidad} · ${material.nombre}`, enlace: '/carrito' },
      3000,
    );
  }

  get items(): ItemCarrito[] {
    return this.itemsSubject.value;
  }

  cantidadDe(materialId: string): number {
    return this.items.find((i) => i.material.id === materialId)?.cantidad ?? 0;
  }

  agregar(material: MaterialCatalogo, cantidad: number): void {
    const actual = this.cantidadDe(material.id);
    this.fijarCantidad(material, actual + cantidad);
  }

  fijarCantidad(material: MaterialCatalogo, cantidad: number): void {
    // Si conocemos el stock exacto (sesión iniciada) se limita; si no, lo valida el servidor al confirmar
    const tope = material.stock_disponible ?? Number.POSITIVE_INFINITY;
    const limpia = Math.max(0, Math.min(Math.floor(Number(cantidad) || 0), tope));
    const otros = this.items.filter((i) => i.material.id !== material.id);
    const existente = this.items.findIndex((i) => i.material.id === material.id);
    if (limpia <= 0) return this.guardar(otros);

    const nuevo = { material, cantidad: limpia };
    const lista = [...this.items];
    if (existente >= 0) lista[existente] = nuevo;
    else lista.push(nuevo);
    this.guardar(lista);
  }

  quitar(materialId: string): void {
    this.guardar(this.items.filter((i) => i.material.id !== materialId));
  }

  /**
   * Actualiza precio/stock de los materiales del carrito que aparezcan en `catalogo`.
   * Los que no aparezcan (p. ej. por un filtro activo) se conservan sin cambios.
   */
  refrescar(catalogo: MaterialCatalogo[]): void {
    if (!this.items.length) return;
    const porId = new Map(catalogo.map((m) => [m.id, m]));
    this.guardar(
      this.items.map((i) => {
        const m = porId.get(i.material.id);
        return m ? { material: m, cantidad: Math.min(i.cantidad, m.stock_disponible ?? i.cantidad) } : i;
      }).filter((i) => i.cantidad > 0),
    );
  }

  vaciar(): void {
    this.guardar([]);
  }

  private guardar(items: ItemCarrito[]): void {
    this.itemsSubject.next(items);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
      /* el carrito vive solo en memoria */
    }
  }

  private leer(): ItemCarrito[] {
    try {
      const raw = localStorage.getItem(CLAVE);
      const items = raw ? (JSON.parse(raw) as ItemCarrito[]) : [];
      return Array.isArray(items) ? items.filter((i) => i?.material?.id && i.cantidad > 0) : [];
    } catch {
      return [];
    }
  }
}
