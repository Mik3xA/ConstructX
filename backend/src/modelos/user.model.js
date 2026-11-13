const { randomUUID } = require('crypto');
const { db, ahora } = require('../config/database');

const COLUMNAS_PUBLICAS = 'id, email, rol, nombre, telefono, empresa, direccion, activo, created_at, updated_at';

const UserModel = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findById(id) {
    return db.prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM users WHERE id = ?`).get(id);
  },

  list({ rol } = {}) {
    return db
      .prepare(
        `SELECT ${COLUMNAS_PUBLICAS},
                (SELECT COUNT(*) FROM pedidos_fletes p WHERE p.cliente_id = users.id) AS total_pedidos,
                (SELECT COALESCE(SUM(total_pagar), 0) FROM pedidos_fletes p WHERE p.cliente_id = users.id) AS total_comprado
         FROM users ${rol ? 'WHERE rol = ?' : ''} ORDER BY rol, nombre`
      )
      .all(...(rol ? [rol] : []));
  },

  setPassword(id, password_hash) {
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(password_hash, ahora(), id);
  },

  /** Estado mínimo para validar tokens (existe y está activo). */
  estado(id) {
    return db.prepare('SELECT id, activo, rol FROM users WHERE id = ?').get(id);
  },

  /** Actualiza solo los campos permitidos que vengan definidos. */
  update(id, campos) {
    const permitidos = ['nombre', 'telefono', 'empresa', 'direccion', 'rol', 'activo'];
    const sets = [];
    const params = { id, updated_at: ahora() };
    for (const k of permitidos) {
      if (campos[k] !== undefined) {
        sets.push(`${k} = @${k}`);
        params[k] = k === 'activo' ? (campos[k] ? 1 : 0) : campos[k];
      }
    }
    if (sets.length) {
      db.prepare(`UPDATE users SET ${sets.join(', ')}, updated_at = @updated_at WHERE id = @id`).run(params);
    }
    return this.findById(id);
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
