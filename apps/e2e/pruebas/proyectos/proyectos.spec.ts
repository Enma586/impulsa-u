import { expect, test } from '@playwright/test';
import {
  conSesion,
  ID_PROYECTO_ANA,
  ID_PROYECTO_LUIS,
  simularPlataforma,
} from '../../fijaciones/plataforma.js';

test.describe('feed de proyectos (API simulada)', () => {
  test('CU-20 · el feed lista los proyectos publicados con autor y tecnología @humo @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Gestor de tareas para estudiantes' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tienda en línea con Node' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Luis Demo' })).toBeVisible();
    await expect(page.getByText('React').first()).toBeVisible();
  });

  test('CU-20 · mientras carga se ve el esqueleto y luego la lista @completo', async ({ page }) => {
    let liberar: () => void = () => undefined;
    const espera = new Promise<void>((resolver) => {
      liberar = resolver;
    });
    await simularPlataforma(page, { esperarFeed: espera });
    await conSesion(page, 'talento');
    await page.goto('/');

    await expect(page.getByText('Proyectos reales de talento que está empezando')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Gestor de tareas para estudiantes' }),
    ).toHaveCount(0);
    liberar();
    await expect(
      page.getByRole('heading', { name: 'Gestor de tareas para estudiantes' }),
    ).toBeVisible();
  });

  test('CU-20 · sin proyectos el talento ve un estado vacío con acción @completo', async ({
    page,
  }) => {
    await simularPlataforma(page, { feedVacio: true });
    await conSesion(page, 'talento');
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Todavía no hay proyectos publicados' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Publicar mi primer proyecto' }).click();
    await expect(page).toHaveURL(/\/proyectos\/nuevo$/);
  });

  test('CU-20 · sin proyectos la empresa no ve la acción de publicar @completo', async ({
    page,
  }) => {
    await simularPlataforma(page, { feedVacio: true });
    await conSesion(page, 'empresa');
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Todavía no hay proyectos publicados' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Publicar mi primer proyecto' })).toHaveCount(0);
  });

  test('CU-20 · si el servidor falla se muestra un error y no una pantalla en blanco @completo', async ({
    page,
  }) => {
    await simularPlataforma(page, { feedFalla: true });
    await conSesion(page, 'talento');
    await page.goto('/');

    await expect(page.getByText(/No pudimos|Algo salió mal|Falla simulada/).first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Gestor de tareas para estudiantes' }),
    ).toHaveCount(0);
  });
});

test.describe('likes (API simulada)', () => {
  test('CU-22 · dar y quitar like actualiza el contador con PUT y DELETE @critico', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/');

    const tarjeta = page.locator('article, section, div').filter({
      has: page.getByRole('heading', { name: 'Gestor de tareas para estudiantes' }),
    });
    const dar = tarjeta.getByRole('button', { name: /^Dar me gusta, 2$/ }).first();
    await dar.click();
    await expect(page.getByRole('button', { name: 'Quitar me gusta, 3' })).toBeVisible();

    await page.getByRole('button', { name: 'Quitar me gusta, 3' }).click();
    await expect(page.getByRole('button', { name: 'Dar me gusta, 2' })).toBeVisible();
    expect(api.likes).toEqual(['PUT', 'DELETE']);
  });

  test('CU-22 · el like se conserva al abrir el proyecto y volver al feed @completo', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/');
    await page.getByRole('button', { name: 'Dar me gusta, 2' }).click();
    await expect(page.getByRole('button', { name: 'Quitar me gusta, 3' })).toBeVisible();

    await page.getByRole('link', { name: 'Gestor de tareas para estudiantes' }).click();
    await expect(page).toHaveURL(new RegExp(`/proyectos/${ID_PROYECTO_LUIS}$`));
    await expect(page.getByRole('button', { name: 'Quitar me gusta, 3' })).toBeVisible();
  });
});

test.describe('publicar y gestionar proyectos (API simulada)', () => {
  test('CU-17 · el talento publica un proyecto y lo ve en el detalle y en el feed @critico', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/');
    await page.getByRole('link', { name: 'Nuevo proyecto' }).click();
    await expect(page.getByRole('heading', { name: 'Muestra lo que sabes hacer' })).toBeVisible();

    await page.getByLabel('Título del proyecto').fill('Bot de recordatorios académicos');
    await page
      .getByLabel('¿Qué construiste y cómo?')
      .fill('Un bot que recuerda entregas por correo.');
    await page
      .getByRole('group', { name: 'Tecnologías usadas' })
      .getByRole('button', { name: 'Node.js' })
      .click();
    await page.getByLabel('Repositorio (opcional)').fill('https://github.com/ana-demo/bot');
    await page.getByRole('button', { name: 'Guardar proyecto' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Bot de recordatorios académicos' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Repositorio' })).toBeVisible();
    expect(api.proyectosPublicados).toHaveLength(1);
    expect(api.proyectosPublicados[0]).toMatchObject({
      titulo: 'Bot de recordatorios académicos',
      publicar: true,
      urlRepositorio: 'https://github.com/ana-demo/bot',
    });
    expect(api.llavesDeIdempotencia).toHaveLength(1);

    await page.getByRole('link', { name: 'ImpulsaU, ir al inicio' }).click();
    await expect(
      page.getByRole('heading', { name: 'Bot de recordatorios académicos' }),
    ).toBeVisible();
  });

  test('CU-17 · un título muy corto y sin tecnologías no se envía @critico', async ({ page }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/proyectos/nuevo');

    await page.getByLabel('Título del proyecto').fill('abc');
    await page.getByLabel('¿Qué construiste y cómo?').fill('Algo');
    await page.getByRole('button', { name: 'Guardar proyecto' }).click();

    await expect(page.getByLabel('Título del proyecto')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/proyectos\/nuevo$/);
    expect(api.proyectosPublicados).toHaveLength(0);
  });

  test('CU-17 · un enlace de repositorio sin https se rechaza @completo', async ({ page }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/proyectos/nuevo');

    await page.getByLabel('Título del proyecto').fill('Proyecto con enlace malo');
    await page.getByLabel('¿Qué construiste y cómo?').fill('Descripción suficiente del proyecto.');
    await page
      .getByRole('group', { name: 'Tecnologías usadas' })
      .getByRole('button', { name: 'React' })
      .click();
    await page.getByLabel('Repositorio (opcional)').fill('http://inseguro.example/repo');
    await page.getByRole('button', { name: 'Guardar proyecto' }).click();

    await expect(page.getByLabel('Repositorio (opcional)')).toHaveAttribute('aria-invalid', 'true');
    expect(api.proyectosPublicados).toHaveLength(0);
  });

  test('CU-19 · en mi proyecto puedo editar y eliminar; en el de otra persona no @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');

    await page.goto(`/proyectos/${ID_PROYECTO_LUIS}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Gestor de tareas para estudiantes' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0);

    await page.goto(`/proyectos/${ID_PROYECTO_ANA}`);
    await expect(page.getByRole('link', { name: 'Editar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar' })).toBeVisible();
  });

  test('CU-21 · eliminar pide confirmación y quita el proyecto del feed @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto(`/proyectos/${ID_PROYECTO_ANA}`);

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('dialog', { name: '¿Eliminar este proyecto?' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Tienda en línea con Node' })).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Gestor de tareas para estudiantes' }),
    ).toBeVisible();
  });

  test('CU-17 · la empresa no puede publicar proyectos desde el menú @completo', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'empresa');
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Nuevo proyecto' })).toHaveCount(0);
  });
});
