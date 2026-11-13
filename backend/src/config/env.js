const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const num = (v, def) => (v === undefined || v === '' ? def : Number(v));

const env = {
  PORT: num(process.env.PORT, 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'constructx-dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  DB_PATH: path.resolve(__dirname, '../../', process.env.DB_PATH || 'dev.db'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200',

  // Algoritmo auditor (regla de negocio: 5 puntos porcentuales)
  ALERTA_TOLERANCIA: num(process.env.ALERTA_TOLERANCIA, 5),
  ALERTA_INTERVALO_MIN: num(process.env.ALERTA_INTERVALO_MIN, 15),

  // Tarifa de flete (MXN): base + % del subtotal; gratis a partir de cierto monto
  FLETE_BASE: num(process.env.FLETE_BASE, 450),
  FLETE_PORCENTAJE: num(process.env.FLETE_PORCENTAJE, 0.03),
  FLETE_GRATIS_DESDE: num(process.env.FLETE_GRATIS_DESDE, 25000),

  // Correo (Nodemailer). Sin SMTP_HOST los recibos se guardan como .html en MAIL_DIR.
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: num(process.env.SMTP_PORT, 587),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'ConstructX <no-reply@constructx.mx>',
  MAIL_DIR: path.resolve(__dirname, '../../', process.env.MAIL_DIR || 'correos'),
};

if (env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción');
}

module.exports = env;
