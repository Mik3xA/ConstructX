const { db } = require('../config/database');
const AlertaModel = require('../modelos/alerta.model');

/** KPIs del panel del Admin. */
function resumen() {
  const kpis = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM proyectos WHERE estado = 'ACTIVO')                         AS proyectos_activos,
         (SELECT COUNT(*) FROM alertas WHERE estado = 'ACTIVA')                            AS alertas_activas,
         (SELECT COUNT(*) FROM catalogo_materiales)                                         AS materiales,
         (SELECT COUNT(*) FROM movimientos WHERE timestamp >= date('now'))                  AS movimientos_hoy,
         (SELECT COALESCE(ROUND(AVG(porcentaje_avance_real), 2), 0) FROM fases)             AS avance_global`
    )
    .get();

  // Consumo vs. presupuesto por proyecto: promedio del % consumido de cada línea del BOM
  // (se promedian porcentajes porque las unidades difieren: bultos, piezas, m3...)
  const proyectos = db
    .prepare(
      `SELECT p.id, p.nombre, p.ubicacion, p.estado,
              COALESCE((SELECT ROUND(AVG(f.porcentaje_avance_real), 2) FROM fases f WHERE f.proyecto_id = p.id), 0) AS avance_pct,
              COALESCE((
                SELECT ROUND(AVG(100.0 * COALESCE(c.consumido, 0) / b.cantidad_presupuestada), 2)
                FROM presupuesto_bom b
                JOIN tareas t ON t.id = b.tarea_id
                JOIN fases f ON f.id = t.fase_id
                LEFT JOIN (SELECT tarea_id, material_id, SUM(cantidad) AS consumido
                           FROM movimientos WHERE tipo = 'CONSUMO_OBRA'
                           GROUP BY tarea_id, material_id) c
                  ON c.tarea_id = b.tarea_id AND c.material_id = b.material_id
                WHERE f.proyecto_id = p.id
              ), 0) AS consumo_pct,
              (SELECT COUNT(*) FROM alertas a WHERE a.proyecto_id = p.id AND a.estado = 'ACTIVA') AS alertas_activas
       FROM proyectos p
       ORDER BY p.created_at DESC`
    )
    .all();

  const stock = db
    .prepare(
      `SELECT m.nombre, m.unidad, i.stock_actual
       FROM inventario_central i JOIN catalogo_materiales m ON m.id = i.material_id
       ORDER BY m.nombre`
    )
    .all();

  return { kpis, proyectos, stock, alertas: AlertaModel.list({ estado: 'ACTIVA' }) };
}

module.exports = { resumen };
