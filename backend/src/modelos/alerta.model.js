const { db } = require('../config/database');

const AlertaModel = {
  list({ estado } = {}) {
    return db
      .prepare(
        `SELECT a.*, p.nombre AS proyecto_nombre, f.nombre AS fase_nombre,
                t.nombre AS tarea_nombre, m.nombre AS material_nombre, m.unidad
         FROM alertas a
         JOIN proyectos p ON p.id = a.proyecto_id
         JOIN fases f ON f.id = a.fase_id
         JOIN tareas t ON t.id = a.tarea_id
         JOIN catalogo_materiales m ON m.id = a.material_id
         ${estado ? 'WHERE a.estado = ?' : ''}
         ORDER BY a.desviacion_pct DESC`
      )
      .all(...(estado ? [estado] : []));
  },

  findById(id) {
    return db.prepare('SELECT * FROM alertas WHERE id = ?').get(id);
  },

  findByTareaMaterial(tarea_id, material_id) {
    return db
      .prepare('SELECT * FROM alertas WHERE tarea_id = ? AND material_id = ?')
      .get(tarea_id, material_id);
  },

  insert(a) {
    db.prepare(
      `INSERT INTO alertas (id, proyecto_id, fase_id, tarea_id, material_id, nivel, consumo_pct, avance_pct,
                            desviacion_pct, mensaje, estado, created_at, updated_at)
       VALUES (@id, @proyecto_id, @fase_id, @tarea_id, @material_id, 'NARANJA', @consumo_pct, @avance_pct,
               @desviacion_pct, @mensaje, 'ACTIVA', @t, @t)`
    ).run(a);
  },

  actualizar(id, { consumo_pct, avance_pct, desviacion_pct, mensaje, estado, t }) {
    db.prepare(
      `UPDATE alertas SET consumo_pct = ?, avance_pct = ?, desviacion_pct = ?, mensaje = ?,
              estado = ?, updated_at = ? WHERE id = ?`
    ).run(consumo_pct, avance_pct, desviacion_pct, mensaje, estado, t, id);
  },

  setEstado(id, estado, t) {
    db.prepare('UPDATE alertas SET estado = ?, updated_at = ? WHERE id = ?').run(estado, t, id);
    return this.findById(id);
  },
};

module.exports = AlertaModel;
