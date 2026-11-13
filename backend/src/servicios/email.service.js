/**
 * Envío de correos con Nodemailer.
 *
 * - Con SMTP_HOST configurado: se envía por SMTP real.
 * - Sin SMTP (desarrollo): no se envía nada a internet; el recibo se guarda como
 *   `<MAIL_DIR>/recibo-<folio>.html` para abrirlo en el navegador.
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const env = require('../config/env');
const { renderRecibo } = require('./plantillas/recibo.html');

let transporter = null;

function modoDesarrollo() {
  return !env.SMTP_HOST;
}

function obtenerTransporter() {
  if (transporter) return transporter;
  transporter = modoDesarrollo()
    ? nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' })
    : nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      });
  return transporter;
}

/**
 * Envía el recibo del pedido al correo del cliente.
 * @returns {Promise<{ enviado: boolean, archivo?: string, messageId?: string }>}
 */
async function enviarRecibo(pedido, destinatario) {
  const { asunto, html, texto } = renderRecibo(pedido);
  const info = await obtenerTransporter().sendMail({
    from: env.MAIL_FROM,
    to: destinatario,
    subject: asunto,
    text: texto,
    html,
  });

  if (modoDesarrollo()) {
    fs.mkdirSync(env.MAIL_DIR, { recursive: true });
    const archivo = path.join(env.MAIL_DIR, `recibo-${pedido.uuid.slice(0, 8)}.html`);
    fs.writeFileSync(archivo, html, 'utf8');
    return { enviado: true, archivo, messageId: info.messageId };
  }
  return { enviado: true, messageId: info.messageId };
}

module.exports = { enviarRecibo, modoDesarrollo };
