const { randomUUID } = require('crypto');
const { db, ahora } = require('../config/database');

const COLUMNAS_PUBLICAS = 'id, email, rol, nombre, telefono, empresa, direccion, created_at, updated_at';

const UserModel = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findById(id) {
    return db.prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM users WHERE id = ?`).get(id);
  },

  list() {
    return db.prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM users ORDER BY nombre`).all();
  },

  create({ email, password_hash, rol, nombre, telefono = null, empresa = null, direccion = null }) {
    const id = randomUUID();
    const t = ahora();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, rol, nombre, telefono, empresa, direccion, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, email, password_hash, rol, nombre, telefono, empresa, direccion, t, t);
    return this.findById(id);
  },
};

module.exports = UserModel;
