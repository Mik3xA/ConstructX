import { Component, Input, OnChanges } from '@angular/core';

const RESPALDO: Record<string, string> = {
  Cementantes: 'assets/materiales/cementantes.svg',
  Acero: 'assets/materiales/acero.svg',
  'Mampostería': 'assets/materiales/mamposteria.svg',
  Agregados: 'assets/materiales/agregados.svg',
};

/**
 * Imagen de producto con respaldo: si la URL remota falla (sin internet, enlace roto),
 * muestra una ilustración local según la categoría del material.
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
      (error)="usarRespaldo()"
      [class.is-fallback]="enRespaldo"
    />
  `,
  styles: `
    :host { display: block; overflow: hidden; background: var(--bg-subtle); }
    img { width: 100%; height: 100%; object-fit: cover; transition: transform 400ms ease; }
    img.is-fallback { object-fit: contain; padding: 14%; }
  `,
})
export class MaterialImgComponent implements OnChanges {
  @Input() url: string | null = null;
  @Input() categoria = '';
  @Input() alt = '';

  src = '';
  enRespaldo = false;

  ngOnChanges(): void {
    this.enRespaldo = !this.url;
    this.src = this.url || this.respaldo();
  }

  usarRespaldo(): void {
    if (this.enRespaldo) return;
    this.enRespaldo = true;
    this.src = this.respaldo();
  }

  private respaldo(): string {
    return RESPALDO[this.categoria] ?? 'assets/materiales/general.svg';
  }
}
