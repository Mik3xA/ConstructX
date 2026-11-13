-- =============================================================
-- BuildSync ERP - Esquema SQLite
-- Todas las fechas en ISO-8601 UTC (TEXT).
-- Los IDs son UUIDv4 (TEXT) para compatibilidad offline-first.
-- =============================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT NOT NULL,
  rol            TEXT NOT NULL CHECK (rol IN ('admin', 'bodeguero', 'residente')),
  nombre         TEXT NOT NULL,
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
  codigo_sku  TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  unidad      TEXT NOT NULL,
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
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Libro contable de materiales. PK = UUIDv4 (idempotencia en sync offline).
CREATE TABLE IF NOT EXISTS movimientos (
  uuid         TEXT PRIMARY KEY,
  proyecto_id  TEXT REFERENCES proyectos(id),
  tarea_id     TEXT REFERENCES tareas(id),
  material_id  TEXT NOT NULL REFERENCES catalogo_materiales(id),
  cantidad     REAL NOT NULL CHECK (cantidad > 0),
  tipo         TEXT NOT NULL CHECK (tipo IN ('INGRESO_BODEGA', 'ENVIO_OBRA', 'CONSUMO_OBRA')),
  usuario_id   TEXT NOT NULL REFERENCES users(id),
  timestamp    TEXT NOT NULL,          -- momento en que ocurrió (reloj del cliente)
  created_at   TEXT NOT NULL,          -- momento en que llegó al servidor
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mov_tarea_material ON movimientos(tarea_id, material_id, tipo);
CREATE INDEX IF NOT EXISTS idx_mov_proyecto ON movimientos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_mov_updated ON movimientos(updated_at);

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
