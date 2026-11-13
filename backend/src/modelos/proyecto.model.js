const { randomUUID } = require('crypto');
const { db, ahora } = require('../config/database');

const ProyectoModel = {
  // ---------- Proyectos ----------
  list() {
    return db
      .prepare(
        `SELECT p.*,
                COALESCE(ROUND(AVG(f.porcentaje_avance_real), 2), 0) AS avance_promedio,
                COUNT(f.id) AS total_fases,
                (SELECT COUNT(*) FROM alertas a WHERE a.proyecto_id = p.id AND a.estado = 'ACTIVA') AS alertas_activas
         FROM proyectos p
         LEFT JOIN fases f ON f.proyecto_id = p.id
         GROUP BY p.id
         ORDER BY p.created_at DESC`
      )
      .all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM proyectos WHERE id = ?').get(id);
  },

  create({ nombre, ubicacion = null, fecha_inicio = null, estado = 'ACTIVO' }) {
    const id = randomUUID();
    const t = ahora();
    db.prepare(
      `INSERT INTO proyectos (id, nombre, ubicacion, fecha_inicio, estado, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, nombre, ubicacion, fecha_inicio, estado, t, t);
    return this.findById(id);
  },

  update(id, campos) {
    const actual = this.findById(id);
    if (!actual) return null;
    const p = { ...actual, ...campos, updated_at: ahora() };
    db.prepare(
      `UPDATE proyectos SET nombre = @nombre, ubicacion = @ubicacion, fecha_inicio = @fecha_inicio,
              estado = @estado, updated_at = @updated_at WHERE id = @id`
    ).run(p);
    return this.findById(id);
  },

  /** Árbol completo: proyecto -> fases -> tareas -> BOM (con consumo acumulado). */
  detalle(id) {
    const proyecto = this.findById(id);
    if (!proyecto) return null;

    const fases = db
      .prepare('SELECT * FROM fases WHERE proyecto_id = ? ORDER BY created_at')
      .all(id);
    const tareas = db
      .prepare(
        `SELECT t.* FROM tareas t JOIN fases f ON f.id = t.fase_id
         WHERE f.proyecto_id = ? ORDER BY t.created_at`
      )
      .all(id);
    const bom = db
      .prepare(
        `SELECT b.*, m.nombre AS material_nombre, m.unidad, m.codigo_sku,
                COALESCE((SELECT SUM(mv.cantidad) FROM movimientos mv
                          WHERE mv.tarea_id = b.tarea_id AND mv.material_id = b.material_id
                            AND mv.tipo = 'CONSUMO_OBRA'), 0) AS cantidad_consumida
         FROM presupuesto_bom b
         JOIN tareas t ON t.id = b.tarea_id
         JOIN fases f ON f.id = t.fase_id
         JOIN catalogo_materiales m ON m.id = b.material_id
         WHERE f.proyecto_id = ?`
      )
      .all(id);

    return {
      ...proyecto,
      fases: fases.map((f) => ({
        ...f,
        tareas: tareas
          .filter((t) => t.fase_id === f.id)
          .map((t) => ({ ...t, bom: bom.filter((b) => b.tarea_id === t.id) })),
      })),
    };
  },

  // ---------- Fases ----------
  findFase(id) {
    return db.prepare('SELECT * FROM fases WHERE id = ?').get(id);
  },

  createFase(proyecto_id, { nombre, porcentaje_avance_real = 0 }) {
    const id = randomUUID();
    const t = ahora();
    db.prepare(
      `INSERT INTO fases (id, proyecto_id, nombre, porcentaje_avance_real, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, proyecto_id, nombre, porcentaje_avance_real, t, t);
    return this.findFase(id);
  },

  /** Actualiza el avance. `updated_at` puede venir del cliente (sync) para resolver conflictos. */
  updateAvance(id, porcentaje, updated_at = ahora()) {
    db.prepare('UPDATE fases SET porcentaje_avance_real = ?, updated_at = ? WHERE id = ?').run(
      porcentaje,
      updated_at,
      id
    );
    return this.findFase(id);
  },

  // ---------- Tareas ----------
  findTarea(id) {
    return db
      .prepare(
        `SELECT t.*, f.proyecto_id FROM tareas t JOIN fases f ON f.id = t.fase_id WHERE t.id = ?`
      )
      .get(id);
  },

  createTarea(fase_id, { nombre, estado = 'PENDIENTE' }) {
    const id = randomUUID();
    const t = ahora();
    db.prepare(
      `INSERT INTO tareas (id, fase_id, nombre, estado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, fase_id, nombre, estado, t, t);
    return this.findTarea(id);
  },

  updateTareaEstado(id, estado) {
    db.prepare('UPDATE tareas SET estado = ?, updated_at = ? WHERE id = ?').run(estado, ahora(), id);
    return this.findTarea(id);
  },

  // ---------- BOM ----------
  upsertBom(tarea_id, { material_id, cantidad_presupuestada }) {
    const t = ahora();
    db.prepare(
      `INSERT INTO presupuesto_bom (id, tarea_id, material_id, cantidad_presupuestada, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (tarea_id, material_id)
       DO UPDATE SET cantidad_presupuestada = excluded.cantidad_presupuestada, updated_at = excluded.updated_at`
    ).run(randomUUID(), tarea_id, material_id, cantidad_presupuestada, t, t);
    return db
      .prepare('SELECT * FROM presupuesto_bom WHERE tarea_id = ? AND material_id = ?')
      .get(tarea_id, material_id);
  },

  // ---------- Sync ----------
  cambiosDesde(desde) {
    return {
      proyectos: db.prepare('SELECT * FROM proyectos WHERE updated_at > ?').all(desde),
      fases: db.prepare('SELECT * FROM fases WHERE updated_at > ?').all(desde),
      tareas: db.prepare('SELECT * FROM tareas WHERE updated_at > ?').all(desde),
      presupuesto_bom: db.prepare('SELECT * FROM presupuesto_bom WHERE updated_at > ?').all(desde),
    };
  },
};

module.exports = ProyectoModel;
