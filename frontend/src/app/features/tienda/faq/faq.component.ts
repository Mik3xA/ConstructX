import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPRESA } from '../../../core/data/empresa';
import { IMAGENES } from '../../../core/data/imagenes';
import { FotoComponent } from '../../../shared/components/foto/foto.component';

interface Pregunta {
  p: string;
  r: string;
}

const FAQ: Array<{ tema: string; preguntas: Pregunta[] }> = [
  {
    tema: 'Pedidos',
    preguntas: [
      { p: '¿Necesito una cuenta para comprar?', r: 'Puedes explorar el catálogo y armar tu carrito sin cuenta. Al confirmar te pedimos registrarte (toma un minuto) para guardar la dirección de tu obra, enviarte el recibo y que puedas seguir tu flete.' },
      { p: '¿Hay un pedido mínimo?', r: 'No hay mínimo de compra. El costo del flete se calcula al instante en tu carrito y es gratis en pedidos desde $25,000.' },
      { p: '¿Puedo pedir por volumen para una obra grande?', r: 'Sí. Escríbenos desde la página de contacto o llámanos y te armamos una cotización por volumen con entregas programadas por etapas.' },
      { p: '¿Cómo sé que mi pedido fue recibido?', r: 'Al confirmar ves tu número de folio en pantalla y te llega un recibo a tu correo con el detalle de materiales, flete y total.' },
    ],
  },
  {
    tema: 'Entregas y fletes',
    preguntas: [
      { p: '¿Cuánto cuesta el flete?', r: 'El flete es de $450 más el 3% del valor de los materiales, y es gratis en pedidos desde $25,000. Siempre lo ves antes de confirmar.' },
      { p: '¿En qué zonas entregan?', r: 'Entregamos en ' + EMPRESA.zonas.join(', ') + '. Para otras localidades consúltanos.' },
      { p: '¿Cómo sigo mi flete?', r: 'En "Mis pedidos" ves el estado en tiempo real: Recibido, En ruta (con nombre del chofer y unidad) y Entregado. También te avisamos en pantalla cuando cambia.' },
      { p: '¿Qué necesito para recibir el material?', r: 'Que haya alguien en la obra para recibir y un acceso donde el camión pueda maniobrar. Puedes dejar indicaciones para el chofer al confirmar tu pedido.' },
    ],
  },
  {
    tema: 'Pagos y facturación',
    preguntas: [
      { p: '¿Cómo se paga?', r: 'Pagas contra entrega, al recibir tu material completo, en efectivo, transferencia o tarjeta con terminal.' },
      { p: '¿Los precios incluyen IVA?', r: 'Los precios del catálogo se muestran sin IVA. Tu factura incluye el desglose correspondiente.' },
      { p: '¿Emiten factura?', r: 'Sí, emitimos factura electrónica. Solicítala al recibir tu material o escríbenos con tu folio de pedido.' },
    ],
  },
  {
    tema: 'Productos',
    preguntas: [
      { p: '¿Qué significa "Pocas piezas"?', r: 'Que el producto tiene existencia limitada en almacén. Al confirmar, el sistema verifica el inventario en tiempo real y te avisa si algo ya no alcanza.' },
      { p: '¿Puedo devolver material?', r: 'Aceptamos devoluciones de material en buen estado y empaque original dentro de los 7 días posteriores a la entrega. Los agregados a granel no tienen devolución.' },
      { p: '¿Me ayudan a calcular cuánto material necesito?', r: 'Sí, nuestros asesores te ayudan sin costo a cuantificar cemento, varilla, block y agregados para tu obra.' },
    ],
  },
];

@Component({
  selector: 'cx-faq',
  standalone: true,
  imports: [FormsModule, RouterLink, FotoComponent],
  template: `
    <section class="page-banner">
      <cx-foto class="page-banner__img" [foto]="img.camionesArena" alt="" [prioridad]="true" />
      <div class="page-banner__shade"></div>
      <div class="wrap page-banner__txt">
        <nav class="crumbs"><a routerLink="/">Inicio</a><span>/</span><span>Preguntas frecuentes</span></nav>
        <h1>Preguntas frecuentes</h1>
        <p>Todo lo que necesitas saber sobre pedidos, fletes, pagos y productos.</p>
      </div>
    </section>

    <div class="wrap layout">
      <div>
        <div class="buscar">
          <input class="input" type="search" placeholder="Busca tu duda: flete, factura, devolución…" [(ngModel)]="filtro" aria-label="Buscar en preguntas frecuentes" />
        </div>
        @for (g of grupos; track g.tema) {
          <section class="grupo">
            <h2>{{ g.tema }}</h2>
            @for (q of g.preguntas; track q.p) {
              <details class="qa" data-testid="faq">
                <summary>{{ q.p }}<span class="qa__icon" aria-hidden="true">+</span></summary>
                <p>{{ q.r }}</p>
              </details>
            }
          </section>
        } @empty {
          <p class="muted">No encontramos preguntas con “{{ filtro }}”. <a routerLink="/contacto">Escríbenos</a> y te respondemos.</p>
        }
      </div>

      <aside class="ayuda">
        <h3>¿No encontraste tu respuesta?</h3>
        <p>Nuestro equipo te atiende {{ empresa.horario }}.</p>
        <a class="btn btn--primary btn--block" routerLink="/contacto">Enviar un mensaje</a>
        <a class="btn btn--ghost btn--block" [href]="empresa.telefonoLink">Llamar al {{ empresa.telefono }}</a>
      </aside>
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;
    .layout { display: grid; gap: 2rem; padding-top: 2rem; @include lg { grid-template-columns: minmax(0, 1fr) 320px; } }
    .buscar { margin-bottom: 1.5rem; .input { height: 50px; border-radius: 999px; padding: 0 1.25rem; } }
    .grupo { margin-bottom: 2rem; h2 { font-size: 1.2rem; margin-bottom: 0.75rem; color: var(--primary-orange); } }
    .qa {
      background: var(--surface); border: 1px solid var(--border); border-radius: $radius; margin-bottom: 0.6rem; transition: border-color $transition;
      &[open] { border-color: color-mix(in srgb, var(--primary-orange) 40%, transparent); .qa__icon { transform: rotate(45deg); color: var(--primary-orange); } }
      summary { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem 1.15rem; cursor: pointer; font-weight: 700; list-style: none;
        &::-webkit-details-marker { display: none; } &:hover { color: var(--primary-orange); } }
      &__icon { font-size: 1.4rem; line-height: 1; color: var(--text-faint); transition: transform $transition; }
      p { margin: 0; padding: 0 1.15rem 1.1rem; color: var(--text-muted); line-height: 1.65; }
    }
    .ayuda { align-self: start; position: sticky; top: 140px; padding: 1.5rem; border-radius: $radius-lg; background: var(--primary-soft);
      display: flex; flex-direction: column; gap: 0.6rem; h3 { font-size: 1.2rem; } p { margin: 0 0 0.4rem; color: var(--text-muted); font-size: 0.9rem; } }
  `,
})
export class FaqComponent {
  readonly empresa = EMPRESA;
  readonly img = IMAGENES;
  filtro = '';

  get grupos() {
    const f = this.normalizar(this.filtro.trim());
    if (!f) return FAQ;
    return FAQ.map((g) => ({ ...g, preguntas: g.preguntas.filter((q) => this.normalizar(q.p + ' ' + q.r).includes(f)) })).filter(
      (g) => g.preguntas.length,
    );
  }

  private normalizar(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
}
