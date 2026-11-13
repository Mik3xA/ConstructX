import { Component, Input } from '@angular/core';

/**
 * Barra de progreso. Puede mostrar un marcador de referencia (p. ej. el avance de obra)
 * sobre la barra de consumo. Azul = sano; Naranja = alerta.
 */
@Component({
  selector: 'bs-progress-bar',
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
    @use 'variables' as *;

    :host { display: block; }

    .bar {
      position: relative;
      height: 8px;
      border-radius: 999px;
      background: $white-08;

      &__fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, $blue-600, $blue-400);
        transition: width 400ms ease;
      }

      &__marker {
        position: absolute;
        top: -4px;
        bottom: -4px;
        width: 2px;
        margin-left: -1px;
        background: $white;
        border-radius: 2px;
        box-shadow: 0 0 0 2px $charcoal-900;
      }

      &--alerta .bar__fill {
        background: linear-gradient(90deg, $orange-600, $orange-400);
        box-shadow: 0 0 12px $orange-glow;
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
