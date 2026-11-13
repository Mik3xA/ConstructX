/**
 * Arranca una instancia aislada del servidor para pruebas:
 * BD temporal, carpeta de correos temporal, puerto aleatorio y Socket.io real.
 * Debe requerirse ANTES que cualquier módulo de src/ (fija las variables de entorno).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'constructx-test-'));
process.env.DB_PATH = path.join(tmp, 'test.db');
process.env.MAIL_DIR = path.join(tmp, 'correos');
process.env.ALERTA_INTERVALO_MIN = '0';
process.env.SMTP_HOST = '';
process.env.JWT_SECRET = 'test-secret';
process.env.FLETE_BASE = '450';
process.env.FLETE_PORCENTAJE = '0.03';
process.env.FLETE_GRATIS_DESDE = '25000';

const { io: ioClient } = require('socket.io-client');
const app = require('../src/app');
const socketService = require('../src/servicios/socket.service');
const { sembrar, PASSWORD_DEMO } = require('../src/config/seed');

async function iniciarServidor() {
  const datos = sembrar();
  const server = http.createServer(app);
  socketService.iniciar(server);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;

  /** Petición JSON. Devuelve { status, body }. */
  async function api(metodo, ruta, { token, body } = {}) {
    const res = await fetch(`${base}/api${ruta}`, {
      method: metodo,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const texto = await res.text();
    return { status: res.status, body: texto ? JSON.parse(texto) : null };
  }

  async function login(email, password = PASSWORD_DEMO) {
    const { status, body } = await api('POST', '/auth/login', { body: { email, password } });
    if (status !== 200) throw new Error(`login ${email} -> ${status}`);
    return body.token;
  }

  /** Conecta un socket autenticado y espera a que esté listo. */
  function conectarSocket(token) {
    return new Promise((resolve, reject) => {
      const s = ioClient(base, { auth: { token }, transports: ['websocket'], reconnection: false });
      s.on('connect', () => resolve(s));
      s.on('connect_error', (e) => {
        s.close();
        reject(e);
      });
    });
  }

  function esperarEvento(socket, evento, ms = 2000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout esperando ${evento}`)), ms);
      socket.once(evento, (payload) => {
        clearTimeout(t);
        resolve(payload);
      });
    });
  }

  async function cerrar() {
    socketService.cerrar();
    await new Promise((r) => server.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return { base, api, login, conectarSocket, esperarEvento, cerrar, datos, mailDir: process.env.MAIL_DIR };
}

/** Reintenta `fn` hasta que devuelva algo truthy (para efectos asíncronos como el correo). */
async function eventualmente(fn, ms = 2000) {
  const fin = Date.now() + ms;
  for (;;) {
    const r = await fn();
    if (r) return r;
    if (Date.now() > fin) throw new Error('condición no cumplida a tiempo');
    await new Promise((res) => setTimeout(res, 25));
  }
}

module.exports = { iniciarServidor, eventualmente };
