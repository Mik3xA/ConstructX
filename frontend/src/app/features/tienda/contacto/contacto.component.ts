import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPRESA } from '../../../core/data/empresa';
import { IMAGENES } from '../../../core/data/imagenes';
import { AuthService } from '../../../core/services/auth.service';
import { PublicoService } from '../../../core/services/publico.service';
import { mensajeError } from '../../../core/utils/http-error';
import { FotoComponent } from '../../../shared/components/foto/foto.component';

@Component({
  selector: 'cx-contacto',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FotoComponent],
  template: `
    <section class="page-banner">
      <cx-foto class="page-banner__img" [src]="img.supervisor" alt="" [prioridad]="true" />
      <div class="page-banner__shade"></div>
      <div class="wrap page-banner__txt">
        <nav class="crumbs"><a routerLink="/">Inicio</a><span>/</span><span>Contacto</span></nav>
        <h1>Hablemos de tu obra</h1>
        <p>Cotizaciones por volumen, dudas de pedidos o facturación. Te respondemos en menos de un día hábil.</p>
      </div>
    </section>

    <div class="wrap layout">
      <section class="card form-card">
        @if (enviado) {
          <div class="ok" data-testid="contacto-ok">
            <div class="ok__icon" aria-hidden="true">✓</div>
            <h2>¡Mensaje enviado!</h2>
            <p class="muted">Gracias, {{ enviado }}. Un asesor te contactará muy pronto.</p>
            <button type="button" class="btn btn--ghost" (click)="enviado = ''">Enviar otro mensaje</button>
          </div>
        } @else {
          <h2>Envíanos un mensaje</h2>
          <form [formGroup]="form" (ngSubmit)="enviar()" class="form">
            <div class="grid2">
              <div class="field"><label for="c-nombre">Nombre</label><input id="c-nombre" class="input" formControlName="nombre" autocomplete="name" /></div>
              <div class="field"><label for="c-tel">Teléfono (opcional)</label><input id="c-tel" class="input" type="tel" formControlName="telefono" autocomplete="tel" /></div>
            </div>
            <div class="field"><label for="c-email">Correo</label><input id="c-email" class="input" type="email" formControlName="email" autocomplete="email" /></div>
            <div class="field">
              <label for="c-asunto">Asunto</label>
              <select id="c-asunto" class="select" formControlName="asunto">
                @for (a of asuntos; track a) { <option [value]="a">{{ a }}</option> }
              </select>
            </div>
            <div class="field"><label for="c-msg">Mensaje</label><textarea id="c-msg" class="textarea" rows="5" formControlName="mensaje" placeholder="Cuéntanos qué necesitas, cantidades aproximadas y la ubicación de tu obra."></textarea></div>
            @if (error) { <div class="banner banner--error">{{ error }}</div> }
            <button class="btn btn--primary btn--lg" type="submit" [disabled]="enviando">{{ enviando ? 'Enviando…' : 'Enviar mensaje' }}</button>
          </form>
        }
      </section>

      <aside class="info">
        @for (i of datos; track i.titulo) {
          <div class="info__item">
            <span class="info__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="i.icono" /></svg></span>
            <div><strong>{{ i.titulo }}</strong>
              @if (i.link) { <a [href]="i.link">{{ i.valor }}</a> } @else { <span>{{ i.valor }}</span> }
            </div>
          </div>
        }
        <div class="mapa" aria-label="Ubicación del almacén">
          <div class="mapa__pin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg></div>
          <span>Almacén central · Parque Industrial, Monterrey</span>
        </div>
      </aside>
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;
    svg { fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
    .layout { display: grid; gap: 1.5rem; padding-top: 2rem; @include lg { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); } }
    .form-card { padding: 1.75rem; h2 { font-size: 1.4rem; margin-bottom: 1rem; } }
    .form { display: flex; flex-direction: column; gap: 1rem; }
    .grid2 { display: grid; gap: 1rem; @include md { grid-template-columns: 1fr 1fr; } }
    .ok { text-align: center; padding: 2rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
      &__icon { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-olive-soft); color: var(--accent-olive); font-size: 2rem; font-weight: 800; }
      p { margin: 0 0 0.75rem; } }
    .info { display: flex; flex-direction: column; gap: 0.75rem;
      &__item { display: flex; gap: 0.9rem; padding: 1rem 1.1rem; border-radius: $radius; background: var(--surface); border: 1px solid var(--border);
        div { display: flex; flex-direction: column; font-size: 0.9rem; } span, a { color: var(--text-muted); } a:hover { color: var(--primary-orange); } }
      &__icon { flex-shrink: 0; display: grid; place-items: center; width: 42px; height: 42px; border-radius: $radius; background: var(--primary-soft); color: var(--primary-orange); svg { width: 20px; height: 20px; } }
    }
    .mapa { position: relative; min-height: 180px; border-radius: $radius-lg; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem;
      color: var(--text-muted); font-size: 0.85rem; border: 1px solid var(--border);
      background: linear-gradient(var(--border) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, var(--border) 1px, transparent 1px) 0 0 / 28px 28px, var(--surface-2);
      &__pin { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; background: var(--primary-orange); color: #fff; box-shadow: 0 0 0 10px var(--primary-soft); svg { width: 26px; height: 26px; } } }
  `,
})
export class ContactoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly publico = inject(PublicoService);
  private readonly auth = inject(AuthService);
  readonly img = IMAGENES;

  readonly asuntos = ['Cotización por volumen', 'Duda sobre un pedido', 'Facturación', 'Información general'];
  readonly datos = [
    { titulo: 'Teléfono', valor: EMPRESA.telefono, link: EMPRESA.telefonoLink, icono: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z' },
    { titulo: 'WhatsApp', valor: EMPRESA.whatsapp, link: EMPRESA.whatsappLink, icono: 'M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20l1.3-5.2A8.5 8.5 0 1 1 21 11.5z' },
    { titulo: 'Correo', valor: EMPRESA.email, link: 'mailto:' + EMPRESA.email, icono: 'M4 4h16v16H4zM4 6l8 7 8-7' },
    { titulo: 'Almacén', valor: EMPRESA.direccion, link: '', icono: 'M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm6 12V12h6v9' },
    { titulo: 'Horario', valor: EMPRESA.horario, link: '', icono: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 7v5l3 2' },
  ];

  readonly form = this.fb.nonNullable.group({
    nombre: [this.auth.user?.nombre ?? '', Validators.required],
    email: [this.auth.user?.email ?? '', [Validators.required, Validators.email]],
    telefono: [this.auth.user?.telefono ?? ''],
    asunto: ['Cotización por volumen'],
    mensaje: ['', [Validators.required, Validators.minLength(10)]],
  });

  enviando = false;
  enviado = '';
  error = '';

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revisa tu nombre, correo y que el mensaje tenga al menos 10 caracteres.';
      return;
    }
    this.enviando = true;
    this.error = '';
    const v = this.form.getRawValue();
    this.publico.contacto(v).subscribe({
      next: () => {
        this.enviado = v.nombre.split(' ')[0];
        this.enviando = false;
        this.form.patchValue({ mensaje: '' });
        this.form.markAsUntouched();
      },
      error: (e) => {
        this.error = mensajeError(e);
        this.enviando = false;
      },
    });
  }
}
