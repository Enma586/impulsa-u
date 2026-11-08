import { expect, test, type Page } from '@playwright/test';
import { menu } from '../../paginas/acceso.js';
import { simularMensajeria } from '../../fijaciones/mensajeria.js';
import { conSesion } from '../../fijaciones/plataforma.js';

const hilo = (page: Page) => page.getByRole('log', { name: 'Mensajes con [Empresa Demo]' });

test.describe('intereses y mensajes (API simulada, sin conexión en vivo)', () => {
  test('CU-31 · el talento acepta un interés y abre la conversación @humo @critico', async ({
    page,
  }) => {
    const api = await simularMensajeria(page, { interesPendiente: true });
    await conSesion(page, 'talento');
    await page.goto('/intereses');

    await expect(page.getByText('Nos gustó tu proyecto de tienda en línea')).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar y abrir chat' }).click();
    await expect(page.getByRole('link', { name: 'Abrir conversación' })).toBeVisible();
    expect(api.aceptados).toHaveLength(1);

    await page.getByRole('link', { name: 'Abrir conversación' }).click();
    await expect(page).toHaveURL(/\/mensajes\/[0-9a-f-]+$/);
    await expect(hilo(page).getByText('Hola Ana, vimos tu portafolio')).toBeVisible();
  });

  test('CU-32 · la bandeja lista la conversación y se navega desde el menú @completo', async ({
    page,
  }) => {
    await simularMensajeria(page);
    await conSesion(page, 'talento');
    await page.goto('/');

    await menu(page, 'Mensajes').click();
    await expect(page.getByRole('heading', { name: 'Mensajes', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /\[Empresa Demo\]/ })).toBeVisible();
    await expect(page.getByText('Elige una conversación').first()).toBeAttached();
  });

  test('CU-33 · envía un mensaje, aparece enviado y el servidor recibe un clientMessageId @critico', async ({
    page,
  }) => {
    const api = await simularMensajeria(page);
    await conSesion(page, 'talento');
    await page.goto('/mensajes');
    await page.getByRole('link', { name: /\[Empresa Demo\]/ }).click();

    await expect(hilo(page).getByText('Hola Ana, vimos tu portafolio')).toBeVisible();
    await expect.poll(() => api.lecturas).toEqual([1]);

    await page
      .getByRole('textbox', { name: 'Escribe un mensaje' })
      .fill('Gracias, ¿cuándo hablamos?');
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(hilo(page).getByText('Gracias, ¿cuándo hablamos?')).toBeVisible();
    await expect(hilo(page).getByText('Enviado')).toBeVisible();
    expect(api.envios).toHaveLength(1);
    expect(api.envios[0]?.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('CU-33 · si el envío falla se puede reintentar sin duplicar el mensaje @completo', async ({
    page,
  }) => {
    const api = await simularMensajeria(page);
    api.fallarProximoEnvio = true;
    await conSesion(page, 'talento');
    await page.goto('/mensajes');
    await page.getByRole('link', { name: /\[Empresa Demo\]/ }).click();

    await page.getByRole('textbox', { name: 'Escribe un mensaje' }).fill('Otro intento');
    await page.getByRole('textbox', { name: 'Escribe un mensaje' }).press('Enter');
    await expect(hilo(page).getByText('No se envió')).toBeVisible();

    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(hilo(page).getByText('Enviado')).toBeVisible();
    expect(api.envios).toHaveLength(2);
    expect(api.envios[1]?.clientMessageId).toBe(api.envios[0]?.clientMessageId);
    await expect(hilo(page).getByText('Otro intento')).toHaveCount(1);
  });

  test('sin conexión en vivo la app lo avisa y sigue funcionando @completo', async ({ page }) => {
    await simularMensajeria(page);
    await conSesion(page, 'talento');
    await page.goto('/mensajes');

    await expect(page.getByText(/Sin conexión en vivo|Reconectando/)).toBeVisible();
  });

  test('CU-35 · bloquear a la otra parte deja la conversación sin caja de texto @completo', async ({
    page,
  }) => {
    const api = await simularMensajeria(page);
    await conSesion(page, 'talento');
    await page.goto('/mensajes');
    await page.getByRole('link', { name: /\[Empresa Demo\]/ }).click();

    await page.getByRole('button', { name: 'Bloquear' }).click();
    await expect(page.getByText(/Bloqueaste a esta persona/)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Escribe un mensaje' })).toHaveCount(0);
    expect(api.bloqueos).toHaveLength(1);

    await page.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.getByRole('textbox', { name: 'Escribe un mensaje' })).toBeVisible();
  });

  test('CU-35 · si la otra parte bloqueó, no se puede escribir ni desbloquear @completo', async ({
    page,
  }) => {
    await simularMensajeria(page, { bloqueadaPorOtro: true });
    await conSesion(page, 'talento');
    await page.goto('/mensajes');
    await page.getByRole('link', { name: /\[Empresa Demo\]/ }).click();

    await expect(page.getByText('Esta conversación está bloqueada.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Escribe un mensaje' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Desbloquear' })).toHaveCount(0);
  });
});
