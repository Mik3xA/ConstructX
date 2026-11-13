# ConstructX

Plataforma integral para materiales de construcción:

- **ERP de obra:** compara el presupuesto BOM contra el consumo real y dispara **alertas de merma** cuando el consumo supera el avance en más de 5 puntos.
- **Tienda en línea (página de inicio):** inicio con banners, catálogo por categorías, ficha de producto, Nosotros, Preguntas frecuentes y Contacto. Se navega sin cuenta; el registro se pide al confirmar el pedido.
- **Portal de clientes:** carrito, **pedido de fletes** con descuento transaccional de inventario, seguimiento en vivo (Socket.io), **recibo por email** (Nodemailer), historial y perfil.
- **Panel interno:** dashboard, reportes de ventas, productos y precios, usuarios, mensajes, despacho con chofer, puntos de reorden y solicitudes de material de obra.
- **Tema Light / Dark matte** automático (según el dispositivo) con toggle manual.

| Capa | Tecnología |
|------|------------|
| Backend | Node.js + Express (CommonJS), SQLite (`better-sqlite3`), JWT + bcrypt, Socket.io, Nodemailer |
| Frontend | Angular 19 (standalone), SCSS con variables CSS, RxJS `BehaviorSubject`, socket.io-client |
| Pruebas | `node:test` (backend) · Playwright (end-to-end) |
| Móvil (futuro) | Flutter offline-first vía `POST /api/sync` (UUIDv4 + timestamps) |

## Inicio rápido

Requisitos: Node.js 18+ (probado con 22 y 24).

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install
npm run db:reset     # crea dev.db con datos de ejemplo
npm start            # API http://localhost:3000/api · Socket.io ws://localhost:3000

# 2. Frontend (otra terminal)
cd frontend
npm install
npm start            # http://localhost:4200
```

> **¿Actualizaste el código?** El esquema de la base de datos cambió (v3). Si `npm start` te lo indica, ejecuta `npm run db:reset`.

### Usuarios de prueba (contraseña `ConstructX123!`)

`http://localhost:4200` abre la **tienda**. Para entrar: botón **Ingresar** (o `/acceso`).

| Rol | Email | Pantalla inicial |
|-----|-------|------------------|
| Cliente | `cliente@constructx.mx` (o `maria@obrasgarza.mx`) | Tienda → `/mi-cuenta` |
| Administrador | `admin@constructx.mx` | `/panel/dashboard` |
| Bodeguero | `bodega@constructx.mx` | `/panel/fletes` |
| Residente | `residente@constructx.mx` | `/panel/campo` |

Los clientes nuevos se registran con **Crear cuenta** (o desde el carrito al confirmar).

👉 **Guía para demostrar todo paso a paso:** [`docs/tour_pruebas.md`](docs/tour_pruebas.md)

## Correos (recibos)

Sin configurar SMTP, los recibos **no se envían**: se guardan como HTML en `backend/correos/recibo-<folio>.html` para que los abras en el navegador. Para enviarlos de verdad, llena en `backend/.env`:

```
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=contraseña
MAIL_FROM=ConstructX <ventas@tu-dominio.mx>
```

## Pruebas

```bash
# Backend: API, RBAC, motor de pedidos, sockets, email y auditor
cd backend
npm test
```

```bash
# End-to-end en navegador (levanta backend y frontend en puertos 3100/4300 con una BD temporal)
cd e2e
npm install
npm run instalar-navegador   # solo la primera vez
npm test
```

## Scripts del backend

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia la API + Socket.io |
| `npm run dev` | Inicia con recarga (`node --watch`) |
| `npm test` | Pruebas automáticas |
| `npm run db:init` | Crea el esquema y siembra si está vacía |
| `npm run db:reset` | Borra `dev.db` y la vuelve a crear |

## Documentación

- [`docs/agents.md`](docs/agents.md) — reglas para asistentes de IA (qué sí / qué no) y paleta
- [`docs/estructura.md`](docs/estructura.md) — estructura de carpetas
- [`docs/flujo_negocio.md`](docs/flujo_negocio.md) — ciclo de materiales, pedidos de flete y auditor
- [`docs/api.md`](docs/api.md) — endpoints REST y eventos de Socket.io
- [`docs/tour_pruebas.md`](docs/tour_pruebas.md) — tour de pruebas paso a paso

## Fotografías

Las fotos de productos y banners son fotos reales de Flickr elegidas por palabra clave (servicio [LoremFlickr](https://loremflickr.com)); cada producto tiene un número fijo para mostrar siempre la misma foto (`backend/src/config/fotos.js`). Si una foto no carga, se usa una foto real aleatoria de [Picsum](https://picsum.photos), y solo sin internet se ve una ilustración. Para usar fotos propias, cambia la URL de la imagen en **Panel → Productos**.
