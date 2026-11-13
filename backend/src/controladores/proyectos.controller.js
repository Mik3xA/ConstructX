const ProyectosService = require('../servicios/proyectos.service');

module.exports = {
  listar: (req, res) => res.json(ProyectosService.listar()),
  detalle: (req, res) => res.json(ProyectosService.detalle(req.params.id)),
  crear: (req, res) => res.status(201).json(ProyectosService.crear(req.body || {})),
  actualizar: (req, res) => res.json(ProyectosService.actualizar(req.params.id, req.body || {})),

  crearFase: (req, res) => res.status(201).json(ProyectosService.crearFase(req.params.id, req.body || {})),
  actualizarAvance: (req, res) => {
    const { porcentaje_avance_real, updated_at } = req.body || {};
    const { fase, aplicado } = ProyectosService.actualizarAvance(req.params.id, porcentaje_avance_real, updated_at);
    res.json({ ...fase, aplicado });
  },

  crearTarea: (req, res) => res.status(201).json(ProyectosService.crearTarea(req.params.id, req.body || {})),
  actualizarEstadoTarea: (req, res) =>
    res.json(ProyectosService.actualizarEstadoTarea(req.params.id, (req.body || {}).estado)),

  definirBom: (req, res) => res.status(201).json(ProyectosService.definirBom(req.params.id, req.body || {})),
};
