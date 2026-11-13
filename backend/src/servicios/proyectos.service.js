const ProyectoModel = require('../modelos/proyecto.model');
const MaterialModel = require('../modelos/material.model');
const alertasService = require('./alertas.service');
const { HttpError } = require('../middlewares/error.middleware');

const ESTADOS_PROYECTO = ['PLANEACION', 'ACTIVO', 'PAUSADO', 'FINALIZADO'];
const ESTADOS_TAREA = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'];

function requerido(valor, campo) {
  if (valor == null || String(valor).trim() === '') throw new HttpError(400, `${campo} es obligatorio`);
  return String(valor).trim();
}

function validarPorcentaje(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new HttpError(400, 'porcentaje_avance_real debe estar entre 0 y 100');
  }
  return n;
}

const ProyectosService = {
  listar: () => ProyectoModel.list(),

  detalle(id) {
    const p = ProyectoModel.detalle(id);
    if (!p) throw new HttpError(404, 'Proyecto no encontrado');
    return p;
  },

  crear(body) {
    const estado = body.estado || 'ACTIVO';
    if (!ESTADOS_PROYECTO.includes(estado)) throw new HttpError(400, 'estado inválido');
    return ProyectoModel.create({
      nombre: requerido(body.nombre, 'nombre'),
      ubicacion: body.ubicacion ?? null,
      fecha_inicio: body.fecha_inicio ?? null,
      estado,
    });
  },

  actualizar(id, body) {
    if (body.estado && !ESTADOS_PROYECTO.includes(body.estado)) throw new HttpError(400, 'estado inválido');
    const campos = {};
    for (const k of ['nombre', 'ubicacion', 'fecha_inicio', 'estado']) if (k in body) campos[k] = body[k];
    const p = ProyectoModel.update(id, campos);
    if (!p) throw new HttpError(404, 'Proyecto no encontrado');
    return p;
  },

  crearFase(proyecto_id, body) {
    if (!ProyectoModel.findById(proyecto_id)) throw new HttpError(404, 'Proyecto no encontrado');
    return ProyectoModel.createFase(proyecto_id, {
      nombre: requerido(body.nombre, 'nombre'),
      porcentaje_avance_real: body.porcentaje_avance_real != null ? validarPorcentaje(body.porcentaje_avance_real) : 0,
    });
  },

  /**
   * El Residente reporta avance. Dispara el auditor sobre el proyecto.
   * `updated_at` opcional (sync offline): si es más antiguo que el del servidor, se ignora (last-write-wins).
   */
  actualizarAvance(fase_id, porcentaje, updated_at) {
    const fase = ProyectoModel.findFase(fase_id);
    if (!fase) throw new HttpError(404, 'Fase no encontrada');
    const pct = validarPorcentaje(porcentaje);

    let ts;
    if (updated_at) {
      const d = new Date(updated_at);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, 'updated_at inválido');
      ts = d.toISOString();
      if (ts <= fase.updated_at) return { fase, aplicado: false };
    }

    const actualizada = ProyectoModel.updateAvance(fase_id, pct, ts);
    alertasService.auditar({ proyecto_id: fase.proyecto_id });
    return { fase: actualizada, aplicado: true };
  },

  crearTarea(fase_id, body) {
    if (!ProyectoModel.findFase(fase_id)) throw new HttpError(404, 'Fase no encontrada');
    const estado = body.estado || 'PENDIENTE';
    if (!ESTADOS_TAREA.includes(estado)) throw new HttpError(400, 'estado inválido');
    return ProyectoModel.createTarea(fase_id, { nombre: requerido(body.nombre, 'nombre'), estado });
  },

  actualizarEstadoTarea(tarea_id, estado) {
    if (!ESTADOS_TAREA.includes(estado)) throw new HttpError(400, 'estado inválido');
    const t = ProyectoModel.updateTareaEstado(tarea_id, estado);
    if (!t) throw new HttpError(404, 'Tarea no encontrada');
    return t;
  },

  definirBom(tarea_id, body) {
    const tarea = ProyectoModel.findTarea(tarea_id);
    if (!tarea) throw new HttpError(404, 'Tarea no encontrada');
    if (!body.material_id || !MaterialModel.findById(body.material_id)) {
      throw new HttpError(404, 'material_id no existe');
    }
    const cantidad = Number(body.cantidad_presupuestada);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new HttpError(400, 'cantidad_presupuestada debe ser mayor a 0');
    }
    const linea = ProyectoModel.upsertBom(tarea_id, { material_id: body.material_id, cantidad_presupuestada: cantidad });
    alertasService.auditar({ tarea_id });
    return linea;
  },
};

module.exports = ProyectosService;
