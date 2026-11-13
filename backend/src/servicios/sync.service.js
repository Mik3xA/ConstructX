/**
 * Sincronización Offline-First (preparado para el cliente Flutter).
 *
 * PUSH: el cliente envía lo que generó sin conexión.
 *   - movimientos:  upsert por uuid (idempotente; los existentes se reportan como duplicados).
 *   - fases_avance: last-write-wins por updated_at.
 *   - pedidos:      pedidos de flete creados offline por un Cliente (idempotentes por uuid).
 * PULL: el servidor devuelve todo lo que cambió después de `last_sync`.
 *
 * Cada elemento se procesa de forma independiente: un error en uno no bloquea al resto.
 */
const { ahora } = require('../config/database');
const movimientosService = require('./movimientos.service');
const proyectosService = require('./proyectos.service');
const alertasService = require('./alertas.service');
const ProyectoModel = require('../modelos/proyecto.model');
const MaterialModel = require('../modelos/material.model');
const MovimientoModel = require('../modelos/movimiento.model');
const AlertaModel = require('../modelos/alerta.model');
const PedidoModel = require('../modelos/pedido.model');
const pedidosService = require('./pedidos.service');
const { ROLES } = require('../middlewares/auth.middleware');
const { HttpError } = require('../middlewares/error.middleware');

const MAX_LOTE = 500;

function normalizarLastSync(last_sync) {
  if (!last_sync) return '1970-01-01T00:00:00.000Z';
  const d = new Date(last_sync);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'last_sync inválido (usar ISO-8601)');
  return d.toISOString();
}

function sincronizar({ last_sync, movimientos = [], fases_avance = [], pedidos = [] }, usuario) {
  if (!Array.isArray(movimientos) || !Array.isArray(fases_avance) || !Array.isArray(pedidos)) {
    throw new HttpError(400, 'movimientos, fases_avance y pedidos deben ser arreglos');
  }
  if (movimientos.length + fases_avance.length + pedidos.length > MAX_LOTE) {
    throw new HttpError(413, `El lote excede ${MAX_LOTE} elementos`);
  }

  // Se fija ANTES de procesar para que el cliente no pierda cambios concurrentes.
  const server_time = ahora();
  const desde = normalizarLastSync(last_sync);

  const resultado = {
    movimientos: { aplicados: [], duplicados: [], rechazados: [] },
    fases_avance: { aplicados: [], ignorados: [], rechazados: [] },
    pedidos: { aplicados: [], duplicados: [], rechazados: [] },
  };

  for (const m of movimientos) {
    try {
      if (!m || !m.uuid) throw new HttpError(400, 'Cada movimiento sincronizado debe traer su uuid');
      const { duplicado } = movimientosService.registrar(m, usuario);
      resultado.movimientos[duplicado ? 'duplicados' : 'aplicados'].push(m.uuid);
    } catch (e) {
      resultado.movimientos.rechazados.push({ uuid: m && m.uuid, status: e.status || 500, error: e.message });
    }
  }

  for (const f of fases_avance) {
    try {
      if (![ROLES.ADMIN, ROLES.RESIDENTE].includes(usuario.rol)) {
        throw new HttpError(403, `El rol '${usuario.rol}' no puede actualizar avance`);
      }
      const { aplicado } = proyectosService.actualizarAvance(f.fase_id, f.porcentaje_avance_real, f.updated_at);
      resultado.fases_avance[aplicado ? 'aplicados' : 'ignorados'].push(f.fase_id);
    } catch (e) {
      resultado.fases_avance.rechazados.push({ fase_id: f && f.fase_id, status: e.status || 500, error: e.message });
    }
  }

  for (const p of pedidos) {
    try {
      if (usuario.rol !== ROLES.CLIENTE && usuario.rol !== ROLES.ADMIN) {
        throw new HttpError(403, `El rol '${usuario.rol}' no puede crear pedidos de flete`);
      }
      if (!p || !p.uuid) throw new HttpError(400, 'Cada pedido sincronizado debe traer su uuid');
      const { duplicado } = pedidosService.crear(usuario, p);
      resultado.pedidos[duplicado ? 'duplicados' : 'aplicados'].push(p.uuid);
    } catch (e) {
      resultado.pedidos.rechazados.push({ uuid: p && p.uuid, status: e.status || 500, error: e.message, details: e.details });
    }
  }

  if (resultado.movimientos.aplicados.length) alertasService.auditar();

  // El cliente solo descarga el catálogo y SUS pedidos (nunca datos internos de obra).
  if (usuario.rol === ROLES.CLIENTE) {
    return {
      server_time,
      resultado,
      cambios: {
        catalogo_materiales: MaterialModel.cambiosDesde(desde).catalogo_materiales,
        pedidos_fletes: PedidoModel.cambiosDesde(desde, usuario.id),
      },
    };
  }

  const cambios = {
    pedidos_fletes: PedidoModel.cambiosDesde(desde),
    ...ProyectoModel.cambiosDesde(desde),
    ...MaterialModel.cambiosDesde(desde),
    movimientos: MovimientoModel.cambiosDesde(desde),
  };
  if (usuario.rol === ROLES.ADMIN) {
    cambios.alertas = AlertaModel.list().filter((a) => a.updated_at > desde);
  }

  return { server_time, resultado, cambios };
}

module.exports = { sincronizar };
