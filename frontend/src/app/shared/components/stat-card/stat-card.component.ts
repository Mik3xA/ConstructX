import { Component, Input } from '@angular/core';

/** Tarjeta de KPI. `tono`: normal (ámbar), primario (naranja) o alerta (merma). */
@Component({
  selector: 'cx-stat-card',
  standalone: true,
  template: `
    <div class="stat" [class.stat--alerta]="tono === 'alerta'" [class.stat--primario]="tono === 'primario'">
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
      gap: 0.3rem;
      height: 100%;

      &::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
        background: var(--accent-amber);
        opacity: 0.8;
      }

      &__valor {
        font-family: $font-display;
        font-size: clamp(1.5rem, 2.4vw, 2rem);
        font-weight: 800;
        line-height: 1.15;
        letter-spacing: -0.02em;
        small { font-size: 0.95rem; color: var(--text-muted); margin-left: 2px; font-weight: 600; }
      }

      &__detalle { font-size: 0.8rem; color: var(--text-muted); }

      &--primario::before { background: var(--primary-orange); }
      &--primario .stat__valor { color: var(--primary-orange); }

      &--alerta {
        background: var(--danger-soft);
        border-color: color-mix(in srgb, var(--danger) 30%, transparent);
        &::before { background: var(--danger); }
        .stat__valor { color: var(--danger); }
      }
    }
  `,
})
export class StatCardComponent {
  @Input({ required: true }) etiqueta!: string;
  @Input({ required: true }) valor!: string | number | null;
  @Input() sufijo = '';
  @Input() detalle = '';
  @Input() tono: 'normal' | 'primario' | 'alerta' = 'normal';
}
