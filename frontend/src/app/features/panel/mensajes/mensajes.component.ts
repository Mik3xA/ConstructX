import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { map } from 'rxjs';
import { MensajeContacto } from '../../../core/models/models';
import { PanelService } from '../../../core/services/panel.service';
import { mensajeError } from '../../../core/utils/http-error';

/** Bandeja de mensajes del formulario de contacto (llegan en tiempo real). */
@Component({
  selector: 'cx-mensajes',
  standalone: true,
  imports: [AsyncPipe, DatePipe],
  template: `
    <div class="page">
      <header class="page__header">
        <div><span class="eyebrow">Administración</span><h1>Mensajes de contacto</h1><p>Solicitudes de cotización y dudas enviadas desde la tienda.</p></div>
        @if (sinLeer$ | async; as n) { <span class="chip chip--orange"><span class="dot dot--pulse"></span>{{ n }} sin leer</span> }
      </header>
      @if (error) { <div class="banner banner--error">{{ error }}</div> }
      <div class="lista">
        @for (m of mensajes$ | async; track m.id) {
          <article class="card msg" [class.is-new]="!m.leido" data-testid="mensaje">
            <header>
              <div><strong>{{ m.nombre }}</strong><span class="muted"> · {{ m.asunto }}</span></div>
              <span class="muted small">{{ m.created_at | date: 'd MMM, HH:mm' }}</span>
            </header>
            <p>{{ m.mensaje }}</p>
            <footer>
              <a class="btn btn--soft btn--sm" [href]="'mailto:' + m.email + '?subject=' + encode('Re: ' + m.asunto)">Responder por correo</a>
              @if (m.telefono) { <a class="btn btn--ghost btn--sm" [href]="'tel:' + m.telefono">Llamar {{ m.telefono }}</a> }
              <button type="button" class="btn btn--ghost btn--sm" (click)="marcar(m)">{{ m.leido ? 'Marcar como no leído' : 'Marcar como leído' }}</button>
            </footer>
          </article>
        } @empty {
          <div class="card empty"><p>No hay mensajes todavía.</p></div>
        }
      </div>
    </div>
  `,
  styles: `
    @use 'variables' as *;
    .small { font-size: 0.75rem; }
    .lista { display: flex; flex-direction: column; gap: 0.75rem; }
    .msg { display: flex; flex-direction: column; gap: 0.6rem; border-left: 4px solid var(--border);
      &.is-new { border-left-color: var(--primary-orange); }
      header { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
      p { margin: 0; line-height: 1.6; }
      footer { display: flex; gap: 0.5rem; flex-wrap: wrap; } }
  `,
})
export class MensajesComponent implements OnInit {
  private readonly panel = inject(PanelService);
  readonly mensajes$ = this.panel.mensajes$;
  readonly sinLeer$ = this.mensajes$.pipe(map((l) => l.filter((m) => !m.leido).length));
  error = '';

  ngOnInit(): void {
    this.panel.cargarMensajes().subscribe({ error: (e) => (this.error = mensajeError(e)) });
  }

  marcar(m: MensajeContacto): void {
    this.panel.marcarMensaje(m.id, !m.leido).subscribe({ error: (e) => (this.error = mensajeError(e)) });
  }

  encode(s: string): string {
    return encodeURIComponent(s);
  }
}
