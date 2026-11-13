import { Component, Input } from '@angular/core';

/**
 * Barra de progreso. Puede mostrar un marcador de referencia (p. ej. el avance de obra)
 * sobre la barra de consumo. Ámbar = sano; Naranja/rojo = alerta.
 */
@Component({
  selector: 'cx-progress-bar',
  standalone: true,
  template: `
    <div class="bar" [class.bar--alerta]="alerta" role="progressbar"
         [attr.aria-valuenow]="valor" aria-valuemin="0" aria-valuemax="100">
      <div class="bar__fill" [style.width.%]="limitar(valor)"></div>
      @if (marcador !== null) {
        <div class="bar__marker" [style.left.%]="limitar(marcador)" [attr.title]="'Referencia ' + marcador + '%'"></div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }

    .bar {
      position: relative;
      height: 8px;
      border-radius: 999px;
      background: var(--bg-subtle);

      &__fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--accent-amber), color-mix(in srgb, var(--accent-amber) 70%, var(--primary-orange)));
        transition: width 400ms ease;
      }

      &__marker {
        position: absolute;
        top: -4px;
        bottom: -4px;
        width: 3px;
        margin-left: -1.5px;
        background: var(--text);
        border-radius: 2px;
        box-shadow: 0 0 0 2px var(--surface);
      }

      &--alerta .bar__fill {
        background: linear-gradient(90deg, var(--primary-orange), var(--danger));
      }
    }
  `,
})
export class ProgressBarComponent {
  @Input() valor = 0;
  @Input() marcador: number | null = null;
  @Input() alerta = false;

  limitar(v: number): number {
    return Math.max(0, Math.min(100, v ?? 0));
  }
}
