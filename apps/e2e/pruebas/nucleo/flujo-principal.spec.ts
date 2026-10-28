import { expect, test } from '@playwright/test';
import { conSesionIniciada, simularNucleo } from '../../fijaciones/apiNucleo.js';

test.describe('flujo principal (API simulada)', () => {
  test('CU-04 · sin sesión redirige al login @humo @critico', async ({ page }) => {
    await simularNucleo(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  });

  test('CU-04 · iniciar sesión lleva al feed @humo @critico', async ({ page }) => {
    const api = await simularNucleo(page);
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('ana@correo.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('una-clave-larga');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Gestor de tareas para estudiantes')).toBeVisible();
    expect(api.inicios).toHaveLength(1);
  });

  test('CU-04 · credenciales incorrectas muestran el aviso @completo', async ({ page }) => {
    await simularNucleo(page, { credencialesValidas: false });
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('ana@correo.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('una-clave-larga');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('CU-22 · dar y quitar like usa PUT y DELETE @critico', async ({ page }) => {
    const api = await simularNucleo(page);
    await conSesionIniciada(page);
    await page.goto('/');

    const dar = page.getByRole('button', { name: 'Dar me gusta' });
    await dar.click();
    await expect(page.getByRole('button', { name: 'Quitar me gusta' })).toBeVisible();
    await page.getByRole('button', { name: 'Quitar me gusta' }).click();
    await expect(page.getByRole('button', { name: 'Dar me gusta' })).toBeVisible();
    expect(api.likes).toEqual(['PUT', 'DELETE']);
  });

  test('CU-42 · la lista de vacantes muestra la coincidencia @completo', async ({ page }) => {
    await simularNucleo(page);
    await conSesionIniciada(page);
    await page.goto('/vacantes');

    await expect(page.getByText('Pasantía de desarrollo web')).toBeVisible();
    await expect(page.getByText('100% de coincidencia')).toBeVisible();
  });
});
