import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { EMPRESA } from '../../../core/data/empresa';
import { MaterialCatalogo } from '../../../core/models/models';
import { CarritoService } from '../../../core/services/carrito.service';
import { PublicoService } from '../../../core/services/publico.service';
import { MaterialImgComponent } from '../../../shared/components/material-img/material-img.component';
import { ProductoCardComponent } from '../../../shared/components/producto-card/producto-card.component';

/** Ficha de producto: foto grande, precio, disponibilidad, cantidad, especificaciones y relacionados. */
@Component({
  selector: 'cx-producto',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, FormsModule, RouterLink, MaterialImgComponent, ProductoCardComponent],
  template: `
    @if (datos$ | async; as d) {
      @if (d.producto; as p) {
        <div class="wrap">
          <nav class="crumbs crumbs--dark" aria-label="Ruta">
            <a routerLink="/">Inicio</a><span>/</span><a routerLink="/catalogo">Productos</a><span>/</span>
            <a routerLink="/catalogo" [queryParams]="{ categoria: p.categoria }">{{ p.categoria }}</a><span>/</span><span>{{ p.nombre }}</span>
          </nav>

          <article class="ficha">
            <cx-material-img class="ficha__img" [url]="p.imagen_url" [categoria]="p.categoria" [alt]="p.nombre" />
            <div class="ficha__info">
              <span class="ficha__cat">{{ p.categoria }}</span>
              <h1>{{ p.nombre }}</h1>
              <span class="mono muted">SKU {{ p.codigo_sku }}</span>
              <div class="ficha__price"><strong class="mono">{{ p.precio_unitario | currency: 'MXN' : 'symbol-narrow' : '1.2-2' }}</strong><span>por {{ p.unidad }} · sin IVA</span></div>
              <span class="disp" [class]="'disp is-' + p.disponibilidad">{{ textos[p.disponibilidad ?? 'DISPONIBLE'] }}</span>
              <p class="ficha__desc">{{ p.descripcion }}</p>

              <div class="ficha__buy">
                <div class="stepper">
                  <button type="button" (click)="cantidad = cantidad > 1 ? cantidad - 1 : 1" aria-label="Menos">−</button>
                  <input type="number" min="1" [(ngModel)]="cantidad" aria-label="Cantidad" />
                  <button type="button" (click)="cantidad = cantidad + 1" aria-label="Más">+</button>
                </div>
                <button type="button" class="btn btn--primary btn--lg" [disabled]="p.disponibilidad === 'AGOTADO'" (click)="agregar(p)" data-testid="agregar-ficha">
                  Agregar al carrito · {{ p.precio_unitario * (cantidad || 1) | currency: 'MXN' : 'symbol-narrow' }}
                </button>
              </div>

              <ul class="ficha__perks">
                <li><b>Flete gratis</b> en pedidos desde $25,000</li>
                <li><b>Pago contra entrega</b> con factura electrónica</li>
                <li><b>Entrega programada</b> en {{ zonas }}</li>
              </ul>

              <table class="table specs">
                <tbody>
                  <tr><th>Unidad de venta</th><td>{{ p.unidad }}</td></tr>
                  <tr><th>Categoría</th><td>{{ p.categoria }}</td></tr>
                  <tr><th>Código</th><td class="mono">{{ p.codigo_sku }}</td></tr>
                </tbody>
              </table>
            </div>
          </article>

          @if (d.relacionados.length) {
            <section class="section">
              <header class="section__head"><div><span class="eyebrow">Completa tu pedido</span><h2>También te puede interesar</h2></div></header>
              <div class="products">
                @for (m of d.relacionados; track m.id) { <cx-producto-card [m]="m" (agregar)="carrito.agregarConAviso($event, 1)" /> }
              </div>
            </section>
          }
        </div>
      } @else {
        <div class="wrap empty"><p>Este producto no existe o ya no está disponible.</p><a class="btn btn--primary" routerLink="/catalogo">Volver al catálogo</a></div>
      }
    } @else {
      <div class="wrap ficha"><div class="skeleton" style="aspect-ratio: 1"></div><div class="skeleton" style="height: 420px"></div></div>
    }
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;
    .crumbs--dark { color: var(--text-muted); padding: 1.5rem 0 1rem; flex-wrap: wrap; a { color: var(--text-muted); } span:last-child { color: var(--text); } }
    .ficha {
      display: grid; gap: 2rem; padding-top: 0.5rem;
      @include md { grid-template-columns: 1fr 1fr; }
      &__img { aspect-ratio: 1; border-radius: $radius-lg; border: 1px solid var(--border); }
      &__info { display: flex; flex-direction: column; gap: 0.6rem; }
      &__cat { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-amber); }
      h1 { font-size: clamp(1.7rem, 3vw, 2.4rem); letter-spacing: -0.03em; }
      &__price { display: flex; align-items: baseline; gap: 0.5rem; margin-top: 0.5rem;
        strong { font-size: 2.2rem; color: var(--primary-orange); } span { color: var(--text-muted); } }
      &__desc { margin: 0.25rem 0; color: var(--text-muted); line-height: 1.6; }
      &__buy { display: flex; flex-wrap: wrap; gap: 0.6rem; margin: 0.5rem 0; .btn { flex: 1; min-width: 240px; } }
      &__perks { list-style: none; margin: 0.25rem 0; padding: 1rem; border-radius: $radius; background: var(--surface-2); border: 1px solid var(--border);
        display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.88rem; li::before { content: '✓  '; color: var(--accent-olive); font-weight: 800; } }
    }
    .disp { font-weight: 700; font-size: 0.88rem;
      &.is-DISPONIBLE { color: var(--accent-olive); } &.is-POCAS { color: var(--accent-amber); } &.is-AGOTADO { color: var(--danger); } }
    .specs th { text-transform: none; letter-spacing: 0; font-size: 0.85rem; width: 45%; }
    .stepper {
      display: flex; height: 50px; border: 1px solid var(--border-strong); border-radius: $radius; background: var(--surface); overflow: hidden;
      button { width: 44px; border: 0; background: none; color: var(--text); font-size: 1.2rem; cursor: pointer; &:hover { color: var(--primary-orange); background: var(--surface-hover); } }
      input { width: 64px; border: 0; background: none; color: var(--text); text-align: center; font: inherit; font-weight: 700; -moz-appearance: textfield;
        &::-webkit-inner-spin-button { -webkit-appearance: none; } &:focus { outline: none; } }
    }
  `,
})
export class ProductoComponent {
  private readonly publico = inject(PublicoService);
  private readonly route = inject(ActivatedRoute);
  readonly carrito = inject(CarritoService);
  readonly zonas = EMPRESA.zonas.slice(0, 4).join(', ') + ' y más';
  readonly textos: Record<string, string> = { DISPONIBLE: '● En existencia', POCAS: '● Pocas piezas', AGOTADO: '● Agotado' };
  cantidad = 1;

  readonly datos$ = this.route.paramMap.pipe(
    map((p) => p.get('sku') ?? ''),
    tap(() => (this.cantidad = 1)),
    switchMap((sku) =>
      this.publico.producto(sku).pipe(catchError(() => of({ producto: null as MaterialCatalogo | null, relacionados: [] as MaterialCatalogo[] }))),
    ),
  );

  agregar(p: MaterialCatalogo): void {
    this.carrito.agregarConAviso(p, Math.max(1, Math.floor(this.cantidad || 1)));
  }
}
