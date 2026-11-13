import { Component, Input, OnChanges } from '@angular/core';
import { picsum } from '../../../core/data/imagenes';

const RESPALDO: Record<string, string> = {
  Cementantes: 'assets/materiales/cementantes.svg',
  Acero: 'assets/materiales/acero.svg',
  'Mampostería': 'assets/materiales/mamposteria.svg',
  Agregados: 'assets/materiales/agregados.svg',
};

/**
 * Foto del producto.
 * Cadena de respaldo: foto del catálogo (foto real por palabra clave) → foto real aleatoria
 * (Picsum, estable por producto) → ilustración local (solo si no hay internet).
 */
@Component({
  selector: 'cx-material-img',
  standalone: true,
  template: `
    <img
      [src]="src"
      [alt]="alt"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      (load)="cargada = true"
      (error)="siguiente()"
      [class.is-loaded]="cargada"
      [class.is-fallback]="enIlustracion"
    />
  `,
  styles: `
    :host {
      display: block;
      overflow: hidden;
      background: linear-gradient(110deg, var(--bg-subtle) 30%, var(--surface-hover) 50%, var(--bg-subtle) 70%);
      background-size: 200% 100%;
      animation: brillo 1.4s linear infinite;
    }
    img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      opacity: 0; transition: opacity 400ms ease, transform 400ms ease;
      // Ajuste de color suave para que fotos de distintas fuentes se vean de una misma familia
      filter: saturate(0.92) sepia(0.08) contrast(1.03);
      &.is-loaded { opacity: 1; }
    }
    img.is-fallback { object-fit: contain; padding: 14%; filter: none; }
    @keyframes brillo { to { background-position: -200% 0; } }
  `,
})
export class MaterialImgComponent implements OnChanges {
  @Input() url: string | null = null;
  @Input() categoria = '';
  @Input() alt = '';

  src = '';
  cargada = false;
  enIlustracion = false;
  private candidatos: string[] = [];

  ngOnChanges(): void {
    this.candidatos = [this.url ?? '', picsum(this.alt || this.categoria, 800, 600), RESPALDO[this.categoria] ?? 'assets/materiales/general.svg'].filter(
      Boolean,
    );
    this.cargada = false;
    this.enIlustracion = false;
    this.src = this.candidatos.shift()!;
  }

  siguiente(): void {
    const proximo = this.candidatos.shift();
    if (!proximo) return;
    this.cargada = false;
    this.enIlustracion = !proximo.startsWith('http');
    this.src = proximo;
  }
}
