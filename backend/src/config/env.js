const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'buildsync-dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  DB_PATH: path.resolve(__dirname, '../../', process.env.DB_PATH || 'dev.db'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200',
  ALERTA_TOLERANCIA: Number(process.env.ALERTA_TOLERANCIA ?? 5),
  ALERTA_INTERVALO_MIN: Number(process.env.ALERTA_INTERVALO_MIN ?? 15),
};

if (env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción');
}

module.exports = env;
