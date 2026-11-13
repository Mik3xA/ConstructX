const alertasService = require('../servicios/alertas.service');
const dashboardService = require('../servicios/dashboard.service');
const { HttpError } = require('../middlewares/error.middleware');

const ESTADOS = ['ACTIVA', 'REVISADA', 'RESUELTA'];

module.exports = {
  /** GET /api/alertas?estado=ACTIVA */
  listar(req, res) {
    const { estado } = req.query;
    if (estado && !ESTADOS.includes(estado)) throw new HttpError(400, 'estado inválido');
    res.json(alertasService.listar(estado));
  },

  /** POST /api/alertas/auditar  -> fuerza una corrida del auditor */
  auditar(req, res) {
    res.json(alertasService.auditar(req.body || {}));
  },

  /** PATCH /api/alertas/:id/revisar */
  revisar(req, res) {
    const a = alertasService.marcarRevisada(req.params.id);
    if (!a) throw new HttpError(404, 'Alerta no encontrada');
    res.json(a);
  },

  /** GET /api/dashboard */
  dashboard: (req, res) => res.json(dashboardService.resumen()),
};
