const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { iniciarServidor, eventualmente } = require('./helpers');

let srv;
const tokens = {};
let catalogo; // materiales por SKU

before(async () => {
  srv = await iniciarServidor();
  for (const rol of ['admin', 'bodega', 'residente', 'cliente']) {
    tokens[rol] = await srv.login(`${rol}@constructx.mx`);
  }
  const { body } = await srv.api('GET', '/catalogo', { token: tokens.cliente });
  catalogo = Object.fromEntries(body.materiales.map((m) => [m.codigo_sku, m]));
});

after(async () => {
  await srv.cerrar();
});

const stockDe = async (sku) => {
  const { body } = await srv.api('GET', '/catalogo', { token: tokens.cliente });
  return body.materiales.find((m) => m.codigo_sku === sku).stock_disponible;
};

// ---------------------------------------------------------------------------
describe('Auth y RBAC', () => {
  it('rechaza credenciales inválidas', async () => {
    const r = await srv.api('POST', '/auth/login', { body: { email: 'admin@constructx.mx', password: 'mala' } });
    assert.equal(r.status, 401);
  });

  it('no expone password_hash en el login', async () => {
    const r = await srv.api('POST', '/auth/login', {
      body: { email: 'cliente@constructx.mx', password: 'ConstructX123!' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.rol, 'cliente');
    assert.equal(r.body.user.password_hash, undefined);
  });

  it('exige token en rutas protegidas', async () => {
    assert.equal((await srv.api('GET', '/catalogo')).status, 401);
    assert.equal((await srv.api('GET', '/pedidos', { token: 'basura' })).status, 401);
  });

  it('el registro público siempre crea rol cliente (aunque se pida admin)', async () => {
    const r = await srv.api('POST', '/auth/registro', {
      body: { email: 'nuevo@obra.mx', password: 'segura1234', nombre: 'Nuevo Cliente', rol: 'admin' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.user.rol, 'cliente');
    assert.ok(r.body.token);
  });

  it('rechaza email duplicado y contraseñas cortas', async () => {
    const dup = await srv.api('POST', '/auth/registro', {
      body: { email: 'cliente@constructx.mx', password: 'segura1234', nombre: 'X' },
    });
    assert.equal(dup.status, 409);
    const corta = await srv.api('POST', '/auth/registro', { body: { email: 'a@b.mx', password: '123', nombre: 'X' } });
    assert.equal(corta.status, 400);
  });

  it('el cliente NO accede a datos internos del ERP', async () => {
    for (const ruta of ['/dashboard', '/inventario', '/proyectos', '/movimientos', '/alertas']) {
      const r = await srv.api('GET', ruta, { token: tokens.cliente });
      assert.equal(r.status, 403, `${ruta} debería ser 403`);
    }
  });

  it('residente y bodeguero no pueden crear pedidos de flete', async () => {
    for (const rol of ['residente', 'bodega']) {
      const r = await srv.api('POST', '/pedidos', {
        token: tokens[rol],
        body: { items: [{ material_id: catalogo['CEM-50KG'].id, cantidad: 1 }], direccion_entrega: 'x' },
      });
      assert.equal(r.status, 403);
    }
  });

  it('solo bodeguero/admin cambian el estado de un flete', async () => {
    const r = await srv.api('PATCH', `/pedidos/${randomUUID()}/estado`, {
      token: tokens.cliente,
      body: { estado: 'EN_RUTA' },
    });
    assert.equal(r.status, 403);
  });
});

// ---------------------------------------------------------------------------
describe('Catálogo visual', () => {
  it('devuelve materiales con precio, imagen y stock', async () => {
    const r = await srv.api('GET', '/catalogo', { token: tokens.cliente });
    assert.equal(r.status, 200);
    assert.ok(r.body.materiales.length >= 13);
    for (const m of r.body.materiales) {
      assert.ok(m.precio_unitario > 0, `${m.nombre} sin precio`);
      assert.match(m.imagen_url, /^https:\/\//);
      assert.equal(typeof m.stock_disponible, 'number');
    }
    assert.ok(r.body.categorias.includes('Cementantes'));
  });

  it('filtra por categoría y búsqueda', async () => {
    const acero = await srv.api('GET', '/catalogo?categoria=Acero', { token: tokens.cliente });
    assert.ok(acero.body.materiales.every((m) => m.categoria === 'Acero'));
    const q = await srv.api('GET', '/catalogo?q=varilla', { token: tokens.cliente });
    assert.ok(q.body.materiales.length >= 2);
    // la búsqueda cubre nombre, SKU y descripción
    assert.ok(q.body.materiales.every((m) => /varilla/i.test(`${m.nombre} ${m.codigo_sku} ${m.descripcion}`)));
  });

  it('un material desactivado por el admin desaparece del catálogo', async () => {
    const cal = catalogo['CAL-25KG'];
    await srv.api('PATCH', `/materiales/${cal.id}`, { token: tokens.admin, body: { activo: false } });
    const r = await srv.api('GET', '/catalogo', { token: tokens.cliente });
    assert.ok(!r.body.materiales.some((m) => m.id === cal.id));
    await srv.api('PATCH', `/materiales/${cal.id}`, { token: tokens.admin, body: { activo: true } });
  });
});

// ---------------------------------------------------------------------------
describe('Motor de pedidos', () => {
  it('cotiza sin modificar el inventario y calcula el flete', async () => {
    const antes = await stockDe('CEM-50KG');
    const r = await srv.api('POST', '/pedidos/cotizar', {
      token: tokens.cliente,
      body: { items: [{ material_id: catalogo['CEM-50KG'].id, cantidad: 10 }] },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.subtotal, 2450); // 10 x 245
    assert.equal(r.body.costo_flete, 523.5); // 450 + 3% de 2450
    assert.equal(r.body.total_pagar, 2973.5);
    assert.equal(await stockDe('CEM-50KG'), antes);
  });

  it('flete gratis a partir de $25,000', async () => {
    const r = await srv.api('POST', '/pedidos/cotizar', {
      token: tokens.cliente,
      body: { items: [{ material_id: catalogo['VAR-1/2'].id, cantidad: 100 }] }, // 28,900
    });
    assert.equal(r.body.costo_flete, 0);
    assert.equal(r.body.total_pagar, r.body.subtotal);
  });

  it('crea el pedido: resta stock, guarda detalles y movimientos SALIDA_FLETE', async () => {
    const cem = catalogo['CEM-50KG'];
    const blk = catalogo['BLK-15'];
    const stockCem = await stockDe('CEM-50KG');
    const stockBlk = await stockDe('BLK-15');

    const r = await srv.api('POST', '/pedidos', {
      token: tokens.cliente,
      body: {
        items: [
          { material_id: cem.id, cantidad: 5 },
          { material_id: blk.id, cantidad: 100 },
          { material_id: cem.id, cantidad: 3 }, // línea repetida: se agrupa (8 en total)
        ],
        direccion_entrega: 'Calle Roble 12, Monterrey',
        // un precio enviado por el cliente debe ignorarse
        precio_unitario: 1,
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.estado, 'PENDIENTE');
    assert.equal(r.body.detalles.length, 2);
    assert.equal(r.body.subtotal, 8 * 245 + 100 * 16.5);
    assert.equal(r.body.total_pagar, r.body.subtotal + r.body.costo_flete);

    assert.equal(await stockDe('CEM-50KG'), stockCem - 8);
    assert.equal(await stockDe('BLK-15'), stockBlk - 100);

    const movs = await srv.api('GET', '/movimientos?tipo=SALIDA_FLETE&limit=500', { token: tokens.admin });
    const delPedido = movs.body.filter((m) => m.pedido_id === r.body.uuid);
    assert.equal(delPedido.length, 2);
    assert.equal(delPedido.find((m) => m.material_id === cem.id).cantidad, 8);
  });

  it('sin stock suficiente responde 409 y NO toca nada (transacción)', async () => {
    const stockCem = await stockDe('CEM-50KG');
    const stockGra = await stockDe('GRA-M3');
    const r = await srv.api('POST', '/pedidos', {
      token: tokens.cliente,
      body: {
        items: [
          { material_id: catalogo['CEM-50KG'].id, cantidad: 1 },
          { material_id: catalogo['GRA-M3'].id, cantidad: stockGra + 1 },
        ],
        direccion_entrega: 'Calle 1',
      },
    });
    assert.equal(r.status, 409);
    assert.equal(r.body.details.faltantes.length, 1);
    assert.equal(r.body.details.faltantes[0].disponible, stockGra);
    assert.equal(await stockDe('CEM-50KG'), stockCem, 'el cemento no debe descontarse');
    assert.equal(await stockDe('GRA-M3'), stockGra);
  });

  it('reenviar el mismo uuid es idempotente (no descuenta dos veces)', async () => {
    const uuid = randomUUID();
    const body = { uuid, items: [{ material_id: catalogo['ARE-M3'].id, cantidad: 2 }], direccion_entrega: 'Obra 7' };
    const antes = await stockDe('ARE-M3');
    const r1 = await srv.api('POST', '/pedidos', { token: tokens.cliente, body });
    const r2 = await srv.api('POST', '/pedidos', { token: tokens.cliente, body });
    assert.equal(r1.status, 201);
    assert.equal(r2.status, 200);
    assert.equal(r2.body.duplicado, true);
    assert.equal(await stockDe('ARE-M3'), antes - 2);
  });

  it('valida la entrada', async () => {
    const casos = [
      { items: [] },
      { items: [{ material_id: catalogo['ARE-M3'].id, cantidad: 0 }] },
      { items: [{ material_id: catalogo['ARE-M3'].id, cantidad: -3 }] },
      { items: [{ material_id: catalogo['ARE-M3'].id, cantidad: 'abc' }] },
      { uuid: 'no-es-uuid', items: [{ material_id: catalogo['ARE-M3'].id, cantidad: 1 }] },
    ];
    for (const body of casos) {
      const r = await srv.api('POST', '/pedidos', { token: tokens.cliente, body });
      assert.equal(r.status, 400, JSON.stringify(body));
    }
    const noExiste = await srv.api('POST', '/pedidos', {
      token: tokens.cliente,
      body: { items: [{ material_id: randomUUID(), cantidad: 1 }] },
    });
    assert.equal(noExiste.status, 404);
  });

  it('usa la dirección del perfil si no se envía una', async () => {
    const r = await srv.api('POST', '/pedidos', {
      token: tokens.cliente,
      body: { items: [{ material_id: catalogo['LAD-ROJO'].id, cantidad: 50 }] },
    });
    assert.equal(r.status, 201);
    assert.match(r.body.direccion_entrega, /Monterrey/);
  });

  it('un cliente solo ve sus propios pedidos', async () => {
    const otro = await srv.api('POST', '/auth/registro', {
      body: { email: 'otro@obra.mx', password: 'segura1234', nombre: 'Otro', direccion: 'Saltillo' },
    });
    const tokOtro = otro.body.token;
    const mio = await srv.api('POST', '/pedidos', {
      token: tokOtro,
      body: { items: [{ material_id: catalogo['LAD-ROJO'].id, cantidad: 10 }] },
    });
    const lista = await srv.api('GET', '/pedidos', { token: tokOtro });
    assert.equal(lista.body.length, 1);
    assert.equal(lista.body[0].uuid, mio.body.uuid);

    const ajenos = await srv.api('GET', '/pedidos', { token: tokens.cliente });
    assert.ok(!ajenos.body.some((p) => p.uuid === mio.body.uuid));
    const directo = await srv.api('GET', `/pedidos/${mio.body.uuid}`, { token: tokens.cliente });
    assert.equal(directo.status, 404);

    const staff = await srv.api('GET', '/pedidos', { token: tokens.bodega });
    assert.ok(staff.body.some((p) => p.uuid === mio.body.uuid));
  });

  it('SALIDA_FLETE no se puede registrar manualmente', async () => {
    const r = await srv.api('POST', '/movimientos', {
      token: tokens.admin,
      body: { tipo: 'SALIDA_FLETE', material_id: catalogo['CEM-50KG'].id, cantidad: 1 },
    });
    assert.equal(r.status, 400);
  });

  it('estados solo avanzan: PENDIENTE -> EN_RUTA -> ENTREGADO', async () => {
    const p = await srv.api('POST', '/pedidos', {
      token: tokens.cliente,
      body: { items: [{ material_id: catalogo['BLK-15'].id, cantidad: 10 }] },
    });
    const url = `/pedidos/${p.body.uuid}/estado`;
    assert.equal((await srv.api('PATCH', url, { token: tokens.bodega, body: { estado: 'ENTREGADO' } })).status, 409);
    assert.equal((await srv.api('PATCH', url, { token: tokens.bodega, body: { estado: 'EN_RUTA' } })).status, 400, 'sin chofer');
    const ruta = await srv.api('PATCH', url, {
      token: tokens.bodega,
      body: { estado: 'EN_RUTA', chofer: 'Jorge', vehiculo: 'Torton 12', fecha_estimada: '2026-11-20' },
    });
    assert.equal(ruta.status, 200);
    assert.equal(ruta.body.chofer, 'Jorge');
    assert.ok(ruta.body.despachado_at);
    assert.equal((await srv.api('PATCH', url, { token: tokens.bodega, body: { estado: 'PENDIENTE' } })).status, 409);
    const fin = await srv.api('PATCH', url, { token: tokens.bodega, body: { estado: 'ENTREGADO' } });
    assert.equal(fin.body.estado, 'ENTREGADO');
    assert.ok(fin.body.entregado_at);
    assert.equal((await srv.api('PATCH', url, { token: tokens.bodega, body: { estado: 'CANCELADO' } })).status, 400);
  });
});

// ---------------------------------------------------------------------------
describe('Tiempo real (Socket.io)', () => {
  it('rechaza conexiones sin token válido', async () => {
    await assert.rejects(srv.conectarSocket('token-falso'), /Token inválido/);
  });

  it('Admin y Bodeguero reciben `nuevo_flete`; Residente y otros clientes no', async () => {
    const [admin, bodega, residente, cliente] = await Promise.all(
      ['admin', 'bodega', 'residente', 'cliente'].map((r) => srv.conectarSocket(tokens[r]))
    );
    const recibidos = { residente: 0, cliente: 0 };
    residente.on('nuevo_flete', () => recibidos.residente++);
    cliente.on('nuevo_flete', () => recibidos.cliente++);

    const enAdmin = srv.esperarEvento(admin, 'nuevo_flete');
    const enBodega = srv.esperarEvento(bodega, 'nuevo_flete');
    const r = await srv.api('POST', '/pedidos', {
      token: tokens.cliente,
      body: { items: [{ material_id: catalogo['VAR-3/8'].id, cantidad: 4 }] },
    });
    const [pa, pb] = await Promise.all([enAdmin, enBodega]);
    assert.equal(pa.uuid, r.body.uuid);
    assert.equal(pb.total_pagar, r.body.total_pagar);
    assert.equal(pa.cliente_nombre, 'Carlos Cliente');
    assert.equal(pa.detalles.length, 1);

    await new Promise((res) => setTimeout(res, 150));
    assert.deepEqual(recibidos, { residente: 0, cliente: 0 });
    [admin, bodega, residente, cliente].forEach((s) => s.close());
  });

  it('el cliente recibe `flete_actualizado` de SU pedido', async () => {
    const cliente = await srv.conectarSocket(tokens.cliente);
    const p = await srv.api('POST', '/pedidos', {
      token: tokens.cliente,
      body: { items: [{ material_id: catalogo['VAR-3/8'].id, cantidad: 1 }] },
    });
    const evento = srv.esperarEvento(cliente, 'flete_actualizado');
    await srv.api('PATCH', `/pedidos/${p.body.uuid}/estado`, {
      token: tokens.bodega,
      body: { estado: 'EN_RUTA', chofer: 'Jorge', vehiculo: 'Torton 12' },
    });
    const e = await evento;
    assert.equal(e.uuid, p.body.uuid);
    assert.equal(e.estado, 'EN_RUTA');
    cliente.close();
  });
});

// ---------------------------------------------------------------------------
describe('Recibo por email (Nodemailer)', () => {
  it('genera un recibo HTML con logo, materiales, flete y total', async () => {
    const r = await srv.api('POST', '/pedidos', {
      token: tokens.cliente,
      body: {
        items: [{ material_id: catalogo['CEM-50KG'].id, cantidad: 2 }],
        notas: '<script>alert(1)</script>',
      },
    });
    const archivo = path.join(srv.mailDir, `recibo-${r.body.uuid.slice(0, 8)}.html`);
    await eventualmente(() => fs.existsSync(archivo));
    const html = fs.readFileSync(archivo, 'utf8');

    assert.match(html, /Construct<span[^>]*>X<\/span>/, 'logo');
    assert.match(html, /Cemento gris CPC 30R/);
    assert.match(html, /Costo del flete/);
    assert.match(html, /Total a pagar/);
    assert.match(html, new RegExp(r.body.uuid.slice(0, 8).toUpperCase()));
    assert.ok(!html.includes('<script>'), 'las notas del cliente deben escaparse');

    const detalle = await eventualmente(async () => {
      const d = await srv.api('GET', `/pedidos/${r.body.uuid}`, { token: tokens.cliente });
      return d.body.recibo_enviado_at ? d : null;
    });
    assert.ok(detalle.body.recibo_enviado_at);
  });
});

// ---------------------------------------------------------------------------
describe('Dashboard del Admin y sincronización', () => {
  it('incluye métricas comerciales y pedidos recientes', async () => {
    const r = await srv.api('GET', '/dashboard', { token: tokens.admin });
    assert.equal(r.status, 200);
    assert.ok(r.body.comercial.pedidos_pendientes >= 1);
    assert.ok(r.body.comercial.ventas_mes > 0);
    assert.ok(r.body.pedidos_recientes.length > 0);
    assert.equal(r.body.kpis.alertas_activas, 1, 'la alerta naranja del cemento sigue activa');
  });

  it('sync: el cliente sube pedidos offline (idempotente) y solo baja datos propios', async () => {
    const uuid = randomUUID();
    const pedidos = [{ uuid, items: [{ material_id: catalogo['ARE-M3'].id, cantidad: 1 }], timestamp: '2026-11-10T10:00:00Z' }];
    const r1 = await srv.api('POST', '/sync', { token: tokens.cliente, body: { pedidos } });
    const r2 = await srv.api('POST', '/sync', { token: tokens.cliente, body: { pedidos } });
    assert.deepEqual(r1.body.resultado.pedidos.aplicados, [uuid]);
    assert.deepEqual(r2.body.resultado.pedidos.duplicados, [uuid]);
    assert.deepEqual(Object.keys(r2.body.cambios).sort(), ['catalogo_materiales', 'pedidos_fletes']);
    assert.ok(r2.body.cambios.pedidos_fletes.every((p) => p.cliente_id === r2.body.cambios.pedidos_fletes[0].cliente_id));
  });
});
