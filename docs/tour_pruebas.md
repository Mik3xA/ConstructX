# Tour de ConstructX: roles y pruebas paso a paso

Guía para entender qué hace cada cuenta y para demostrar que **todo funciona**. Cada paso dice **qué hacer** y **qué debes ver** (✅).
Tiempo estimado: 30 minutos.

---

## Parte 1 · ¿Qué hace cada rol?

ConstructX tiene dos caras:

- **La tienda en línea** (`http://localhost:4200`): es la página de inicio. Cualquiera la visita sin cuenta.
- **El panel interno** (`/panel`): para el equipo de la empresa.

Todos entran por el mismo botón **Ingresar** con su correo y contraseña.

### 🧑 Visitante (sin cuenta)
- Navega la tienda: inicio, catálogo, fichas de producto, Nosotros, Preguntas frecuentes y Contacto.
- Arma un carrito y ve un **flete estimado**.
- Envía mensajes desde **Contacto**.
- **No puede confirmar pedidos**: el carrito le pide crear una cuenta (toma un minuto) y lo regresa al carrito con sus productos.

### 🏗️ Cliente — `cliente@constructx.mx`
Es quien **compra material y pide el flete a su obra**.
- Todo lo del visitante.
- **Confirma pedidos** con la cotización oficial del servidor: precios, costo del flete (gratis desde $25,000) y total.
- Recibe el **recibo por correo**.
- En **Mi cuenta → Mis pedidos**:
  - Sigue cada pedido **en vivo**: Recibido → En ruta (con chofer, unidad y fecha estimada) → Entregado.
  - Abre o imprime el recibo.
  - **Vuelve a pedir** lo mismo con un clic.
- En **Mi perfil** cambia sus datos, la dirección de entrega y la contraseña.
- No ve nada interno: inventario, obras, otros clientes.

### 👷 Residente de obra — `residente@constructx.mx`
Es el **ingeniero en campo** que controla el material de su obra.
- **Reporte de campo:** registra lo que se consumió hoy en cada tarea y el **% de avance** de la fase. Si el consumo va más rápido que el avance (más de 5 puntos), el sistema avisa al Admin de una **posible merma o robo**.
- **Solicitudes de obra:** pide material a la bodega central y ve **en vivo** si se aprobó o rechazó, y por qué.

### 📦 Bodeguero — `bodega@constructx.mx`
Es el **almacén central**: entra y sale todo el material.
- **Pedidos de flete:**
  - Recibe al instante los pedidos de los clientes (aviso + fila nueva).
  - **Despacha** asignando chofer, unidad y fecha estimada, y luego marca **Entregado**.
- **Inventario:**
  - Registra las **entradas de proveedor** y los **envíos a obra**.
  - Define el **punto de reorden** (stock mínimo) de cada material y ve qué hay que reordenar.
- **Solicitudes de obra:** **aprueba** (el material sale del inventario automáticamente) o **rechaza con motivo** lo que piden los residentes.

### 👔 Administrador — `admin@constructx.mx`
Es el **dueño o gerente**, con acceso total.
- **Dashboard:**
  - Ventas del mes y fletes pendientes.
  - Avance de obra y **alertas de merma**.
  - Avisos de material bajo mínimo, solicitudes pendientes y mensajes sin leer.
  - Pedidos recientes **en vivo**.
- **Reportes de ventas:** gráfica de ventas por día (7, 14 o 30 días), ticket promedio, ingresos por flete, materiales más vendidos y vista de tabla.
- **Productos:** cambia precios, oculta o muestra productos en la tienda y da de alta productos nuevos.
- **Usuarios:**
  - Ve a los clientes con su historial de compras.
  - **Desactiva** cuentas (la sesión se cierra al instante).
  - Da de alta empleados.
- **Mensajes:** bandeja del formulario de Contacto, con aviso en vivo cuando llega uno nuevo.
- Puede entrar a todas las pantallas del bodeguero y del residente.

> **Contraseña de todas las cuentas de prueba:** `ConstructX123!`
> Cliente adicional con historial: `maria@obrasgarza.mx`.

---

## Parte 2 · Preparación

1. Terminal 1 (backend):
   ```bash
   cd backend
   npm install
   npm run db:reset
   npm start
   ```
   ✅ `ConstructX API escuchando en http://localhost:3000/api`, `Socket.io activo` y `Auditor inicial: 1 alerta(s) activa(s)`.
2. Terminal 2 (frontend):
   ```bash
   cd frontend
   npm install
   npm start
   ```
3. Abre **tres ventanas que no compartan sesión** para ver el tiempo real:
   - **Ventana A:** navegador normal → cliente.
   - **Ventana B:** incógnito → Administrador (luego Residente).
   - **Ventana C:** otro navegador o perfil → Bodeguero.

> `npm run db:reset` deja los datos de ejemplo limpios. Úsalo cada vez que quieras repetir el tour desde cero.

---

## Parte 3 · El tour

### 1. La tienda como visitante (Ventana A)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 1.1 | Abre `http://localhost:4200` | La **tienda**, no el login: barra superior (flete gratis, horario, teléfono), buscador, menú y carrusel de 3 banners que cambian solos. |
| 1.2 | Baja con la rueda del mouse | La página hace scroll **como cualquier sitio web**: el encabezado queda fijo arriba y abajo hay beneficios, **categorías con foto**, **Más vendidos**, promociones, **¿Cómo pedir tu flete?**, cifras, opiniones y pie de página. |
| 1.3 | Mira las tarjetas de producto | **Fotos reales** de cada material (cemento, varilla, ladrillo, arena…) con un tono cálido que combina con el diseño. Mientras cargan se ve un brillo gris suave. |
| 1.4 | Menú **Productos** (pasa el mouse) → **Acero** | Submenú con 5 categorías. El catálogo de Acero tiene banner, filtros a la izquierda y solo productos de acero. |
| 1.5 | **Ordenar por → Precio: menor a mayor** | Productos ordenados. La URL cambia (`?orden=precio-asc`). |
| 1.6 | Escribe `varilla` en el buscador y presiona Enter | Las dos varillas y el alambre recocido, con "para «varilla»" y el enlace **limpiar**. |
| 1.7 | Abre **Cemento gris CPC 30R** | Ficha: foto grande, precio, "● En existencia", descripción, cantidad, ventajas, especificaciones y **También te puede interesar**. |
| 1.8 | Menú **Nosotros** | Historia, cifras, Misión / Visión / Compromiso, valores y zonas de entrega. |
| 1.9 | Menú **Preguntas frecuentes** → abre una → escribe `factura` en su buscador | La respuesta se despliega. Al buscar solo quedan las preguntas de facturación. |
| 1.10 | Menú **Contacto** → llena el formulario → **Enviar mensaje** | "¡Mensaje enviado! Gracias, …". *(El Admin lo verá en el paso 9.)* |
| 1.11 | Ícono de luna del encabezado | Modo oscuro mate (gris carbón, nunca negro). Recarga: se mantiene. Regresa a modo claro. |
| 1.12 | Reduce la ventana a la mitad del monitor | Sigue viéndose como página web: el menú completo se mantiene y las tarjetas se reacomodan. Solo en tamaño celular aparece el botón de menú ☰. |

### 2. Carrito como visitante → registro (Ventana A)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 2.1 | En la ficha del cemento, cantidad **3** → **Agregar al carrito** | Aviso "Agregado al carrito". El botón del carrito muestra **1** y el subtotal. |
| 2.2 | **Productos → Acero** → **Agregar al carrito** en *Varilla corrugada 3/8"* | El contador sube a **2**. |
| 2.3 | Abre el carrito | Productos, subtotal, **flete estimado** y el recuadro **"Crea tu cuenta para hacer tu pedido"**. |
| 2.4 | Cambia la varilla a **10** | Subtotal y flete se recalculan. |
| 2.5 | **Crear cuenta y continuar** | Pantalla de acceso en la pestaña **Crear cuenta**. |
| 2.6 | Llena nombre, un correo **nuevo**, dirección y contraseña (mín. 8) → **Crear cuenta** | Regresas **al carrito** con tus productos, la dirección ya escrita y la **cotización oficial**: subtotal $2,415.00 · flete $522.45 · **total $2,937.45**. |

> No confirmes todavía: primero abre las ventanas del paso 3.

### 3. Pedido en tiempo real (Ventanas A, B y C)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 3.1 | **Ventana B:** **Ingresar** → `admin@constructx.mx` | **Panel de control**. Abajo a la izquierda: **● En vivo**. |
| 3.2 | **Ventana C:** **Ingresar** → `bodega@constructx.mx` | **Pedidos de flete** con "Escuchando pedidos en vivo". |
| 3.3 | **Ventana A:** escribe una nota para el chofer → **Confirmar pedido de flete** | **"¡Listo! Tu flete está en preparación"** con folio, materiales, flete y total. |
| 3.4 | Mira **B y C** sin recargar | Aviso animado **"Nuevo pedido de flete · tu nombre · $2,937.45"**. En C la fila nueva aparece arriba con **Nuevo**. En B suben *Fletes pendientes* y *Ventas del mes* y el pedido aparece en *Pedidos recientes*. |

### 4. Recibo por correo

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 4.1 | Abre `backend/correos/recibo-<folio>.html` | Recibo con logo, folio, fecha, materiales, **costo del flete**, **total**, dirección y tu nota. *(Con `SMTP_*` en `backend/.env` llega a tu correo real.)* |

### 5. Despacho y seguimiento (Ventanas A y C)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 5.1 | **A:** **Seguir mi pedido** | **Mi cuenta → Mis pedidos**: tu pedido en **Pendiente** con la línea *Recibido → En ruta → Entregado*. |
| 5.2 | **C:** **Despachar** → elige chofer, unidad y fecha → **Confirmar salida a ruta** | La fila pasa a "En ruta" con el chofer. |
| 5.3 | **A**, sin recargar | El pedido cambia a **En ruta** y aparece el aviso "Tu pedido XXXX está en ruta". Al abrirlo ves chofer, unidad y fecha estimada. |
| 5.4 | **C:** clic en el folio → **Marcar entregado** | Panel lateral con el detalle y **Ver / imprimir recibo**. |
| 5.5 | **A** | El pedido pasa a **Entregado**, con fecha y hora. |

### 6. Mi cuenta y cierre de sesión (Ventana A)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 6.1 | Abre el pedido → **Ver recibo** | El recibo en una pestaña nueva, ya *Entregado* y con el chofer. |
| 6.2 | **Volver a pedir** | Los mismos materiales en el carrito con los precios actuales. |
| 6.3 | **Mi perfil** → cambia tu teléfono → **Guardar cambios** | "Perfil actualizado." |
| 6.4 | Escribe `/panel/dashboard` en la barra de direcciones | Te regresa a la tienda: el cliente no entra al panel. |
| 6.5 | Con productos en el carrito: menú con tu nombre → **Cerrar sesión** | El carrito queda en **$0** sin contador. Recarga la página: sigue vacío. **Nada de tu sesión queda para la siguiente persona** que use el navegador. |

### 7. Bodeguero: inventario (Ventana C)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 7.1 | Menú **Inventario** | Stock y **mínimo (reorden)**. *Polín de pino* y *Malla electrosoldada* resaltadas con "Reordenar" y el chip **"2 bajo mínimo"**. |
| 7.2 | **Ingreso de proveedor:** Polín de pino, 20 → **Registrar ingreso** | El stock sube y el polín deja de estar bajo mínimo. |
| 7.3 | Cambia el mínimo del *Cemento* a `1000` → **Guardar** | El cemento queda marcado como stock bajo. |
| 7.4 | **Envío a obra:** Cemento, Torre Residencial Norte, `99999` | **"Stock insuficiente"** y el stock no cambia. |

### 8. Residente de obra (Ventana B: cierra sesión y entra con `residente@constructx.mx`)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 8.1 | Entras en **Reporte de campo** | Proyecto, fase y tarea ya seleccionados. |
| 8.2 | Escribe `20` en *Arena* | La barra se pone naranja: "superarían el avance + 5%". Borra el 20. |
| 8.3 | **Solicitudes de obra** → *Varilla corrugada 1/2"*, `30`, nota "Columnas" → **Enviar solicitud a bodega** | "Solicitud enviada". Tu solicitud aparece **Pendiente**, junto con otra de ejemplo. |
| 8.4 | **C (bodega):** aviso "Nueva solicitud de material" → **Solicitudes de obra** → **Aprobar y enviar** | La solicitud sale con el stock disponible y se aprueba. |
| 8.5 | **B (residente)**, sin recargar | Cambia a **Aprobada** con el aviso "Solicitud aprobada". *(La varilla bajó 30 en el inventario.)* |
| 8.6 | **C:** la otra solicitud → **Rechazar** → escribe el motivo → **Confirmar rechazo** | En **B** aparece "Solicitud rechazada" con el motivo. |

### 9. Administrador (Ventana B: cierra sesión y entra con `admin@constructx.mx`)

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 9.1 | **Dashboard** | KPIs, franja **Atención** (bajo mínimo, solicitudes, mensajes) y la alerta **"Posible merma o robo en Cimientos: Cemento"** (30% de consumo vs. 20% de avance, +10%). |
| 9.2 | **Reportes de ventas** | KPIs y gráfica de barras por día. Al pasar el mouse ves fecha, total y pedidos. Prueba **7 / 14 / 30 días** y **Ver tabla**. |
| 9.3 | **Productos** → precio del *Cemento gris* a `259` → **Guardar** | "Precio actualizado". En la **Ventana A** la ficha muestra **$259.00**. |
| 9.4 | Apaga **En tienda** en *Cal hidratada* | En A la cal **desaparece** del catálogo. Vuelve a encenderla. |
| 9.5 | **+ Nuevo producto** → SKU, nombre, precio, foto (URL opcional) → **Crear producto** | Aparece con stock 0. |
| 9.6 | **Usuarios → Clientes** | Clientes con número de pedidos y total comprado. |
| 9.7 | **Desactivar** la cuenta del paso 2 → en A entra a *Mi cuenta* | La sesión del cliente **se cierra sola**. Si intenta entrar: "Tu cuenta está desactivada". Reactívala. |
| 9.8 | **Usuarios → Equipo interno** → da de alta un bodeguero | Aparece y puede entrar con ese correo. |
| 9.9 | **Mensajes** | El mensaje del paso 1.10, con **Responder por correo** y **Marcar como leído**. |
| 9.10 | En A (sin sesión) envía otro mensaje desde **Contacto** | En B aparece al instante **"Nuevo mensaje de contacto"**. |
| 9.11 | Baja con la rueda del mouse en cualquier pantalla del panel | El menú lateral se queda fijo y el contenido hace scroll como página web. |
| 9.12 | **Ver tienda** (menú lateral) | Abre la tienda. El menú con tu nombre dice **Ir al panel**. |

### 10. Casos de error

| # | Haz esto | ✅ Debes ver |
|---|----------|-------------|
| 10.1 | Login con contraseña incorrecta | "Credenciales inválidas". |
| 10.2 | Como bodeguero escribe `/panel/dashboard` | Te regresa a *Pedidos de flete*. |
| 10.3 | Cliente pide más de lo disponible y otro cliente se lleva el stock antes | Al confirmar: "Stock insuficiente", la línea marcada "Solo hay X disponibles" y el botón deshabilitado. No se descuenta nada. |
| 10.4 | Con el panel abierto, detén el backend (Ctrl+C) | El indicador cambia a **Desconectado**. Al encender el backend se reconecta solo. |

---

## Parte 4 · Pruebas automáticas (equipo técnico)

```bash
cd backend && npm test
```
✅ **48 pruebas**: API, permisos por rol, motor de pedidos, stock, idempotencia, sockets, correo, tienda pública, solicitudes, reportes, usuarios y la regla de merma.

```bash
cd e2e
npm install
npm run instalar-navegador
npm test
```
✅ **16 pruebas end-to-end** en un navegador real. Usan una base de datos temporal y no tocan tu `dev.db`. Cubren:
- Tienda y scroll como página web.
- Registro desde el carrito y carrito vacío al cerrar sesión.
- Pedido en vivo, recibo y despacho con chofer.
- Solicitudes de obra y panel del admin.
