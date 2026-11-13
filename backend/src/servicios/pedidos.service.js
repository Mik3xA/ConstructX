/**
 * ============================================================================
 *  MOTOR DE PEDIDOS DE FLETE (Portal de Clientes)
 * ============================================================================
 *  1. El cliente arma su carrito y (opcional) cotiza: POST /api/pedidos/cotizar
 *  2. Al confirmar (POST /api/pedidos), en UNA transacción:
 *       - se verifica el stock_actual de cada material,
 *       - si alguno no alcanza => 409 y NO se modifica nada,
 *       - si hay stock => se resta del inventario_central,
 *       - se crean pedidos_fletes + detalles_pedido + movimientos (SALIDA_FLETE).
 *  3. Tras el commit: evento Socket.io `nuevo_flete` (Admin/Bodeguero) y
 *     recibo HTML por correo al cliente (Nodemailer).
 *
 *  Los precios SIEMPRE se toman del catálogo en el servidor (nunca del cliente).
 *  El uuid del pedido lo puede generar el cliente: reenviarlo es idempotente.
 * ============================================================================
 */
const { randomUUID } = require('crypto');
const { db, ahora, dinero } = require('../config/database');
const env = require('../config/env');
const PedidoModel = require('../modelos/pedido.model');
const MaterialModel = require('../modelos/material.model');
const MovimientoModel = require('../modelos/movimiento.model');
const UserModel = require('../modelos/user.model');
const socketService = require('./socket.service');
const emailService = require('./email.service');
const { HttpError } = require('../middlewares/error.middleware');
const { UUID_V4 } = require('./movimientos.service');

const MAX_LINEAS = 50;

/** Tarifa de flete: base + % del subtotal; gratis desde cierto monto. */
function calcularFlete(subtotal) {
  if (subtotal <= 0) return 0;
  if (subtotal >= env.FLETE_GRATIS_DESDE) return 0;
  return dinero(env.FLETE_BASE + subtotal * env.FLETE_PORCENTAJE);
}

/** Valida y agrupa las líneas del carrito (mismo material => se suman cantidades). */
function normalizarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'El pedido debe tener al menos un material');
  }
  if (items.length > MAX_LINEAS) throw new HttpError(400, `Máximo ${MAX_LINEAS} líneas por pedido`);

  const agrupado = new Map();
  for (const it of items) {
    const cantidad = Number(it && it.cantidad);
    if (!it || !it.material_id) throw new HttpError(400, 'Cada línea requiere material_id');
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new HttpError(400, 'Cada línea requiere una cantidad mayor a 0');
    }
    agrupado.set(it.material_id, (agrupado.get(it.material_id) || 0) + cantidad);
  }
  return [...agrupado].map(([material_id, cantidad]) => ({ material_id, cantidad }));
}

/**
 * Calcula importes y disponibilidad sin guardar nada.
 * @returns {{ lineas, subtotal, costo_flete, total_pagar, faltantes }}
 */
function cotizar(items) {
  const lineas = normalizarItems(items).map(({ material_id, cantidad }) => {
    const m = MaterialModel.findById(material_id);
    if (!m || !m.activo) throw new HttpError(404, `Material no disponible en el catálogo: ${material_id}`);
    const stock = MaterialModel.stock(material_id);
    return {
      material_id,
      material_nombre: m.nombre,
      codigo_sku: m.codigo_sku,
      unidad: m.unidad,
      cantidad,
      precio_unitario: m.precio_unitario,
      subtotal: dinero(cantidad * m.precio_unitario),
      stock_disponible: stock,
    };
  });

  const subtotal = dinero(lineas.reduce((s, l) => s + l.subtotal, 0));
  const costo_flete = calcularFlete(subtotal);
  const faltantes = lineas
    .filter((l) => l.stock_disponible < l.cantidad)
    .map((l) => ({ material_id: l.material_id, material_nombre: l.material_nombre, solicitado: l.cantidad, disponible: l.stock_disponible }));

  return { lineas, subtotal, costo_flete, total_pagar: dinero(subtotal + costo_flete), faltantes };
}

/**
 * Crea un pedido de flete de forma transaccional.
 * @param {{ id: string }} cliente  usuario autenticado
 * @param {{ uuid?, items, direccion_entrega?, telefono_contacto?, notas?, timestamp? }} body
 * @param {{ notificar?: boolean }} opciones  notificar=false en seeds/scripts (sin socket ni email)
 */
function crear(cliente, body, { notificar = true } = {}) {
  const uuid = body.uuid || randomUUID();
  if (!UUID_V4.test(uuid)) throw new HttpError(400, 'uuid debe ser un UUIDv4 válido');

  // Idempotencia (reintentos del cliente / sync offline)
  const existente = PedidoModel.findByUuid(uuid);
  if (existente) {
    if (existente.cliente_id !== cliente.id) throw new HttpError(409, 'El uuid ya pertenece a otro pedido');
    return { ...existente, duplicado: true };
  }

  const perfil = UserModel.findById(cliente.id);
  if (!perfil) throw new HttpError(404, 'Cliente no encontrado');

  const direccion_entrega = String(body.direccion_entrega || perfil.direccion || '').trim();
  if (!direccion_entrega) throw new HttpError(400, 'direccion_entrega es obligatoria');

  let timestamp = ahora();
  if (body.timestamp) {
    const d = new Date(body.timestamp);
    if (Number.isNaN(d.getTime())) throw new HttpError(400, 'timestamp inválido (usar ISO-8601)');
    timestamp = d.toISOString();
  }

  db.transaction(() => {
    // La cotización se hace DENTRO de la transacción: el stock leído no puede cambiar antes de restarlo.
    const c = cotizar(body.items);
    if (c.faltantes.length) {
      throw new HttpError(409, 'Stock insuficiente para completar el pedido', { faltantes: c.faltantes });
    }

    const t = ahora();
    PedidoModel.insert({
      uuid,
      cliente_id: cliente.id,
      subtotal: c.subtotal,
      costo_flete: c.costo_flete,
      total_pagar: c.total_pagar,
      direccion_entrega,
      telefono_contacto: body.telefono_contacto || perfil.telefono || null,
      notas: body.notas ? String(body.notas).slice(0, 500) : null,
      timestamp,
      created_at: t,
      updated_at: t,
    });

    for (const l of c.lineas) {
      MaterialModel.ajustarStock(l.material_id, -l.cantidad);
      PedidoModel.insertDetalle({
        id: randomUUID(),
        pedido_id: uuid,
        material_id: l.material_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal: l.subtotal,
        created_at: t,
        updated_at: t,
      });
      // Trazabilidad estricta: cada salida por flete queda en el libro de movimientos
      MovimientoModel.insert({
        uuid: randomUUID(),
        pedido_id: uuid,
        material_id: l.material_id,
        cantidad: l.cantidad,
        tipo: 'SALIDA_FLETE',
        usuario_id: cliente.id,
        timestamp,
        created_at: t,
        updated_at: t,
      });
    }
  })();

  const pedido = PedidoModel.findByUuid(uuid);

  if (notificar) {
    socketService.emitir(socketService.SALAS.STAFF, 'nuevo_flete', pedido);
    socketService.emitir(socketService.SALAS.STAFF, 'inventario_actualizado', {
      materiales: pedido.detalles.map((d) => d.material_id),
    });
    // Aviso de reorden si algún material del pedido quedó en o por debajo de su mínimo
    const ids = new Set(pedido.detalles.map((d) => d.material_id));
    const bajos = MaterialModel.stockBajo().filter((m) => ids.has(m.material_id));
    if (bajos.length) socketService.emitir(socketService.SALAS.STAFF, 'stock_bajo', bajos);
    pedido.recibo = enviarReciboEnSegundoPlano(pedido);
  }

  return { ...pedido, duplicado: false };
}

/** El correo no bloquea la respuesta ni revierte el pedido si falla. */
function enviarReciboEnSegundoPlano(pedido) {
  return emailService
    .enviarRecibo(pedido, pedido.cliente_email)
    .then((r) => {
      PedidoModel.marcarReciboEnviado(pedido.uuid, ahora());
      return r;
    })
    .catch((err) => {
      console.error(`✉️  No se pudo enviar el recibo del pedido ${pedido.uuid}:`, err.message);
      return { enviado: false, error: err.message };
    });
}

const SIGUIENTE_ESTADO = { PENDIENTE: 'EN_RUTA', EN_RUTA: 'ENTREGADO' };

/**
 * Avanza el estado del flete (solo hacia adelante: PENDIENTE -> EN_RUTA -> ENTREGADO).
 * Al despachar (EN_RUTA) se registran chofer y vehículo (obligatorios) y una fecha estimada opcional.
 */
function cambiarEstado(uuid, estado, usuario, { notificar = true, chofer, vehiculo, fecha_estimada } = {}) {
  if (!PedidoModel.ESTADOS.includes(estado)) {
    throw new HttpError(400, `estado inválido. Valores: ${PedidoModel.ESTADOS.join(', ')}`);
  }
  const pedido = PedidoModel.findByUuid(uuid);
  if (!pedido) throw new HttpError(404, 'Pedido no encontrado');
  if (SIGUIENTE_ESTADO[pedido.estado] !== estado) {
    throw new HttpError(409, `No se puede pasar de ${pedido.estado} a ${estado}`);
  }

  const extra = {};
  if (estado === 'EN_RUTA') {
    extra.chofer = String(chofer || '').trim();
    extra.vehiculo = String(vehiculo || '').trim();
    if (!extra.chofer || !extra.vehiculo) throw new HttpError(400, 'Para despachar indica chofer y vehículo');
    if (fecha_estimada) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_estimada)) throw new HttpError(400, 'fecha_estimada debe ser YYYY-MM-DD');
      extra.fecha_estimada = fecha_estimada;
    }
  }

  PedidoModel.updateEstado(uuid, estado, ahora(), extra);
  const actualizado = PedidoModel.findByUuid(uuid);

  if (notificar) {
    const payload = { ...actualizado, actualizado_por: usuario.nombre };
    socketService.emitir(
      [...socketService.SALAS.STAFF, socketService.SALAS.usuario(actualizado.cliente_id)],
      'flete_actualizado',
      payload
    );
  }
  return actualizado;
}

function obtener(uuid, usuario) {
  const pedido = PedidoModel.findByUuid(uuid);
  if (!pedido) throw new HttpError(404, 'Pedido no encontrado');
  // Un cliente solo puede ver sus propios pedidos (se responde 404 para no revelar existencia)
  if (usuario.rol === 'cliente' && pedido.cliente_id !== usuario.id) throw new HttpError(404, 'Pedido no encontrado');
  return pedido;
}

/** HTML del recibo (para verlo o imprimirlo desde el portal). */
function reciboHtml(uuid, usuario) {
  const { renderRecibo } = require('./plantillas/recibo.html');
  return renderRecibo(obtener(uuid, usuario)).html;
}

function listar(usuario, { estado, limit } = {}) {
  if (estado && !PedidoModel.ESTADOS.includes(estado)) throw new HttpError(400, 'estado inválido');
  const cliente_id = usuario.rol === 'cliente' ? usuario.id : undefined;
  return PedidoModel.list({ cliente_id, estado, limit });
}

module.exports = { crear, cotizar, cambiarEstado, obtener, listar, calcularFlete, reciboHtml };
