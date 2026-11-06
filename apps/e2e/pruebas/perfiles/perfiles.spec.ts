import { expect, test } from '@playwright/test';
import { menu } from '../../paginas/acceso.js';
import { conSesion, ID_PROYECTO_ANA, simularPlataforma } from '../../fijaciones/plataforma.js';

test.describe('perfiles (API simulada)', () => {
  test('CU-11 · el perfil del talento muestra datos, habilidades con evidencia y proyectos @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/');
    await menu(page, 'Perfil').click();

    await expect(page.getByRole('heading', { level: 1, name: 'Ana Demo' })).toBeVisible();
    await expect(page.getByText('Estudiante · ciclo 6')).toBeVisible();
    await expect(page.getByText(/Ingeniería en Sistemas/).first()).toBeVisible();
    await expect(
      page.getByText('Me gusta construir cosas pequeñas que funcionan de verdad.'),
    ).toBeVisible();

    await expect(page.getByText('React · 1 proyecto')).toBeVisible();
    await expect(page.getByText('SQL', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/ana-demo',
    );
    await expect(page.getByRole('link', { name: 'Tienda en línea con Node' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Editar perfil' })).toBeVisible();
  });

  test('CU-11 · desde el perfil se abre un proyecto propio @completo', async ({ page }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/perfil');

    await page.getByRole('link', { name: 'Tienda en línea con Node' }).click();
    await expect(page).toHaveURL(new RegExp(`/proyectos/${ID_PROYECTO_ANA}$`));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Tienda en línea con Node' }),
    ).toBeVisible();
  });

  test('CU-11 · un proyecto eliminado deja de aparecer en el perfil @completo', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto(`/proyectos/${ID_PROYECTO_ANA}`);
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page).toHaveURL(/\/$/);

    await menu(page, 'Perfil').click();
    await expect(page.getByRole('heading', { name: 'Sin proyectos publicados' })).toBeVisible();
  });

  test('CU-12 · el perfil de la empresa muestra sector, verificación y sitio web @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'empresa');
    await page.goto('/perfil');

    await expect(page.getByRole('heading', { level: 1, name: '[Empresa Demo]' })).toBeVisible();
    await expect(page.getByText('Tecnología', { exact: true })).toBeVisible();
    await expect(page.getByText('Verificada')).toBeVisible();
    await expect(page.getByText('Equipo pequeño que contrata talento de entrada.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sitio web' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Editar perfil' })).toBeVisible();
  });

  test('CU-11 · el perfil indica la cuenta con la que se inició sesión @completo', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/perfil');

    await expect(page.getByText(/Cuenta: ana@demo\.impulsau\.test/)).toBeVisible();
  });
});
