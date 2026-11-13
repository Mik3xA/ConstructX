import { Component, Input } from '@angular/core';

/**
 * Fotografía de ambientación (banners, secciones). Si no carga, queda un degradado
 * cálido de respaldo: el diseño nunca se rompe.
 */
@Component({
  selector: 'cx-foto',
  standalone: true,
  template: `
    @if (!fallo) {
      <img [src]="src" [alt]="alt" [attr.loading]="prioridad ? 'eager' : 'lazy'" decoding="async"
           referrerpolicy="no-referrer" (error)="fallo = true" />
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
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `,
})
export class FotoComponent {
  @Input({ required: true }) src!: string;
  @Input() alt = '';
  @Input() prioridad = false;
  fallo = false;
}
