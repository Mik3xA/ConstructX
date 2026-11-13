const MaterialModel = require('../modelos/material.model');
const { HttpError } = require('../middlewares/error.middleware');
const { calcularFlete } = require('../servicios/pedidos.service');
const env = require('../config/env');

module.exports = {
  /** GET /api/catalogo?categoria=&q=  -> materiales con precio, imagen y stock disponible */
  listar(req, res) {
    const { categoria, q } = req.query;
    res.json({
      categorias: MaterialModel.categorias(),
      materiales: MaterialModel.catalogo({ categoria, q: q ? String(q).slice(0, 80) : undefined }),
      tarifa_flete: {
        base: env.FLETE_BASE,
        porcentaje: env.FLETE_PORCENTAJE,
        gratis_desde: env.FLETE_GRATIS_DESDE,
        ejemplo_10000: calcularFlete(10000),
      },
    });
  },

  /** PATCH /api/materiales/:id  (Admin) precio, imagen, descripción, categoría, activo */
  actualizar(req, res) {
    const actual = MaterialModel.findById(req.params.id);
    if (!actual) throw new HttpError(404, 'Material no encontrado');
    const b = req.body || {};
    if ('precio_unitario' in b && !(Number(b.precio_unitario) >= 0)) {
      throw new HttpError(400, 'precio_unitario debe ser un número >= 0');
    }
    if (b.imagen_url && !/^https?:\/\//.test(b.imagen_url)) throw new HttpError(400, 'imagen_url debe ser una URL http(s)');
    res.json(MaterialModel.update(req.params.id, b));
  },
};
