import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EMPRESA } from '../../../core/data/empresa';
import { IMAGENES } from '../../../core/data/imagenes';
import { PublicoService } from '../../../core/services/publico.service';
import { FotoComponent } from '../../../shared/components/foto/foto.component';

@Component({
  selector: 'cx-nosotros',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, RouterLink, FotoComponent],
  template: `
    <section class="page-banner page-banner--tall">
      <cx-foto class="page-banner__img" [src]="img.camionTierra" alt="Camión de volteo en obra" [prioridad]="true" />
      <div class="page-banner__shade"></div>
      <div class="wrap page-banner__txt">
        <nav class="crumbs"><a routerLink="/">Inicio</a><span>/</span><span>Nosotros</span></nav>
        <h1>Abastecemos las obras que construyen la ciudad</h1>
        <p>Desde {{ empresa.fundacion }} llevamos material de construcción a contratistas, constructoras y familias que construyen su casa.</p>
      </div>
    </section>

    <section class="wrap historia">
      <div class="historia__txt">
        <span class="eyebrow">Nuestra historia</span>
        <h2>De un patio de materiales a una plataforma digital</h2>
        <p>ConstructX nació como un pequeño patio de materiales en la zona industrial de Monterrey. Con los años crecimos junto a nuestros clientes: sumamos camiones propios, un almacén central y un equipo de asesores que conoce la obra porque viene de ella.</p>
        <p>Hoy combinamos ese conocimiento con tecnología: tu pedido, tu flete y tu recibo en línea, y para las constructoras, control de materiales por obra para evitar mermas.</p>
        <div class="historia__cifras">
          <div><strong class="mono">+{{ anios }}</strong><span>años</span></div>
          @if (info$ | async; as info) {
            <div><strong class="mono">{{ info.cifras.fletes_entregados | number }}</strong><span>fletes entregados</span></div>
          }
          <div><strong class="mono">{{ empresa.zonas.length }}</strong><span>municipios</span></div>
        </div>
      </div>
      <div class="historia__fotos">
        <cx-foto class="f1" [src]="img.supervisor" alt="Supervisor de obra con casco" />
        <cx-foto class="f2" [src]="img.block" alt="Block de concreto apilado" />
        <cx-foto class="f3" [src]="img.revolvedora" alt="Camión revolvedor" />
      </div>
    </section>

    <section class="wrap section">
      <div class="mvv">
        @for (c of mvv; track c.titulo) {
          <article class="mvv__card">
            <span class="mvv__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="c.icono" /></svg></span>
            <h3>{{ c.titulo }}</h3>
            <p>{{ c.texto }}</p>
          </article>
        }
      </div>
    </section>

    <section class="wrap section">
      <header class="section__head"><div><span class="eyebrow">Lo que nos mueve</span><h2>Nuestros valores</h2></div></header>
      <div class="valores">
        @for (v of valores; track v.titulo; let i = $index) {
          <div class="valor"><span class="valor__n mono">0{{ i + 1 }}</span><strong>{{ v.titulo }}</strong><span>{{ v.texto }}</span></div>
        }
      </div>
    </section>

    <section class="wrap section">
      <div class="cobertura">
        <div>
          <span class="eyebrow">Cobertura</span>
          <h2>Entregamos en toda la zona metropolitana</h2>
          <p class="muted">Programamos tu flete según el avance de tu obra. Para otras ciudades, consúltanos.</p>
          <a class="btn btn--primary" routerLink="/contacto">Consultar mi zona</a>
        </div>
        <ul class="zonas">
          @for (z of empresa.zonas; track z) { <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>{{ z }}</li> }
        </ul>
      </div>
    </section>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;
    .page-banner--tall { min-height: 340px; }
    svg { fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }

    .historia {
      display: grid; gap: 2rem; padding-top: 3rem; align-items: center;
      @include lg { grid-template-columns: 1fr 1fr; }
      &__txt { h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); margin: 0.3rem 0 1rem; } p { color: var(--text-muted); line-height: 1.7; } }
      &__cifras { display: flex; gap: 2rem; margin-top: 1.5rem;
        div { display: flex; flex-direction: column; } strong { font-size: 2rem; color: var(--primary-orange); } span { color: var(--text-muted); font-size: 0.85rem; } }
      &__fotos {
        display: grid; gap: 0.75rem; grid-template-columns: 1.2fr 1fr; grid-template-rows: 180px 180px;
        cx-foto { border-radius: $radius-lg; }
        .f1 { grid-row: 1 / 3; }
      }
    }
    .mvv { display: grid; gap: 1rem; @include md { grid-template-columns: repeat(3, 1fr); }
      &__card { padding: 1.75rem; border-radius: $radius-lg; background: var(--surface); border: 1px solid var(--border);
        h3 { font-size: 1.25rem; margin: 0.75rem 0 0.5rem; } p { margin: 0; color: var(--text-muted); line-height: 1.6; } }
      &__icon { display: grid; place-items: center; width: 50px; height: 50px; border-radius: $radius; background: var(--primary-soft); color: var(--primary-orange);
        svg { width: 24px; height: 24px; } }
    }
    .valores { display: grid; gap: 1rem; @include md { grid-template-columns: repeat(2, 1fr); } @include lg { grid-template-columns: repeat(4, 1fr); } }
    .valor { display: flex; flex-direction: column; gap: 0.3rem; padding: 1.25rem; border-left: 3px solid var(--primary-orange); background: var(--surface); border-radius: 0 $radius $radius 0;
      &__n { color: var(--accent-amber); font-weight: 700; } strong { font-family: $font-display; font-size: 1.05rem; } span:last-child { color: var(--text-muted); font-size: 0.88rem; } }
    .cobertura { display: grid; gap: 2rem; padding: 2rem; border-radius: $radius-lg; background: var(--surface); border: 1px solid var(--border);
      @include lg { grid-template-columns: 1fr 1.2fr; align-items: center; padding: 2.5rem; }
      h2 { font-size: 1.7rem; margin: 0.3rem 0 0.5rem; } p { margin: 0 0 1.25rem; } }
    .zonas { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; grid-template-columns: repeat(2, 1fr);
      li { display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 0.9rem; border-radius: $radius; background: var(--surface-2); font-weight: 600; font-size: 0.9rem;
        svg { width: 18px; height: 18px; color: var(--primary-orange); flex-shrink: 0; } } }
  `,
})
export class NosotrosComponent {
  readonly empresa = EMPRESA;
  readonly img = IMAGENES;
  readonly anios = new Date().getFullYear() - EMPRESA.fundacion;
  readonly info$ = inject(PublicoService).info$;

  readonly mvv = [
    { titulo: 'Misión', texto: 'Abastecer cada obra con material de calidad, a tiempo y al mejor precio, para que nuestros clientes construyan sin contratiempos.', icono: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    { titulo: 'Visión', texto: 'Ser la plataforma de materiales de construcción de mayor confianza del noreste, combinando servicio cercano y tecnología.', icono: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
    { titulo: 'Compromiso', texto: 'Cuidar cada bulto de tu presupuesto: entregas completas, precios claros y control para evitar desperdicios en obra.', icono: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z' },
  ];

  readonly valores = [
    { titulo: 'Puntualidad', texto: 'Tu obra no se detiene: entregamos en la fecha acordada.' },
    { titulo: 'Transparencia', texto: 'Precios, flete y estado de tu pedido siempre a la vista.' },
    { titulo: 'Calidad', texto: 'Material de proveedores certificados y bien almacenado.' },
    { titulo: 'Cercanía', texto: 'Asesores que te ayudan a cuantificar y planear tu obra.' },
  ];
}
