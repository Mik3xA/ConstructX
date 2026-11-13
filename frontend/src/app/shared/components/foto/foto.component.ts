import { Component, Input, OnChanges } from '@angular/core';
import { picsum } from '../../../core/data/imagenes';

/**
 * Fotografía de ambientación (banners, secciones).
 * Cadena de respaldo: foto principal → foto real aleatoria (Picsum) → degradado cálido.
 * Lleva un ligero ajuste de color para que cualquier foto combine con la paleta.
 */
@Component({
  selector: 'cx-foto',
  standalone: true,
  template: `
    @if (src) {
      <img [src]="src" [alt]="alt" [attr.loading]="prioridad ? 'eager' : 'lazy'" decoding="async"
           referrerpolicy="no-referrer" (load)="cargada = true" (error)="siguiente()" [class.is-loaded]="cargada" />
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(120% 90% at 100% 100%, color-mix(in srgb, var(--primary-orange) 55%, transparent), transparent 60%),
        radial-gradient(90% 80% at 0% 0%, color-mix(in srgb, var(--accent-amber) 45%, transparent), transparent 60%),
        #2b2520;
    }
    img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      opacity: 0; transition: opacity 500ms ease;
      filter: saturate(0.9) sepia(0.1) contrast(1.03);
      &.is-loaded { opacity: 1; }
    }
  `,
})
export class FotoComponent implements OnChanges {
  @Input({ required: true }) foto!: string;
  @Input() alt = '';
  @Input() prioridad = false;

  src = '';
  cargada = false;
  private candidatos: string[] = [];

  ngOnChanges(): void {
    this.candidatos = [this.foto, picsum(this.alt || this.foto, 1600, 1000)].filter(Boolean);
    this.cargada = false;
    this.src = this.candidatos.shift() ?? '';
  }

  siguiente(): void {
    this.cargada = false;
    this.src = this.candidatos.shift() ?? ''; // sin más fuentes: queda el degradado
  }
}
