# Flujo de Negocio y Ciclo de Vida de Materiales

Este documento explica cómo viajan los datos en **ConstructX** para que el equipo de desarrollo entienda el "por qué" de las tablas y los endpoints.

```
 [Admin]                 [Bodeguero]                     [Residente]               [Auditor]
 Proyecto ─► Fases ─►    INGRESO_BODEGA (+stock)  ─►     CONSUMO_OBRA          ─►  alertas.service.js
 Tareas ─► BOM           ENVIO_OBRA     (−stock)         porcentaje_avance_real     ¿Consumo > Avance + 5%?
                                                                                    └─► Alerta NARANJA
```

## 1. Planeación (El Presupuesto BOM)

El **Admin** crea un Proyecto y sus Fases (y las Tareas de cada fase).
Luego, define el BOM (*Bill of Materials*) en la tabla `presupuesto_bom`.

> Ejemplo: Tarea: "Cimientos". Material: "Cemento". Cantidad: 100 bultos.

Endpoints: `POST /api/proyectos`, `POST /api/proyectos/:id/fases`, `POST /api/fases/:id/tareas`, `POST /api/tareas/:id/bom`.

## 2. Abastecimiento (Inventario Central)

El **Bodeguero** recibe camiones de los proveedores.
Registra en el sistema un movimiento de tipo `INGRESO_BODEGA`.

**Acción del Backend:** Suma el stock en la tabla `inventario_central`.

## 3. Despacho (De Bodega a Obra)

El **Bodeguero** autoriza que salgan 50 bultos hacia la construcción.
Registra un movimiento tipo `ENVIO_OBRA`.

**Acción del Backend:** Descuenta 50 bultos del `inventario_central`. Si no hay stock suficiente, la operación se rechaza (HTTP 409) y no se registra el movimiento.

## 4. Consumo en Campo (El Residente)

El **Residente de Obra** (usando la app) recibe los 50 bultos.
Al final del día, reporta que en la Tarea "Cimientos" se vertieron 30 bultos.
Registra un movimiento tipo `CONSUMO_OBRA`.
A la par, actualiza el `porcentaje_avance_real` de la Fase a "20%".

**Acción del Backend:** El consumo **no** toca `inventario_central` (el material ya salió de bodega con `ENVIO_OBRA`). Tras guardar, se ejecuta el auditor.

## 5. El Algoritmo Auditor (Alerta Naranja)

El servicio backend `alertas.service.js` se despierta (tras cada consumo/avance, tras cada `/api/sync` y periódicamente) y calcula, **por cada línea del BOM (tarea × material)**:

```
consumo_pct = SUM(cantidad de CONSUMO_OBRA de esa tarea y material) / cantidad_presupuestada × 100
avance_pct  = fases.porcentaje_avance_real de la fase de esa tarea
desviacion  = consumo_pct − avance_pct

SI consumo_pct > avance_pct + 5  ─►  ALERTA NARANJA
```

Con el ejemplo:

- Cemento presupuestado: 100 bultos.
- Cemento consumido hoy: 30 bultos (30% del total).
- Avance reportado de la obra: 20%.

**Resultado:** Se ha consumido el 30% del cemento para avanzar solo el 20%. Hay una desviación del **+10%** (superando el 5% de tolerancia).
El sistema dispara una notificación color **Naranja** al panel del Admin:

> "Posible merma o robo en Cimientos: Cemento".

Las alertas se persisten en la tabla `alertas` (una alerta activa por tarea × material). Si la desviación vuelve a estar dentro de la tolerancia (p. ej. porque se reportó más avance), la alerta pasa a estado `RESUELTA` automáticamente. El Admin también puede marcarla como `REVISADA`.

## 6. Portal de Clientes: Pedido de Flete

```
 [Cliente]                         [Backend]                                   [Admin / Bodeguero]
 Catálogo ─► Carrito ─► Cotizar ─► POST /pedidos/cotizar (no guarda nada)
                      ─► Confirmar ─► POST /pedidos
                                     ┌─ TRANSACCIÓN ─────────────────────────┐
                                     │ 1. ¿stock_actual ≥ cantidad? (todas)   │──✗──► 409, no se toca nada
                                     │ 2. inventario_central −= cantidad      │
                                     │ 3. INSERT pedidos_fletes (PENDIENTE)    │
                                     │ 4. INSERT detalles_pedido              │
                                     │ 5. INSERT movimientos SALIDA_FLETE     │
                                     └────────────────────────────────────────┘
                                     ─► Socket.io `nuevo_flete`  ─────────────► Toast + tabla en vivo
                                     ─► Nodemailer: recibo HTML al cliente
                                                     Bodega: Despachar ─► EN_RUTA ─► ENTREGADO
 Mis pedidos ◄── `flete_actualizado` ◄────────────────────────────────────────┘
```

1. **Catálogo visual:** el cliente ve materiales con foto, precio unitario (MXN sin IVA) y existencias.
2. **Cotización:** el carrito pide al servidor la cotización oficial. Los precios **siempre** salen de `catalogo_materiales`; lo que muestre el navegador es solo una vista previa.
3. **Costo del flete:** `base ($450) + 3% del subtotal`, **gratis** desde $25,000 (configurable en `.env`).
4. **Confirmación:** el motor de pedidos ejecuta todo en una transacción. Si alguna línea no tiene stock suficiente, responde 409 con la lista de `faltantes` y no descuenta nada.
5. **Trazabilidad:** cada línea genera un movimiento `SALIDA_FLETE` (con `pedido_id`) en el mismo libro que los ingresos y consumos de obra.
6. **Tiempo real:** tras el commit se emite `nuevo_flete` a las salas `rol:admin` y `rol:bodeguero`. Su panel muestra un toast y la fila nueva sin recargar.
7. **Recibo por email:** se envía después del commit. Si el correo falla, el pedido **no** se revierte (queda `recibo_enviado_at = NULL`).
8. **Seguimiento:** el bodeguero avanza el estado (`PENDIENTE → EN_RUTA → ENTREGADO`, nunca hacia atrás). El cliente recibe `flete_actualizado` en su sala personal.

## 7. Solicitudes de material (Residente → Bodega)

1. El residente pide material para su obra (`POST /api/solicitudes`). La bodega recibe `solicitud_material` en vivo.
2. **Aprobar** ejecuta en una transacción: verificar stock → movimiento `ENVIO_OBRA` (descuenta `inventario_central`) → solicitud `APROBADA`. Si no alcanza, responde 409 y la solicitud sigue `PENDIENTE`.
3. **Rechazar** exige un motivo. El residente recibe `solicitud_actualizada`.

## 8. Punto de reorden (stock mínimo)

Cada material tiene `stock_minimo`. Si `stock_actual <= stock_minimo`, aparece como **stock bajo** en el dashboard y el inventario, y tras un pedido se emite `stock_bajo` a Admin y Bodega.

## 9. Tienda pública

La raíz (`/`) es la tienda: cualquiera navega el catálogo y arma su carrito. Al confirmar, el carrito pide **crear cuenta o ingresar** y regresa al carrito con los productos intactos. El público ve `disponibilidad` (no la cifra exacta de inventario); el cliente con sesión obtiene la cotización oficial del servidor.

## 10. Sincronización Offline-First (futuro Flutter)

- Todo `movimiento` se identifica por un **UUIDv4 generado en el cliente**. Reenviar el mismo UUID es idempotente: el servidor no lo vuelve a aplicar sobre el stock.
- Todas las tablas tienen `created_at` / `updated_at` (ISO-8601 UTC) para que el cliente pida "cambios desde `last_sync`".
- `POST /api/sync` acepta un lote de movimientos, actualizaciones de avance y pedidos de flete (clientes), y devuelve los cambios del servidor posteriores a `last_sync` junto con un nuevo `server_time`.
