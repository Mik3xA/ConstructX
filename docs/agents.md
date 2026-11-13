# Contexto y Reglas para Agentes de IA (Claude, Cursor, Copilot, etc.)

**Proyecto:** ConstructX
**Objetivo:** Plataforma integral que funciona como **ERP de control de obras** (BOM vs. consumo real) y como **Portal de Clientes** para pedir fletes de materiales de construcción.

Cualquier IA que lea este repositorio **debe acatar estrictamente** las siguientes reglas antes de sugerir o generar código. Lee también `docs/estructura.md`, `docs/flujo_negocio.md` y `docs/api.md`.

---

## ✅ Lo que SÍ puedes hacer

### Backend (Node.js)
- Escribir **JavaScript puro con CommonJS** (`require` / `module.exports`).
- Usar **Express** para rutas, **better-sqlite3** para **SQLite (`dev.db`)**, **Socket.io** para tiempo real y **Nodemailer** para correos.
- Escribir **SQL nativo** con sentencias preparadas (`db.prepare(...)`) en `src/modelos/`.
- Envolver operaciones que modifiquen varias tablas en `db.transaction(...)` (p. ej. el motor de pedidos).
- Generar **UUIDv4** (`crypto.randomUUID()`) para `movimientos` y `pedidos_fletes` cuando el cliente no lo envíe.
- Respetar el UUID enviado por el cliente y tratar reenvíos como **idempotentes**.
- Guardar fechas como **ISO-8601 UTC** y mantener `created_at` / `updated_at` en toda tabla nueva.
- Proteger cada ruta nueva con `verifyToken` y `verifyRole(...)`.
- Emitir eventos en tiempo real **solo** a través de `servicios/socket.service.js` (`emitir(salas, evento, payload)`).
- Poner la lógica de negocio en `src/servicios/`, no en los controladores.
- Añadir pruebas en `backend/test/` (`npm test`) para toda regla de negocio nueva.
- Documentar endpoints y eventos nuevos en `docs/api.md`.

### Frontend (Angular)
- Usar **componentes standalone** de Angular y **SCSS puro**.
- Usar **solo variables CSS del tema** para colores: `var(--bg-color)`, `var(--surface)`, `var(--text)`, `var(--primary-orange)`, `var(--accent-amber)`, etc. (definidas en `src/styles/_theme.scss`).
- Manejar estado con **RxJS `BehaviorSubject`** dentro de servicios en `core/`.
- Escuchar eventos de Socket.io mediante `SocketService.on('evento')`.
- Crear componentes reutilizables en `shared/` y vistas en `features/`.
- Mantener el diseño **Full-Page**, moderno, cálido, minimalista, con bordes sutiles, y que funcione en móvil.

### Documentación
- Actualizar `docs/*.md` cuando cambie el esquema, un endpoint, un evento o el flujo.

---

## ❌ Lo que NO puedes hacer

### Lenguajes y stack
- **PROHIBIDO** usar Python, Java, PHP, Go, C# u otro lenguaje en el backend.
- **PROHIBIDO** cambiar de SQLite a otra base (Postgres, MySQL, Mongo) sin autorización humana.
- **NO** generar código Flutter / Dart en esta etapa (solo diseñar la API compatible).
- **NO** introducir TypeScript en el backend ni mezclar ES Modules con CommonJS.

### Datos y seguridad
- **NO** usar IDs autoincrementales para `movimientos` ni `pedidos_fletes`: siempre UUIDv4.
- **NO** crear rutas sin JWT + rol. Las **únicas** rutas públicas son `POST /api/auth/login` y `POST /api/auth/registro` (que siempre crea rol `cliente`).
- **NO** aceptar precios ni totales enviados por el cliente: el backend los calcula desde `catalogo_materiales`.
- **NO** descontar inventario fuera de una transacción, ni permitir `stock_actual` negativo.
- **NO** permitir registrar `SALIDA_FLETE` manualmente: solo lo genera `pedidos.service.js`.
- **NO** mostrar a un cliente pedidos de otro cliente ni datos internos del ERP (obras, inventario, alertas).
- **NO** guardar contraseñas en texto plano (siempre `bcrypt`) ni devolver `password_hash`.
- **NO** concatenar valores del usuario dentro de SQL ni de HTML de correos (escapar siempre).
- **NO** versionar `dev.db`, `.env`, `correos/` ni secretos (SMTP incluido).
- **NO** borrar movimientos (son un libro contable); las correcciones se hacen con movimientos compensatorios.
- **NO** hacer que un fallo del correo revierta un pedido: el recibo se envía después del commit.

### Frontend
- **NO** usar librerías de componentes pesadas (Angular Material, Bootstrap, PrimeNG…) a menos que el humano lo pida.
- **NO** escribir colores fijos (`#hex`) en componentes: usar las variables CSS del tema.
- **NO** usar negro puro `#000000` en ningún modo. El modo oscuro es **matte** (`#121212` / `#1E1E1E`).
- **NO** usar NgRx / Akita / otras librerías de estado; usar `BehaviorSubject`.
- **NO** confiar en cálculos del frontend (carrito, desviación): son vista previa; el backend es la fuente de verdad.

---

## 🎨 Paleta ConstructX (estricta)

| Token | Light (por defecto) | Dark (matte) | Uso |
|-------|--------------------|--------------|-----|
| `--bg-color` | `#F7F3ED` beige claro | `#121212` carbón mate | Fondo de la app |
| `--surface` | `#FFFFFF` | `#1E1E1E` | Tarjetas |
| `--text` | `#2A241F` | `#F1ECE4` blanco hueso | Texto |
| `--primary-orange` | `#E2600F` | `#F07A30` | Botones, CTA, iconos activos |
| `--accent-amber` | `#B7801F` | `#DDB054` | Amarillo tostado (acento) |
| `--accent-gray` | `#8C8279` | `#A69C91` | Gris cálido |
| `--danger` | `#B93A0B` | `#FF8A5C` | Alertas de merma / errores |

El tema sigue `prefers-color-scheme` y el usuario puede fijarlo con el toggle (`<html data-theme>`).

---

## 🔒 Lógica de Negocio Intocable

1. **Cálculo de Desviación:** `Consumo_Real% > (Avance_Obra% + 5%)  ⇒  ALERTA NARANJA`
   (en `backend/src/servicios/alertas.service.js`). Puedes refactorizar, pero el resultado debe ser idéntico.
2. **Motor de pedidos:** verificar stock → restar inventario → crear pedido + detalles + movimientos `SALIDA_FLETE`, **todo en una transacción**. Si falta stock de cualquier línea, no se modifica nada (HTTP 409).
3. **Estados de flete** solo avanzan: `PENDIENTE → EN_RUTA → ENTREGADO`.

## Roles (RBAC)

| Rol | Valor en BD | Permisos |
|-----|-------------|----------|
| Administrador | `admin` | Acceso total. Dashboard financiero, alertas, notificaciones en vivo de pedidos. |
| Bodeguero | `bodeguero` | Inventario, `INGRESO_BODEGA`, `ENVIO_OBRA`, preparar y despachar fletes. |
| Residente de Obra | `residente` | `CONSUMO_OBRA`, avance de fases. |
| Cliente | `cliente` | Catálogo, cotizar, pedir fletes, ver **sus** pedidos. |
