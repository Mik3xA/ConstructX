# BuildSync ERP

Sistema de control de materiales para obras de construcción: compara el **presupuesto BOM** contra el **consumo real** en campo y dispara **alertas naranjas** cuando el consumo supera el avance de obra en más de 5 puntos (posible merma o robo).

| Capa | Tecnología |
|------|------------|
| Backend | Node.js + Express (CommonJS), SQLite (`better-sqlite3`), JWT + bcrypt |
| Frontend | Angular 19 (standalone), SCSS puro, RxJS `BehaviorSubject` |
| Móvil (futuro) | Flutter offline-first vía `POST /api/sync` (UUIDv4 + timestamps) |

## Inicio rápido

Requisitos: Node.js 18+ (probado con 22).

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install
npm run db:init      # crea dev.db con datos de ejemplo
npm start            # http://localhost:3000/api

# 2. Frontend (otra terminal)
cd frontend
npm install
npm start            # http://localhost:4200
```

### Usuarios de prueba (contraseña `BuildSync123!`)

| Rol | Email | Vista |
|-----|-------|-------|
| Administrador | `admin@buildsync.io` | `/dashboard` — KPIs y alertas naranjas |
| Bodeguero | `bodega@buildsync.io` | `/bodega` — ingresos y envíos a obra |
| Residente | `residente@buildsync.io` | `/campo` — consumo diario y avance |

Los datos semilla reproducen el ejemplo de `docs/flujo_negocio.md`: 30 de 100 bultos de cemento consumidos con 20% de avance ⇒ **+10% de desviación ⇒ alerta naranja**.

## Scripts del backend

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia la API |
| `npm run dev` | Inicia con recarga (`node --watch`) |
| `npm run db:init` | Crea el esquema y siembra si está vacía |
| `npm run db:reset` | Borra `dev.db` y la vuelve a crear |

## Documentación

- [`docs/agents.md`](docs/agents.md) — reglas para asistentes de IA (qué sí / qué no)
- [`docs/estructura.md`](docs/estructura.md) — estructura de carpetas
- [`docs/flujo_negocio.md`](docs/flujo_negocio.md) — ciclo de vida de materiales y algoritmo auditor
- [`docs/api.md`](docs/api.md) — endpoints REST y contrato de sincronización
