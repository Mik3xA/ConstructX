const { randomUUID } = require('crypto');
const { db, ahora } = require('../config/database');

const MensajeModel = {
  create({ nombre, email, telefono = null, asunto, mensaje }) {
    const id = randomUUID();
    const t = ahora();
    db.prepare(
      `INSERT INTO mensajes_contacto (id, nombre, email, telefono, asunto, mensaje, leido, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(id, nombre, email, telefono, asunto, mensaje, t, t);
    return db.prepare('SELECT * FROM mensajes_contacto WHERE id = ?').get(id);
  },
  list() {
    return db.prepare('SELECT * FROM mensajes_contacto ORDER BY created_at DESC LIMIT 200').all();
  },
  marcarLeido(id, leido = true) {
    const { changes } = db
      .prepare('UPDATE mensajes_contacto SET leido = ?, updated_at = ? WHERE id = ?')
      .run(leido ? 1 : 0, ahora(), id);
    return changes ? db.prepare('SELECT * FROM mensajes_contacto WHERE id = ?').get(id) : null;
  },
  sinLeer() {
    return db.prepare('SELECT COUNT(*) AS n FROM mensajes_contacto WHERE leido = 0').get().n;
  },
};

module.exports = MensajeModel;
