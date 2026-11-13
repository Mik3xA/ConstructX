import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

/** Contenedor de toasts animados (esquina inferior derecha). */
@Component({
  selector: 'cx-toast-container',
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  template: `
    <div class="toasts" aria-live="polite" aria-relevant="additions">
      @for (t of toasts.toasts$ | async; track t.id) {
        <div class="toast" [class]="'toast toast--' + t.tipo" role="status">
          <div class="toast__icon" aria-hidden="true">
            @switch (t.tipo) {
              @case ('pedido') {
                <svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" /></svg>
              }
              @case ('alerta') {
                <svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
              }
              @case ('exito') {
                <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
              }
              @default {
                <svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" /></svg>
              }
            }
          </div>
          <div class="toast__body">
            <strong>{{ t.titulo }}</strong>
            @if (t.mensaje) { <span>{{ t.mensaje }}</span> }
            @if (t.enlace) { <a [routerLink]="t.enlace" (click)="toasts.cerrar(t.id)">Ver detalle →</a> }
          </div>
          <button type="button" class="toast__close" (click)="toasts.cerrar(t.id)" aria-label="Cerrar notificación">×</button>
          <div class="toast__timer"></div>
        </div>
      }
    </div>
  `,
  styles: `
    @use 'variables' as *;

    // Móvil: sobre la barra de navegación inferior. Escritorio: arriba a la derecha (no tapa los botones de acción).
    .toasts {
      position: fixed;
      right: 0.75rem;
      bottom: calc(72px + env(safe-area-inset-bottom));
      left: 0.75rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.75rem;
      pointer-events: none;
      @media (min-width: $bp-md) {
        top: 1rem;
        bottom: auto;
        left: auto;
        right: 1.25rem;
        width: 400px;
      }
    }

    .toast {
      pointer-events: auto;
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.85rem;
      width: min(400px, 100%);
      padding: 1rem 1rem 1.1rem;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      border-left: 4px solid var(--accent);
      border-radius: $radius;
      box-shadow: var(--shadow-lg);
      animation: entrar 420ms cubic-bezier(0.2, 0.9, 0.25, 1.2) both;
      --accent: var(--accent-amber);

      &--pedido { --accent: var(--primary-orange); }
      &--alerta { --accent: var(--danger); }
      &--exito { --accent: var(--accent-olive); }

      &__icon {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--accent) 15%, transparent);
        color: var(--accent);
        svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      }
      &--pedido .toast__icon { animation: rebote 900ms ease 300ms 2; }

      &__body {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
        font-size: 0.86rem;
        strong { font-size: 0.95rem; }
        span { color: var(--text-muted); }
        a { font-weight: 700; margin-top: 0.2rem; font-size: 0.82rem; }
      }

      &__close {
        border: 0;
        background: transparent;
        color: var(--text-faint);
        font-size: 1.4rem;
        line-height: 1;
        cursor: pointer;
        align-self: start;
        &:hover { color: var(--text); }
      }

      &__timer {
        position: absolute;
        left: 0;
        bottom: 0;
        height: 3px;
        width: 100%;
        background: var(--accent);
        opacity: 0.5;
        transform-origin: left;
        animation: tiempo 6s linear forwards;
      }
    }

    @keyframes entrar {
      from { opacity: 0; transform: translateX(40px) scale(0.96); }
      to { opacity: 1; transform: none; }
    }
    @keyframes rebote {
      0%, 100% { transform: translateY(0); }
      40% { transform: translateY(-5px); }
    }
    @keyframes tiempo {
      to { transform: scaleX(0); }
    }
  `,
})
export class ToastContainerComponent {
  readonly toasts = inject(ToastService);
}
