const { db } = require('../config/database');

const ESTADOS = Object.freeze(['PENDIENTE', 'EN_RUTA', 'ENTREGADO']);

const SELECT_PEDIDO = `
  SELECT p.*, u.nombre AS cliente_nombre, u.email AS cliente_email, u.empresa AS cliente_empresa,
         (SELECT COUNT(*) FROM detalles_pedido d WHERE d.pedido_id = p.uuid) AS total_lineas
  FROM pedidos_fletes p
  JOIN users u ON u.id = p.cliente_id`;

const PedidoModel = {
  ESTADOS,

  insert(p) {
    db.prepare(
      `INSERT INTO pedidos_fletes
         (uuid, cliente_id, subtotal, costo_flete, total_pagar, estado, direccion_entrega, telefono_contacto,
          notas, timestamp, created_at, updated_at)
       VALUES
         (@uuid, @cliente_id, @subtotal, @costo_flete, @total_pagar, 'PENDIENTE', @direccion_entrega, @telefono_contacto,
          @notas, @timestamp, @created_at, @updated_at)`
    ).run(p);
  },

  insertDetalle(d) {
    db.prepare(
      `INSERT INTO detalles_pedido (id, pedido_id, material_id, cantidad, precio_unitario, subtotal, created_at, updated_at)
       VALUES (@id, @pedido_id, @material_id, @cantidad, @precio_unitario, @subtotal, @created_at, @updated_at)`
    ).run(d);
  },

  /** Pedido + sus líneas con datos del material. */
  findByUuid(uuid) {
    const pedido = db.prepare(`${SELECT_PEDIDO} WHERE p.uuid = ?`).get(uuid);
    if (!pedido) return null;
    pedido.detalles = db
      .prepare(
        `SELECT d.*, m.nombre AS material_nombre, m.codigo_sku, m.unidad, m.imagen_url, m.categoria
         FROM detalles_pedido d JOIN catalogo_materiales m ON m.id = d.material_id
         WHERE d.pedido_id = ? ORDER BY m.nombre`
      )
      .all(uuid);
    return pedido;
  },

  list({ cliente_id, estado, limit = 100 } = {}) {
    const where = [];
    const params = { limit: Math.min(Number(limit) || 100, 500) };
    if (cliente_id) { where.push('p.cliente_id = @cliente_id'); params.cliente_id = cliente_id; }
    if (estado) { where.push('p.estado = @estado'); params.estado = estado; }
    return db
      .prepare(`${SELECT_PEDIDO} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.timestamp DESC LIMIT @limit`)
      .all(params);
  },

  updateEstado(uuid, estado, t) {
    db.prepare('UPDATE pedidos_fletes SET estado = ?, updated_at = ? WHERE uuid = ?').run(estado, t, uuid);
  },

  marcarReciboEnviado(uuid, t) {
    db.prepare('UPDATE pedidos_fletes SET recibo_enviado_at = ? WHERE uuid = ?').run(t, uuid);
  },

  /** Métricas comerciales para el dashboard del Admin. */
  resumen() {
    return db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM pedidos_fletes WHERE estado = 'PENDIENTE')                    AS pedidos_pendientes,
           (SELECT COUNT(*) FROM pedidos_fletes WHERE estado = 'EN_RUTA')                      AS pedidos_en_ruta,
           (SELECT COALESCE(ROUND(SUM(total_pagar), 2), 0) FROM pedidos_fletes
              WHERE substr(timestamp, 1, 7) = substr(@ahora, 1, 7))                            AS ventas_mes,
           (SELECT COUNT(*) FROM pedidos_fletes WHERE substr(timestamp, 1, 10) = substr(@ahora, 1, 10)) AS pedidos_hoy`
      )
      .get({ ahora: new Date().toISOString() });
  },

  cambiosDesde(desde, cliente_id) {
    const filtro = cliente_id ? 'AND p.cliente_id = @cliente_id' : '';
    return db
      .prepare(`SELECT p.* FROM pedidos_fletes p WHERE p.updated_at > @desde ${filtro}`)
      .all(cliente_id ? { desde, cliente_id } : { desde });
  },
};

module.exports = PedidoModel;
