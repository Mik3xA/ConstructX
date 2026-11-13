const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

const ROLES = Object.freeze({
  ADMIN: 'admin',
  BODEGUERO: 'bodeguero',
  RESIDENTE: 'residente',
  CLIENTE: 'cliente',
});

/**
 * Verifica el JWT del header Authorization: Bearer <token>.
 * Adjunta el payload en req.user = { id, email, rol, nombre }.
 */
function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // La cuenta debe seguir existiendo y activa (un admin puede desactivarla en cualquier momento)
    const UserModel = require('../modelos/user.model');
    const estado = UserModel.estado(payload.sub);
    if (!estado || !estado.activo) return res.status(401).json({ error: 'Sesión no válida: cuenta desactivada' });
    req.user = { id: payload.sub, email: payload.email, rol: estado.rol, nombre: payload.nombre };
    return next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    return res.status(401).json({ error: msg });
  }
}

/**
 * Guardia de roles (RBAC). El admin siempre tiene acceso total.
 *   router.get('/x', verifyToken, verifyRole('bodeguero'), handler)
 */
function verifyRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const { rol } = req.user;
    if (rol === ROLES.ADMIN || rolesPermitidos.includes(rol)) return next();
    return res.status(403).json({ error: `Acceso denegado para el rol '${rol}'` });
  };
}

module.exports = { verifyToken, verifyRole, ROLES };
