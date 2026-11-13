/** Error de negocio con código HTTP. */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  if (err.code && String(err.code).startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ error: 'Violación de integridad de datos', details: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

/** Envuelve handlers para que los errores lleguen al errorHandler. */
const asyncHandler = (fn) => (req, res, next) => {
  try {
    const r = fn(req, res, next);
    if (r && typeof r.catch === 'function') r.catch(next);
  } catch (e) {
    next(e);
  }
};

module.exports = { HttpError, notFound, errorHandler, asyncHandler };
