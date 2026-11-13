# Estructura del Directorio - BuildSync ERP

Este documento define la estructura de carpetas **estricta** que el proyecto debe seguir. Está diseñado para mantener el Backend (Node.js) y el Frontend (Angular) en el mismo repositorio, claramente separados.

```
buildsync-erp/
├── backend/                  # Servidor Node.js + Express
│   ├── src/
│   │   ├── config/           # Configuración de BD (SQLite) y variables de entorno
│   │   ├── controladores/    # Lógica de las rutas (auth, sync, proyectos, inventario)
│   │   ├── middlewares/      # Validaciones de JWT y Roles (RBAC)
│   │   ├── modelos/          # Consultas SQL nativas o configuración de ORM para SQLite
│   │   ├── rutas/            # Definición de Endpoints
│   │   ├── servicios/        # Lógica de negocio dura (Ej. alertas.service.js)
│   │   └── app.js            # Inicialización de Express
│   ├── dev.db                # Base de datos SQLite local (generada, no versionada)
│   ├── package.json
│   └── server.js             # Punto de entrada del servidor
│
├── frontend/                 # Aplicación Angular Web
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/         # Guards, Interceptors (Token), Servicios HTTP
│   │   │   ├── shared/       # Componentes reusables (Botones, Tarjetas, Gráficos)
│   │   │   ├── features/     # Módulos por vista (Dashboard, Bodega, Residente)
│   │   │   └── app.routes.ts # Enrutamiento principal
│   │   ├── assets/           # Imágenes y logos
│   │   ├── styles/           # Archivos SCSS (Variables globales: Azul, Naranja, Negro, Blanco)
│   │   └── styles.scss       # Importación principal de estilos
│   ├── angular.json
│   └── package.json
│
├── docs/                     # Documentación del sistema
│   ├── agents.md             # Instrucciones para IAs asistentes
│   ├── estructura.md         # Este archivo
│   ├── flujo_negocio.md      # Lógica del cálculo de mermas
│   └── api.md                # Contrato de endpoints REST
│
├── .gitignore
└── README.md
```

## Detalle de archivos clave

### Backend

| Ruta | Responsabilidad |
|------|-----------------|
| `src/config/env.js` | Lee variables de entorno (`PORT`, `JWT_SECRET`, `DB_PATH`, `ALERTA_TOLERANCIA`). |
| `src/config/database.js` | Conexión única a SQLite (`better-sqlite3`), `PRAGMA foreign_keys = ON`, WAL. |
| `src/config/schema.sql` | DDL de todas las tablas. |
| `src/config/init-db.js` | Script `npm run db:init`: crea tablas y carga datos semilla. |
| `src/middlewares/auth.middleware.js` | `verifyToken` y `verifyRole(...roles)`. |
| `src/controladores/*.controller.js` | Reciben `req`/`res`, validan entrada y delegan en servicios/modelos. |
| `src/modelos/*.model.js` | SQL nativo con sentencias preparadas. |
| `src/servicios/movimientos.service.js` | Registra movimientos y aplica efectos sobre `inventario_central` en una transacción. |
| `src/servicios/alertas.service.js` | Algoritmo auditor (Consumo vs. Avance). |
| `src/rutas/*.routes.js` | Endpoints + middlewares de seguridad. |

### Frontend

| Ruta | Responsabilidad |
|------|-----------------|
| `core/services/*.service.ts` | Servicios HTTP + estado con `BehaviorSubject`. |
| `core/interceptors/auth.interceptor.ts` | Inyecta `Authorization: Bearer <token>`. |
| `core/guards/*.guard.ts` | Protección por sesión y por rol. |
| `shared/components/` | `stat-card`, `progress-bar`, `alert-badge`, `shell` (layout). |
| `features/dashboard/` | Vista Admin: KPIs, avance de proyectos, alertas naranjas. |
| `features/field-report/` | Vista Residente: reporte de consumo diario y avance de fase. |
| `features/bodega/` | Vista Bodeguero: ingresos y envíos a obra. |
| `features/auth/` | Login. |
