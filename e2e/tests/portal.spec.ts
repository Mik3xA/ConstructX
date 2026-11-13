import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { MAIL_DIR } from '../playwright.config';
import { entrar, sesion, vigilarConsola } from './utils';

test.describe('Tienda pública', () => {
  test('la raíz abre la tienda (sin login) con todas sus secciones', async ({ page }) => {
    const errores = vigilarConsola(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Material de construcción, directo a tu obra' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Más vendidos' })).toBeVisible();
    await expect(page.getByTestId('producto').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: '¿Cómo pedir tu flete?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lo que dicen nuestros clientes' })).toBeVisible();
    await expect(page.getByTestId('ingresar')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('navegación: Nosotros, Preguntas frecuentes, Contacto y búsqueda', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Nosotros' }).click();
    await expect(page.getByRole('heading', { name: 'Abastecemos las obras que construyen la ciudad' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Misión' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Preguntas frecuentes' }).click();
    const primera = page.getByTestId('faq').first();
    await primera.locator('summary').click();
    await expect(primera.locator('p')).toBeVisible();
    await page.getByLabel('Buscar en preguntas frecuentes').fill('factura');
    await expect(page.getByTestId('faq')).toHaveCount(2);

    await page.getByRole('search').getByLabel('Buscar productos').fill('varilla');
    await page.getByRole('search').getByRole('button', { name: 'Buscar' }).click();
    await expect(page).toHaveURL(/\/catalogo\?q=varilla/);
    await expect(page.getByTestId('producto').filter({ hasText: 'Varilla corrugada 3/8"' })).toBeVisible();
  });

  test('catálogo por categoría y ficha de producto', async ({ page }) => {
    await page.goto('/catalogo?categoria=Acero');
    await expect(page.getByRole('heading', { level: 1, name: 'Acero' })).toBeVisible();
    const cards = page.getByTestId('producto');
    await expect(cards.first()).toBeVisible();
    for (const c of await cards.all()) await expect(c).toContainText('Acero');
    await cards.filter({ hasText: 'Malla electrosoldada' }).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/producto\/MAL-6X6$/);
    await expect(page.getByRole('heading', { name: /Malla electrosoldada/ })).toBeVisible();
    await expect(page.getByText('También te puede interesar')).toBeVisible();
  });

  test('formulario de contacto → el Admin lo recibe en vivo', async ({ browser, page }) => {
    const admin = await sesion(browser, 'admin@constructx.mx', /\/panel\/dashboard$/);
    await admin.page.getByRole('link', { name: 'Mensajes', exact: true }).click();
    await expect(admin.page.getByTestId('mensaje').first()).toBeVisible();

    await page.goto('/contacto');
    await page.getByLabel('Nombre').fill('Paola Ríos');
    await page.getByLabel('Correo').fill('paola@obra.mx');
    await page.getByLabel('Mensaje').fill('Necesito 500 block para una barda en Escobedo.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.getByTestId('contacto-ok')).toContainText('Gracias, Paola');

    await expect(admin.page.locator('.toast', { hasText: 'Nuevo mensaje de contacto' })).toBeVisible();
    await expect(admin.page.getByTestId('mensaje').first()).toContainText('500 block');
    await admin.ctx.close();
  });
});

test.describe('Acceso y roles', () => {
  test('rechaza credenciales inválidas', async ({ page }) => {
    await page.goto('/acceso');
    await page.getByLabel('Correo').fill('admin@constructx.mx');
    await page.getByLabel('Contraseña').fill('incorrecta');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Credenciales inválidas')).toBeVisible();
  });

  test('cada cuenta interna entra a su panel y no ve lo ajeno', async ({ browser }) => {
    const casos = [
      ['bodega@constructx.mx', /\/panel\/fletes$/, ['/panel/dashboard', '/panel/usuarios', '/panel/campo']],
      ['residente@constructx.mx', /\/panel\/campo$/, ['/panel/fletes', '/panel/dashboard', '/panel/productos']],
    ] as const;
    for (const [email, inicio, prohibidas] of casos) {
      const { ctx, page } = await sesion(browser, email, inicio);
      for (const ruta of prohibidas) {
        await page.goto(ruta);
        await expect(page).toHaveURL(inicio);
      }
      await ctx.close();
    }
  });

  test('al cerrar sesión el carrito vuelve a cero (no queda nada del cliente anterior)', async ({ page }) => {
    await entrar(page, 'cliente@constructx.mx', /\/catalogo$/);
    await page.getByTestId('producto').nth(0).getByTestId('agregar').click();
    await page.getByTestId('producto').nth(1).getByTestId('agregar').click();
    await expect(page.getByTestId('badge-carrito')).toHaveText('2');

    await page.getByTestId('menu-cuenta').click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/localhost:4300\/$/);
    await expect(page.getByTestId('badge-carrito')).toHaveCount(0);
    await expect(page.getByTestId('ir-carrito')).toContainText('$0');
    await page.reload(); // tampoco debe reaparecer desde localStorage
    await expect(page.getByTestId('badge-carrito')).toHaveCount(0);
    await page.getByTestId('ir-carrito').click();
    await expect(page.getByText('Tu carrito está vacío.')).toBeVisible();
  });

  test('es una página web: el documento hace scroll (no un contenedor tipo app)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('producto').first()).toBeVisible();
    const alto = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(alto).toBeGreaterThan(2000);
    await page.mouse.wheel(0, 1200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  });

  test('un cliente no entra al panel interno', async ({ page }) => {
    await entrar(page, 'cliente@constructx.mx', /\/catalogo$/);
    await page.goto('/panel/dashboard');
    await expect(page).toHaveURL(/localhost:4300\/$/);
  });

  test('el Admin tiene acceso total al panel', async ({ page }) => {
    await entrar(page, 'admin@constructx.mx', /\/panel\/dashboard$/);
    for (const ruta of ['/panel/reportes', '/panel/fletes', '/panel/bodega', '/panel/solicitudes', '/panel/campo', '/panel/productos', '/panel/usuarios']) {
      await page.goto(ruta);
      await expect(page).toHaveURL(new RegExp(`${ruta}$`));
    }
  });
});

test.describe('Tema Light / Dark', () => {
  test('respeta prefers-color-scheme y el toggle manual persiste', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('/');
    const fondo = () =>
      page.evaluate(() => {
        const el = document.querySelector('.tienda__main');
        return el ? getComputedStyle(el).backgroundColor : null;
      });
    await expect.poll(fondo).toBe('rgb(18, 18, 18)'); // #121212 matte, nunca #000
    await page.getByTestId('toggle-tema').click();
    await expect.poll(fondo).toBe('rgb(247, 243, 237)'); // beige claro
    await page.reload();
    await expect.poll(fondo).toBe('rgb(247, 243, 237)');
    await ctx.close();
  });
});

test.describe('Compra completa', () => {
  test('visitante arma carrito → se registra desde el carrito → confirma → Admin/Bodega en vivo → recibo → despacho con chofer → cliente lo ve', async ({ browser }) => {
    const admin = await sesion(browser, 'admin@constructx.mx', /\/panel\/dashboard$/);
    const bodega = await sesion(browser, 'bodega@constructx.mx', /\/panel\/fletes$/);
    await expect(bodega.page.getByText('Escuchando pedidos en vivo')).toBeVisible();
    await expect(bodega.page.getByTestId('fila-flete').first()).toBeVisible();
    const filasAntes = await bodega.page.getByTestId('fila-flete').count();

    // Visitante (sin cuenta)
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const cliente = await ctx.newPage();
    const errores = vigilarConsola(cliente);
    await cliente.goto('/producto/CEM-50KG');
    await cliente.getByRole('button', { name: 'Más' }).click();
    await cliente.getByRole('button', { name: 'Más' }).click();
    await cliente.getByTestId('agregar-ficha').click(); // 3 bultos
    await cliente.goto('/catalogo?q=varilla');
    await cliente.getByTestId('producto').filter({ hasText: 'Varilla corrugada 3/8"' }).getByTestId('agregar').click();
    await expect(cliente.getByTestId('badge-carrito')).toHaveText('2');

    await cliente.getByTestId('ir-carrito').click();
    await expect(cliente.getByTestId('item-carrito')).toHaveCount(2);
    await expect(cliente.getByTestId('gate-registro')).toBeVisible();
    await cliente.getByLabel('Cantidad de Varilla corrugada 3/8"').fill('10');

    // El carrito pide crear cuenta y regresa al carrito
    await cliente.getByTestId('crear-cuenta-carrito').click();
    await expect(cliente).toHaveURL(/\/acceso\?modo=registro/);
    const email = `obra.${Date.now()}@constructora.mx`;
    await cliente.getByLabel('Nombre').fill('Sofía Leal');
    await cliente.getByLabel('Correo').fill(email);
    await cliente.getByLabel('Dirección de entrega').fill('Privada Encinos 8, Guadalupe, NL');
    await cliente.getByLabel('Contraseña (mín. 8 caracteres)').fill('segura1234');
    await cliente.getByRole('button', { name: /Crear cuenta/ }).click();
    await expect(cliente).toHaveURL(/\/carrito$/);
    await expect(cliente.getByTestId('item-carrito')).toHaveCount(2);

    // Cotización del servidor: 3×245 + 10×168 = 2415; flete 450 + 3% = 522.45; total 2,937.45
    await expect(cliente.getByTestId('costo-flete')).toContainText('522.45');
    await expect(cliente.getByTestId('total')).toContainText('2,937.45');
    await expect(cliente.getByLabel('Dirección de entrega')).toHaveValue('Privada Encinos 8, Guadalupe, NL');
    await cliente.getByLabel('Notas para el chofer (opcional)').fill('Tocar el portón azul');
    await cliente.getByTestId('confirmar').click();
    await expect(cliente.getByTestId('pedido-confirmado')).toBeVisible();
    const folio = (await cliente.getByTestId('folio').innerText()).trim();

    // Tiempo real en el panel
    for (const s of [admin, bodega]) {
      await expect(s.page.locator('.toast--pedido')).toContainText('Sofía Leal');
    }
    await expect(bodega.page.getByTestId('fila-flete')).toHaveCount(filasAntes + 1);
    await expect(bodega.page.getByTestId('fila-flete').first()).toContainText(folio);
    await expect(admin.page.getByTestId('fila-dashboard').first()).toContainText(folio);

    // Recibo por correo
    const archivo = path.join(MAIL_DIR, `recibo-${folio.toLowerCase()}.html`);
    await expect.poll(() => fs.existsSync(archivo)).toBe(true);
    const html = fs.readFileSync(archivo, 'utf8');
    expect(html).toContain('2,937.45');
    expect(html).toContain('Tocar el portón azul');

    // Despacho con chofer → el cliente lo ve en vivo en Mi cuenta
    await cliente.getByRole('link', { name: 'Seguir mi pedido' }).click();
    const miPedido = cliente.getByTestId('mi-pedido').filter({ hasText: folio });
    await expect(miPedido).toContainText('Pendiente');
    await bodega.page.getByTestId('fila-flete').filter({ hasText: folio }).getByRole('button', { name: 'Despachar' }).click();
    await bodega.page.getByLabel('Chofer').selectOption('Luis Martínez');
    await bodega.page.getByTestId('confirmar-despacho').click();
    await expect(miPedido).toContainText('En ruta');
    await expect(cliente.locator('.toast', { hasText: `Tu pedido ${folio} está en ruta` })).toBeVisible();
    await miPedido.getByRole('button').first().click();
    await expect(miPedido.getByTestId('chofer')).toContainText('Luis Martínez');

    expect(errores).toEqual([]);
    await Promise.all([admin.ctx.close(), bodega.ctx.close(), ctx.close()]);
  });

  test('si otro cliente agota el stock, el carrito lo detecta y no permite confirmar', async ({ browser, request }) => {
    const cliente = await sesion(browser, 'cliente@constructx.mx', /\/catalogo$/);
    const api = 'http://localhost:3100/api';
    const login = await request.post(`${api}/auth/login`, { data: { email: 'bodega@constructx.mx', password: 'ConstructX123!' } });
    const inv = await (await request.get(`${api}/inventario`, { headers: { authorization: `Bearer ${(await login.json()).token}` } })).json();
    const stock = inv.find((i: { codigo_sku: string }) => i.codigo_sku === 'GRA-M3').stock_actual;

    await cliente.page.goto('/producto/GRA-M3');
    await cliente.page.getByLabel('Cantidad').fill(String(stock));
    await cliente.page.getByTestId('agregar-ficha').click();
    await cliente.page.getByTestId('ir-carrito').click();
    await expect(cliente.page.getByTestId('confirmar')).toBeEnabled();

    const reg = await request.post(`${api}/auth/registro`, {
      data: { email: `rapido.${Date.now()}@obra.mx`, password: 'segura1234', nombre: 'Rápido', direccion: 'X' },
    });
    const { token } = await reg.json();
    const cat = await (await request.get(`${api}/catalogo?q=Grava`, { headers: { authorization: `Bearer ${token}` } })).json();
    const r = await request.post(`${api}/pedidos`, { headers: { authorization: `Bearer ${token}` }, data: { items: [{ material_id: cat.materiales[0].id, cantidad: 1 }] } });
    expect(r.status()).toBe(201);

    await cliente.page.getByTestId('confirmar').click();
    await expect(cliente.page.getByTestId('error-pedido')).toContainText('Stock insuficiente');
    await expect(cliente.page.getByText(/Solo hay .* disponibles/)).toBeVisible();
    await expect(cliente.page.getByTestId('confirmar')).toBeDisabled();
    await cliente.ctx.close();
  });
});

test.describe('Equipo interno', () => {
  test('residente solicita material → bodega aprueba → residente lo ve en vivo', async ({ browser }) => {
    const residente = await sesion(browser, 'residente@constructx.mx', /\/panel\/campo$/);
    const bodega = await sesion(browser, 'bodega@constructx.mx', /\/panel\/fletes$/);
    await bodega.page.getByRole('link', { name: 'Solicitudes de obra' }).click();
    await expect(bodega.page.getByTestId('solicitud').first()).toBeVisible();

    await residente.page.getByRole('link', { name: 'Solicitudes de obra' }).click();
    await residente.page.getByLabel('Material').selectOption({ label: 'Cemento gris CPC 30R (bulto)' });
    await residente.page.getByLabel('Cantidad').fill('15');
    await residente.page.getByLabel('Notas (opcional)').fill('Para el firme del lunes');
    await residente.page.getByRole('button', { name: 'Enviar solicitud a bodega' }).click();

    await expect(bodega.page.locator('.toast', { hasText: 'Nueva solicitud de material' })).toBeVisible();
    const sol = bodega.page.getByTestId('solicitud').filter({ hasText: 'Para el firme del lunes' });
    await sol.getByTestId('aprobar').click();

    const mia = residente.page.getByTestId('solicitud').filter({ hasText: 'Para el firme del lunes' });
    await expect(mia).toContainText('Aprobada');
    await expect(residente.page.locator('.toast', { hasText: 'Solicitud aprobada' })).toBeVisible();
    await Promise.all([residente.ctx.close(), bodega.ctx.close()]);
  });

  test('admin: reporte de ventas, productos y usuarios', async ({ page }) => {
    await entrar(page, 'admin@constructx.mx', /\/panel\/dashboard$/);
    await expect(page.getByText('Posible merma o robo en Cimientos: Cemento')).toBeVisible();
    await expect(page.getByTestId('aviso-stock')).toContainText('Polín');

    await page.getByRole('link', { name: 'Reportes de ventas' }).click();
    await expect(page.getByRole('heading', { name: 'Ventas por día' })).toBeVisible();
    await page.getByRole('button', { name: 'Ver tabla' }).click();
    await expect(page.locator('table tbody tr')).not.toHaveCount(0);

    await page.getByRole('link', { name: 'Usuarios' }).click();
    await expect(page.getByTestId('fila-usuario').filter({ hasText: 'cliente@constructx.mx' })).toBeVisible();
  });

  test('el residente reporta consumo y avance', async ({ page }) => {
    await entrar(page, 'residente@constructx.mx', /\/panel\/campo$/);
    await page.locator('input[type=range]').fill('25');
    await page.getByRole('button', { name: 'Enviar reporte' }).click();
    await expect(page.getByText(/Reporte enviado/)).toBeVisible();
  });
});
