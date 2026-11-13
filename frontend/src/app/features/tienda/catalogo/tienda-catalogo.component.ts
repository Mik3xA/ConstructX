import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, shareReplay, switchMap } from 'rxjs';
import { IMAGENES, IMAGEN_CATEGORIA } from '../../../core/data/imagenes';
import { MaterialCatalogo } from '../../../core/models/models';
import { CarritoService } from '../../../core/services/carrito.service';
import { PublicoService } from '../../../core/services/publico.service';
import { FotoComponent } from '../../../shared/components/foto/foto.component';
import { ProductoCardComponent } from '../../../shared/components/producto-card/producto-card.component';

type Orden = 'relevancia' | 'precio-asc' | 'precio-desc' | 'nombre';

/** Catálogo público con filtros por categoría, búsqueda y orden (estado en la URL). */
@Component({
  selector: 'cx-tienda-catalogo',
  standalone: true,
  imports: [AsyncPipe, FormsModule, RouterLink, FotoComponent, ProductoCardComponent],
  template: `
    @if (filtros$ | async; as f) {
    <section class="page-banner">
      <cx-foto class="page-banner__img" [src]="banner(f.categoria)" alt="" [prioridad]="true" />
      <div class="page-banner__shade"></div>
      <div class="wrap page-banner__txt">
        <nav class="crumbs" aria-label="Ruta"><a routerLink="/">Inicio</a><span>/</span><a routerLink="/catalogo">Productos</a>
          @if (f.categoria) { <span>/</span><span>{{ f.categoria }}</span> }</nav>
        <h1>{{ f.categoria || 'Catálogo de materiales' }}</h1>
        <p>Precios por unidad en MXN sin IVA. Arma tu carrito sin cuenta; te pedimos registrarte solo al confirmar.</p>
      </div>
    </section>

    <div class="wrap layout">
      <aside class="filters">
        <h2 class="eyebrow">Categorías</h2>
        <a class="filters__item" [class.is-active]="!f.categoria" [routerLink]="[]" [queryParams]="{ categoria: null }" queryParamsHandling="merge">Todos los productos</a>
        @for (c of categorias$ | async; track c) {
          <a class="filters__item" [class.is-active]="f.categoria === c" [routerLink]="[]" [queryParams]="{ categoria: c }" queryParamsHandling="merge">{{ c }}</a>
        }
        <div class="filters__help">
          <strong>¿No encuentras algo?</strong>
          <span>Manejamos más productos bajo pedido.</span>
          <a routerLink="/contacto">Pregúntanos →</a>
        </div>
      </aside>

      <section class="results">
        <div class="toolbar">
          <span class="muted" data-testid="conteo">
            @if (vista$ | async; as v) { {{ v.length }} producto(s) }
            @if (f.q) { para “<b>{{ f.q }}</b>” <a [routerLink]="[]" [queryParams]="{ q: null }" queryParamsHandling="merge">limpiar</a> }
          </span>
          <label class="sort">
            <span>Ordenar por</span>
            <select class="select" [ngModel]="f.orden" (ngModelChange)="ordenar($event)" aria-label="Ordenar productos">
              <option value="relevancia">Más vendidos</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre</option>
            </select>
          </label>
        </div>

        @if (vista$ | async; as productos) {
          <div class="products products--3">
            @for (m of productos; track m.id) {
              <cx-producto-card [m]="m" (agregar)="carrito.agregarConAviso($event, 1)" />
            } @empty {
              <div class="empty card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <p>No encontramos productos con esos filtros.</p>
                <a class="btn btn--soft" routerLink="/catalogo">Ver todo el catálogo</a>
              </div>
            }
          </div>
        } @else {
          <div class="products products--3">@for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="skeleton" style="height: 380px"></div> }</div>
        }
      </section>
    </div>
    }
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;
    .layout { display: grid; gap: 1.5rem; padding-top: 2rem; @include lg { grid-template-columns: 240px minmax(0, 1fr); } }
    .filters {
      display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.25rem;
      @include lg { flex-direction: column; overflow: visible; position: sticky; top: 140px; align-self: start; }
      h2 { display: none; @include lg { display: block; margin-bottom: 0.4rem; } }
      &__item {
        flex-shrink: 0; padding: 0.55rem 0.9rem; border-radius: 999px; color: var(--text); font-weight: 600; font-size: 0.9rem;
        border: 1px solid var(--border-strong); background: var(--surface); white-space: nowrap;
        @include lg { border: 0; background: none; border-radius: $radius-sm; }
        &:hover { color: var(--primary-orange); }
        &.is-active { background: var(--primary-soft); color: var(--primary-orange); border-color: transparent; }
      }
      &__help {
        display: none; margin-top: 1.25rem; padding: 1rem; border-radius: $radius; background: var(--surface); border: 1px solid var(--border);
        flex-direction: column; gap: 0.2rem; font-size: 0.85rem; span { color: var(--text-muted); }
        @include lg { display: flex; }
      }
    }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .sort { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-muted); .select { width: auto; height: 40px; } }
    .products--3 { @include lg { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .empty { grid-column: 1 / -1; }
  `,
})
export class TiendaCatalogoComponent {
  private readonly publico = inject(PublicoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly carrito = inject(CarritoService);

  /** Los filtros viven en la URL (se pueden compartir y usar con "atrás"). */
  readonly filtros$ = this.route.queryParamMap.pipe(
    map((p) => ({
      categoria: p.get('categoria') ?? '',
      q: p.get('q') ?? '',
      orden: (p.get('orden') as Orden) ?? 'relevancia',
    })),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly categorias$ = this.publico.catalogo().pipe(map((c) => c.categorias));
  readonly vista$ = this.filtros$.pipe(
    switchMap((f) => this.publico.catalogo({ categoria: f.categoria, q: f.q }).pipe(map((c) => this.ordenarLista(c.materiales, f.orden)))),
  );

  banner(cat: string): string {
    return IMAGEN_CATEGORIA[cat] ?? IMAGENES.heroFletes;
  }

  ordenar(orden: Orden): void {
    this.router.navigate([], { queryParams: { orden: orden === 'relevancia' ? null : orden }, queryParamsHandling: 'merge' });
  }

  private ordenarLista(lista: MaterialCatalogo[], orden: Orden): MaterialCatalogo[] {
    const l = [...lista];
    switch (orden) {
      case 'precio-asc': return l.sort((a, b) => a.precio_unitario - b.precio_unitario);
      case 'precio-desc': return l.sort((a, b) => b.precio_unitario - a.precio_unitario);
      case 'nombre': return l.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      default: return l.sort((a, b) => (b.vendidos ?? 0) - (a.vendidos ?? 0));
    }
  }
}
