const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { DB_PATH } = require('./env');

/** Versión del esquema. Súbela cuando cambie schema.sql de forma incompatible. */
const SCHEMA_VERSION = 3;

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

// Recomendaciones para SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

/** Ejecuta el DDL (idempotente: CREATE TABLE IF NOT EXISTS). */
function aplicarEsquema() {
  const tablas = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'users'").get().n;
  const version = db.pragma('user_version', { simple: true });

  if (tablas > 0 && version < SCHEMA_VERSION) {
    throw new Error(
      `La base de datos (${path.basename(DB_PATH)}) usa un esquema antiguo (v${version}, se requiere v${SCHEMA_VERSION}).\n` +
        '   Ejecuta:  npm run db:reset   (borra y vuelve a crear la BD con datos de ejemplo)'
    );
  }

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

aplicarEsquema();

/**
 * Migración de datos (idempotente): las bases creadas antes usaban enlaces de descarga de
 * Unsplash que no funcionan como imagen directa. Se reemplazan por las fotos actuales.
 */
function migrarFotos() {
  const { urlFoto } = require('./fotos');
  const viejos = db
    .prepare("SELECT id, codigo_sku FROM catalogo_materiales WHERE imagen_url LIKE 'https://unsplash.com/photos/%/download%'")
    .all();
  const upd = db.prepare('UPDATE catalogo_materiales SET imagen_url = ?, updated_at = ? WHERE id = ?');
  const t = new Date().toISOString();
  for (const m of viejos) upd.run(urlFoto(m.codigo_sku), t, m.id);
}
migrarFotos();

/** Marca de tiempo ISO-8601 UTC usada en todas las tablas. */
const ahora = () => new Date().toISOString();

/** Redondeo monetario a 2 decimales. */
const dinero = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

module.exports = { db, ahora, dinero, aplicarEsquema, SCHEMA_VERSION };
