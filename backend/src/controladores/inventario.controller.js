const MaterialModel = require('../modelos/material.model');
const MovimientoModel = require('../modelos/movimiento.model');
const movimientosService = require('../servicios/movimientos.service');
const alertasService = require('../servicios/alertas.service');
const { HttpError } = require('../middlewares/error.middleware');

module.exports = {
  /** GET /api/materiales */
  listarMateriales: (req, res) => res.json(MaterialModel.list()),

  /** POST /api/materiales  (Admin) */
  crearMaterial(req, res) {
    const { codigo_sku, nombre, unidad } = req.body || {};
    if (!codigo_sku || !nombre || !unidad) throw new HttpError(400, 'codigo_sku, nombre y unidad son obligatorios');
    res.status(201).json(MaterialModel.create({ codigo_sku, nombre, unidad }));
  },

  /** GET /api/inventario */
  inventario: (req, res) => res.json(MaterialModel.inventario()),

  /** GET /api/movimientos?tipo=&proyecto_id=&tarea_id=&material_id=&limit=&offset= */
  listarMovimientos: (req, res) => res.json(MovimientoModel.list(req.query)),

  /**
   * POST /api/movimientos
   * El rol se valida por tipo dentro del servicio (bodeguero: INGRESO/ENVIO, residente: CONSUMO).
   * 201 = creado, 200 = ya existía (idempotente).
   */
  registrarMovimiento(req, res) {
    const { movimiento, duplicado } = movimientosService.registrar(req.body || {}, req.user);
    if (!duplicado && movimiento.tipo === 'CONSUMO_OBRA') {
      alertasService.auditar({ tarea_id: movimiento.tarea_id });
    }
    res.status(duplicado ? 200 : 201).json({ ...movimiento, duplicado });
  },
};
