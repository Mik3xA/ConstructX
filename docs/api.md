# API REST - BuildSync ERP

Base URL: `http://localhost:3000/api`
Autenticación: `Authorization: Bearer <JWT>` en todas las rutas excepto `POST /auth/login` y `GET /health`.
El rol `admin` tiene acceso a todo. Fechas en ISO-8601 UTC.

## Auth

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/auth/login` | pública | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | todos | Usuario actual |
| POST | `/auth/register` | admin | `{ email, password, rol, nombre }` |
| GET | `/auth/users` | admin | Lista usuarios |

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

## Alertas y Dashboard (admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | `{ kpis, proyectos, stock, alertas }` |
| GET | `/alertas?estado=ACTIVA` | Alertas naranjas |
| POST | `/alertas/auditar` | Corre el auditor (`{ proyecto_id?, tarea_id? }`) |
| PATCH | `/alertas/:id/revisar` | Marca como `REVISADA` |

## Sync Offline-First

`POST /sync` (bodeguero, residente, admin)

```json
{
  "last_sync": "2026-11-12T00:00:00.000Z",
  "movimientos": [{ "uuid": "…", "tipo": "CONSUMO_OBRA", "material_id": "…", "cantidad": 5, "tarea_id": "…", "timestamp": "…" }],
  "fases_avance": [{ "fase_id": "…", "porcentaje_avance_real": 25, "updated_at": "…" }]
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
- `alertas` solo se incluye para el rol admin. Máximo 500 elementos por lote.
