/**
 * Datos de ejemplo de ConstructX.
 * Reproduce el flujo de docs/flujo_negocio.md (alerta naranja del cemento)
 * y carga el catálogo comercial con precios e imágenes reales (Unsplash).
 */
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { db, ahora } = require('./database');
const { urlFoto } = require('./fotos');

const PASSWORD_DEMO = 'ConstructX123!';


const CATALOGO = [
  { sku: 'CEM-50KG', nombre: 'Cemento gris CPC 30R', unidad: 'bulto', categoria: 'Cementantes', precio: 245,
    descripcion: 'Saco de 50 kg. Cemento Portland compuesto para colados, firmes y mampostería.' },
  { sku: 'CAL-25KG', nombre: 'Cal hidratada', unidad: 'bulto', categoria: 'Cementantes', precio: 98,
    descripcion: 'Saco de 25 kg. Ideal para morteros, aplanados y estabilización de suelos.' },
  { sku: 'VAR-3/8', nombre: 'Varilla corrugada 3/8"', unidad: 'pieza', categoria: 'Acero', precio: 168,
    descripcion: 'Pieza de 12 m, grado 42. Para castillos, cadenas y losas.' },
  { sku: 'VAR-1/2', nombre: 'Varilla corrugada 1/2"', unidad: 'pieza', categoria: 'Acero', precio: 289,
    descripcion: 'Pieza de 12 m, grado 42. Para trabes, columnas y cimentación.' },
  { sku: 'BLK-15', nombre: 'Block hueco 15x20x40', unidad: 'pieza', categoria: 'Mampostería', precio: 16.5,
    descripcion: 'Block de concreto vibrocomprimido para muros de carga y divisorios.' },
  { sku: 'LAD-ROJO', nombre: 'Ladrillo rojo recocido', unidad: 'pieza', categoria: 'Mampostería', precio: 4.2,
    descripcion: 'Ladrillo de barro 7x14x28 cm, cocido en horno.' },
  { sku: 'ARE-M3', nombre: 'Arena de río', unidad: 'm3', categoria: 'Agregados', precio: 480,
    descripcion: 'Arena cribada para mezclas de concreto y mortero. Entrega a granel.' },
  { sku: 'GRA-M3', nombre: 'Grava 3/4"', unidad: 'm3', categoria: 'Agregados', precio: 520,
    descripcion: 'Grava triturada de 3/4" para concreto estructural. Entrega a granel.' },
  { sku: 'MOR-50KG', nombre: 'Mortero para albañilería', unidad: 'bulto', categoria: 'Cementantes', precio: 189,
    descripcion: 'Saco de 50 kg. Para pegar block y tabique y para aplanados finos.' },
  { sku: 'MAL-6X6', nombre: 'Malla electrosoldada 6x6 10/10', unidad: 'rollo', categoria: 'Acero', precio: 1650,
    descripcion: 'Rollo de 2.5 x 40 m para firmes, losas y pisos de concreto.' },
  { sku: 'ALM-REC', nombre: 'Alambre recocido calibre 16', unidad: 'kg', categoria: 'Acero', precio: 42,
    descripcion: 'Para amarres de varilla y armados. Venta por kilo.' },
  { sku: 'TAB-ROJO', nombre: 'Tabicón ligero 10x14x28', unidad: 'pieza', categoria: 'Mampostería', precio: 7.8,
    descripcion: 'Tabicón de concreto ligero, ideal para muros divisorios.' },
  { sku: 'POL-4X4', nombre: 'Polín de pino 4x4" x 8 ft', unidad: 'pieza', categoria: 'Madera y cimbra', precio: 135,
    descripcion: 'Madera de pino de 3a para cimbra, apuntalamiento y obra negra.' },
];

const STOCK_INICIAL = {
  'CEM-50KG': 500, 'CAL-25KG': 300, 'VAR-3/8': 1000, 'VAR-1/2': 600,
  'BLK-15': 2000, 'LAD-ROJO': 8000, 'ARE-M3': 60, 'GRA-M3': 45,
  'MOR-50KG': 220, 'MAL-6X6': 40, 'ALM-REC': 350, 'TAB-ROJO': 3000, 'POL-4X4': 30,
};

/** Punto de reorden por material (el arranque deja a la Malla y al Polín en stock bajo). */
const STOCK_MINIMO = {
  'CEM-50KG': 120, 'CAL-25KG': 60, 'VAR-3/8': 200, 'VAR-1/2': 120, 'BLK-15': 400, 'LAD-ROJO': 1500,
  'ARE-M3': 15, 'GRA-M3': 12, 'MOR-50KG': 50, 'MAL-6X6': 45, 'ALM-REC': 80, 'TAB-ROJO': 600, 'POL-4X4': 35,
};

function sembrar() {
  // require diferido para evitar ciclos (los servicios dependen de database.js)
  const movimientosService = require('../servicios/movimientos.service');
  const pedidosService = require('../servicios/pedidos.service');
  const alertasService = require('../servicios/alertas.service');

  const t = ahora();
  const hash = bcrypt.hashSync(PASSWORD_DEMO, 10);

  const usuarios = {
    admin: { id: randomUUID(), email: 'admin@constructx.mx', nombre: 'Ana Admin', rol: 'admin' },
    bodeguero: { id: randomUUID(), email: 'bodega@constructx.mx', nombre: 'Bruno Bodega', rol: 'bodeguero' },
    residente: { id: randomUUID(), email: 'residente@constructx.mx', nombre: 'Rita Residente', rol: 'residente' },
    cliente: { id: randomUUID(), email: 'cliente@constructx.mx', nombre: 'Carlos Cliente', rol: 'cliente',
      telefono: '81 1234 5678', empresa: 'Constructora del Norte', direccion: 'Av. Constitución 1500, Col. Centro, Monterrey, NL' },
    cliente2: { id: randomUUID(), email: 'maria@obrasgarza.mx', nombre: 'María Garza', rol: 'cliente',
      telefono: '81 8765 4321', empresa: 'Obras Garza', direccion: 'Calle Hidalgo 220, San Pedro Garza García, NL' },
  };

  const materiales = {};
  let proyectoId;

  db.transaction(() => {
    const insUser = db.prepare(
      `INSERT INTO users (id, email, password_hash, rol, nombre, telefono, empresa, direccion, created_at, updated_at)
       VALUES (@id, @email, @hash, @rol, @nombre, @telefono, @empresa, @direccion, @t, @t)`
    );
    for (const u of Object.values(usuarios)) {
      insUser.run({ telefono: null, empresa: null, direccion: null, ...u, hash, t });
    }

    const insMat = db.prepare(
      `INSERT INTO catalogo_materiales
         (id, codigo_sku, nombre, unidad, categoria, descripcion, precio_unitario, imagen_url, activo, created_at, updated_at)
       VALUES (@id, @sku, @nombre, @unidad, @categoria, @descripcion, @precio, @imagen_url, 1, @t, @t)`
    );
    const insInv = db.prepare(
      'INSERT INTO inventario_central (id, material_id, stock_actual, created_at, updated_at) VALUES (?, ?, 0, ?, ?)'
    );
    for (const m of CATALOGO) {
      const id = randomUUID();
      materiales[m.sku] = id;
      insMat.run({ ...m, id, imagen_url: urlFoto(m.sku), t });
      insInv.run(randomUUID(), id, t, t);
    }

    // ---------- Obra (ERP) ----------
    const proyecto = randomUUID();
    db.prepare(
      `INSERT INTO proyectos (id, nombre, ubicacion, fecha_inicio, estado, created_at, updated_at)
       VALUES (?, 'Torre Residencial Norte', 'Monterrey, NL', '2026-09-01', 'ACTIVO', ?, ?)`
    ).run(proyecto, t, t);

    const insFase = db.prepare(
      'INSERT INTO fases (id, proyecto_id, nombre, porcentaje_avance_real, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insTarea = db.prepare('INSERT INTO tareas (id, fase_id, nombre, estado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    const insBom = db.prepare(
      `INSERT INTO presupuesto_bom (id, tarea_id, material_id, cantidad_presupuestada, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const faseCim = randomUUID();
    const faseEst = randomUUID();
    insFase.run(faseCim, proyecto, 'Cimentación', 20, t, t);
    insFase.run(faseEst, proyecto, 'Estructura', 0, t, t);

    const tCimientos = randomUUID();
    const tColumnas = randomUUID();
    insTarea.run(tCimientos, faseCim, 'Cimientos', 'EN_PROGRESO', t, t);
    insTarea.run(tColumnas, faseEst, 'Columnas planta baja', 'PENDIENTE', t, t);

    insBom.run(randomUUID(), tCimientos, materiales['CEM-50KG'], 100, t, t);
    insBom.run(randomUUID(), tCimientos, materiales['VAR-3/8'], 400, t, t);
    insBom.run(randomUUID(), tCimientos, materiales['ARE-M3'], 30, t, t);
    insBom.run(randomUUID(), tColumnas, materiales['CEM-50KG'], 80, t, t);
    insBom.run(randomUUID(), tColumnas, materiales['BLK-15'], 1200, t, t);

    const reg = (tipo, sku, cantidad, usuario, extra = {}) =>
      movimientosService.registrar({ tipo, material_id: materiales[sku], cantidad, ...extra }, usuario);

    for (const [sku, cant] of Object.entries(STOCK_INICIAL)) reg('INGRESO_BODEGA', sku, cant, usuarios.bodeguero);
    const insMin = db.prepare('UPDATE inventario_central SET stock_minimo = ? WHERE material_id = ?');
    for (const [sku, min] of Object.entries(STOCK_MINIMO)) insMin.run(min, materiales[sku]);
    proyectoId = proyecto;

    reg('ENVIO_OBRA', 'CEM-50KG', 50, usuarios.bodeguero, { proyecto_id: proyecto });
    reg('ENVIO_OBRA', 'VAR-3/8', 200, usuarios.bodeguero, { proyecto_id: proyecto });
    reg('ENVIO_OBRA', 'ARE-M3', 10, usuarios.bodeguero, { proyecto_id: proyecto });

    // 30 de 100 bultos (30%) con 20% de avance => +10% de desviación => ALERTA NARANJA
    reg('CONSUMO_OBRA', 'CEM-50KG', 30, usuarios.residente, { tarea_id: tCimientos });
    reg('CONSUMO_OBRA', 'VAR-3/8', 80, usuarios.residente, { tarea_id: tCimientos });
    reg('CONSUMO_OBRA', 'ARE-M3', 7, usuarios.residente, { tarea_id: tCimientos });
  })();

  // ---------- Portal de clientes: un pedido entregado y otro pendiente ----------
  const opciones = { notificar: false };
  const entregado = pedidosService.crear(
    usuarios.cliente,
    {
      items: [
        { material_id: materiales['CEM-50KG'], cantidad: 40 },
        { material_id: materiales['VAR-3/8'], cantidad: 60 },
      ],
      direccion_entrega: usuarios.cliente.direccion,
      notas: 'Entregar por la puerta lateral.',
    },
    opciones
  );
  pedidosService.cambiarEstado(entregado.uuid, 'EN_RUTA', usuarios.bodeguero, { ...opciones, chofer: 'Jorge Ramírez', vehiculo: 'Torton NL-4521' });
  pedidosService.cambiarEstado(entregado.uuid, 'ENTREGADO', usuarios.bodeguero, opciones);

  pedidosService.crear(
    usuarios.cliente,
    {
      items: [
        { material_id: materiales['BLK-15'], cantidad: 300 },
        { material_id: materiales['ARE-M3'], cantidad: 3 },
      ],
      direccion_entrega: usuarios.cliente.direccion,
    },
    opciones
  );

  // ---------- Historial de ventas de las últimas 2 semanas (para el reporte del Admin) ----------
  const historial = [
    [13, usuarios.cliente2, [['CEM-50KG', 30], ['ARE-M3', 4]]],
    [12, usuarios.cliente, [['BLK-15', 250]]],
    [10, usuarios.cliente2, [['VAR-1/2', 40], ['ALM-REC', 25]]],
    [9, usuarios.cliente, [['MOR-50KG', 20], ['CAL-25KG', 15]]],
    [7, usuarios.cliente2, [['TAB-ROJO', 400], ['MOR-50KG', 10]]],
    [6, usuarios.cliente, [['CEM-50KG', 25], ['GRA-M3', 3]]],
    [4, usuarios.cliente2, [['VAR-3/8', 80], ['MAL-6X6', 2]]],
    [3, usuarios.cliente, [['LAD-ROJO', 1200]]],
    [2, usuarios.cliente2, [['CEM-50KG', 15], ['POL-4X4', 4]]],
    [1, usuarios.cliente, [['ARE-M3', 2], ['GRA-M3', 2], ['CEM-50KG', 10]]],
  ];
  for (const [diasAtras, cliente, lineas] of historial) {
    const p = pedidosService.crear(
      cliente,
      { items: lineas.map(([sku, cantidad]) => ({ material_id: materiales[sku], cantidad })) },
      opciones
    );
    pedidosService.cambiarEstado(p.uuid, 'EN_RUTA', usuarios.bodeguero, { ...opciones, chofer: 'Jorge Ramírez', vehiculo: 'Torton NL-4521' });
    pedidosService.cambiarEstado(p.uuid, 'ENTREGADO', usuarios.bodeguero, opciones);
    const ts = new Date(Date.now() - diasAtras * 86400000).toISOString();
    db.prepare('UPDATE pedidos_fletes SET timestamp = ?, created_at = ? WHERE uuid = ?').run(ts, ts, p.uuid);
  }

  // ---------- Solicitud de material pendiente del residente ----------
  require('../servicios/solicitudes.service').crear(
    usuarios.residente,
    { proyecto_id: proyectoId, material_id: materiales['VAR-1/2'], cantidad: 60, notas: 'Para columnas de planta baja' },
    opciones
  );

  // ---------- Mensaje de contacto de ejemplo ----------
  require('../modelos/mensaje.model').create({
    nombre: 'Luis Treviño',
    email: 'luis@ejemplo.mx',
    telefono: '81 5555 0101',
    asunto: 'Cotización por volumen',
    mensaje: 'Hola, necesito cotizar 800 bultos de cemento para una obra en Apodaca. ¿Manejan precio por volumen?',
  });

  const { activas } = alertasService.auditar();
  return { usuarios, materiales, alertasActivas: activas };
}

module.exports = { sembrar, PASSWORD_DEMO, CATALOGO };
