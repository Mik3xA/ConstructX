# Tour de pruebas paso a paso — ConstructX

Guía para demostrar que **todo funciona**, ideal para presentar el sistema. Cada paso dice **qué hacer** y **qué debes ver** (✅).
Tiempo estimado: 25–30 minutos.

> **Contraseña de todas las cuentas de prueba:** `ConstructX123!`
>
> | Rol | Correo |
> |-----|--------|
> | Administrador | `admin@constructx.mx` |
> | Bodeguero | `bodega@constructx.mx` |
> | Residente de obra | `residente@constructx.mx` |
> | Cliente (con historial) | `cliente@constructx.mx` |
> | Cliente 2 | `maria@obrasgarza.mx` |

---

## 0. Preparación

1. Terminal 1 (backend):
   ```bash
   cd backend
   npm install
   npm run db:reset
   npm start
   ```
   ✅ Ves `ConstructX API escuchando en http://localhost:3000/api`, `Socket.io activo` y `Auditor inicial: 1 alerta(s) activa(s)`.
2. Terminal 2 (frontend):
   ```bash
   cd frontend
   npm install
   npm start
   ```
3. Para ver el **tiempo real** necesitas varias sesiones a la vez. Usa ventanas separadas que no compartan sesión:
   - **Ventana A:** navegador normal → será el *cliente*.
   - **Ventana B:** ventana de incógnito → *Administrador*.
   - **Ventana C:** otro navegador (o un perfil distinto) → *Bodeguero*.

> `npm run db:reset` deja los datos de ejemplo limpios. Repítelo cuando quieras volver a empezar el tour.

---

## 1. Tienda pública (Ventana A, sin iniciar sesión)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 1.1 | Abre `http://localhost:4200` | La **tienda**, no el login: barra superior (flete gratis, horario, teléfono), buscador, menú y carrusel con 3 banners que cambian solos. |
| 1.2 | Baja por la página | Beneficios, **Compra por categoría** (5 tarjetas con foto), **Más vendidos**, 2 banners promocionales, **¿Cómo pedir tu flete?** (4 pasos), cifras, opiniones, invitación a crear cuenta y pie de página con 4 columnas. |
| 1.3 | Menú **Productos** (pasa el mouse) | Submenú con las 5 categorías. Elige **Acero**. |
| 1.4 | En el catálogo | Banner "Acero", filtros a la izquierda y solo productos de acero. Cambia **Ordenar por → Precio: menor a mayor**. Los precios quedan ordenados y la URL cambia (`?orden=precio-asc`). |
| 1.5 | Escribe `varilla` en el buscador del encabezado y presiona Enter | Las dos varillas y el alambre recocido (su descripción menciona varilla), con el texto "para «varilla»" y un enlace **limpiar**. |
| 1.6 | Clic en la foto o el nombre de **Cemento gris CPC 30R** | Ficha del producto: foto grande, precio, "● En existencia", descripción, selector de cantidad, ventajas, tabla de especificaciones y **También te puede interesar**. |
| 1.7 | Menú **Nosotros** | Historia, cifras, Misión / Visión / Compromiso, valores y zonas de cobertura. |
| 1.8 | Menú **Preguntas frecuentes** | Preguntas agrupadas por tema. Clic en una: se despliega la respuesta. Escribe `factura` en el buscador: solo quedan las preguntas relacionadas. |
| 1.9 | Menú **Contacto** → llena nombre, correo y un mensaje de más de 10 letras → **Enviar mensaje** | "¡Mensaje enviado! Gracias, …". *(En el paso 9 el Admin lo verá.)* |
| 1.10 | Clic en el ícono de luna (encabezado) | Toda la página cambia a **modo oscuro mate** (gris carbón, nunca negro puro). Recarga: se mantiene. Vuelve a dar clic para regresar. |

---

## 2. Carrito como visitante → registro (Ventana A)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 2.1 | En la ficha del cemento, sube la cantidad a **3** → **Agregar al carrito** | Aviso verde "Agregado al carrito". El botón del carrito muestra **1** y el subtotal. |
| 2.2 | Ve a **Productos → Acero** → **Agregar al carrito** en *Varilla corrugada 3/8"* | El contador sube a **2**. |
| 2.3 | Clic en el carrito | Tus 2 productos, **subtotal**, **flete estimado** y el recuadro **"Crea tu cuenta para hacer tu pedido"**. No puedes confirmar sin cuenta. |
| 2.4 | Cambia la varilla a **10** piezas | El subtotal y el flete estimado se recalculan. |
| 2.5 | **Crear cuenta y continuar** | Pantalla de acceso en la pestaña **Crear cuenta**. |
| 2.6 | Llena nombre, un correo **tuyo y nuevo**, dirección de entrega y contraseña (mín. 8) → **Crear cuenta** | Regresas **directo al carrito** con tus productos intactos. Ahora aparecen el formulario de **Entrega**, con tu dirección ya llena, y la **cotización oficial del servidor**: subtotal $2,415.00 · flete $522.45 · **total $2,937.45**. |

> No confirmes todavía: primero prepara las ventanas del Admin y del Bodeguero (paso 3).

---

## 3. Pedido en tiempo real (Ventanas A, B y C)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 3.1 | **Ventana B:** `http://localhost:4200/acceso` → `admin@constructx.mx` | Entra al **Panel de control**. Abajo a la izquierda dice **● En vivo**. |
| 3.2 | **Ventana C:** entra con `bodega@constructx.mx` | Entra a **Pedidos de flete**, pestaña *Pendientes*, con el chip "Escuchando pedidos en vivo". |
| 3.3 | **Ventana A:** escribe una nota para el chofer → **Confirmar pedido de flete** | Pantalla **"¡Listo! Tu flete está en preparación"** con **folio**, materiales, flete y total. |
| 3.4 | Mira **Ventanas B y C** *sin recargar* | Aparece un **aviso naranja animado** "Nuevo pedido de flete · Tu nombre · $2,937.45". En C la fila nueva aparece arriba con la etiqueta **Nuevo**. En B suben **Fletes pendientes** y **Ventas del mes**, y el pedido sale en *Pedidos recientes*. |

---

## 4. Recibo por correo

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 4.1 | Abre la carpeta `backend/correos/` | Un archivo `recibo-<folio>.html`. |
| 4.2 | Ábrelo con doble clic | Recibo con logo ConstructX, folio, fecha, materiales, **costo del flete**, **total a pagar**, dirección y tu nota para el chofer. |

> Si configuras `SMTP_*` en `backend/.env`, el recibo llega a tu correo real en lugar de guardarse en esta carpeta.

---

## 5. Despacho con chofer y seguimiento (Ventanas A y C)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 5.1 | **Ventana A:** **Seguir mi pedido** | **Mi cuenta → Mis pedidos**, con tu pedido en **Pendiente** y la línea de seguimiento *Recibido → En ruta → Entregado*. |
| 5.2 | **Ventana C:** clic en **Despachar** en tu pedido | Ventana para elegir **chofer**, **unidad** y **fecha estimada** (mañana por defecto). Elige un chofer → **Confirmar salida a ruta**. |
| 5.3 | **Ventana A**, sin recargar | El estado cambia a **En ruta** y aparece el aviso "Tu pedido XXXX está en ruta". Al abrir el pedido ves **chofer, unidad y fecha estimada**. |
| 5.4 | **Ventana C:** clic en el folio | Panel lateral con el detalle del pedido y **Ver / imprimir recibo**. Clic en **Marcar entregado**. |
| 5.5 | **Ventana A** | El pedido pasa a **Entregado**, con fecha y hora de entrega. |

---

## 6. Mi cuenta del cliente (Ventana A)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 6.1 | Abre tu pedido → **Ver recibo** | Se abre el recibo en una pestaña nueva, ya con estado *Entregado* y el chofer. |
| 6.2 | **Volver a pedir** | Los mismos materiales se agregan al carrito con los **precios actuales**. |
| 6.3 | Pestaña **Mi perfil** → cambia tu teléfono → **Guardar cambios** | "Perfil actualizado." |
| 6.4 | Cambia la contraseña con una actual **incorrecta** | Error "La contraseña actual no es correcta". |
| 6.5 | Escribe `/panel/dashboard` en la barra de direcciones | Te regresa a la tienda: un cliente **no** entra al panel interno. |

---

## 7. Bodeguero: inventario (Ventana C)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 7.1 | Menú **Inventario** | Tabla con stock y **mínimo (reorden)**. *Polín de pino* y *Malla electrosoldada* aparecen resaltadas con "Reordenar" y el chip **"2 bajo mínimo"**. |
| 7.2 | **Ingreso de proveedor:** Polín de pino, 20 → **Registrar ingreso** | El stock sube y el polín deja de estar bajo mínimo. |
| 7.3 | Cambia el mínimo del *Cemento* a `1000` → **Guardar** | El cemento queda marcado como stock bajo. |
| 7.4 | **Envío a obra:** Cemento, Torre Residencial Norte, `99999` | Error naranja **"Stock insuficiente"** y el stock no cambia. |

---

## 8. Residente de obra (Ventana B: cierra sesión del Admin y entra con `residente@constructx.mx`)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 8.1 | Entras en **Reporte de campo** | Proyecto, fase y tarea ya seleccionados. |
| 8.2 | Escribe `20` en *Arena* | La barra de la arena se pone naranja y aparece el aviso "superarían el avance + 5%". Borra el 20. |
| 8.3 | Menú **Solicitudes de obra** → Material: *Varilla corrugada 1/2"*, cantidad `30`, nota "Columnas" → **Enviar solicitud a bodega** | Aviso "Solicitud enviada". Ves tu solicitud **Pendiente** (más una que ya venía en los datos de ejemplo). |
| 8.4 | **Ventana C (bodega)** | Aviso "Nueva solicitud de material". Menú **Solicitudes de obra**: aparece con el stock disponible. Clic en **Aprobar y enviar**. |
| 8.5 | **Ventana B (residente)**, sin recargar | La solicitud cambia a **Aprobada** y aparece el aviso "Solicitud aprobada". *(En bodega el stock de varilla bajó 30.)* |
| 8.6 | **Ventana C:** en la otra solicitud pendiente → **Rechazar** → escribe un motivo → **Confirmar rechazo** | **Ventana B** muestra el aviso "Solicitud rechazada" con el motivo. |

---

## 9. Administrador (Ventana B: cierra sesión y entra con `admin@constructx.mx`)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 9.1 | **Dashboard** | KPIs (ventas del mes, fletes pendientes, avance de obra, alertas de merma). Franja **Atención**: materiales bajo mínimo, solicitudes pendientes y mensajes sin leer. **Alerta de merma** "Posible merma o robo en Cimientos: Cemento" (30% vs 20%, +10%). |
| 9.2 | **Reportes de ventas** | KPIs del periodo y una gráfica de barras por día. Pasa el mouse sobre una barra: ves fecha, total y pedidos. Cambia a **7 / 14 / 30 días**. **Ver tabla** muestra los mismos datos en tabla. También ves los materiales más vendidos y los pedidos por estado. |
| 9.3 | **Productos** → cambia el precio del *Cemento gris* a `259` → **Guardar** | Aviso "Precio actualizado". En la **Ventana A**, la ficha del cemento muestra **$259.00**. |
| 9.4 | Desactiva el interruptor **En tienda** de *Cal hidratada* | En la Ventana A, la cal **desaparece** del catálogo. Vuelve a activarla. |
| 9.5 | **+ Nuevo producto** → llena SKU, nombre, precio → **Crear producto** | Aparece en la tabla con stock 0 (la bodega registra la entrada). |
| 9.6 | **Usuarios → Clientes** | Clientes con número de pedidos y total comprado. |
| 9.7 | **Desactivar** la cuenta que creaste en el paso 2 → en la **Ventana A** navega a *Mi cuenta* | La sesión del cliente se **cierra sola**. Si intenta entrar: "Tu cuenta está desactivada". Reactívala. |
| 9.8 | **Usuarios → Equipo interno** → da de alta un bodeguero | Aparece en la lista y puede entrar con ese correo. |
| 9.9 | **Mensajes** | El mensaje que enviaste en el paso 1.9 y el de ejemplo, con **Responder por correo** y **Marcar como leído**. |
| 9.10 | En la Ventana A (cerrando sesión) envía otro mensaje desde **Contacto** | En la Ventana B aparece al instante el aviso **"Nuevo mensaje de contacto"**. |
| 9.11 | **Ver tienda** (menú lateral) | Abre la tienda pública. El menú de tu nombre dice **Ir al panel**. |

---

## 10. Casos de error que el sistema debe manejar

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 10.1 | Login con contraseña incorrecta | "Credenciales inválidas". |
| 10.2 | Como bodeguero escribe `/panel/dashboard` | Te regresa a *Pedidos de flete* (no tiene permiso). |
| 10.3 | Cliente con un producto agotado o escaso: pide más de lo disponible | Al confirmar: "Stock insuficiente", la línea marcada "Solo hay X disponibles" y el botón deshabilitado. No se descuenta nada del inventario. |
| 10.4 | Con una sesión del panel abierta, detén el backend (Ctrl+C) | El indicador del panel cambia a **Desconectado** en segundos. Si intentas iniciar sesión verás "No hay conexión con el servidor". Al volver a encender el backend se reconecta solo. |

---

## 11. Vista móvil

Abre las herramientas del navegador (F12) → modo dispositivo (Ctrl+Shift+M) → iPhone o similar:
- ✅ Tienda: menú hamburguesa, buscador debajo del logo, tarjetas en 2 columnas.
- ✅ Panel: la navegación pasa a una barra inferior.

---

## 12. Pruebas automáticas (opcional, para el equipo técnico)

```bash
cd backend && npm test
```
✅ **48 pruebas** pasan: API, permisos por rol, motor de pedidos, stock, idempotencia, sockets, correo, tienda pública, solicitudes, reportes, usuarios y la regla de merma.

```bash
cd e2e
npm install
npm run instalar-navegador
npm test
```
✅ **14 pruebas end-to-end** pasan en un navegador real. Cubren la tienda, el registro desde el carrito, el pedido en vivo, el recibo, el despacho con chofer, las solicitudes de obra y el panel del admin. Usan una base de datos temporal, así que no tocan tu `dev.db`.
