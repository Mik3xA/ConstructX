const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { DB_PATH } = require('./env');

const db = new Database(DB_PATH);

// Recomendaciones para SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

/** Ejecuta el DDL (idempotente: CREATE TABLE IF NOT EXISTS). */
function aplicarEsquema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);
}

aplicarEsquema();

/** Marca de tiempo ISO-8601 UTC usada en todas las tablas. */
const ahora = () => new Date().toISOString();

module.exports = { db, ahora, aplicarEsquema };
