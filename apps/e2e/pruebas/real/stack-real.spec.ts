import { expect, test } from '@playwright/test';
import { entrar, menu, salir } from '../../paginas/acceso.js';

/**
 * Punta a punta contra el stack REAL: el frontend de esta prueba habla con el backend en
 * `http://localhost:3000`, que usa Supabase Auth, la base y Redis de desarrollo.
 *
 * No corre por defecto: crea y borra likes de verdad. Requiere haber ejecutado antes
 * `pnpm --filter @impulsau/backend demo` contra dev. Para correrla:
 *
 *   $env:E2E_REAL = '1'; $env:E2E_PUERTO = '5173'; $env:E2E_CONTRASENA = '<la de DEMO_CONTRASENA>'
 *   pnpm --filter @impulsau/e2e e2e -- pruebas/real --project=escritorio-oscuro
 *
 * El backend debe estar en marcha (`pnpm --filter @impulsau/backend dev`) con Redis arriba. El
 * puerto 5173 es el único origen que acepta su `CORS_ORIGIN`.
 */
const contrasena = process.env['E2E_CONTRASENA'] ?? '';
const habilitada = process.env['E2E_REAL'] === '1' && contrasena !== '';

test.describe('stack real (Supabase dev)', () => {
  test.skip(!habilitada, 'Define E2E_REAL=1 y E2E_CONTRASENA para correr contra el stack real');

  test('real · el talento inicia sesión, ve el feed, da y quita like y cierra sesión @real', async ({
    page,
  }) => {
    await entrar(page, 'ana@demo.impulsau.test', contrasena);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Hola, ')).toBeVisible();

    const proyectos = page.getByRole('heading', { level: 2 });
    await expect(proyectos.first()).toBeVisible();

    const dar = page.getByRole('button', { name: /^Dar me gusta/ }).first();
    if ((await dar.count()) > 0) {
      await dar.click();
      await expect(page.getByRole('button', { name: /^Quitar me gusta/ }).first()).toBeVisible();
      await page
        .getByRole('button', { name: /^Quitar me gusta/ })
        .first()
        .click();
      await expect(page.getByRole('button', { name: /^Dar me gusta/ }).first()).toBeVisible();
    }

    await menu(page, 'Vacantes').click();
    await expect(page.getByRole('heading', { name: 'Vacantes para empezar' })).toBeVisible();
    await menu(page, 'Perfil').click();
    await expect(page.getByText('Habilidades y evidencia')).toBeVisible();

    await salir(page);
  });

  test('real · la empresa inicia sesión y ve sus vacantes @real', async ({ page }) => {
    await entrar(page, 'empresa@demo.impulsau.test', contrasena);
    await expect(page).toHaveURL(/\/$/);

    await menu(page, 'Vacantes').click();
    await expect(page.getByRole('heading', { name: 'Mis vacantes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nueva vacante' })).toBeVisible();
    await salir(page);
  });

  test('real · una contraseña incorrecta no deja entrar y no filtra detalles @real', async ({
    page,
  }) => {
    await entrar(page, 'ana@demo.impulsau.test', `${contrasena}-incorrecta`);
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('real · sin sesión las rutas protegidas llevan al login @real', async ({ page }) => {
    await page.goto('/vacantes');
    await expect(page).toHaveURL(/\/login$/);
  });
});
