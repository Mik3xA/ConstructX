/**
 * Datos de ejemplo de ConstructX.
 * Reproduce el flujo de docs/flujo_negocio.md (alerta naranja del cemento)
 * y carga el catálogo comercial con precios e imágenes reales (Unsplash).
 */
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { db, ahora } = require('./database');

const PASSWORD_DEMO = 'ConstructX123!';

/**
 * Fotos de Unsplash (licencia Unsplash: uso comercial gratuito, sin atribución obligatoria).
 * `/photos/<id>/download` redirige a la imagen en images.unsplash.com.
 * Si alguna no carga, el frontend muestra una ilustración local de respaldo por categoría.
 */
const unsplash = (id) => `https://unsplash.com/photos/${id}/download?w=800`;

const CATALOGO = [
  { sku: 'CEM-50KG', nombre: 'Cemento gris CPC 30R', unidad: 'bulto', categoria: 'Cementantes', precio: 245, foto: 'rc5crEySTXo',
    descripcion: 'Saco de 50 kg. Cemento Portland compuesto para colados, firmes y mampostería.' },
  { sku: 'CAL-25KG', nombre: 'Cal hidratada', unidad: 'bulto', categoria: 'Cementantes', precio: 98, foto: 'kTg4NXEmfs8',
    descripcion: 'Saco de 25 kg. Ideal para morteros, aplanados y estabilización de suelos.' },
  { sku: 'VAR-3/8', nombre: 'Varilla corrugada 3/8"', unidad: 'pieza', categoria: 'Acero', precio: 168, foto: 'XRuBqN8o7Pg',
    descripcion: 'Pieza de 12 m, grado 42. Para castillos, cadenas y losas.' },
  { sku: 'VAR-1/2', nombre: 'Varilla corrugada 1/2"', unidad: 'pieza', categoria: 'Acero', precio: 289, foto: 'PqRvLsjD_TU',
    descripcion: 'Pieza de 12 m, grado 42. Para trabes, columnas y cimentación.' },
  { sku: 'BLK-15', nombre: 'Block hueco 15x20x40', unidad: 'pieza', categoria: 'Mampostería', precio: 16.5, foto: 'qx-_xFPTi2g',
    descripcion: 'Block de concreto vibrocomprimido para muros de carga y divisorios.' },
  { sku: 'LAD-ROJO', nombre: 'Ladrillo rojo recocido', unidad: 'pieza', categoria: 'Mampostería', precio: 4.2, foto: 's9t2XPFwIwY',
    descripcion: 'Ladrillo de barro 7x14x28 cm, cocido en horno.' },
  { sku: 'ARE-M3', nombre: 'Arena de río', unidad: 'm3', categoria: 'Agregados', precio: 480, foto: 'wdYyYY9F0Ts',
    descripcion: 'Arena cribada para mezclas de concreto y mortero. Entrega a granel.' },
  { sku: 'GRA-M3', nombre: 'Grava 3/4"', unidad: 'm3', categoria: 'Agregados', precio: 520, foto: 'rbQWEU0HFhQ',
    descripcion: 'Grava triturada de 3/4" para concreto estructural. Entrega a granel.' },
];

const STOCK_INICIAL = {
  'CEM-50KG': 500, 'CAL-25KG': 300, 'VAR-3/8': 1000, 'VAR-1/2': 600,
  'BLK-15': 2000, 'LAD-ROJO': 8000, 'ARE-M3': 60, 'GRA-M3': 45,
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
  };

  const materiales = {};

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
      insMat.run({ ...m, id, imagen_url: unsplash(m.foto), t });
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
  pedidosService.cambiarEstado(entregado.uuid, 'EN_RUTA', usuarios.bodeguero, opciones);
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

  const { activas } = alertasService.auditar();
  return { usuarios, materiales, alertasActivas: activas };
}

module.exports = { sembrar, PASSWORD_DEMO, CATALOGO };
