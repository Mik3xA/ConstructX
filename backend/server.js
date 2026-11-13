const http = require('http');
const env = require('./src/config/env');
const app = require('./src/app');
const socketService = require('./src/servicios/socket.service');
const { iniciarAuditorPeriodico, auditar } = require('./src/servicios/alertas.service');
const emailService = require('./src/servicios/email.service');

const server = http.createServer(app);
socketService.iniciar(server);

server.listen(env.PORT, () => {
  console.log(`🏗  ConstructX API escuchando en http://localhost:${env.PORT}/api`);
  console.log(`⚡ Socket.io activo en ws://localhost:${env.PORT}`);
  console.log(
    emailService.modoDesarrollo()
      ? `✉️  Correo en modo desarrollo: los recibos se guardan en ${env.MAIL_DIR}`
      : `✉️  Correo vía SMTP ${env.SMTP_HOST}:${env.SMTP_PORT}`
  );
  const { activas } = auditar();
  console.log(`🟠 Auditor inicial: ${activas} alerta(s) activa(s). Tolerancia: ${env.ALERTA_TOLERANCIA}%`);
  iniciarAuditorPeriodico(env.ALERTA_INTERVALO_MIN);
});

const cerrar = () => {
  socketService.cerrar();
  server.close(() => process.exit(0));
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
