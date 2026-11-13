import { Component, Input } from '@angular/core';

/** Tarjeta de KPI. `tono="alerta"` la pinta en naranja. */
@Component({
  selector: 'bs-stat-card',
  standalone: true,
  template: `
    <div class="stat" [class.stat--alerta]="tono === 'alerta'">
      <span class="eyebrow">{{ etiqueta }}</span>
      <div class="stat__valor mono">
        {{ valor }}<small>{{ sufijo }}</small>
      </div>
      @if (detalle) {
        <span class="stat__detalle">{{ detalle }}</span>
      }
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;

    :host { display: block; }

    .stat {
      @include card;
      position: relative;
      overflow: hidden;
      padding: 1.1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      height: 100%;

      &::after {
        content: '';
        position: absolute;
        inset: 0 0 auto 0;
        height: 2px;
        background: linear-gradient(90deg, $blue-500, transparent);
      }

      &__valor {
        font-size: 2rem;
        font-weight: 600;
        line-height: 1.1;
        small { font-size: 1rem; color: $white-60; margin-left: 2px; }
      }

      &__detalle { font-size: 0.8rem; color: $white-60; }

      &--alerta {
        border-color: rgba($orange-500, 0.35);
        background: linear-gradient(180deg, rgba($orange-500, 0.1), $charcoal-850 70%);
        &::after { background: linear-gradient(90deg, $orange-500, transparent); }
        .stat__valor { color: $orange-400; }
      }
    }
  `,
})
export class StatCardComponent {
  @Input({ required: true }) etiqueta!: string;
  @Input({ required: true }) valor!: string | number | null;
  @Input() sufijo = '';
  @Input() detalle = '';
  @Input() tono: 'normal' | 'alerta' = 'normal';
}
