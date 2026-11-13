/**
 * Inicializa dev.db: crea el esquema y carga datos de ejemplo.
 *   npm run db:init    -> crea tablas y siembra si la BD está vacía
 *   npm run db:reset   -> borra dev.db y la vuelve a crear
 */
const fs = require('fs');
const { DB_PATH } = require('./env');

if (process.argv.includes('--reset')) {
  for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  console.log('🗑  Base de datos eliminada');
}

const { db } = require('./database');
const { sembrar, PASSWORD_DEMO } = require('./seed');

if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) {
  console.log('✔  Esquema aplicado. La BD ya contiene datos; no se siembra de nuevo.');
  process.exit(0);
}

const { usuarios, alertasActivas } = sembrar();

console.log('✔  dev.db creada y sembrada en', DB_PATH);
console.log(`✔  Auditor: ${alertasActivas} alerta(s) naranja activa(s)`);
console.log(`\nUsuarios de prueba (contraseña: ${PASSWORD_DEMO}):`);
for (const u of Object.values(usuarios)) console.log(`   ${u.rol.padEnd(10)} ${u.email}`);
