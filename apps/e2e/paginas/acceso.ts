import { expect, type Page } from '@playwright/test';
import { CONTRASENA } from '../fijaciones/plataforma.js';

/** Inicia sesión por la pantalla real, como lo haría una persona. */
export async function entrar(page: Page, correo: string, contrasena = CONTRASENA): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(contrasena);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Cierra la sesión con el botón de la barra superior y espera a llegar al login. */
export async function salir(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/** Enlace del menú principal (riel en escritorio, barra inferior en celular). */
export function menu(page: Page, nombre: string) {
  return page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: nombre });
}
