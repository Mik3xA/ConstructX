const { db } = require('../config/database');

const SELECT = `
  SELECT s.*, m.nombre AS material_nombre, m.unidad, m.codigo_sku,
         p.nombre AS proyecto_nombre, t.nombre AS tarea_nombre,
         u.nombre AS solicitante_nombre, a.nombre AS atendido_por_nombre,
         COALESCE(i.stock_actual, 0) AS stock_disponible
  FROM solicitudes_material s
  JOIN catalogo_materiales m ON m.id = s.material_id
  JOIN proyectos p ON p.id = s.proyecto_id
  LEFT JOIN tareas t ON t.id = s.tarea_id
  JOIN users u ON u.id = s.solicitante_id
  LEFT JOIN users a ON a.id = s.atendido_por
  LEFT JOIN inventario_central i ON i.material_id = s.material_id`;

const SolicitudModel = {
  ESTADOS: Object.freeze(['PENDIENTE', 'APROBADA', 'RECHAZADA']),

  insert(s) {
    db.prepare(
      `INSERT INTO solicitudes_material
         (id, proyecto_id, tarea_id, material_id, cantidad, estado, notas, solicitante_id, created_at, updated_at)
       VALUES (@id, @proyecto_id, @tarea_id, @material_id, @cantidad, 'PENDIENTE', @notas, @solicitante_id, @t, @t)`
    ).run(s);
  },

  findById(id) {
    return db.prepare(`${SELECT} WHERE s.id = ?`).get(id);
  },

  list({ estado, solicitante_id } = {}) {
    const where = [];
    const params = {};
    if (estado) { where.push('s.estado = @estado'); params.estado = estado; }
    if (solicitante_id) { where.push('s.solicitante_id = @solicitante_id'); params.solicitante_id = solicitante_id; }
    return db
      .prepare(`${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY s.created_at DESC LIMIT 200`)
      .all(params);
  },

  resolver(id, { estado, atendido_por, movimiento_uuid = null, motivo_rechazo = null, t }) {
    db.prepare(
      `UPDATE solicitudes_material SET estado = ?, atendido_por = ?, movimiento_uuid = ?, motivo_rechazo = ?, updated_at = ?
       WHERE id = ?`
    ).run(estado, atendido_por, movimiento_uuid, motivo_rechazo, t, id);
  },

  pendientes() {
    return db.prepare("SELECT COUNT(*) AS n FROM solicitudes_material WHERE estado = 'PENDIENTE'").get().n;
  },
};

module.exports = SolicitudModel;
