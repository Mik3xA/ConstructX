/**
 * Fotografías reales para banners y categorías.
 *
 * Fuente principal: LoremFlickr (fotos reales de Flickr por palabra clave; `lock` fija la foto).
 * Si una foto no carga, los componentes `cx-foto` y `cx-material-img` prueban Picsum
 * (fotos reales aleatorias) y solo al final muestran un respaldo visual.
 */
export const flickr = (palabras: string, lock: number, w = 1600, h = 900) =>
  `https://loremflickr.com/${w}/${h}/${palabras}?lock=${lock}`;

/** Foto real aleatoria pero estable para una semilla (respaldo universal). */
export const picsum = (semilla: string, w = 1200, h = 800) =>
  `https://picsum.photos/seed/constructx-${encodeURIComponent(semilla)}/${w}/${h}`;

export const IMAGENES = {
  heroFletes: flickr('dump,truck,construction', 201),
  heroCemento: flickr('cement,bags', 202),
  heroAcero: flickr('rebar,construction,site', 203),
  camionesArena: flickr('trucks,sand,quarry', 204),
  camionTierra: flickr('construction,truck', 205, 1200, 800),
  revolvedora: flickr('concrete,mixer,truck', 206, 1200, 800),
  supervisor: flickr('construction,worker,helmet', 207, 1200, 800),
  block: flickr('concrete,blocks', 208, 1200, 800),
  ladrillo: flickr('bricks,pallet', 209, 1200, 800),
  madera: flickr('lumber,yard', 210, 1200, 800),
  grava: flickr('gravel,pile', 211, 1200, 800),
  arenaObra: flickr('sand,construction', 212, 1200, 800),
};

/** Foto representativa por categoría del catálogo. */
export const IMAGEN_CATEGORIA: Record<string, string> = {
  Cementantes: flickr('cement,bags,warehouse', 221, 900, 1100),
  Acero: flickr('rebar,steel,bars', 222, 900, 1100),
  'Mampostería': flickr('bricks,wall,construction', 223, 900, 1100),
  Agregados: flickr('gravel,sand,pile', 224, 900, 1100),
  'Madera y cimbra': flickr('lumber,wood,planks', 225, 900, 1100),
};
