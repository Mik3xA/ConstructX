/**
 * Solicitudes de material: el Residente pide material para su obra y la Bodega
 * la aprueba (genera un ENVIO_OBRA y descuenta inventario en la MISMA transacción)
 * o la rechaza con un motivo. Ambos lados se enteran en tiempo real.
 */
const { randomUUID } = require('crypto');
const { db, ahora } = require('../config/database');
const SolicitudModel = require('../modelos/solicitud.model');
const MaterialModel = require('../modelos/material.model');
const ProyectoModel = require('../modelos/proyecto.model');
const movimientosService = require('./movimientos.service');
const socketService = require('./socket.service');
const { HttpError } = require('../middlewares/error.middleware');

function crear(usuario, { proyecto_id, tarea_id, material_id, cantidad, notas }, { notificar = true } = {}) {
  const n = Number(cantidad);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, 'cantidad debe ser mayor a 0');
  if (!material_id || !MaterialModel.findById(material_id)) throw new HttpError(404, 'material_id no existe');
  if (tarea_id) {
    const tarea = ProyectoModel.findTarea(tarea_id);
    if (!tarea) throw new HttpError(404, 'tarea_id no existe');
    proyecto_id = tarea.proyecto_id;
  }
  if (!proyecto_id || !ProyectoModel.findById(proyecto_id)) throw new HttpError(404, 'proyecto_id no existe');

  const id = randomUUID();
  SolicitudModel.insert({
    id,
    proyecto_id,
    tarea_id: tarea_id || null,
    material_id,
    cantidad: n,
    notas: notas ? String(notas).slice(0, 300) : null,
    solicitante_id: usuario.id,
    t: ahora(),
  });
  const s = SolicitudModel.findById(id);
  if (notificar) socketService.emitir(socketService.SALAS.STAFF, 'solicitud_material', s);
  return s;
}

function pendiente(id) {
  const s = SolicitudModel.findById(id);
  if (!s) throw new HttpError(404, 'Solicitud no encontrada');
  if (s.estado !== 'PENDIENTE') throw new HttpError(409, `La solicitud ya fue ${s.estado.toLowerCase()}`);
  return s;
}

function avisar(s) {
  socketService.emitir([...socketService.SALAS.STAFF, socketService.SALAS.usuario(s.solicitante_id)], 'solicitud_actualizada', s);
}

/** Aprueba: registra ENVIO_OBRA (valida y descuenta stock) y marca la solicitud, todo o nada. */
function aprobar(id, usuario, { notificar = true } = {}) {
  db.transaction(() => {
    const s = pendiente(id);
    const { movimiento } = movimientosService.registrar(
      { tipo: 'ENVIO_OBRA', material_id: s.material_id, cantidad: s.cantidad, proyecto_id: s.proyecto_id },
      usuario
    );
    SolicitudModel.resolver(id, { estado: 'APROBADA', atendido_por: usuario.id, movimiento_uuid: movimiento.uuid, t: ahora() });
  })();
  const s = SolicitudModel.findById(id);
  if (notificar) avisar(s);
  return s;
}

function rechazar(id, usuario, motivo, { notificar = true } = {}) {
  pendiente(id);
  const m = String(motivo || '').trim();
  if (!m) throw new HttpError(400, 'Indica el motivo del rechazo');
  SolicitudModel.resolver(id, { estado: 'RECHAZADA', atendido_por: usuario.id, motivo_rechazo: m.slice(0, 300), t: ahora() });
  const s = SolicitudModel.findById(id);
  if (notificar) avisar(s);
  return s;
}

function listar(usuario, { estado } = {}) {
  if (estado && !SolicitudModel.ESTADOS.includes(estado)) throw new HttpError(400, 'estado inválido');
  // El residente solo ve las suyas
  const solicitante_id = usuario.rol === 'residente' ? usuario.id : undefined;
  return SolicitudModel.list({ estado, solicitante_id });
}

module.exports = { crear, aprobar, rechazar, listar };
