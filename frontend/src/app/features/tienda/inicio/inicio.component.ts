import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { EMPRESA } from '../../../core/data/empresa';
import { IMAGENES, IMAGEN_CATEGORIA } from '../../../core/data/imagenes';
import { MaterialCatalogo } from '../../../core/models/models';
import { CarritoService } from '../../../core/services/carrito.service';
import { PublicoService } from '../../../core/services/publico.service';
import { FotoComponent } from '../../../shared/components/foto/foto.component';
import { ProductoCardComponent } from '../../../shared/components/producto-card/producto-card.component';

interface Slide {
  imagen: string;
  eyebrow: string;
  titulo: string;
  texto: string;
  cta: { texto: string; ruta: string; params?: Record<string, string> };
}

/** Página de inicio de la tienda. */
@Component({
  selector: 'cx-inicio',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, RouterLink, FotoComponent, ProductoCardComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent implements OnInit, OnDestroy {
  private readonly publico = inject(PublicoService);
  readonly carrito = inject(CarritoService);
  readonly empresa = EMPRESA;
  readonly img = IMAGENES;
  readonly anios = new Date().getFullYear() - EMPRESA.fundacion;

  readonly slides: Slide[] = [
    {
      imagen: IMAGENES.heroFletes,
      eyebrow: 'Fletes a tu obra',
      titulo: 'Material de construcción, directo a tu obra',
      texto: 'Cemento, varilla, block y agregados con entrega programada en toda la zona metropolitana.',
      cta: { texto: 'Ver catálogo', ruta: '/catalogo' },
    },
    {
      imagen: IMAGENES.heroCemento,
      eyebrow: 'Cementantes',
      titulo: 'Cemento y mortero al mejor precio por volumen',
      texto: 'Bultos de 50 kg siempre en existencia. Flete gratis en pedidos desde $25,000.',
      cta: { texto: 'Comprar cementantes', ruta: '/catalogo', params: { categoria: 'Cementantes' } },
    },
    {
      imagen: IMAGENES.heroAcero,
      eyebrow: 'Acero de refuerzo',
      titulo: 'Varilla, malla y alambre para tus armados',
      texto: 'Acero grado 42 en piezas de 12 m. Te ayudamos a calcular lo que necesitas.',
      cta: { texto: 'Ver acero', ruta: '/catalogo', params: { categoria: 'Acero' } },
    },
  ];
  slide = 0;
  private timer?: ReturnType<typeof setInterval>;

  readonly categorias = [
    { nombre: 'Cementantes', texto: 'Cemento, mortero y cal' },
    { nombre: 'Acero', texto: 'Varilla, malla y alambre' },
    { nombre: 'Mampostería', texto: 'Block, tabique y tabicón' },
    { nombre: 'Agregados', texto: 'Arena y grava a granel' },
    { nombre: 'Madera y cimbra', texto: 'Polines y madera de pino' },
  ].map((c) => ({ ...c, imagen: IMAGEN_CATEGORIA[c.nombre] }));

  readonly beneficios = [
    { titulo: 'Entrega en obra', texto: 'Fletes con camión propio y fecha programada.', icono: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
    { titulo: 'Precios de mayoreo', texto: 'Mejores precios por volumen y obra recurrente.', icono: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01' },
    { titulo: 'Pago contra entrega', texto: 'Pagas cuando recibes tu material completo.', icono: 'M2 7h20v12H2zM2 11h20M6 15h4' },
    { titulo: 'Asesoría técnica', texto: 'Te ayudamos a cuantificar tu obra sin costo.', icono: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01' },
  ];

  readonly pasos = [
    { n: 1, titulo: 'Elige tu material', texto: 'Explora el catálogo y arma tu carrito sin necesidad de cuenta.' },
    { n: 2, titulo: 'Crea tu cuenta', texto: 'Solo tus datos y la dirección de tu obra. Toma un minuto.' },
    { n: 3, titulo: 'Confirma tu pedido', texto: 'Ves el costo del flete al instante y recibes tu recibo por correo.' },
    { n: 4, titulo: 'Recibe en obra', texto: 'Sigue tu flete en vivo: preparación, en ruta y entregado.' },
  ];

  readonly testimonios = [
    { texto: 'Pedí 300 bultos un martes y el jueves ya estaban en la obra. El seguimiento en línea nos ahorra muchas llamadas.', nombre: 'Ing. Roberto Salinas', rol: 'Residente, vivienda vertical' },
    { texto: 'Los precios por volumen y el flete gratis hicieron la diferencia en nuestro presupuesto de cimentación.', nombre: 'Arq. Daniela Cantú', rol: 'Despacho de arquitectura' },
    { texto: 'Me gusta que el recibo llega al correo y puedo ver todo mi historial de pedidos para la contabilidad.', nombre: 'Héctor Villarreal', rol: 'Contratista independiente' },
  ];

  /** Más vendidos primero. */
  readonly destacados$ = this.publico
    .catalogo()
    .pipe(map((c) => [...c.materiales].sort((a, b) => (b.vendidos ?? 0) - (a.vendidos ?? 0)).slice(0, 8)));

  readonly info$ = this.publico.info$;

  ngOnInit(): void {
    this.timer = setInterval(() => this.irA(this.slide + 1), 6500);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  irA(i: number): void {
    this.slide = (i + this.slides.length) % this.slides.length;
  }

  agregar(m: MaterialCatalogo): void {
    this.carrito.agregarConAviso(m, 1);
  }
}
