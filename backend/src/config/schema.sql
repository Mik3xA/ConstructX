-- =============================================================
-- ConstructX - Esquema SQLite (ERP de obra + Portal de Clientes)
-- Todas las fechas en ISO-8601 UTC (TEXT).
-- Los IDs son UUIDv4 (TEXT) para compatibilidad offline-first.
-- =============================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT NOT NULL,
  rol            TEXT NOT NULL CHECK (rol IN ('admin', 'bodeguero', 'residente', 'cliente')),
  nombre         TEXT NOT NULL,
  telefono       TEXT,
  empresa        TEXT,
  direccion      TEXT,
  activo         INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),  -- 0 = no puede iniciar sesión
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proyectos (
  id            TEXT PRIMARY KEY,
  nombre        TEXT NOT NULL,
  ubicacion     TEXT,
  fecha_inicio  TEXT,
  estado        TEXT NOT NULL DEFAULT 'ACTIVO'
                CHECK (estado IN ('PLANEACION', 'ACTIVO', 'PAUSADO', 'FINALIZADO')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fases (
  id                      TEXT PRIMARY KEY,
  proyecto_id             TEXT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre                  TEXT NOT NULL,
  porcentaje_avance_real  REAL NOT NULL DEFAULT 0
                          CHECK (porcentaje_avance_real BETWEEN 0 AND 100),
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fases_proyecto ON fases(proyecto_id);

CREATE TABLE IF NOT EXISTS tareas (
  id          TEXT PRIMARY KEY,
  fase_id     TEXT NOT NULL REFERENCES fases(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'PENDIENTE'
              CHECK (estado IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tareas_fase ON tareas(fase_id);

CREATE TABLE IF NOT EXISTS catalogo_materiales (
  id          TEXT PRIMARY KEY,
  codigo_sku      TEXT NOT NULL UNIQUE,
  nombre          TEXT NOT NULL,
  unidad          TEXT NOT NULL,
  categoria       TEXT NOT NULL DEFAULT 'General',
  descripcion     TEXT,
  precio_unitario REAL NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),  -- MXN, sin IVA
  imagen_url      TEXT,
  activo          INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),   -- visible en el catálogo
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS presupuesto_bom (
  id                      TEXT PRIMARY KEY,
  tarea_id                TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  material_id             TEXT NOT NULL REFERENCES catalogo_materiales(id),
  cantidad_presupuestada  REAL NOT NULL CHECK (cantidad_presupuestada > 0),
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  UNIQUE (tarea_id, material_id)
);

CREATE TABLE IF NOT EXISTS inventario_central (
  id            TEXT PRIMARY KEY,
  material_id   TEXT NOT NULL UNIQUE REFERENCES catalogo_materiales(id),
  stock_actual  REAL NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo  REAL NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),   -- punto de reorden
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Pedidos de flete hechos por Clientes desde el portal. PK = UUIDv4 (idempotencia).
CREATE TABLE IF NOT EXISTS pedidos_fletes (
  uuid               TEXT PRIMARY KEY,
  cliente_id         TEXT NOT NULL REFERENCES users(id),
  subtotal           REAL NOT NULL CHECK (subtotal >= 0),
  costo_flete        REAL NOT NULL CHECK (costo_flete >= 0),
  total_pagar        REAL NOT NULL CHECK (total_pagar >= 0),
  estado             TEXT NOT NULL DEFAULT 'PENDIENTE'
                     CHECK (estado IN ('PENDIENTE', 'EN_RUTA', 'ENTREGADO')),
  direccion_entrega  TEXT NOT NULL,
  telefono_contacto  TEXT,
  notas              TEXT,
  chofer             TEXT,               -- asignado al despachar (EN_RUTA)
  vehiculo           TEXT,
  fecha_estimada     TEXT,               -- fecha estimada de entrega (YYYY-MM-DD)
  despachado_at      TEXT,
  entregado_at       TEXT,
  recibo_enviado_at  TEXT,               -- cuándo se envió el recibo por email
  timestamp          TEXT NOT NULL,      -- momento del pedido (reloj del cliente)
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos_fletes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos_fletes(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_updated ON pedidos_fletes(updated_at);

CREATE TABLE IF NOT EXISTS detalles_pedido (
  id               TEXT PRIMARY KEY,
  pedido_id        TEXT NOT NULL REFERENCES pedidos_fletes(uuid) ON DELETE CASCADE,
  material_id      TEXT NOT NULL REFERENCES catalogo_materiales(id),
  cantidad         REAL NOT NULL CHECK (cantidad > 0),
  precio_unitario  REAL NOT NULL CHECK (precio_unitario >= 0),  -- precio congelado al momento del pedido
  subtotal         REAL NOT NULL CHECK (subtotal >= 0),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  UNIQUE (pedido_id, material_id)
);

-- Libro contable de materiales. PK = UUIDv4 (idempotencia en sync offline).
CREATE TABLE IF NOT EXISTS movimientos (
  uuid         TEXT PRIMARY KEY,
  proyecto_id  TEXT REFERENCES proyectos(id),
  tarea_id     TEXT REFERENCES tareas(id),
  material_id  TEXT NOT NULL REFERENCES catalogo_materiales(id),
  cantidad     REAL NOT NULL CHECK (cantidad > 0),
  tipo         TEXT NOT NULL CHECK (tipo IN ('INGRESO_BODEGA', 'ENVIO_OBRA', 'CONSUMO_OBRA', 'SALIDA_FLETE')),
  pedido_id    TEXT REFERENCES pedidos_fletes(uuid),   -- solo en SALIDA_FLETE
  usuario_id   TEXT NOT NULL REFERENCES users(id),
  timestamp    TEXT NOT NULL,          -- momento en que ocurrió (reloj del cliente)
  created_at   TEXT NOT NULL,          -- momento en que llegó al servidor
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mov_tarea_material ON movimientos(tarea_id, material_id, tipo);
CREATE INDEX IF NOT EXISTS idx_mov_proyecto ON movimientos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_mov_updated ON movimientos(updated_at);
CREATE INDEX IF NOT EXISTS idx_mov_pedido ON movimientos(pedido_id);

-- Alertas generadas por el algoritmo auditor (alertas.service.js)
CREATE TABLE IF NOT EXISTS alertas (
  id                      TEXT PRIMARY KEY,
  proyecto_id             TEXT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  fase_id                 TEXT NOT NULL REFERENCES fases(id) ON DELETE CASCADE,
  tarea_id                TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  material_id             TEXT NOT NULL REFERENCES catalogo_materiales(id),
  nivel                   TEXT NOT NULL DEFAULT 'NARANJA',
  consumo_pct             REAL NOT NULL,
  avance_pct              REAL NOT NULL,
  desviacion_pct          REAL NOT NULL,
  mensaje                 TEXT NOT NULL,
  estado                  TEXT NOT NULL DEFAULT 'ACTIVA'
                          CHECK (estado IN ('ACTIVA', 'REVISADA', 'RESUELTA')),
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  UNIQUE (tarea_id, material_id)
);
CREATE INDEX IF NOT EXISTS idx_alertas_estado ON alertas(estado);

-- Solicitudes de material del Residente a la Bodega central.
-- Al aprobarse se genera (en la misma transacción) un movimiento ENVIO_OBRA.
CREATE TABLE IF NOT EXISTS solicitudes_material (
  id              TEXT PRIMARY KEY,
  proyecto_id     TEXT NOT NULL REFERENCES proyectos(id),
  tarea_id        TEXT REFERENCES tareas(id),
  material_id     TEXT NOT NULL REFERENCES catalogo_materiales(id),
  cantidad        REAL NOT NULL CHECK (cantidad > 0),
  estado          TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
  notas           TEXT,
  motivo_rechazo  TEXT,
  solicitante_id  TEXT NOT NULL REFERENCES users(id),
  atendido_por    TEXT REFERENCES users(id),
  movimiento_uuid TEXT REFERENCES movimientos(uuid),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_material(estado);

-- Mensajes del formulario de contacto público.
CREATE TABLE IF NOT EXISTS mensajes_contacto (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL,
  telefono    TEXT,
  asunto      TEXT NOT NULL,
  mensaje     TEXT NOT NULL,
  leido       INTEGER NOT NULL DEFAULT 0 CHECK (leido IN (0, 1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
