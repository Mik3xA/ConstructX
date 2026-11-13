/**
 * Fotografías reales de Unsplash (licencia Unsplash: uso comercial gratuito, sin atribución obligatoria).
 * `/photos/<id>/download` redirige a la imagen en images.unsplash.com.
 * Todas las imágenes tienen respaldo visual si no cargan (sin internet, enlace caído).
 */
const unsplash = (id: string, w = 1600) => `https://unsplash.com/photos/${id}/download?w=${w}`;

export const IMAGENES = {
  heroFletes: unsplash('j9SBSppgoik'), // dos camiones de volteo en obra
  heroCemento: unsplash('rc5crEySTXo'), // estiba de bultos de cemento
  heroAcero: unsplash('PqRvLsjD_TU'), // armado de varilla en obra
  camionesArena: unsplash('WjL4UQ5_T4g'), // camiones de volteo en banco de arena
  camionTierra: unsplash('uGEIMh-5MJw', 1200), // camión de volteo en obra
  revolvedora: unsplash('-UGWA7ETrSY', 1200), // camión revolvedor
  supervisor: unsplash('sZdlS32KvNI', 1200), // supervisor con casco
  block: unsplash('qx-_xFPTi2g', 1200),
  ladrillo: unsplash('s9t2XPFwIwY', 1200),
  madera: unsplash('yVRn-d6JGzo', 1200),
  grava: unsplash('rbQWEU0HFhQ', 1200),
  arenaObra: unsplash('wdYyYY9F0Ts', 1200),
};

/** Foto representativa por categoría del catálogo. */
export const IMAGEN_CATEGORIA: Record<string, string> = {
  Cementantes: IMAGENES.heroCemento,
  Acero: unsplash('XRuBqN8o7Pg', 1200),
  'Mampostería': IMAGENES.block,
  Agregados: IMAGENES.grava,
  'Madera y cimbra': IMAGENES.madera,
};
