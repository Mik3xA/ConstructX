/**
 * Fotografías reales de los productos.
 *
 * Se usan fotos de Flickr buscadas por palabra clave (servicio LoremFlickr): son fotos reales
 * relacionadas con cada material. El parámetro `lock` fija la foto para que cada producto
 * muestre siempre la misma. Si una foto no carga, el frontend prueba otra fuente (Picsum) y
 * solo al final usa una ilustración.
 *
 * Para usar fotos propias basta con cambiar la URL del producto desde el panel (Productos).
 */
const FOTOS = {
  'CEM-50KG': ['cement,bags', 101],
  'CAL-25KG': ['lime,powder,bags', 102],
  'MOR-50KG': ['mortar,cement', 103],
  'VAR-3/8': ['rebar,steel', 104],
  'VAR-1/2': ['rebar,construction', 105],
  'MAL-6X6': ['steel,mesh,concrete', 106],
  'ALM-REC': ['wire,coil,steel', 107],
  'BLK-15': ['concrete,blocks', 108],
  'LAD-ROJO': ['red,bricks', 109],
  'TAB-ROJO': ['bricks,stack', 110],
  'ARE-M3': ['sand,pile', 111],
  'GRA-M3': ['gravel,stones', 112],
  'POL-4X4': ['lumber,wood', 113],
};

const urlFoto = (sku) => {
  const [palabras, lock] = FOTOS[sku] || ['construction,materials', 199];
  return `https://loremflickr.com/800/600/${palabras}?lock=${lock}`;
};

module.exports = { FOTOS, urlFoto };
