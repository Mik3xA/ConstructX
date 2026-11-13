const { db } = require('../config/database');

const TIPOS = Object.freeze(['INGRESO_BODEGA', 'ENVIO_OBRA', 'CONSUMO_OBRA']);

const MovimientoModel = {
  TIPOS,

  findByUuid(uuid) {
    return db.prepare('SELECT * FROM movimientos WHERE uuid = ?').get(uuid);
  },

  insert(m) {
    db.prepare(
      `INSERT INTO movimientos
         (uuid, proyecto_id, tarea_id, material_id, cantidad, tipo, usuario_id, timestamp, created_at, updated_at)
       VALUES
         (@uuid, @proyecto_id, @tarea_id, @material_id, @cantidad, @tipo, @usuario_id, @timestamp, @created_at, @updated_at)`
    ).run(m);
    return this.findByUuid(m.uuid);
  },

  list({ tipo, proyecto_id, tarea_id, material_id, limit = 100, offset = 0 } = {}) {
    const where = [];
    const params = {};
    if (tipo) { where.push('mv.tipo = @tipo'); params.tipo = tipo; }
    if (proyecto_id) { where.push('mv.proyecto_id = @proyecto_id'); params.proyecto_id = proyecto_id; }
    if (tarea_id) { where.push('mv.tarea_id = @tarea_id'); params.tarea_id = tarea_id; }
    if (material_id) { where.push('mv.material_id = @material_id'); params.material_id = material_id; }

    return db
      .prepare(
        `SELECT mv.*, m.nombre AS material_nombre, m.unidad, u.nombre AS usuario_nombre,
                t.nombre AS tarea_nombre, p.nombre AS proyecto_nombre
         FROM movimientos mv
         JOIN catalogo_materiales m ON m.id = mv.material_id
         JOIN users u ON u.id = mv.usuario_id
         LEFT JOIN tareas t ON t.id = mv.tarea_id
         LEFT JOIN proyectos p ON p.id = mv.proyecto_id
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY mv.timestamp DESC
         LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit: Math.min(Number(limit) || 100, 500), offset: Number(offset) || 0 });
  },

  cambiosDesde(desde) {
    return db.prepare('SELECT * FROM movimientos WHERE updated_at > ? ORDER BY updated_at').all(desde);
  },
};

module.exports = MovimientoModel;
