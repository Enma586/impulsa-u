import { expect, test } from '@playwright/test';
import { entrar, menu, salir } from '../../paginas/acceso.js';
import {
  conSesion,
  CORREO_EMPRESA,
  CORREO_TALENTO,
  simularPlataforma,
} from '../../fijaciones/plataforma.js';

const hayPantallaDeError = (texto: string | null) =>
  texto !== null && /Something went wrong|se usó fuera de una ruta protegida/.test(texto);

test.describe('sesión de punta a punta (API simulada)', () => {
  test('CU-05 · el talento inicia sesión y ve su feed @humo @critico', async ({ page }) => {
    const api = await simularPlataforma(page);
    await entrar(page, CORREO_TALENTO);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Hola, Ana Demo')).toBeVisible();
    await expect(page.getByText('Gestor de tareas para estudiantes')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuevo proyecto' })).toBeVisible();
    await expect(menu(page, 'Mis postulaciones')).toBeVisible();
    expect(api.inicios).toEqual([{ correo: CORREO_TALENTO, contrasena: 'una-clave-larga' }]);
  });

  test('CU-05 · la empresa inicia sesión y su menú no tiene postulaciones de talento @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await entrar(page, CORREO_EMPRESA);

    await expect(page.getByText('Hola, [Empresa Demo]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuevo proyecto' })).toHaveCount(0);
    await expect(menu(page, 'Vacantes')).toBeVisible();
    await expect(menu(page, 'Mis postulaciones')).toHaveCount(0);
  });

  test('CU-05 · enviar el formulario vacío valida sin llamar al servidor @completo', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByLabel('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('textbox', { name: 'Contraseña' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page).toHaveURL(/\/login$/);
    expect(api.inicios).toHaveLength(0);
  });

  test('CU-05 · un correo con formato inválido se marca en el campo @completo', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('esto-no-es-un-correo');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('una-clave-larga');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByLabel('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    expect(api.inicios).toHaveLength(0);
  });

  test('CU-05 · credenciales incorrectas muestran el aviso y no dejan entrar @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await entrar(page, CORREO_TALENTO, 'otra-clave-distinta');

    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('impulsau.sesion'))).toBeNull();
  });

  test('CU-05 · demasiados intentos pide esperar @completo', async ({ page }) => {
    await simularPlataforma(page, { demasiadosIntentos: true });
    await entrar(page, CORREO_TALENTO);

    await expect(page.getByText(/Demasiados intentos/).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('CU-06 · cerrar sesión vuelve al login sin pantalla de error @humo @critico', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await entrar(page, CORREO_TALENTO);
    await expect(page.getByText('Hola, Ana Demo')).toBeVisible();

    await salir(page);

    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    expect(hayPantallaDeError(await page.locator('body').textContent())).toBe(false);
    expect(api.cierres).toEqual(['local']);
    expect(await page.evaluate(() => localStorage.getItem('impulsau.sesion'))).toBeNull();
  });

  test('CU-06 · tras cerrar sesión las rutas protegidas vuelven a pedir login @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await entrar(page, CORREO_TALENTO);
    await salir(page);

    await page.goto('/vacantes');
    await expect(page).toHaveURL(/\/login$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('CU-06 · cerrar sesión en todos los dispositivos avisa al servidor @completo', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await entrar(page, CORREO_TALENTO);
    await menu(page, 'Perfil').click();
    await page.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(api.cierres).toEqual(['global']);
  });

  test('CU-07 · la sesión sobrevive a recargar la página @critico', async ({ page }) => {
    await simularPlataforma(page);
    await entrar(page, CORREO_TALENTO);
    await expect(page.getByText('Hola, Ana Demo')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Hola, Ana Demo')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('CU-07 · una sesión vencida que no se puede renovar lleva al login @critico', async ({
    page,
  }) => {
    await simularPlataforma(page, { sesionVencida: true });
    await conSesion(page, 'talento');
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    expect(hayPantallaDeError(await page.locator('body').textContent())).toBe(false);
  });

  test('CU-04 · sin sesión cada ruta protegida redirige al login @critico', async ({ page }) => {
    await simularPlataforma(page);
    for (const ruta of ['/', '/vacantes', '/postulaciones', '/perfil', '/proyectos/nuevo']) {
      await page.goto(ruta);
      await expect(page, `ruta ${ruta}`).toHaveURL(/\/login$/);
    }
  });

  test('CU-04 · con sesión, /login y /registro llevan al inicio @completo', async ({ page }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    for (const ruta of ['/login', '/registro', '/registro/empresa']) {
      await page.goto(ruta);
      await expect(page, `ruta ${ruta}`).toHaveURL(/\/$/);
    }
  });

  test('CU-01 · el login enlaza al registro de talento y al de empresa @completo', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await page.goto('/login');
    await page.getByRole('link', { name: 'Crea tu cuenta de talento' }).click();
    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByRole('heading', { name: 'Empieza tu trayectoria' })).toBeVisible();

    await page.goto('/login');
    await page.getByRole('link', { name: 'Registra tu empresa' }).click();
    await expect(page).toHaveURL(/\/registro\/empresa$/);
  });
});
