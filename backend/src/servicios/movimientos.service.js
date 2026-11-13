/**
 * Registro de movimientos de material (libro contable).
 *
 * - Cada movimiento se identifica por un UUIDv4 (generado por el cliente o aquí).
 * - Registrar dos veces el mismo UUID es IDEMPOTENTE: no se reaplica el efecto sobre el stock.
 * - Efectos sobre inventario_central:
 *     INGRESO_BODEGA  -> +cantidad
 *     ENVIO_OBRA      -> -cantidad (rechazado si no hay stock)
 *     CONSUMO_OBRA    -> sin efecto (el material ya salió de bodega)
 *     SALIDA_FLETE    -> lo genera exclusivamente pedidos.service.js al confirmar un pedido
 */
const { randomUUID } = require('crypto');
const { db, ahora } = require('../config/database');
const MovimientoModel = require('../modelos/movimiento.model');
const MaterialModel = require('../modelos/material.model');
const ProyectoModel = require('../modelos/proyecto.model');
const { HttpError } = require('../middlewares/error.middleware');
const { ROLES } = require('../middlewares/auth.middleware');

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Qué rol (además de admin) puede registrar cada tipo. */
const ROLES_POR_TIPO = Object.freeze({
  INGRESO_BODEGA: [ROLES.BODEGUERO],
  ENVIO_OBRA: [ROLES.BODEGUERO],
  CONSUMO_OBRA: [ROLES.RESIDENTE],
});

function puedeRegistrar(rol, tipo) {
  return rol === ROLES.ADMIN || (ROLES_POR_TIPO[tipo] || []).includes(rol);
}

function validarTimestamp(ts) {
  if (ts == null) return ahora();
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'timestamp inválido (usar ISO-8601)');
  return d.toISOString();
}

/**
 * Registra un movimiento dentro de una transacción.
 * @param {object} data  { uuid?, tipo, material_id, cantidad, proyecto_id?, tarea_id?, timestamp? }
 * @param {object} usuario  { id, rol }
 * @returns {{ movimiento: object, duplicado: boolean }}
 */
function registrar(data, usuario) {
  const uuid = data.uuid || randomUUID();
  if (!UUID_V4.test(uuid)) throw new HttpError(400, 'uuid debe ser un UUIDv4 válido');

  // Idempotencia: si ya existe, no se vuelve a aplicar.
  const existente = MovimientoModel.findByUuid(uuid);
  if (existente) return { movimiento: existente, duplicado: true };

  const { tipo, material_id } = data;
  const cantidad = Number(data.cantidad);

  if (!MovimientoModel.TIPOS.includes(tipo)) {
    throw new HttpError(400, `tipo inválido. Valores: ${MovimientoModel.TIPOS.join(', ')}`);
  }
  if (tipo === 'SALIDA_FLETE') {
    throw new HttpError(400, 'SALIDA_FLETE se genera automáticamente al confirmar un pedido de flete');
  }
  if (!puedeRegistrar(usuario.rol, tipo)) {
    throw new HttpError(403, `El rol '${usuario.rol}' no puede registrar ${tipo}`);
  }
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new HttpError(400, 'cantidad debe ser un número mayor a 0');
  }
  if (!material_id || !MaterialModel.findById(material_id)) {
    throw new HttpError(404, 'material_id no existe en el catálogo');
  }

  let proyecto_id = data.proyecto_id || null;
  let tarea_id = data.tarea_id || null;

  if (tarea_id) {
    const tarea = ProyectoModel.findTarea(tarea_id);
    if (!tarea) throw new HttpError(404, 'tarea_id no existe');
    if (proyecto_id && proyecto_id !== tarea.proyecto_id) {
      throw new HttpError(400, 'tarea_id no pertenece al proyecto_id indicado');
    }
    proyecto_id = tarea.proyecto_id;
  }
  if (proyecto_id && !ProyectoModel.findById(proyecto_id)) {
    throw new HttpError(404, 'proyecto_id no existe');
  }

  if (tipo === 'ENVIO_OBRA' && !proyecto_id) {
    throw new HttpError(400, 'ENVIO_OBRA requiere proyecto_id');
  }
  if (tipo === 'CONSUMO_OBRA' && !tarea_id) {
    throw new HttpError(400, 'CONSUMO_OBRA requiere tarea_id');
  }

  const t = ahora();
  const nuevo = {
    uuid,
    proyecto_id,
    tarea_id,
    material_id,
    cantidad,
    tipo,
    usuario_id: usuario.id,
    timestamp: validarTimestamp(data.timestamp),
    created_at: t,
    updated_at: t,
  };

  const ejecutar = db.transaction(() => {
    if (tipo === 'INGRESO_BODEGA') {
      MaterialModel.ajustarStock(material_id, cantidad);
    } else if (tipo === 'ENVIO_OBRA') {
      const stock = MaterialModel.stock(material_id);
      if (stock < cantidad) {
        throw new HttpError(409, 'Stock insuficiente en inventario central', {
          stock_actual: stock,
          solicitado: cantidad,
        });
      }
      MaterialModel.ajustarStock(material_id, -cantidad);
    }
    return MovimientoModel.insert(nuevo);
  });

  return { movimiento: ejecutar(), duplicado: false };
}

module.exports = { registrar, puedeRegistrar, ROLES_POR_TIPO, UUID_V4 };
