# Flujo de Negocio y Ciclo de Vida de Materiales

Este documento explica cómo viajan los datos en **BuildSync ERP** para que el equipo de desarrollo entienda el "por qué" de las tablas y los endpoints.

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

## 6. Sincronización Offline-First (futuro Flutter)

- Todo `movimiento` se identifica por un **UUIDv4 generado en el cliente**. Reenviar el mismo UUID es idempotente: el servidor no lo vuelve a aplicar sobre el stock.
- Todas las tablas tienen `created_at` / `updated_at` (ISO-8601 UTC) para que el cliente pida "cambios desde `last_sync`".
- `POST /api/sync` acepta un lote de movimientos y actualizaciones de avance, y devuelve los cambios del servidor posteriores a `last_sync` junto con un nuevo `server_time`.
