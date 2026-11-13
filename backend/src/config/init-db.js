/**
 * Inicializa dev.db: crea el esquema y carga datos semilla.
 *   npm run db:init    -> crea tablas y siembra si la BD está vacía
 *   npm run db:reset   -> borra dev.db y la vuelve a crear
 */
const fs = require('fs');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { DB_PATH } = require('./env');

if (process.argv.includes('--reset')) {
  for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  console.log('🗑  Base de datos eliminada');
}

const { db, ahora } = require('./database');
const movimientosService = require('../servicios/movimientos.service');
const alertasService = require('../servicios/alertas.service');

const yaSembrada = db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0;
if (yaSembrada) {
  console.log('✔  Esquema aplicado. La BD ya contiene datos; no se siembra de nuevo.');
  process.exit(0);
}

const t = ahora();
const hash = (p) => bcrypt.hashSync(p, 10);

const usuarios = {
  admin: { id: randomUUID(), email: 'admin@buildsync.io', nombre: 'Ana Admin', rol: 'admin' },
  bodeguero: { id: randomUUID(), email: 'bodega@buildsync.io', nombre: 'Bruno Bodega', rol: 'bodeguero' },
  residente: { id: randomUUID(), email: 'residente@buildsync.io', nombre: 'Rita Residente', rol: 'residente' },
};

const materiales = [
  { id: randomUUID(), codigo_sku: 'CEM-50KG', nombre: 'Cemento', unidad: 'bulto' },
  { id: randomUUID(), codigo_sku: 'VAR-3/8', nombre: 'Varilla corrugada 3/8"', unidad: 'pieza' },
  { id: randomUUID(), codigo_sku: 'ARE-M3', nombre: 'Arena', unidad: 'm3' },
  { id: randomUUID(), codigo_sku: 'BLK-15', nombre: 'Block 15x20x40', unidad: 'pieza' },
];
const [cemento, varilla, arena, block] = materiales;

const sembrar = db.transaction(() => {
  const insUser = db.prepare(
    `INSERT INTO users (id, email, password_hash, rol, nombre, created_at, updated_at)
     VALUES (@id, @email, @password_hash, @rol, @nombre, @t, @t)`
  );
  for (const u of Object.values(usuarios)) {
    insUser.run({ ...u, password_hash: hash('BuildSync123!'), t });
  }

  const insMat = db.prepare(
    `INSERT INTO catalogo_materiales (id, codigo_sku, nombre, unidad, created_at, updated_at)
     VALUES (@id, @codigo_sku, @nombre, @unidad, @t, @t)`
  );
  const insInv = db.prepare(
    `INSERT INTO inventario_central (id, material_id, stock_actual, created_at, updated_at)
     VALUES (?, ?, 0, ?, ?)`
  );
  for (const m of materiales) {
    insMat.run({ ...m, t });
    insInv.run(randomUUID(), m.id, t, t);
  }

  const proyecto = { id: randomUUID(), nombre: 'Torre Residencial Norte', ubicacion: 'Monterrey, NL', fecha_inicio: '2026-09-01' };
  db.prepare(
    `INSERT INTO proyectos (id, nombre, ubicacion, fecha_inicio, estado, created_at, updated_at)
     VALUES (@id, @nombre, @ubicacion, @fecha_inicio, 'ACTIVO', @t, @t)`
  ).run({ ...proyecto, t });

  const insFase = db.prepare(
    `INSERT INTO fases (id, proyecto_id, nombre, porcentaje_avance_real, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insTarea = db.prepare(
    `INSERT INTO tareas (id, fase_id, nombre, estado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insBom = db.prepare(
    `INSERT INTO presupuesto_bom (id, tarea_id, material_id, cantidad_presupuestada, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const faseCim = randomUUID();
  const faseEst = randomUUID();
  insFase.run(faseCim, proyecto.id, 'Cimentación', 20, t, t);
  insFase.run(faseEst, proyecto.id, 'Estructura', 0, t, t);

  const tCimientos = randomUUID();
  const tColumnas = randomUUID();
  insTarea.run(tCimientos, faseCim, 'Cimientos', 'EN_PROGRESO', t, t);
  insTarea.run(tColumnas, faseEst, 'Columnas planta baja', 'PENDIENTE', t, t);

  insBom.run(randomUUID(), tCimientos, cemento.id, 100, t, t);
  insBom.run(randomUUID(), tCimientos, varilla.id, 400, t, t);
  insBom.run(randomUUID(), tCimientos, arena.id, 30, t, t);
  insBom.run(randomUUID(), tColumnas, cemento.id, 80, t, t);
  insBom.run(randomUUID(), tColumnas, block.id, 1200, t, t);

  // Flujo de ejemplo de docs/flujo_negocio.md
  const reg = (tipo, material, cantidad, usuario, extra = {}) =>
    movimientosService.registrar(
      { tipo, material_id: material.id, cantidad, ...extra },
      usuario
    );

  reg('INGRESO_BODEGA', cemento, 500, usuarios.bodeguero);
  reg('INGRESO_BODEGA', varilla, 1000, usuarios.bodeguero);
  reg('INGRESO_BODEGA', arena, 60, usuarios.bodeguero);
  reg('INGRESO_BODEGA', block, 2000, usuarios.bodeguero);

  reg('ENVIO_OBRA', cemento, 50, usuarios.bodeguero, { proyecto_id: proyecto.id });
  reg('ENVIO_OBRA', varilla, 200, usuarios.bodeguero, { proyecto_id: proyecto.id });
  reg('ENVIO_OBRA', arena, 10, usuarios.bodeguero, { proyecto_id: proyecto.id });

  // 30 bultos de 100 (30%) con 20% de avance  =>  +10% de desviación  =>  ALERTA NARANJA
  reg('CONSUMO_OBRA', cemento, 30, usuarios.residente, { proyecto_id: proyecto.id, tarea_id: tCimientos });
  // 80 varillas de 400 (20%) con 20% de avance  =>  sano
  reg('CONSUMO_OBRA', varilla, 80, usuarios.residente, { proyecto_id: proyecto.id, tarea_id: tCimientos });
  // 7 m3 de 30 (23.3%) con 20% de avance  =>  +3.3%, dentro de tolerancia
  reg('CONSUMO_OBRA', arena, 7, usuarios.residente, { proyecto_id: proyecto.id, tarea_id: tCimientos });
});

sembrar();
const resultado = alertasService.auditar();

console.log('✔  dev.db creada y sembrada en', DB_PATH);
console.log(`✔  Auditor: ${resultado.activas} alerta(s) naranja activa(s)`);
console.log('\nUsuarios de prueba (password: BuildSync123!):');
for (const u of Object.values(usuarios)) console.log(`   ${u.rol.padEnd(10)} ${u.email}`);
