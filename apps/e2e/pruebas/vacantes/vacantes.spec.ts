import { expect, test, type Page } from '@playwright/test';
import { entrar, menu, salir } from '../../paginas/acceso.js';
import {
  conSesion,
  CORREO_EMPRESA,
  CORREO_TALENTO,
  ID_SQL,
  ID_VACANTE_DATOS,
  ID_VACANTE_WEB,
  simularPlataforma,
} from '../../fijaciones/plataforma.js';

async function elegirOpcion(page: Page, selector: RegExp, opcion: string): Promise<void> {
  await page.getByRole('button', { name: selector }).click();
  await page.getByRole('option', { name: opcion }).click();
}

test.describe('vacantes del talento (API simulada)', () => {
  test('CU-42 · el talento ve solo vacantes abiertas con su coincidencia @humo @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/vacantes');

    await expect(page.getByRole('heading', { name: 'Vacantes para empezar' })).toBeVisible();
    await expect(page.getByText('Pasantía de desarrollo web')).toBeVisible();
    await expect(page.getByText('Trainee de datos')).toBeVisible();
    await expect(page.getByText('100% de coincidencia').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nueva vacante' })).toHaveCount(0);
  });

  test('CU-42 · buscar por título filtra la lista @completo', async ({ page }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/vacantes');

    await page.getByLabel('Buscar').fill('datos');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText('Trainee de datos')).toBeVisible();
    await expect(page.getByText('Pasantía de desarrollo web')).toHaveCount(0);

    await page.getByLabel('Buscar').fill('no existe esta vacante');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(
      page.getByRole('heading', { name: 'No hay vacantes con esos filtros' }),
    ).toBeVisible();
  });

  test('CU-42 · filtrar por tipo y por modalidad combina los criterios @completo', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/vacantes');

    await elegirOpcion(page, /Tipo$/, 'Trainee');
    await expect(page.getByText('Trainee de datos')).toBeVisible();
    await expect(page.getByText('Pasantía de desarrollo web')).toHaveCount(0);

    await elegirOpcion(page, /Modalidad$/, 'Presencial');
    await expect(
      page.getByRole('heading', { name: 'No hay vacantes con esos filtros' }),
    ).toBeVisible();

    await elegirOpcion(page, /Tipo$/, 'Todos los tipos');
    await elegirOpcion(page, /Modalidad$/, 'Todas las modalidades');
    await expect(page.getByText('Pasantía de desarrollo web')).toBeVisible();
  });

  test('CU-43 · el detalle muestra la vacante y la acción de postularse @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto('/vacantes');
    await page.getByRole('link', { name: 'Pasantía de desarrollo web' }).click();

    await expect(page).toHaveURL(new RegExp(`/vacantes/${ID_VACANTE_WEB}$`));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pasantía de desarrollo web' }),
    ).toBeVisible();
    await expect(page.getByText('React · requerida')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Postularme' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
  });

  test('CU-43 · postularse exige elegir al menos un proyecto y luego queda registrada @critico', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);

    await page.getByRole('button', { name: 'Postularme' }).click();
    const modal = page.getByRole('dialog', { name: /Postularme a Pasantía de desarrollo web/ });
    await expect(modal).toBeVisible();
    const enviar = modal.getByRole('button', { name: 'Enviar postulación' });
    await expect(enviar).toBeDisabled();

    await modal.getByRole('button', { name: 'Tienda en línea con Node' }).click();
    await expect(enviar).toBeEnabled();
    await enviar.click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Ya te postulaste')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Postularme' })).toHaveCount(0);
    expect(api.postulaciones).toHaveLength(1);
    expect(api.llavesDeIdempotencia).toHaveLength(1);
  });

  test('CU-43 · cancelar el modal no envía nada @completo', async ({ page }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);

    await page.getByRole('button', { name: 'Postularme' }).click();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(api.postulaciones).toHaveLength(0);
  });

  test('CU-45 · «Mis postulaciones» muestra el estado y los proyectos enviados @critico', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');

    await page.goto('/postulaciones');
    await expect(page.getByRole('heading', { name: 'Todavía no te has postulado' })).toBeVisible();

    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);
    await page.getByRole('button', { name: 'Postularme' }).click();
    await page.getByRole('button', { name: 'Tienda en línea con Node' }).click();
    await page.getByRole('button', { name: 'Enviar postulación' }).click();
    await expect(page.getByText('Ya te postulaste')).toBeVisible();

    await menu(page, 'Mis postulaciones').click();
    await expect(page.getByRole('link', { name: 'Pasantía de desarrollo web' })).toBeVisible();
    await expect(page.getByText('Recibida')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tienda en línea con Node' })).toBeVisible();
  });

  test('CU-43 · una vacante que no está abierta no admite postulaciones @completo', async ({
    page,
  }) => {
    await simularPlataforma(page);
    await entrar(page, CORREO_EMPRESA);
    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByRole('button', { name: 'Reabrir' })).toBeVisible();
    await salir(page);

    await entrar(page, CORREO_TALENTO);
    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);
    await expect(page.getByText('Esta vacante no recibe postulaciones por ahora.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Postularme' })).toHaveCount(0);
  });

  test('CU-42 · la vacante de otra empresa no ofrece gestión @completo', async ({ page }) => {
    await simularPlataforma(page);
    await conSesion(page, 'empresa');
    await page.goto(`/vacantes/${ID_VACANTE_DATOS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Trainee de datos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pausar' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
  });
});

test.describe('vacantes de la empresa (API simulada)', () => {
  test('CU-40 · la empresa publica una vacante y aparece en «Mis vacantes» @critico', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'empresa');
    await page.goto('/vacantes');
    await expect(page.getByRole('heading', { name: 'Mis vacantes' })).toBeVisible();
    await expect(page.getByText('Trainee de datos')).toHaveCount(0);

    await page.getByRole('link', { name: 'Nueva vacante' }).click();
    await expect(
      page.getByRole('heading', { name: 'Encuentra talento que quiere empezar' }),
    ).toBeVisible();

    await page.getByLabel('Título de la vacante').fill('Pasantía de datos y analítica');
    await page
      .getByLabel('Descripción')
      .fill('Apoyarás al equipo con reportes y tableros para decisiones reales.');
    await elegirOpcion(page, /Tipo$/, 'Primer empleo');
    await elegirOpcion(page, /Modalidad$/, 'Remota');
    await page
      .getByRole('group', { name: 'Habilidades requeridas' })
      .getByRole('button', { name: 'SQL' })
      .click();
    await page.getByRole('button', { name: 'Guardar vacante' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Pasantía de datos y analítica' }),
    ).toBeVisible();
    await expect(page.getByText('SQL · requerida')).toBeVisible();
    expect(api.vacantesPublicadas).toEqual([
      expect.objectContaining({
        titulo: 'Pasantía de datos y analítica',
        tipo: 'primer_empleo',
        modalidad: 'remota',
        publicar: true,
        habilidades: [{ id: ID_SQL, requerida: true }],
      }),
    ]);

    await menu(page, 'Vacantes').click();
    await expect(page.getByRole('link', { name: 'Pasantía de datos y analítica' })).toBeVisible();
  });

  test('CU-40 · un título muy corto marca el campo y no envía nada @critico', async ({ page }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'empresa');
    await page.goto('/vacantes/nueva');

    await page.getByLabel('Título de la vacante').fill('Hola');
    await page.getByRole('button', { name: 'Guardar vacante' }).click();

    await expect(page.getByLabel('Título de la vacante')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/vacantes\/nueva$/);
    expect(api.vacantesPublicadas).toHaveLength(0);
  });

  test('CU-40 · sin descripción ni habilidades se muestran sus errores y no se envía @critico', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'empresa');
    await page.goto('/vacantes/nueva');

    await page.getByLabel('Título de la vacante').fill('Pasantía de soporte técnico');
    await page.getByRole('button', { name: 'Guardar vacante' }).click();

    await expect(page.getByLabel('Descripción')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Elige al menos una habilidad')).toBeVisible();
    await expect(page).toHaveURL(/\/vacantes\/nueva$/);
    expect(api.vacantesPublicadas).toHaveLength(0);
  });

  test('CU-40 · guardar como borrador no la deja abierta @completo', async ({ page }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'empresa');
    await page.goto('/vacantes/nueva');

    await page.getByLabel('Título de la vacante').fill('Vacante en preparación');
    await page
      .getByLabel('Descripción')
      .fill('Todavía estamos definiendo las funciones del puesto.');
    await page
      .getByRole('group', { name: 'Habilidades requeridas' })
      .getByRole('button', { name: 'React' })
      .click();
    await page.getByRole('radio', { name: 'Guardar borrador' }).check({ force: true });
    await page.getByRole('button', { name: 'Guardar vacante' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Vacante en preparación' }),
    ).toBeVisible();
    await expect(page.getByText('Borrador', { exact: true })).toBeVisible();
    expect(api.vacantesPublicadas[0]).toMatchObject({ publicar: false });
  });

  test('CU-41 · pausar, reabrir y cerrar cambian el estado y los botones @critico', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await conSesion(page, 'empresa');
    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);

    await expect(page.getByText('Abierta', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByText('Pausada', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reabrir' }).click();
    await expect(page.getByText('Abierta', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByText('Cerrada', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).toHaveCount(0);
    expect(api.cambiosDeVacante).toEqual(['pausada', 'abierta', 'cerrada']);
  });

  test('CU-44 · sin postulaciones el tablero lo explica @completo', async ({ page }) => {
    await simularPlataforma(page);
    await conSesion(page, 'empresa');
    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);

    await expect(page.getByRole('heading', { name: 'Aún no hay postulaciones' })).toBeVisible();
  });
});

test.describe('proceso de selección de punta a punta (API simulada)', () => {
  /** El talento se postula por la interfaz y la empresa entra a revisar a esa misma persona. */
  async function postularYEntrarComoEmpresa(page: Page): Promise<void> {
    await entrar(page, CORREO_TALENTO);
    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);
    await page.getByRole('button', { name: 'Postularme' }).click();
    await page.getByRole('button', { name: 'Tienda en línea con Node' }).click();
    await page.getByRole('button', { name: 'Enviar postulación' }).click();
    await expect(page.getByText('Ya te postulaste')).toBeVisible();
    await salir(page);

    await entrar(page, CORREO_EMPRESA);
    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);
  }

  test('CU-44 · la empresa avanza la postulación hasta seleccionar y el talento lo ve @humo @critico', async ({
    page,
  }) => {
    const api = await simularPlataforma(page);
    await postularYEntrarComoEmpresa(page);

    await expect(page.getByRole('link', { name: 'Ana Demo' })).toBeVisible();
    await expect(page.getByText('Ingeniería en Sistemas')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tienda en línea con Node' })).toBeVisible();

    await page.getByRole('button', { name: 'En revisión' }).click();
    await expect(page.getByRole('button', { name: 'Entrevista' })).toBeVisible();
    await page.getByRole('button', { name: 'Entrevista' }).click();
    await expect(page.getByRole('button', { name: 'Seleccionada' })).toBeVisible();
    await page.getByRole('button', { name: 'Seleccionada' }).click();
    await expect(page.getByRole('button', { name: 'Descartar' })).toHaveCount(0);
    expect(api.cambiosDePostulacion.map((c) => c.estado)).toEqual([
      'en_revision',
      'entrevista',
      'seleccionada',
    ]);
    expect(api.cambiosDePostulacion.map((c) => c.version)).toEqual([1, 2, 3]);

    await salir(page);
    await entrar(page, CORREO_TALENTO);
    await menu(page, 'Mis postulaciones').click();
    await expect(page.getByText('Seleccionada', { exact: true })).toBeVisible();
  });

  test('CU-46 · descartar exige el motivo y luego lo muestra @critico', async ({ page }) => {
    const api = await simularPlataforma(page);
    await postularYEntrarComoEmpresa(page);

    await page.getByRole('button', { name: 'Descartar' }).click();
    const modal = page.getByRole('dialog', { name: 'Descartar postulación' });
    await modal.getByRole('button', { name: 'Descartar' }).click();
    await expect(modal.getByText('Indica el motivo del descarte')).toBeVisible();
    expect(api.cambiosDePostulacion).toHaveLength(0);

    await modal.getByRole('button', { name: /Motivo$/ }).click();
    await page.getByRole('option', { name: 'Perfil incompleto' }).click();
    await modal.getByLabel('Detalle (opcional)').fill('Falta evidencia de bases de datos.');
    await modal.getByRole('button', { name: 'Descartar' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByText('Descartada: Perfil incompleto — Falta evidencia de bases de datos.'),
    ).toBeVisible();
    expect(api.cambiosDePostulacion).toEqual([
      expect.objectContaining({
        estado: 'descartada',
        motivoDescarte: 'perfil_incompleto',
        detalleDescarte: 'Falta evidencia de bases de datos.',
      }),
    ]);

    await salir(page);
    await entrar(page, CORREO_TALENTO);
    await menu(page, 'Mis postulaciones').click();
    await expect(page.getByText('Descartada', { exact: true })).toBeVisible();
  });

  test('CU-46 · cancelar el descarte no cambia el estado @completo', async ({ page }) => {
    const api = await simularPlataforma(page);
    await postularYEntrarComoEmpresa(page);

    await page.getByRole('button', { name: 'Descartar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Recibida', { exact: true })).toBeVisible();
    expect(api.cambiosDePostulacion).toHaveLength(0);
  });

  test('CU-44 · el talento no ve el tablero de otra empresa @completo', async ({ page }) => {
    await simularPlataforma(page);
    await conSesion(page, 'talento');
    await page.goto(`/vacantes/${ID_VACANTE_WEB}`);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Pasantía de desarrollo web' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Postulaciones' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Descartar' })).toHaveCount(0);
  });
});
