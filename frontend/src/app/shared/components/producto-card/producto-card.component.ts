import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialCatalogo } from '../../../core/models/models';
import { MaterialImgComponent } from '../material-img/material-img.component';

/** Tarjeta de producto de la tienda: foto, categoría, nombre, precio, disponibilidad y botón de agregar. */
@Component({
  selector: 'cx-producto-card',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, MaterialImgComponent],
  template: `
    <article class="card-p" [class.is-agotado]="agotado" data-testid="producto">
      <a class="card-p__media" [routerLink]="['/producto', m.codigo_sku]" [attr.aria-label]="'Ver ' + m.nombre">
        <cx-material-img [url]="m.imagen_url" [categoria]="m.categoria" [alt]="m.nombre" />
        @if (etiqueta) { <span class="card-p__tag">{{ etiqueta }}</span> }
      </a>
      <div class="card-p__body">
        <span class="card-p__cat">{{ m.categoria }}</span>
        <a class="card-p__name" [routerLink]="['/producto', m.codigo_sku]">{{ m.nombre }}</a>
        <span class="card-p__sku mono">SKU {{ m.codigo_sku }}</span>
        <div class="card-p__price">
          <strong class="mono">{{ m.precio_unitario | currency: 'MXN' : 'symbol-narrow' : '1.2-2' }}</strong>
          <span>/ {{ m.unidad }}</span>
        </div>
        <span class="card-p__disp" [class]="'card-p__disp is-' + disp">{{ textoDisp }}</span>
        <button type="button" class="btn btn--primary btn--block" (click)="agregar.emit(m)" [disabled]="agotado" data-testid="agregar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 8H6" /></svg>
          {{ agotado ? 'Agotado' : 'Agregar al carrito' }}
        </button>
      </div>
    </article>
  `,
  styles: `
    @use 'variables' as *;
    :host { display: block; }
    .card-p {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: $radius-lg;
      overflow: hidden;
      transition: transform $transition, box-shadow $transition, border-color $transition;
      &:hover { transform: translateY(-3px); box-shadow: var(--shadow); border-color: var(--border-strong); }
      &:hover cx-material-img ::ng-deep img { transform: scale(1.05); }
      &.is-agotado cx-material-img { filter: grayscale(1); opacity: 0.6; }

      &__media { position: relative; display: block; aspect-ratio: 4 / 3; cx-material-img { height: 100%; } }
      &__tag {
        position: absolute; top: 0.7rem; left: 0.7rem;
        padding: 0.2rem 0.6rem; border-radius: 999px;
        background: var(--primary-orange); color: var(--on-primary);
        font-size: 0.7rem; font-weight: 800; letter-spacing: 0.02em;
      }
      &__body { display: flex; flex-direction: column; gap: 0.3rem; padding: 0.95rem 1rem 1rem; flex: 1; }
      &__cat { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-amber); }
      &__name {
        font-family: $font-display; font-weight: 700; font-size: 1.02rem; color: var(--text); line-height: 1.25;
        &:hover { color: var(--primary-orange); }
      }
      &__sku { font-size: 0.72rem; color: var(--text-faint); }
      &__price {
        display: flex; align-items: baseline; gap: 0.3rem; margin-top: auto; padding-top: 0.4rem;
        strong { font-size: 1.3rem; color: var(--text); }
        span { color: var(--text-muted); font-size: 0.82rem; }
      }
      &__disp {
        font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem;
        &.is-DISPONIBLE { color: var(--accent-olive); }
        &.is-POCAS { color: var(--accent-amber); }
        &.is-AGOTADO { color: var(--danger); }
      }
    }
  `,
})
export class ProductoCardComponent {
  @Input({ required: true }) m!: MaterialCatalogo;
  @Input() etiqueta = '';
  @Output() agregar = new EventEmitter<MaterialCatalogo>();

  get disp(): string {
    if (this.m.disponibilidad) return this.m.disponibilidad;
    const s = this.m.stock_disponible ?? 0;
    return s <= 0 ? 'AGOTADO' : s < 50 ? 'POCAS' : 'DISPONIBLE';
  }
  get agotado(): boolean {
    return this.disp === 'AGOTADO';
  }
  get textoDisp(): string {
    return { DISPONIBLE: '● En existencia', POCAS: '● Pocas piezas', AGOTADO: '● Agotado' }[this.disp] ?? '';
  }
}
