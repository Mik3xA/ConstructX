/**
 * Motor de tiempo real (Socket.io).
 *
 * Autenticación: el cliente se conecta con `io(URL, { auth: { token: <JWT> } })`.
 * Salas:
 *   - `rol:<rol>`   (rol:admin, rol:bodeguero, ...)
 *   - `user:<id>`   (notificaciones personales, p. ej. el cliente que hizo el pedido)
 *
 * Eventos emitidos por el servidor:
 *   - nuevo_flete         -> rol:admin, rol:bodeguero       (payload: pedido completo)
 *   - flete_actualizado   -> rol:admin, rol:bodeguero, user:<cliente_id>
 *   - inventario_actualizado -> rol:admin, rol:bodeguero
 *   - alerta_naranja      -> rol:admin
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, CORS_ORIGIN } = require('../config/env');

let io = null;

const SALAS = Object.freeze({
  STAFF: ['rol:admin', 'rol:bodeguero'],
  ADMIN: ['rol:admin'],
  usuario: (id) => `user:${id}`,
});

function iniciar(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: CORS_ORIGIN.split(',').map((o) => o.trim()) },
  });

  // Middleware de autenticación: misma verificación JWT que la API REST.
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Token no proporcionado'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.data.user = { id: payload.sub, rol: payload.rol, nombre: payload.nombre };
      return next();
    } catch {
      return next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { id, rol } = socket.data.user;
    socket.join([`rol:${rol}`, SALAS.usuario(id)]);
  });

  return io;
}

/** Emite un evento a una o varias salas. No hace nada si Socket.io no está iniciado (scripts, seed). */
function emitir(salas, evento, payload) {
  if (!io) return false;
  io.to(salas).emit(evento, payload);
  return true;
}

function cerrar() {
  if (io) io.close();
  io = null;
}

module.exports = { iniciar, emitir, cerrar, SALAS };
