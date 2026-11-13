/**
 * Regla de negocio intocable: Consumo% > Avance% + 5  =>  ALERTA NARANJA
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor } = require('./helpers');
const { evaluarDesviacion } = require('../src/servicios/alertas.service');

describe('evaluarDesviacion (función pura)', () => {
  it('ejemplo de flujo_negocio.md: 30 de 100 con 20% de avance => alerta +10%', () => {
    const r = evaluarDesviacion({ consumido: 30, presupuestado: 100, avance_pct: 20 }, 5);
    assert.equal(r.alerta, true);
    assert.equal(r.desviacion_pct, 10);
  });

  it('justo en la tolerancia (25% vs 20%) NO es alerta (la regla usa ">")', () => {
    assert.equal(evaluarDesviacion({ consumido: 25, presupuestado: 100, avance_pct: 20 }, 5).alerta, false);
  });

  it('apenas por encima (25.01% vs 20%) SÍ es alerta', () => {
    assert.equal(evaluarDesviacion({ consumido: 25.01, presupuestado: 100, avance_pct: 20 }, 5).alerta, true);
  });

  it('presupuesto 0 no divide entre cero', () => {
    const r = evaluarDesviacion({ consumido: 10, presupuestado: 0, avance_pct: 0 }, 5);
    assert.equal(r.consumo_pct, 0);
    assert.equal(r.alerta, false);
  });
});

describe('Auditor integrado con la API', () => {
  let srv;
  let admin;
  let residente;
  before(async () => {
    srv = await iniciarServidor();
    admin = await srv.login('admin@constructx.mx');
    residente = await srv.login('residente@constructx.mx');
  });
  after(() => srv.cerrar());

  it('la alerta se resuelve sola al reportar más avance y emite alerta_naranja al reaparecer', async () => {
    const activas = await srv.api('GET', '/alertas?estado=ACTIVA', { token: admin });
    assert.equal(activas.body.length, 1);
    assert.match(activas.body[0].mensaje, /Posible merma o robo en Cimientos: Cemento/);

    const proyectos = await srv.api('GET', '/proyectos', { token: residente });
    const det = await srv.api('GET', `/proyectos/${proyectos.body[0].id}`, { token: residente });
    const fase = det.body.fases[0];
    const tarea = fase.tareas[0];
    const cemento = tarea.bom.find((b) => b.codigo_sku === 'CEM-50KG');

    await srv.api('PATCH', `/fases/${fase.id}/avance`, { token: residente, body: { porcentaje_avance_real: 40 } });
    const despues = await srv.api('GET', '/alertas?estado=ACTIVA', { token: admin });
    assert.equal(despues.body.length, 0);

    // Consumir 20 bultos más (50%) con 40% de avance => +10% => vuelve la alerta, en vivo
    const sock = await srv.conectarSocket(admin);
    const evento = srv.esperarEvento(sock, 'alerta_naranja');
    const mov = await srv.api('POST', '/movimientos', {
      token: residente,
      body: { tipo: 'CONSUMO_OBRA', material_id: cemento.material_id, cantidad: 20, tarea_id: tarea.id },
    });
    assert.equal(mov.status, 201);
    const alerta = await evento;
    assert.equal(alerta.desviacion_pct, 10);
    sock.close();
  });
});
