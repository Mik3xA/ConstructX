# Contexto y Reglas para Agentes de IA (Claude, Cursor, Copilot, etc.)

**Proyecto:** BuildSync ERP
**Objetivo:** Sistema de control de materiales de construcción (BOM vs. Consumo Real).

Cualquier IA que lea este repositorio **debe acatar estrictamente** las siguientes reglas antes de sugerir o generar código. Lee también `docs/estructura.md` y `docs/flujo_negocio.md`.

---

## ✅ Lo que SÍ puedes hacer

### Backend (Node.js)
- Escribir **JavaScript puro con CommonJS** (`require` / `module.exports`). Es la convención actual del backend.
- Usar **Express** para rutas y **better-sqlite3** para acceder a **SQLite (`dev.db`)**.
- Escribir **SQL nativo** con sentencias preparadas (`db.prepare(...)`) en `src/modelos/`.
- Envolver operaciones que modifiquen varias tablas en `db.transaction(...)`.
- Generar **UUIDv4** (`crypto.randomUUID()`) para los registros de `movimientos` cuando el cliente no lo envíe.
- Respetar el UUID enviado por el cliente y tratar reenvíos como **idempotentes** (no duplicar efectos sobre el stock).
- Guardar fechas como **ISO-8601 UTC** (`new Date().toISOString()`), y mantener `created_at` / `updated_at` en toda tabla nueva.
- Proteger cada ruta nueva con `verifyToken` y `verifyRole(...)`.
- Poner la lógica de negocio en `src/servicios/`, no en los controladores.
- Añadir endpoints documentándolos en `docs/api.md`.

### Frontend (Angular)
- Usar **componentes standalone** de Angular y **SCSS puro**.
- Consumir las variables de `src/styles/_variables.scss` (paleta oficial).
- Manejar estado con **RxJS `BehaviorSubject`** dentro de servicios en `core/`.
- Crear componentes reutilizables en `shared/` y vistas en `features/`.
- Mantener el diseño **Full-Page** (100% alto y ancho), moderno, minimalista, con bordes sutiles.

### Documentación
- Actualizar `docs/*.md` cuando cambie el esquema, un endpoint o el flujo.

---

## ❌ Lo que NO puedes hacer

### Lenguajes y stack
- **PROHIBIDO** usar Python, Java, PHP, Go, C# u otro lenguaje en el backend.
- **PROHIBIDO** cambiar de SQLite a otra base (Postgres, MySQL, Mongo) sin autorización humana.
- **NO** generar código Flutter / Dart en esta etapa (solo diseñar la API compatible).
- **NO** introducir TypeScript en el backend ni mezclar ES Modules con CommonJS.

### Datos y seguridad
- **NO** usar IDs autoincrementales para `movimientos`: siempre UUIDv4.
- **NO** crear rutas sin el middleware de JWT + rol (la única excepción es `POST /api/auth/login`).
- **NO** guardar contraseñas en texto plano: siempre `bcrypt`.
- **NO** devolver `password_hash` en ninguna respuesta.
- **NO** concatenar valores del usuario dentro de SQL (usar parámetros `?` o `@nombre`).
- **NO** versionar `dev.db`, `.env` ni secretos.
- **NO** permitir que `ENVIO_OBRA` deje el `stock_actual` en negativo.
- **NO** borrar movimientos (son un libro contable); las correcciones se hacen con movimientos compensatorios.

### Frontend
- **NO** usar librerías de componentes pesadas (Angular Material, Bootstrap, PrimeNG…) a menos que el humano lo pida.
- **NO** introducir colores fuera de la paleta oficial:
  - **Primario:** Azul.
  - **Acento/Peligro:** Naranja.
  - **Fondos:** Negro / Dark Charcoal.
  - **Texto/Contraste:** Blanco.
- **NO** usar NgRx / Akita / otras librerías de estado; usar `BehaviorSubject`.
- **NO** guardar lógica de negocio crítica (cálculo de desviación) solo en el frontend; el backend es la fuente de verdad.

---

## 🔒 Lógica de Negocio Intocable

**Cálculo de Desviación:** Nunca modificar la regla:

```
Consumo_Real% > (Avance_Obra% + 5%)  ⇒  ALERTA NARANJA
```

Esta es la funcionalidad central del sistema para detectar robos o desperdicios. Vive en `backend/src/servicios/alertas.service.js`. Puedes refactorizar su implementación, pero el resultado de la regla debe ser idéntico. La tolerancia por defecto es **5** puntos porcentuales.

## Roles (RBAC)

| Rol | Valor en BD | Permisos |
|-----|-------------|----------|
| Administrador | `admin` | Acceso total. Dashboard financiero, alertas, CRUD de proyectos/BOM/usuarios. |
| Bodeguero | `bodeguero` | `INGRESO_BODEGA`, `ENVIO_OBRA`, consulta de inventario. |
| Residente de Obra | `residente` | `CONSUMO_OBRA`, actualizar `porcentaje_avance_real`, consultar proyectos. |
