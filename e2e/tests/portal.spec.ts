import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { MAIL_DIR } from '../playwright.config';
import { entrar, sesion, vigilarConsola } from './utils';

test.describe('Autenticación', () => {
  test('rechaza credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill('admin@constructx.mx');
    await page.getByLabel('Contraseña').fill('incorrecta');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Credenciales inválidas')).toBeVisible();
  });

  test('cada rol aterriza en su pantalla y no entra a las ajenas', async ({ browser }) => {
    const casos = [
      ['cliente@constructx.mx', /\/catalogo$/, ['/dashboard', '/fletes', '/bodega', '/campo']],
      ['bodega@constructx.mx', /\/bodega$/, ['/dashboard', '/catalogo', '/campo']],
      ['residente@constructx.mx', /\/campo$/, ['/fletes', '/dashboard', '/carrito']],
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

  test('el Admin tiene acceso total', async ({ page }) => {
    await entrar(page, 'admin@constructx.mx', /\/dashboard$/);
    for (const ruta of ['/fletes', '/bodega', '/campo', '/catalogo']) {
      await page.goto(ruta);
      await expect(page).toHaveURL(new RegExp(`${ruta}$`));
    }
  });

  test('un cliente nuevo se registra y llega al catálogo', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Crear cuenta' }).click();
    await page.getByLabel('Nombre').fill('Laura Obra');
    await page.getByLabel('Correo').fill(`laura.${Date.now()}@obra.mx`);
    await page.getByLabel('Dirección de entrega').fill('Calle Pino 45, Saltillo');
    await page.getByLabel('Contraseña (mín. 8 caracteres)').fill('segura1234');
    await page.getByRole('button', { name: /Crear cuenta y ver catálogo/ }).click();
    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.getByRole('heading', { name: 'Catálogo de materiales' })).toBeVisible();
  });
});

test.describe('Tema Light / Dark', () => {
  test('respeta prefers-color-scheme y el toggle manual persiste', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('/login');
    const fondo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // poll: el fondo tiene una transición suave de 250 ms
    await expect.poll(fondo).toBe('rgb(18, 18, 18)'); // #121212 matte, nunca #000
    await page.getByTestId('toggle-tema').click();
    await expect.poll(fondo).toBe('rgb(247, 243, 237)'); // beige claro
    await page.reload();
    await expect.poll(fondo).toBe('rgb(247, 243, 237)');
    await page.getByTestId('toggle-tema').click();
    await expect.poll(fondo).toBe('rgb(18, 18, 18)');
    await ctx.close();
  });
});

test.describe('Flujo de pedido de flete', () => {
  test('cliente compra → Admin y Bodega reciben toast y tabla en vivo → recibo por email → seguimiento', async ({ browser }) => {
    // Admin y bodeguero escuchando ANTES del pedido
    const admin = await sesion(browser, 'admin@constructx.mx', /\/dashboard$/);
    const bodega = await sesion(browser, 'bodega@constructx.mx', /\/bodega$/);
    await bodega.page.getByRole('link', { name: 'Pedidos de flete' }).click();
    await expect(bodega.page.getByText('Escuchando pedidos en vivo')).toBeVisible();
    await expect(bodega.page.getByTestId('fila-flete').first()).toBeVisible(); // la lista ya cargó
    const filasAntes = await bodega.page.getByTestId('fila-flete').count();
    const pendientesAntes = Number(await admin.page.getByTestId('kpi-pendientes').locator('.stat__valor').innerText());

    // Cliente arma el carrito
    const cliente = await sesion(browser, 'cliente@constructx.mx', /\/catalogo$/);
    const errores = vigilarConsola(cliente.page);
    const cemento = cliente.page.getByTestId('producto').filter({ hasText: 'Cemento gris CPC 30R' });
    await expect(cemento.locator('img')).toBeVisible();
    await cemento.getByRole('button', { name: 'Más' }).click();
    await cemento.getByRole('button', { name: 'Más' }).click();
    await cemento.getByTestId('agregar').click(); // 3 bultos
    const varilla = cliente.page.getByTestId('producto').filter({ hasText: 'Varilla corrugada 3/8"' });
    await varilla.getByLabel(/Cantidad de/).fill('10');
    await varilla.getByTestId('agregar').click();
    await expect(cliente.page.getByTestId('badge-carrito')).toHaveText('2');

    // Carrito: cotización del servidor = 3×245 + 10×168 = 2415; flete 450 + 3% = 522.45
    await cliente.page.getByRole('link', { name: 'Carrito', exact: true }).click();
    await expect(cliente.page.getByTestId('item-carrito')).toHaveCount(2);
    await expect(cliente.page.getByTestId('costo-flete')).toContainText('522.45');
    await expect(cliente.page.getByTestId('total')).toContainText('2,937.45');
    await cliente.page.getByLabel('Notas para el chofer (opcional)').fill('Tocar el portón azul');
    await cliente.page.getByTestId('confirmar').click();

    const confirmado = cliente.page.getByTestId('pedido-confirmado');
    await expect(confirmado).toBeVisible();
    const folio = (await cliente.page.getByTestId('folio').innerText()).trim();
    expect(folio).toMatch(/^[0-9A-F]{8}$/);

    // Tiempo real: toasts y tablas sin recargar
    for (const s of [admin, bodega]) {
      await expect(s.page.locator('.toast--pedido')).toContainText('Nuevo pedido de flete');
      await expect(s.page.locator('.toast--pedido')).toContainText('Carlos Cliente');
    }
    await expect(bodega.page.getByTestId('fila-flete')).toHaveCount(filasAntes + 1);
    await expect(bodega.page.getByTestId('fila-flete').first()).toContainText(folio);
    await expect(bodega.page.getByTestId('fila-flete').first()).toContainText('Nuevo');
    await expect(admin.page.getByTestId('kpi-pendientes').locator('.stat__valor')).toHaveText(String(pendientesAntes + 1));
    await expect(admin.page.getByTestId('fila-dashboard').first()).toContainText(folio);

    // Recibo HTML generado por Nodemailer
    const archivo = path.join(MAIL_DIR, `recibo-${folio.toLowerCase()}.html`);
    await expect.poll(() => fs.existsSync(archivo)).toBe(true);
    const html = fs.readFileSync(archivo, 'utf8');
    expect(html).toContain('Cemento gris CPC 30R');
    expect(html).toContain('Tocar el portón azul');
    expect(html).toContain('2,937.45');

    // Bodega despacha → el cliente lo ve en vivo en "Mis pedidos"
    await cliente.page.getByRole('link', { name: 'Seguir mi pedido' }).click();
    const miPedido = cliente.page.getByTestId('mi-pedido').filter({ hasText: folio });
    await expect(miPedido).toContainText('Pendiente');
    await bodega.page.getByTestId('fila-flete').filter({ hasText: folio }).getByRole('button', { name: 'Despachar' }).click();
    await expect(miPedido).toContainText('En ruta');
    await expect(cliente.page.locator('.toast', { hasText: `Tu pedido ${folio} está en ruta` })).toBeVisible();

    expect(errores).toEqual([]);
    await Promise.all([admin.ctx.close(), bodega.ctx.close(), cliente.ctx.close()]);
  });

  test('si otro cliente agota el stock, el carrito lo detecta y no permite confirmar', async ({ browser, request }) => {
    const cliente = await sesion(browser, 'cliente@constructx.mx', /\/catalogo$/);
    const grava = cliente.page.getByTestId('producto').filter({ hasText: 'Grava 3/4"' });
    const stockTexto = await grava.locator('.product__stock').innerText();
    const stock = Number(stockTexto.match(/[\d,.]+/)![0].replace(/,/g, ''));
    await grava.getByLabel(/Cantidad de/).fill(String(stock));
    await grava.getByTestId('agregar').click();
    await cliente.page.getByRole('link', { name: 'Carrito', exact: true }).click();
    await expect(cliente.page.getByTestId('confirmar')).toBeEnabled();

    // Otro cliente compra 1 m3 de grava por la API
    const api = 'http://localhost:3100/api';
    const reg = await request.post(`${api}/auth/registro`, {
      data: { email: `rapido.${Date.now()}@obra.mx`, password: 'segura1234', nombre: 'Rápido', direccion: 'X' },
    });
    const { token } = await reg.json();
    const cat = await (await request.get(`${api}/catalogo?q=Grava`, { headers: { authorization: `Bearer ${token}` } })).json();
    const r = await request.post(`${api}/pedidos`, {
      headers: { authorization: `Bearer ${token}` },
      data: { items: [{ material_id: cat.materiales[0].id, cantidad: 1 }] },
    });
    expect(r.status()).toBe(201);

    // Nuestro cliente intenta confirmar: el servidor responde 409 y la UI lo explica
    await cliente.page.getByTestId('confirmar').click();
    await expect(cliente.page.getByTestId('error-pedido')).toContainText('Stock insuficiente');
    await expect(cliente.page.getByText(/Solo hay .* disponibles/)).toBeVisible();
    await expect(cliente.page.getByTestId('confirmar')).toBeDisabled();
    await cliente.ctx.close();
  });
});

test.describe('ERP intacto', () => {
  test('el dashboard sigue mostrando la alerta de merma del cemento', async ({ page }) => {
    await entrar(page, 'admin@constructx.mx', /\/dashboard$/);
    await expect(page.getByText('Posible merma o robo en Cimientos: Cemento')).toBeVisible();
  });

  test('el residente reporta consumo y avance', async ({ page }) => {
    await entrar(page, 'residente@constructx.mx', /\/campo$/);
    await expect(page.getByRole('heading', { name: 'Reporte de campo' })).toBeVisible();
    await page.locator('input[type=range]').fill('25');
    await page.getByRole('button', { name: 'Enviar reporte' }).click();
    await expect(page.getByText(/Reporte enviado/)).toBeVisible();
  });
});
