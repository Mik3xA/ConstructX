const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../modelos/user.model');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { ROLES } = require('../middlewares/auth.middleware');
const { HttpError } = require('../middlewares/error.middleware');

// Hash señuelo para igualar tiempos cuando el email no existe.
const DUMMY_HASH = bcrypt.hashSync('constructx-dummy', 10);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function firmarToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/** POST /api/auth/login  (pública) */
async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, 'email y password son obligatorios');

  const user = UserModel.findByEmail(String(email).trim());
  // Comparar siempre para no filtrar si el email existe por diferencia de tiempos.
  const ok = await bcrypt.compare(String(password), user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Credenciales inválidas');
  if (!user.activo) throw new HttpError(403, 'Tu cuenta está desactivada. Contacta al administrador.');

  const { password_hash, ...publico } = user; // eslint-disable-line no-unused-vars
  res.json({ token: firmarToken(publico), user: publico });
}

/** POST /api/auth/register  (solo Admin crea usuarios) */
async function register(req, res) {
  const { email, password, rol, nombre } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, 'email inválido');
  if (!password || String(password).length < 8) throw new HttpError(400, 'password debe tener al menos 8 caracteres');
  if (!Object.values(ROLES).includes(rol)) throw new HttpError(400, `rol inválido. Valores: ${Object.values(ROLES).join(', ')}`);
  if (!nombre) throw new HttpError(400, 'nombre es obligatorio');
  if (UserModel.findByEmail(email)) throw new HttpError(409, 'El email ya está registrado');

  const password_hash = await bcrypt.hash(String(password), 10);
  const user = UserModel.create({ email: email.trim(), password_hash, rol, nombre: nombre.trim() });
  res.status(201).json(user);
}

/**
 * POST /api/auth/registro  (pública) — alta de CLIENTES del portal.
 * El rol siempre es 'cliente'; los roles internos solo los crea el Admin.
 */
async function registroCliente(req, res) {
  const { email, password, nombre, telefono, empresa, direccion } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, 'email inválido');
  if (!password || String(password).length < 8) throw new HttpError(400, 'password debe tener al menos 8 caracteres');
  if (!nombre || !String(nombre).trim()) throw new HttpError(400, 'nombre es obligatorio');
  if (UserModel.findByEmail(email)) throw new HttpError(409, 'El email ya está registrado');

  const password_hash = await bcrypt.hash(String(password), 10);
  const user = UserModel.create({
    email: email.trim(),
    password_hash,
    rol: ROLES.CLIENTE,
    nombre: String(nombre).trim(),
    telefono: telefono || null,
    empresa: empresa || null,
    direccion: direccion || null,
  });
  res.status(201).json({ token: firmarToken(user), user });
}

/** GET /api/auth/me */
function me(req, res) {
  const user = UserModel.findById(req.user.id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  res.json(user);
}

/** PATCH /api/auth/me  — el usuario edita su perfil (no su rol ni su estado). */
async function actualizarPerfil(req, res) {
  const { nombre, telefono, empresa, direccion, password_actual, password_nueva } = req.body || {};
  if (nombre !== undefined && !String(nombre).trim()) throw new HttpError(400, 'nombre no puede quedar vacío');
  if (password_nueva) {
    if (String(password_nueva).length < 8) throw new HttpError(400, 'La nueva contraseña debe tener al menos 8 caracteres');
    const completo = UserModel.findByEmail(req.user.email);
    if (!completo || !(await bcrypt.compare(String(password_actual || ''), completo.password_hash))) {
      throw new HttpError(400, 'La contraseña actual no es correcta');
    }
    UserModel.setPassword(req.user.id, await bcrypt.hash(String(password_nueva), 10));
  }
  const user = UserModel.update(req.user.id, {
    nombre: nombre !== undefined ? String(nombre).trim() : undefined,
    telefono,
    empresa,
    direccion,
  });
  res.json(user);
}

/** GET /api/auth/users  (Admin) */
function listUsers(req, res) {
  res.json(UserModel.list());
}

module.exports = { login, register, registroCliente, me, actualizarPerfil, listUsers };
