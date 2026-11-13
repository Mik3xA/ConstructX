/**
 * Recibo HTML de un pedido de flete.
 * Diseñado para clientes de correo: tablas + estilos en línea, sin SVG ni CSS externo.
 */

const COLORES = {
  naranja: '#E8641B',
  fondo: '#F6F2EC',
  tarjeta: '#FFFFFF',
  texto: '#2B2520',
  suave: '#7A6F64',
  borde: '#ECE4D8',
  tostado: '#C98F2E',
};

const ESTADOS = { PENDIENTE: 'Pendiente', EN_RUTA: 'En ruta', ENTREGADO: 'Entregado' };

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const mxn = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0);

const fecha = (iso) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Monterrey' }).format(
    new Date(iso)
  );

/** Logo tipográfico: funciona en todos los clientes de correo (no depende de imágenes). */
const logo = `
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="background:${COLORES.naranja};border-radius:8px;width:36px;height:36px;text-align:center;
               font:800 20px/36px Arial,Helvetica,sans-serif;color:#fff;">X</td>
    <td style="padding-left:10px;font:800 20px Arial,Helvetica,sans-serif;color:${COLORES.texto};letter-spacing:-0.5px;">
      Construct<span style="color:${COLORES.naranja};">X</span>
    </td>
  </tr></table>`;

/**
 * @param {object} pedido  pedido completo (con `detalles` y `cliente_nombre`)
 * @returns {{ asunto: string, html: string, texto: string }}
 */
function renderRecibo(pedido) {
  const folio = pedido.uuid.slice(0, 8).toUpperCase();

  const filas = pedido.detalles
    .map(
      (d) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${COLORES.borde};">
          <div style="font-weight:600;color:${COLORES.texto};">${esc(d.material_nombre)}</div>
          <div style="font-size:12px;color:${COLORES.suave};">${esc(d.codigo_sku)} · ${mxn(d.precio_unitario)} / ${esc(d.unidad)}</div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${COLORES.borde};text-align:center;color:${COLORES.texto};">
          ${d.cantidad} ${esc(d.unidad)}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${COLORES.borde};text-align:right;color:${COLORES.texto};font-weight:600;">
          ${mxn(d.subtotal)}
        </td>
      </tr>`
    )
    .join('');

  const fleteTexto = pedido.costo_flete === 0 ? '<span style="color:' + COLORES.tostado + ';font-weight:700;">Gratis</span>' : mxn(pedido.costo_flete);

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recibo ${folio} · ConstructX</title></head>
<body style="margin:0;padding:0;background:${COLORES.fondo};font-family:Arial,Helvetica,sans-serif;color:${COLORES.texto};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORES.fondo};padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
    <tr><td style="padding:0 4px 20px;">${logo}</td></tr>
    <tr><td style="background:${COLORES.tarjeta};border:1px solid ${COLORES.borde};border-radius:14px;padding:28px;">

      <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORES.suave};font-weight:700;">Recibo de pedido de flete</div>
      <h1 style="margin:6px 0 4px;font-size:24px;color:${COLORES.texto};">¡Gracias, ${esc(pedido.cliente_nombre)}!</h1>
      <p style="margin:0 0 20px;color:${COLORES.suave};font-size:14px;line-height:1.5;">
        Recibimos tu pedido y nuestro almacén ya lo está preparando. Te avisaremos cuando el flete salga a ruta.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORES.fondo};border-radius:10px;margin-bottom:20px;">
        <tr>
          <td style="padding:14px 16px;font-size:13px;">
            <div style="color:${COLORES.suave};">Folio</div>
            <div style="font-weight:700;font-family:'Courier New',monospace;">${folio}</div>
          </td>
          <td style="padding:14px 16px;font-size:13px;">
            <div style="color:${COLORES.suave};">Fecha</div>
            <div style="font-weight:700;">${fecha(pedido.timestamp)}</div>
          </td>
          <td style="padding:14px 16px;font-size:13px;">
            <div style="color:${COLORES.suave};">Estado</div>
            <div style="font-weight:700;color:${COLORES.naranja};">${ESTADOS[pedido.estado] || 'Pendiente'}</div>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr>
          <th align="left" style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORES.suave};padding-bottom:8px;border-bottom:2px solid ${COLORES.borde};">Material</th>
          <th align="center" style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORES.suave};padding-bottom:8px;border-bottom:2px solid ${COLORES.borde};">Cantidad</th>
          <th align="right" style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORES.suave};padding-bottom:8px;border-bottom:2px solid ${COLORES.borde};">Importe</th>
        </tr>
        ${filas}
        <tr><td colspan="2" style="padding:14px 0 4px;color:${COLORES.suave};">Subtotal materiales</td>
            <td style="padding:14px 0 4px;text-align:right;">${mxn(pedido.subtotal)}</td></tr>
        <tr><td colspan="2" style="padding:4px 0;color:${COLORES.suave};">Costo del flete</td>
            <td style="padding:4px 0;text-align:right;">${fleteTexto}</td></tr>
        <tr><td colspan="2" style="padding:14px 0 0;font-size:16px;font-weight:700;border-top:2px solid ${COLORES.borde};">Total a pagar</td>
            <td style="padding:14px 0 0;text-align:right;font-size:20px;font-weight:800;color:${COLORES.naranja};border-top:2px solid ${COLORES.borde};">${mxn(pedido.total_pagar)}</td></tr>
      </table>

      <div style="margin-top:24px;padding:14px 16px;border-left:4px solid ${COLORES.naranja};background:${COLORES.fondo};border-radius:6px;font-size:13px;line-height:1.5;">
        <div style="font-weight:700;margin-bottom:2px;">Dirección de entrega</div>
        <div>${esc(pedido.direccion_entrega)}</div>
        ${pedido.telefono_contacto ? `<div style="color:${COLORES.suave};">Tel. ${esc(pedido.telefono_contacto)}</div>` : ''}
        ${pedido.notas ? `<div style="color:${COLORES.suave};margin-top:6px;">Notas: ${esc(pedido.notas)}</div>` : ''}
        ${pedido.chofer ? `<div style="color:${COLORES.suave};margin-top:6px;">Chofer: ${esc(pedido.chofer)} · Unidad: ${esc(pedido.vehiculo)}</div>` : ''}
      </div>
    </td></tr>
    <tr><td style="padding:18px 4px;font-size:12px;color:${COLORES.suave};line-height:1.5;text-align:center;">
      Precios en MXN. Pago contra entrega. Este correo es un comprobante automático de ConstructX.
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

  const texto = [
    `ConstructX — Recibo de pedido ${folio}`,
    `Cliente: ${pedido.cliente_nombre}`,
    '',
    ...pedido.detalles.map((d) => `- ${d.material_nombre}: ${d.cantidad} ${d.unidad} = ${mxn(d.subtotal)}`),
    '',
    `Subtotal: ${mxn(pedido.subtotal)}`,
    `Flete: ${pedido.costo_flete === 0 ? 'Gratis' : mxn(pedido.costo_flete)}`,
    `Total a pagar: ${mxn(pedido.total_pagar)}`,
    '',
    `Entrega en: ${pedido.direccion_entrega}`,
  ].join('\n');

  return { asunto: `Tu pedido ${folio} en ConstructX — ${mxn(pedido.total_pagar)}`, html, texto };
}

module.exports = { renderRecibo };
