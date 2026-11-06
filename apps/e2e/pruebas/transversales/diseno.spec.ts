import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { menu } from '../../paginas/acceso.js';
import { conSesion, simularPlataforma } from '../../fijaciones/plataforma.js';

/** Margen mínimo entre el borde superior del navegador y el primer contenido de acceso. */
const AIRE_SUPERIOR_MINIMO = 24;
const AREA_TACTIL_MINIMA = 44;

async function sinDesbordeHorizontal(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

async function adjuntarCaptura(
  page: Page,
  testInfo: { attach: (nombre: string, o: { body: Buffer; contentType: string }) => Promise<void> },
  nombre: string,
): Promise<void> {
  await testInfo.attach(nombre, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

const pantallasDeAcceso = [
  { ruta: '/login', titulo: 'Tu trayectoria, con evidencia.' },
  { ruta: '/registro', titulo: 'Empieza tu trayectoria' },
  { ruta: '/registro/empresa', titulo: null },
] as const;

test.describe('diseño de las pantallas de acceso', () => {
  for (const { ruta, titulo } of pantallasDeAcceso) {
    test(`diseño · ${ruta} no queda pegado al borde superior ni se desborda @critico`, async ({
      page,
      viewport,
    }, testInfo) => {
      await simularPlataforma(page);
      await page.goto(ruta);
      const encabezado = titulo
        ? page.getByRole('heading', { level: 1, name: titulo })
        : page.getByRole('heading', { level: 1 });
      await expect(encabezado).toBeVisible();

      const caja = await encabezado.boundingBox();
      expect(caja, 'el título tiene caja').not.toBeNull();
      expect(caja?.y ?? 0, 'aire sobre el título').toBeGreaterThanOrEqual(AIRE_SUPERIOR_MINIMO);

      // El contenido de acceso queda centrado en horizontal.
      const primeraCaja = await page.getByLabel('Correo electrónico').boundingBox();
      const anchoViewport = viewport?.width ?? 0;
      if (primeraCaja && anchoViewport > 0) {
        const izquierda = primeraCaja.x;
        const derecha = anchoViewport - (primeraCaja.x + primeraCaja.width);
        expect(Math.abs(izquierda - derecha), 'centrado horizontal').toBeLessThanOrEqual(2);
        expect(izquierda, 'margen lateral').toBeGreaterThanOrEqual(12);
      }

      expect(await sinDesbordeHorizontal(page), 'sin scroll horizontal').toBe(true);
      await adjuntarCaptura(page, testInfo, `acceso${ruta.replaceAll('/', '-')}`);
    });
  }

  test('diseño · el botón Entrar y los campos cumplen el área táctil de 44 px @a11y', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await page.goto('/login');

    for (const control of [
      page.getByRole('button', { name: 'Entrar' }),
      page.getByLabel('Correo electrónico'),
      page.getByRole('textbox', { name: 'Contraseña' }),
    ]) {
      const caja = await control.boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(AREA_TACTIL_MINIMA);
    }
  });

  test('diseño · con los errores a la vista el login sigue sin desbordarse @completo', async ({
    page,
  }, testInfo) => {
    await simularPlataforma(page, { credencialesInvalidas: true });
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByLabel('Correo electrónico').fill('ana@demo.impulsau.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('una-clave-larga');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    expect(await sinDesbordeHorizontal(page)).toBe(true);
    await adjuntarCaptura(page, testInfo, 'login-con-error');
  });
});

const pantallasProtegidas = [
  { ruta: '/', espera: 'Gestor de tareas para estudiantes' },
  { ruta: '/vacantes', espera: 'Pasantía de desarrollo web' },
  { ruta: '/postulaciones', espera: 'Todavía no te has postulado' },
  { ruta: '/perfil', espera: 'Habilidades y evidencia' },
  { ruta: '/proyectos/nuevo', espera: 'Muestra lo que sabes hacer' },
  { ruta: '/vacantes/4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c1e', espera: 'Pasantía de desarrollo web' },
] as const;

test.describe('diseño de las pantallas de la app', () => {
  for (const { ruta, espera } of pantallasProtegidas) {
    test(`diseño · ${ruta} se ve completa y sin desborde @completo`, async ({ page }, testInfo) => {
      await simularPlataforma(page);
      await conSesion(page, 'talento');
      await page.goto(ruta);
      await expect(page.getByText(espera).first()).toBeVisible();

      expect(await sinDesbordeHorizontal(page), 'sin scroll horizontal').toBe(true);
      await adjuntarCaptura(page, testInfo, `app${ruta.replaceAll('/', '-')}`);
    });
  }

  test('diseño · el menú principal es navegable y marca la sección activa @completo', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/');

    for (const [nombre, ruta] of [
      ['Vacantes', /\/vacantes$/],
      ['Mis postulaciones', /\/postulaciones$/],
      ['Perfil', /\/perfil$/],
      ['Inicio', /\/$/],
    ] as const) {
      await menu(page, nombre).click();
      await expect(page).toHaveURL(ruta);
      await expect(menu(page, nombre)).toHaveAttribute('aria-current', 'page');
    }
  });
});

test.describe('accesibilidad de las pantallas clave', () => {
  const sinAutenticar = ['/login', '/registro'] as const;
  for (const ruta of sinAutenticar) {
    test(`a11y · ${ruta} no tiene violaciones graves @a11y`, async ({ page }) => {
      await simularPlataforma(page);
      await page.goto(ruta);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }

  for (const { ruta, espera } of pantallasProtegidas.slice(0, 5)) {
    test(`a11y · ${ruta} no tiene violaciones graves @a11y`, async ({ page }) => {
      await simularPlataforma(page);
      await conSesion(page, 'talento');
      await page.goto(ruta);
      await expect(page.getByText(espera).first()).toBeVisible();

      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});
