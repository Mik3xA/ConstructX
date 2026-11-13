# Estructura del Directorio - ConstructX

Este documento define la estructura de carpetas **estricta** que el proyecto debe seguir. Backend (Node.js) y Frontend (Angular) viven en el mismo repositorio, claramente separados.

```
constructx/
├── backend/                  # Servidor Node.js + Express + Socket.io
│   ├── src/
│   │   ├── config/           # BD (SQLite), esquema, seed y variables de entorno
│   │   ├── controladores/    # Lógica de las rutas (auth, pedidos, catálogo, sync, proyectos, inventario)
│   │   ├── middlewares/      # Validaciones de JWT y Roles (RBAC), errores
│   │   ├── modelos/          # Consultas SQL nativas para SQLite
│   │   ├── rutas/            # Definición de Endpoints
│   │   ├── servicios/        # Lógica de negocio dura (pedidos, alertas, socket, email)
│   │   │   └── plantillas/   # Plantillas HTML de correo (recibo)
│   │   └── app.js            # Inicialización de Express
│   ├── test/                 # Pruebas automáticas (node:test) — npm test
│   ├── correos/              # Recibos HTML en modo desarrollo (no versionado)
│   ├── dev.db                # Base de datos SQLite local (no versionada)
│   ├── package.json
│   └── server.js             # Punto de entrada: HTTP + Socket.io
│
├── frontend/                 # Aplicación Angular Web
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/         # Guards, Interceptors (Token), Servicios HTTP, Socket, Tema, Carrito
│   │   │   ├── shared/       # Componentes reusables (Shell, Toasts, Tarjetas, Barras, Imagen de material)
│   │   │   ├── features/     # Vistas: Catálogo, Carrito, Mis pedidos, Fletes, Dashboard, Bodega, Campo, Login
│   │   │   └── app.routes.ts # Enrutamiento principal
│   │   ├── assets/           # Logo e ilustraciones de respaldo de materiales
│   │   ├── environments/     # URL de la API (dev / e2e)
│   │   ├── styles/           # SCSS: _theme (Light/Dark), _variables, _mixins, _base, _components
│   │   └── styles.scss       # Importación principal de estilos
│   ├── angular.json
│   └── package.json
│
├── e2e/                      # Pruebas end-to-end con Playwright (levantan backend + frontend)
│
├── docs/                     # Documentación del sistema
│   ├── agents.md             # Instrucciones para IAs asistentes (qué sí / qué no)
│   ├── estructura.md         # Este archivo
│   ├── flujo_negocio.md      # Ciclo de vida de materiales, pedidos y algoritmo auditor
│   └── api.md                # Endpoints REST y eventos de Socket.io
│
├── .gitignore
└── README.md
```

## Detalle de archivos clave

### Backend

| Ruta | Responsabilidad |
|------|-----------------|
| `src/config/env.js` | Variables de entorno: puerto, JWT, BD, tarifa de flete, SMTP. |
| `src/config/database.js` | Conexión SQLite (`better-sqlite3`), WAL, FKs, control de versión de esquema. |
| `src/config/schema.sql` | DDL de todas las tablas. |
| `src/config/seed.js` | Datos de ejemplo: usuarios, catálogo con precios/fotos, obra, pedidos. |
| `src/config/init-db.js` | `npm run db:init` / `db:reset`. |
| `src/middlewares/auth.middleware.js` | `verifyToken` y `verifyRole(...roles)`. |
| `src/servicios/pedidos.service.js` | **Motor de pedidos** transaccional (stock, totales, flete, eventos, recibo). |
| `src/servicios/socket.service.js` | Socket.io con autenticación JWT y salas por rol/usuario. |
| `src/servicios/email.service.js` | Nodemailer (SMTP real o archivo `.html` en desarrollo). |
| `src/servicios/plantillas/recibo.html.js` | HTML del recibo (estilos en línea, apto para clientes de correo). |
| `src/servicios/alertas.service.js` | Algoritmo auditor (Consumo vs. Avance). |
| `src/servicios/movimientos.service.js` | Libro de movimientos e inventario de obra. |
| `test/*.test.js` | Pruebas de API, RBAC, pedidos, sockets, email y auditor. |

### Frontend

| Ruta | Responsabilidad |
|------|-----------------|
| `core/services/theme.service.ts` | Tema Light/Dark (`prefers-color-scheme` + toggle persistente). |
| `core/services/socket.service.ts` | Conexión Socket.io autenticada; `on('nuevo_flete')`, etc. |
| `core/services/notificaciones.service.ts` | Convierte eventos en toasts y actualiza listas sin recargar. |
| `core/services/carrito.service.ts` | Carrito de fletes (BehaviorSubject + localStorage). |
| `core/services/pedidos.service.ts` | Cotizar, crear y cambiar estado de pedidos. |
| `shared/components/toast-container/` | Toasts animados. |
| `shared/components/material-img/` | Foto del producto con ilustración de respaldo. |
| `features/catalogo/` | Catálogo visual del cliente (tarjetas con fotos). |
| `features/carrito/` | Carrito con cotización del servidor y confirmación. |
| `features/mis-pedidos/` | Historial del cliente con seguimiento en vivo. |
| `features/fletes/` | Tablero de pedidos para Admin/Bodeguero (tiempo real). |
| `features/dashboard/` | Panel del Admin: ventas, pedidos en vivo, obras y alertas. |
| `features/bodega/`, `features/field-report/` | ERP de obra (Bodeguero / Residente). |
