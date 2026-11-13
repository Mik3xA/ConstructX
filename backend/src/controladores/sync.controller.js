const { sincronizar } = require('../servicios/sync.service');

/**
 * POST /api/sync
 * Body:
 * {
 *   "last_sync": "2026-11-01T00:00:00.000Z" | null,
 *   "movimientos": [{ "uuid", "tipo", "material_id", "cantidad", "proyecto_id?", "tarea_id?", "timestamp" }],
 *   "fases_avance": [{ "fase_id", "porcentaje_avance_real", "updated_at" }]
 * }
 * Respuesta: { server_time, resultado, cambios }  -> el cliente guarda server_time como su nuevo last_sync.
 */
function sync(req, res) {
  res.json(sincronizar(req.body || {}, req.user));
}

module.exports = { sync };
