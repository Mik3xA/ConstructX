import { Browser, Page, expect } from '@playwright/test';

export const PASSWORD = 'ConstructX123!';

export async function entrar(page: Page, email: string, rutaEsperada: RegExp) {
  await page.goto('/acceso');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(rutaEsperada);
}

/** Abre una sesión aislada (otro "navegador") con el usuario indicado. */
export async function sesion(browser: Browser, email: string, ruta: RegExp) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await entrar(page, email, ruta);
  return { ctx, page };
}

/** Captura errores de consola para fallar si la app los produce. */
export function vigilarConsola(page: Page) {
  const errores: string[] = [];
  page.on('console', (m) => {
    // Las fotos remotas pueden fallar sin internet: eso lo cubre el respaldo local
    if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/i.test(m.text())) errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(e.message));
  return errores;
}
