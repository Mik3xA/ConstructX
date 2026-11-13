/** Funciones de gestión para el equipo interno (solicitudes, mensajes, reportes, inventario, usuarios). */
const bcrypt = require('bcryptjs');
const solicitudesService = require('../servicios/solicitudes.service');
const MensajeModel = require('../modelos/mensaje.model');
const PedidoModel = require('../modelos/pedido.model');
const MaterialModel = require('../modelos/material.model');
const UserModel = require('../modelos/user.model');
const { ROLES } = require('../middlewares/auth.middleware');
const { HttpError } = require('../middlewares/error.middleware');

module.exports = {
  // ---------- Solicitudes de material ----------
  crearSolicitud: (req, res) => res.status(201).json(solicitudesService.crear(req.user, req.body || {})),
  listarSolicitudes: (req, res) => res.json(solicitudesService.listar(req.user, req.query)),
  aprobarSolicitud: (req, res) => res.json(solicitudesService.aprobar(req.params.id, req.user)),
  rechazarSolicitud: (req, res) => res.json(solicitudesService.rechazar(req.params.id, req.user, (req.body || {}).motivo)),

  // ---------- Mensajes de contacto ----------
  listarMensajes: (req, res) => res.json(MensajeModel.list()),
  marcarMensaje(req, res) {
    const m = MensajeModel.marcarLeido(req.params.id, (req.body || {}).leido !== false);
    if (!m) throw new HttpError(404, 'Mensaje no encontrado');
    res.json(m);
  },

  // ---------- Reportes ----------
  reporteVentas(req, res) {
    const dias = Math.min(Math.max(parseInt(req.query.dias, 10) || 30, 1), 365);
    res.json(PedidoModel.reporteVentas(dias));
  },

  // ---------- Inventario ----------
  fijarStockMinimo(req, res) {
    const n = Number((req.body || {}).stock_minimo);
    if (!Number.isFinite(n) || n < 0) throw new HttpError(400, 'stock_minimo debe ser un número >= 0');
    if (!MaterialModel.fijarStockMinimo(req.params.materialId, n)) throw new HttpError(404, 'Material no encontrado');
    res.json({ ok: true, material_id: req.params.materialId, stock_minimo: n });
  },

  // ---------- Usuarios (Admin) ----------
  listarUsuarios: (req, res) => res.json(UserModel.list({ rol: req.query.rol })),

  async actualizarUsuario(req, res) {
    const u = UserModel.findById(req.params.id);
    if (!u) throw new HttpError(404, 'Usuario no encontrado');
    const { rol, activo, nombre, telefono, password } = req.body || {};
    if (rol !== undefined && !Object.values(ROLES).includes(rol)) throw new HttpError(400, 'rol inválido');
    if (req.params.id === req.user.id && (activo === false || (rol && rol !== ROLES.ADMIN))) {
      throw new HttpError(400, 'No puedes desactivarte ni quitarte el rol de administrador');
    }
    const actualizado = UserModel.update(req.params.id, { rol, activo, nombre, telefono });
    if (password) {
      if (String(password).length < 8) throw new HttpError(400, 'password debe tener al menos 8 caracteres');
      UserModel.setPassword(req.params.id, await bcrypt.hash(String(password), 10));
    }
    res.json(actualizado);
  },
};
