# API REST y Tiempo Real - ConstructX

Base URL: `http://localhost:3000/api`
Autenticación: `Authorization: Bearer <JWT>` en todas las rutas excepto `POST /auth/login`, `POST /auth/registro` y `GET /health`.
El rol `admin` tiene acceso a todo. Fechas en ISO-8601 UTC.

## Auth

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/auth/login` | pública | `{ email, password }` → `{ token, user }` |
| POST | `/auth/registro` | pública | Alta de **clientes**: `{ email, password, nombre, telefono?, empresa?, direccion? }` → `{ token, user }`. El rol siempre es `cliente`. |
| GET | `/auth/me` | todos | Usuario actual |
| POST | `/auth/register` | admin | `{ email, password, rol, nombre }` |
| GET | `/auth/users` | admin | Lista usuarios |

| PATCH | `/auth/me` | todos | Perfil propio: `{ nombre?, telefono?, empresa?, direccion?, password_actual?, password_nueva? }` |

## Tienda pública (sin sesión)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/public/catalogo?categoria=&q=` | Productos activos con `disponibilidad` (DISPONIBLE / POCAS / AGOTADO) y `vendidos`; **sin** cifra exacta de stock |
| GET | `/public/catalogo/:sku` | `{ producto, relacionados }` |
| GET | `/public/info` | `{ tarifa_flete, cifras: { fletes_entregados, clientes, productos } }` |
| POST | `/public/contacto` | `{ nombre, email, telefono?, asunto, mensaje }` → 201. Límite: 5 mensajes por IP cada 10 min (429) |

## Proyectos / Planeación

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/proyectos` | todos | Lista con `avance_promedio` y `alertas_activas` |
| GET | `/proyectos/:id` | todos | Árbol `fases → tareas → bom` (con `cantidad_consumida`) |
| POST | `/proyectos` | admin | `{ nombre, ubicacion?, fecha_inicio?, estado? }` |
| PATCH | `/proyectos/:id` | admin | Campos parciales |
| POST | `/proyectos/:id/fases` | admin | `{ nombre, porcentaje_avance_real? }` |
| POST | `/fases/:id/tareas` | admin | `{ nombre, estado? }` |
| POST | `/tareas/:id/bom` | admin | `{ material_id, cantidad_presupuestada }` (upsert) |
| PATCH | `/fases/:id/avance` | residente | `{ porcentaje_avance_real, updated_at? }` → dispara auditor |
| PATCH | `/tareas/:id/estado` | residente | `{ estado: PENDIENTE \| EN_PROGRESO \| COMPLETADA }` |

## Materiales / Inventario / Movimientos

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/materiales` | todos | Catálogo |
| POST | `/materiales` | admin | `{ codigo_sku, nombre, unidad }` |
| GET | `/inventario` | bodeguero | Stock del inventario central |
| GET | `/movimientos` | todos | Filtros: `tipo, proyecto_id, tarea_id, material_id, limit, offset` |
| POST | `/movimientos` | por tipo | Ver abajo |

`POST /movimientos`

```json
{
  "uuid": "opcional-uuidv4-generado-por-el-cliente",
  "tipo": "INGRESO_BODEGA | ENVIO_OBRA | CONSUMO_OBRA",
  "material_id": "…",
  "cantidad": 30,
  "proyecto_id": "obligatorio en ENVIO_OBRA",
  "tarea_id": "obligatorio en CONSUMO_OBRA",
  "timestamp": "2026-11-13T18:00:00.000Z"
}
```

- `INGRESO_BODEGA`, `ENVIO_OBRA` → bodeguero. `CONSUMO_OBRA` → residente.
- `201` creado · `200` + `duplicado: true` si el uuid ya existía · `409` stock insuficiente.

## Portal de Clientes

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/catalogo?categoria=&q=` | todos | `{ categorias, materiales[{ precio_unitario, imagen_url, stock_disponible, ... }], tarifa_flete }` |
| PATCH | `/materiales/:id` | admin | `{ precio_unitario?, imagen_url?, descripcion?, categoria?, activo? }` |
| POST | `/pedidos/cotizar` | cliente | `{ items: [{ material_id, cantidad }] }` → `{ lineas, subtotal, costo_flete, total_pagar, faltantes }` (no guarda) |
| POST | `/pedidos` | cliente | Crea el pedido (ver abajo) |
| GET | `/pedidos?estado=` | cliente, bodeguero | El cliente solo recibe **sus** pedidos |
| GET | `/pedidos/:uuid` | cliente, bodeguero | Pedido con `detalles`. Un cliente recibe 404 si no es suyo |
| PATCH | `/pedidos/:uuid/estado` | bodeguero | `{ estado, chofer?, vehiculo?, fecha_estimada? }` — solo avanza; `EN_RUTA` exige chofer y vehículo |
| GET | `/pedidos/:uuid/recibo` | cliente, bodeguero | HTML del recibo (el cliente solo el suyo) |

## Gestión interna

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/solicitudes` | residente | `{ proyecto_id \| tarea_id, material_id, cantidad, notas? }` |
| GET | `/solicitudes?estado=` | residente, bodeguero | El residente solo ve las suyas |
| PATCH | `/solicitudes/:id/aprobar` | bodeguero | Genera `ENVIO_OBRA` y descuenta stock (409 si no alcanza) |
| PATCH | `/solicitudes/:id/rechazar` | bodeguero | `{ motivo }` obligatorio |
| PATCH | `/inventario/:materialId/minimo` | bodeguero | `{ stock_minimo }` (punto de reorden) |
| GET | `/reportes/ventas?dias=14` | admin | `{ serie, top_materiales, totales, por_estado }` |
| GET | `/usuarios?rol=` | admin | Usuarios con `total_pedidos` y `total_comprado` |
| PATCH | `/usuarios/:id` | admin | `{ activo?, rol?, nombre?, telefono?, password? }` (no puede desactivarse a sí mismo) |
| GET | `/mensajes` | admin | Mensajes de contacto |
| PATCH | `/mensajes/:id` | admin | `{ leido }` |

`POST /pedidos`

```json
{
  "uuid": "opcional-uuidv4-del-cliente",
  "items": [{ "material_id": "…", "cantidad": 10 }],
  "direccion_entrega": "opcional: usa la del perfil",
  "telefono_contacto": "opcional",
  "notas": "opcional (máx. 500)",
  "timestamp": "2026-11-13T18:00:00.000Z"
}
```

- `201` creado · `200` + `duplicado: true` si el uuid ya existía (idempotente) · `409` stock insuficiente con `details.faltantes` · `400` entrada inválida.
- Líneas repetidas del mismo material se suman. Cualquier precio enviado por el cliente se ignora.

## Eventos en tiempo real (Socket.io)

Conexión: `io('http://localhost:3000', { auth: { token: '<JWT>' } })`. Sin token válido la conexión se rechaza.

| Evento | Salas | Payload | Cuándo |
|--------|-------|---------|--------|
| `nuevo_flete` | `rol:admin`, `rol:bodeguero` | Pedido completo con `detalles` | Un cliente confirma un pedido |
| `flete_actualizado` | `rol:admin`, `rol:bodeguero`, `user:<cliente_id>` | Pedido + `actualizado_por` | Cambia el estado del flete |
| `inventario_actualizado` | `rol:admin`, `rol:bodeguero` | `{ materiales: [id] }` | Un pedido descuenta stock |
| `alerta_naranja` | `rol:admin` | Alerta | El auditor detecta una desviación nueva |
| `stock_bajo` | `rol:admin`, `rol:bodeguero` | `[{ nombre, stock_actual, stock_minimo, ... }]` | Un pedido deja materiales en o bajo su mínimo |
| `solicitud_material` | `rol:admin`, `rol:bodeguero` | Solicitud | Un residente pide material |
| `solicitud_actualizada` | staff + `user:<residente>` | Solicitud | Se aprueba o rechaza |
| `mensaje_contacto` | `rol:admin` | Mensaje | Llega un mensaje del formulario de contacto |

## Alertas y Dashboard (admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | `{ kpis, comercial, pedidos_recientes, stock_bajo, mensajes_sin_leer, solicitudes_pendientes, proyectos, stock, alertas }` |
| GET | `/alertas?estado=ACTIVA` | Alertas naranjas |
| POST | `/alertas/auditar` | Corre el auditor (`{ proyecto_id?, tarea_id? }`) |
| PATCH | `/alertas/:id/revisar` | Marca como `REVISADA` |

## Sync Offline-First

`POST /sync` (bodeguero, residente, cliente, admin)

```json
{
  "last_sync": "2026-11-12T00:00:00.000Z",
  "movimientos": [{ "uuid": "…", "tipo": "CONSUMO_OBRA", "material_id": "…", "cantidad": 5, "tarea_id": "…", "timestamp": "…" }],
  "fases_avance": [{ "fase_id": "…", "porcentaje_avance_real": 25, "updated_at": "…" }],
  "pedidos": [{ "uuid": "…", "items": [{ "material_id": "…", "cantidad": 3 }], "timestamp": "…" }]
}
```

Respuesta:

```json
{
  "server_time": "2026-11-13T18:05:00.000Z",
  "resultado": {
    "movimientos": { "aplicados": [], "duplicados": [], "rechazados": [{ "uuid": "…", "status": 409, "error": "…" }] },
    "fases_avance": { "aplicados": [], "ignorados": [], "rechazados": [] }
  },
  "cambios": { "proyectos": [], "fases": [], "tareas": [], "presupuesto_bom": [], "catalogo_materiales": [], "inventario_central": [], "movimientos": [], "alertas": [] }
}
```

- El cliente guarda `server_time` como su próximo `last_sync`.
- `movimientos` en sync **deben** traer `uuid`. Reenviar es seguro (idempotente).
- `fases_avance` usa *last-write-wins* por `updated_at`; si es más antiguo que el del servidor se reporta en `ignorados`.
- `alertas` solo se incluye para el rol admin. Un **cliente** solo recibe `catalogo_materiales` y sus `pedidos_fletes`. Máximo 500 elementos por lote.
