const env = require('./src/config/env');
const app = require('./src/app');
const { iniciarAuditorPeriodico, auditar } = require('./src/servicios/alertas.service');

const server = app.listen(env.PORT, () => {
  console.log(`🏗  BuildSync API escuchando en http://localhost:${env.PORT}/api`);
  const { activas } = auditar();
  console.log(`🟠 Auditor inicial: ${activas} alerta(s) activa(s). Tolerancia: ${env.ALERTA_TOLERANCIA}%`);
  iniciarAuditorPeriodico(env.ALERTA_INTERVALO_MIN);
});

const cerrar = () => server.close(() => process.exit(0));
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
