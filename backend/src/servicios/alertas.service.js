/**
 * ============================================================================
 *  ALGORITMO AUDITOR - Detección de mermas / robos (ALERTA NARANJA)
 * ============================================================================
 *  REGLA DE NEGOCIO INTOCABLE (ver docs/agents.md):
 *
 *      Consumo_Real% > (Avance_Obra% + 5%)   ==>   ALERTA NARANJA
 *
 *  Por cada línea del BOM (tarea × material):
 *    consumo_pct = Σ CONSUMO_OBRA(tarea, material) / cantidad_presupuestada × 100
 *    avance_pct  = fases.porcentaje_avance_real de la fase de la tarea
 * ============================================================================
 */
const { randomUUID } = require('crypto');
const { db, ahora } = require('../config/database');
const AlertaModel = require('../modelos/alerta.model');
const { ALERTA_TOLERANCIA } = require('../config/env');

const redondear = (n) => Math.round(n * 100) / 100;

/**
 * Función pura con la regla central. No modificar el criterio de comparación.
 * @returns {{ consumo_pct, avance_pct, desviacion_pct, alerta: boolean }}
 */
function evaluarDesviacion({ consumido, presupuestado, avance_pct }, tolerancia = ALERTA_TOLERANCIA) {
  const consumo_pct = presupuestado > 0 ? (consumido / presupuestado) * 100 : 0;
  const desviacion_pct = consumo_pct - avance_pct;
  return {
    consumo_pct: redondear(consumo_pct),
    avance_pct: redondear(avance_pct),
    desviacion_pct: redondear(desviacion_pct),
    alerta: consumo_pct > avance_pct + tolerancia,
  };
}

/** Datos de entrada del auditor: cada línea del BOM con su consumo acumulado y avance de la fase. */
function lineasBom({ proyecto_id, tarea_id } = {}) {
  const where = [];
  const params = {};
  if (proyecto_id) { where.push('f.proyecto_id = @proyecto_id'); params.proyecto_id = proyecto_id; }
  if (tarea_id) { where.push('b.tarea_id = @tarea_id'); params.tarea_id = tarea_id; }

  return db
    .prepare(
      `SELECT b.tarea_id, b.material_id, b.cantidad_presupuestada AS presupuestado,
              t.nombre AS tarea_nombre, m.nombre AS material_nombre,
              f.id AS fase_id, f.proyecto_id, f.porcentaje_avance_real AS avance_pct,
              COALESCE(c.consumido, 0) AS consumido
       FROM presupuesto_bom b
       JOIN tareas t ON t.id = b.tarea_id
       JOIN fases f ON f.id = t.fase_id
       JOIN catalogo_materiales m ON m.id = b.material_id
       LEFT JOIN (
         SELECT tarea_id, material_id, SUM(cantidad) AS consumido
         FROM movimientos WHERE tipo = 'CONSUMO_OBRA'
         GROUP BY tarea_id, material_id
       ) c ON c.tarea_id = b.tarea_id AND c.material_id = b.material_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`
    )
    .all(params);
}

/**
 * Ejecuta el auditor y sincroniza la tabla `alertas`.
 *  - Desviación fuera de tolerancia: crea/actualiza la alerta (ACTIVA).
 *  - Desviación dentro de tolerancia: marca la alerta existente como RESUELTA.
 * @param {{ proyecto_id?: string, tarea_id?: string }} filtro
 */
function auditar(filtro = {}) {
  const t = ahora();
  const nuevas = [];
  let activas = 0;

  db.transaction(() => {
    for (const linea of lineasBom(filtro)) {
      const r = evaluarDesviacion(linea);
      const existente = AlertaModel.findByTareaMaterial(linea.tarea_id, linea.material_id);

      if (r.alerta) {
        activas++;
        const mensaje =
          `Posible merma o robo en ${linea.tarea_nombre}: ${linea.material_nombre}. ` +
          `Consumo ${r.consumo_pct}% vs. avance ${r.avance_pct}% (desviación +${r.desviacion_pct}%).`;

        if (!existente) {
          const a = { id: randomUUID(), proyecto_id: linea.proyecto_id, fase_id: linea.fase_id,
            tarea_id: linea.tarea_id, material_id: linea.material_id, ...r, mensaje, t };
          AlertaModel.insert(a);
          nuevas.push(a);
        } else {
          // Una alerta REVISADA se reactiva solo si la desviación empeora.
          let estado = existente.estado;
          if (estado === 'RESUELTA') estado = 'ACTIVA';
          if (estado === 'REVISADA' && r.desviacion_pct > existente.desviacion_pct) estado = 'ACTIVA';
          AlertaModel.actualizar(existente.id, { ...r, mensaje, estado, t });
          if (existente.estado === 'RESUELTA') nuevas.push({ ...existente, ...r, mensaje });
        }
      } else if (existente && existente.estado !== 'RESUELTA') {
        AlertaModel.actualizar(existente.id, {
          ...r,
          mensaje: existente.mensaje,
          estado: 'RESUELTA',
          t,
        });
      }
    }
  })();

  return { activas, nuevas };
}

/** Lanza el auditor periódicamente ("se despierta"). */
function iniciarAuditorPeriodico(minutos) {
  if (!minutos || minutos <= 0) return null;
  const timer = setInterval(() => {
    try {
      const { nuevas } = auditar();
      if (nuevas.length) console.log(`🟠 Auditor: ${nuevas.length} alerta(s) naranja nueva(s)`);
    } catch (e) {
      console.error('Auditor falló:', e);
    }
  }, minutos * 60 * 1000);
  timer.unref();
  return timer;
}

module.exports = {
  evaluarDesviacion,
  auditar,
  lineasBom,
  iniciarAuditorPeriodico,
  listar: (estado) => AlertaModel.list({ estado }),
  marcarRevisada: (id) => AlertaModel.setEstado(id, 'REVISADA', ahora()),
};
