/**
 * Tienda pública, perfil, recibos, solicitudes de material, stock mínimo,
 * mensajes de contacto, reportes y administración de usuarios.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor } = require('./helpers');

let srv;
const tok = {};
let mat; // materiales por SKU (catálogo autenticado)
let proyectoId;

before(async () => {
  srv = await iniciarServidor();
  for (const r of ['admin', 'bodega', 'residente', 'cliente']) tok[r] = await srv.login(`${r}@constructx.mx`);
  const c = await srv.api('GET', '/catalogo', { token: tok.cliente });
  mat = Object.fromEntries(c.body.materiales.map((m) => [m.codigo_sku, m]));
  proyectoId = (await srv.api('GET', '/proyectos', { token: tok.residente })).body[0].id;
});
after(() => srv.cerrar());

const stock = async (sku) => {
  const inv = await srv.api('GET', '/inventario', { token: tok.bodega });
  return inv.body.find((i) => i.codigo_sku === sku);
};

describe('Tienda pública (sin sesión)', () => {
  it('lista el catálogo sin token y oculta la cifra exacta de stock', async () => {
    const r = await srv.api('GET', '/public/catalogo');
    assert.equal(r.status, 200);
    assert.ok(r.body.materiales.length >= 13);
    for (const m of r.body.materiales) {
      assert.equal(m.stock_disponible, undefined);
      assert.ok(['DISPONIBLE', 'POCAS', 'AGOTADO'].includes(m.disponibilidad));
      assert.ok(m.precio_unitario > 0);
    }
  });

  it('detalle de producto por SKU con relacionados de la misma categoría', async () => {
    const r = await srv.api('GET', `/public/catalogo/${encodeURIComponent('CEM-50KG')}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.producto.codigo_sku, 'CEM-50KG');
    assert.ok(r.body.relacionados.length > 0);
    assert.ok(r.body.relacionados.every((x) => x.categoria === 'Cementantes'));
    assert.equal((await srv.api('GET', '/public/catalogo/NO-EXISTE')).status, 404);
  });

  it('info pública con tarifas y cifras', async () => {
    const r = await srv.api('GET', '/public/info');
    assert.equal(r.body.tarifa_flete.base, 450);
    assert.ok(r.body.cifras.fletes_entregados > 0);
  });

  it('el formulario de contacto guarda el mensaje y el admin lo ve; el cliente no', async () => {
    const malo = await srv.api('POST', '/public/contacto', { body: { nombre: 'X', email: 'no-email', mensaje: 'corto' } });
    assert.equal(malo.status, 400);
    const ok = await srv.api('POST', '/public/contacto', {
      body: { nombre: 'Ana', email: 'ana@obra.mx', asunto: 'Crédito', mensaje: 'Quisiera abrir una línea de crédito.' },
    });
    assert.equal(ok.status, 201);
    const lista = await srv.api('GET', '/mensajes', { token: tok.admin });
    const m = lista.body.find((x) => x.id === ok.body.id);
    assert.equal(m.leido, 0);
    assert.equal((await srv.api('PATCH', `/mensajes/${m.id}`, { token: tok.admin, body: {} })).body.leido, 1);
    assert.equal((await srv.api('GET', '/mensajes', { token: tok.cliente })).status, 403);
  });

  it('las rutas internas siguen protegidas', async () => {
    assert.equal((await srv.api('GET', '/catalogo')).status, 401);
    assert.equal((await srv.api('GET', '/pedidos')).status, 401);
  });
});

describe('Cuenta del cliente', () => {
  it('actualiza su perfil pero no puede cambiar su rol', async () => {
    const r = await srv.api('PATCH', '/auth/me', {
      token: tok.cliente,
      body: { telefono: '81 0000 1111', direccion: 'Nueva dirección 99, Monterrey', rol: 'admin' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.telefono, '81 0000 1111');
    assert.equal(r.body.rol, 'cliente');
  });

  it('cambia su contraseña solo con la actual correcta', async () => {
    const mal = await srv.api('PATCH', '/auth/me', {
      token: tok.cliente,
      body: { password_actual: 'equivocada', password_nueva: 'NuevaClave123' },
    });
    assert.equal(mal.status, 400);
  });

  it('descarga el recibo HTML de su pedido', async () => {
    const p = await srv.api('POST', '/pedidos', {
      token: tok.cliente,
      body: { items: [{ material_id: mat['CEM-50KG'].id, cantidad: 1 }] },
    });
    const res = await fetch(`${srv.base}/api/pedidos/${p.body.uuid}/recibo`, {
      headers: { authorization: `Bearer ${tok.cliente}` },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(await res.text(), /Total a pagar/);
  });
});

describe('Solicitudes de material (Residente → Bodega)', () => {
  it('residente solicita; bodega aprueba y se descuenta el stock con un ENVIO_OBRA', async () => {
    const sock = await srv.conectarSocket(tok.bodega);
    const aviso = srv.esperarEvento(sock, 'solicitud_material');
    const antes = (await stock('VAR-3/8')).stock_actual;
    const s = await srv.api('POST', '/solicitudes', {
      token: tok.residente,
      body: { proyecto_id: proyectoId, material_id: mat['VAR-3/8'].id, cantidad: 25, notas: 'Castillos' },
    });
    assert.equal(s.status, 201);
    assert.equal((await aviso).id, s.body.id);
    sock.close();

    const resSock = await srv.conectarSocket(tok.residente);
    const respuesta = srv.esperarEvento(resSock, 'solicitud_actualizada');
    const ap = await srv.api('PATCH', `/solicitudes/${s.body.id}/aprobar`, { token: tok.bodega });
    assert.equal(ap.status, 200);
    assert.equal(ap.body.estado, 'APROBADA');
    assert.ok(ap.body.movimiento_uuid);
    assert.equal((await respuesta).estado, 'APROBADA');
    resSock.close();
    assert.equal((await stock('VAR-3/8')).stock_actual, antes - 25);

    // No se puede aprobar dos veces
    assert.equal((await srv.api('PATCH', `/solicitudes/${s.body.id}/aprobar`, { token: tok.bodega })).status, 409);
  });

  it('sin stock suficiente la aprobación falla y la solicitud sigue PENDIENTE', async () => {
    const disponible = (await stock('POL-4X4')).stock_actual;
    const s = await srv.api('POST', '/solicitudes', {
      token: tok.residente,
      body: { proyecto_id: proyectoId, material_id: mat['POL-4X4'].id, cantidad: disponible + 10 },
    });
    const ap = await srv.api('PATCH', `/solicitudes/${s.body.id}/aprobar`, { token: tok.bodega });
    assert.equal(ap.status, 409);
    const lista = await srv.api('GET', '/solicitudes', { token: tok.bodega });
    assert.equal(lista.body.find((x) => x.id === s.body.id).estado, 'PENDIENTE');
    assert.equal((await stock('POL-4X4')).stock_actual, disponible);

    const rechazoSinMotivo = await srv.api('PATCH', `/solicitudes/${s.body.id}/rechazar`, { token: tok.bodega, body: {} });
    assert.equal(rechazoSinMotivo.status, 400);
    const rech = await srv.api('PATCH', `/solicitudes/${s.body.id}/rechazar`, {
      token: tok.bodega,
      body: { motivo: 'Sin existencia, llega el lunes' },
    });
    assert.equal(rech.body.estado, 'RECHAZADA');
  });

  it('solo el residente crea solicitudes; el cliente no ve ninguna', async () => {
    const body = { proyecto_id: proyectoId, material_id: mat['CEM-50KG'].id, cantidad: 1 };
    assert.equal((await srv.api('POST', '/solicitudes', { token: tok.bodega, body })).status, 403);
    assert.equal((await srv.api('POST', '/solicitudes', { token: tok.cliente, body })).status, 403);
    assert.equal((await srv.api('GET', '/solicitudes', { token: tok.cliente })).status, 403);
  });
});

describe('Inventario: punto de reorden', () => {
  it('bodega fija el mínimo y el material aparece como stock bajo en el dashboard', async () => {
    const actual = (await stock('CAL-25KG')).stock_actual;
    const r = await srv.api('PATCH', `/inventario/${mat['CAL-25KG'].id}/minimo`, {
      token: tok.bodega,
      body: { stock_minimo: actual + 1 },
    });
    assert.equal(r.status, 200);
    assert.equal((await stock('CAL-25KG')).stock_bajo, 1);
    const d = await srv.api('GET', '/dashboard', { token: tok.admin });
    assert.ok(d.body.stock_bajo.some((s) => s.codigo_sku === 'CAL-25KG'));
    assert.equal((await srv.api('PATCH', `/inventario/${mat['CAL-25KG'].id}/minimo`, { token: tok.bodega, body: { stock_minimo: -1 } })).status, 400);
  });

  it('emite stock_bajo cuando un pedido deja un material bajo su mínimo', async () => {
    const sock = await srv.conectarSocket(tok.admin);
    const evento = srv.esperarEvento(sock, 'stock_bajo');
    const { stock_actual, stock_minimo } = await stock('MAL-6X6');
    assert.ok(stock_actual <= stock_minimo, 'el seed deja la malla bajo mínimo');
    await srv.api('POST', '/pedidos', { token: tok.cliente, body: { items: [{ material_id: mat['MAL-6X6'].id, cantidad: 1 }] } });
    const bajos = await evento;
    assert.ok(bajos.some((b) => b.codigo_sku === 'MAL-6X6'));
    sock.close();
  });
});

describe('Admin: reportes y usuarios', () => {
  it('reporte de ventas con serie diaria continua y top de materiales', async () => {
    const r = await srv.api('GET', '/reportes/ventas?dias=14', { token: tok.admin });
    assert.equal(r.status, 200);
    assert.equal(r.body.serie.length, 14);
    assert.ok(r.body.totales.ventas > 0);
    assert.ok(r.body.top_materiales.length > 0);
    assert.equal((await srv.api('GET', '/reportes/ventas', { token: tok.bodega })).status, 403);
  });

  it('desactivar una cuenta bloquea el login y corta la sesión abierta', async () => {
    const reg = await srv.api('POST', '/auth/registro', { body: { email: 'temporal@obra.mx', password: 'segura1234', nombre: 'Temporal' } });
    const tokenViejo = reg.body.token;
    assert.equal((await srv.api('GET', '/auth/me', { token: tokenViejo })).status, 200);

    const off = await srv.api('PATCH', `/usuarios/${reg.body.user.id}`, { token: tok.admin, body: { activo: false } });
    assert.equal(off.body.activo, 0);
    assert.equal((await srv.api('GET', '/auth/me', { token: tokenViejo })).status, 401);
    const login = await srv.api('POST', '/auth/login', { body: { email: 'temporal@obra.mx', password: 'segura1234' } });
    assert.equal(login.status, 403);

    await srv.api('PATCH', `/usuarios/${reg.body.user.id}`, { token: tok.admin, body: { activo: true } });
    assert.equal((await srv.api('POST', '/auth/login', { body: { email: 'temporal@obra.mx', password: 'segura1234' } })).status, 200);
  });

  it('el admin no puede desactivarse a sí mismo y crea empleados', async () => {
    const yo = (await srv.api('GET', '/auth/me', { token: tok.admin })).body;
    assert.equal((await srv.api('PATCH', `/usuarios/${yo.id}`, { token: tok.admin, body: { activo: false } })).status, 400);
    const nuevo = await srv.api('POST', '/auth/register', {
      token: tok.admin,
      body: { email: 'chofer@constructx.mx', password: 'segura1234', nombre: 'Nuevo Bodeguero', rol: 'bodeguero' },
    });
    assert.equal(nuevo.status, 201);
    const lista = await srv.api('GET', '/usuarios?rol=cliente', { token: tok.admin });
    assert.ok(lista.body.every((u) => u.rol === 'cliente'));
    assert.ok(lista.body.find((u) => u.email === 'cliente@constructx.mx').total_pedidos > 0);
  });
});
