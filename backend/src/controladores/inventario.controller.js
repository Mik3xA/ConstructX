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
    const { codigo_sku, nombre, unidad, categoria, descripcion, precio_unitario, imagen_url } = req.body || {};
    if (!codigo_sku || !nombre || !unidad) throw new HttpError(400, 'codigo_sku, nombre y unidad son obligatorios');
    const precio = Number(precio_unitario ?? 0);
    if (!Number.isFinite(precio) || precio < 0) throw new HttpError(400, 'precio_unitario debe ser >= 0');
    if (imagen_url && !/^https?:\/\//.test(imagen_url)) throw new HttpError(400, 'imagen_url debe ser una URL http(s)');
    res.status(201).json(
      MaterialModel.create({
        codigo_sku: String(codigo_sku).trim().toUpperCase(),
        nombre: String(nombre).trim(),
        unidad: String(unidad).trim(),
        categoria: categoria || 'General',
        descripcion: descripcion || null,
        precio_unitario: precio,
        imagen_url: imagen_url || null,
      })
    );
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
