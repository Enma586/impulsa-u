import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { error, simularRegistro, type RespuestaSimulada } from '../../fijaciones/apiSimulada.js';
import { datosValidos, RegistroPagina } from '../../paginas/RegistroPagina.js';

/** Avanza con Tab hasta el destino; falla si no se llega en pocas paradas. */
async function tabulaHasta(page: Page, destino: Locator): Promise<void> {
  for (let paradas = 0; paradas < 5; paradas++) {
    await page.keyboard.press('Tab');
    const enfocado = await expect(destino)
      .toBeFocused({ timeout: 250 })
      .then(() => true)
      .catch(() => false);
    if (enfocado) return;
  }
  await expect(destino).toBeFocused();
}

test.describe('registro de talento (API simulada)', () => {
  test('CU-01 · registro de talento completo muestra "Revisa tu correo" @humo @critico', async ({
    page,
  }) => {
    const api = await simularRegistro(page);
    const registro = new RegistroPagina(page);
    await registro.ir();
    await registro.llenar(datosValidos);
    await registro.crearCuenta.click();

    await expect(registro.confirmacion).toBeVisible();
    expect(api.peticiones).toHaveLength(1);
    expect(api.peticiones[0]?.llaveIdempotencia).toMatch(/^[0-9a-f-]{36}$/);
    expect(api.peticiones[0]?.cuerpo).toMatchObject({
      rol: 'talento',
      correo: datosValidos.correo,
      estadoAcademico: 'estudiante',
      ciclo: 3,
      fechaNacimiento: datosValidos.fechaNacimiento,
      declaracionSinExperiencia: true,
      aceptaTerminos: true,
    });
  });

  test('CU-01 · registro rechaza menor de 18 años con mensaje claro @completo', async ({
    page,
  }) => {
    await simularRegistro(page, error(422, 'menor_de_edad'));
    const registro = new RegistroPagina(page);
    await registro.ir();
    await registro.llenar({ ...datosValidos, fechaNacimiento: '2015-01-01' });
    await registro.crearCuenta.click();

    await expect(page.getByText('Debes tener 18 años o más', { exact: true })).toBeVisible();
    await expect(registro.confirmacion).toBeHidden();
  });

  test('CU-01 · no se puede crear cuenta sin la declaración de cero experiencia @critico', async ({
    page,
  }) => {
    const api = await simularRegistro(page);
    const registro = new RegistroPagina(page);
    await registro.ir();
    await registro.llenar({ ...datosValidos, declaracion: false });
    await registro.crearCuenta.click();

    await expect(page.getByText('Debes aceptar la declaración de cero experiencia')).toBeVisible();
    expect(api.peticiones).toHaveLength(0);
  });

  test('CU-01 · doble clic en "Crear cuenta" envía una sola petición @critico', async ({
    page,
  }) => {
    let liberar: (respuesta: RespuestaSimulada) => void = () => undefined;
    const respuestaPendiente = new Promise<RespuestaSimulada>((resolver) => {
      liberar = resolver;
    });
    const api = await simularRegistro(page, () => respuestaPendiente);
    const registro = new RegistroPagina(page);
    await registro.ir();
    await registro.llenar(datosValidos);
    await registro.crearCuenta.dblclick();
    liberar({ status: 202, cuerpo: { estado: 'revisa_tu_correo' } });

    await expect(registro.confirmacion).toBeVisible();
    expect(api.peticiones).toHaveLength(1);
  });

  test('CU-01 · con límite de intentos muestra un aviso amable y conserva los datos @completo', async ({
    page,
  }) => {
    await simularRegistro(page, error(429, 'demasiadas_peticiones'));
    const registro = new RegistroPagina(page);
    await registro.ir();
    await registro.llenar(datosValidos);
    await registro.crearCuenta.click();

    await expect(page.getByRole('alert')).toContainText('Demasiados intentos');
    await expect(registro.correo).toHaveValue(datosValidos.correo);
  });

  test('CU-01 · se completa solo con teclado @a11y', async ({ page, isMobile }) => {
    test.skip(
      isMobile,
      'El teclado físico se prueba en escritorio; el celular usa el selector táctil de fecha',
    );
    const api = await simularRegistro(page);
    const registro = new RegistroPagina(page);
    await registro.ir();

    await registro.nombre.focus();
    await page.keyboard.type(datosValidos.nombre);
    await tabulaHasta(page, registro.correo);
    await page.keyboard.type(datosValidos.correo);
    await tabulaHasta(page, registro.contrasena);
    await page.keyboard.type(datosValidos.contrasena);
    await tabulaHasta(page, registro.fechaNacimiento);
    await page.keyboard.type('14032002'); // dd/mm/aaaa con locale es-ES
    await tabulaHasta(page, page.getByRole('radio', { name: 'Estudiante' }));
    await tabulaHasta(page, registro.selectorCiclo);
    await page.keyboard.press('Enter');
    await page.getByRole('option', { name: 'Ciclo 3' }).press('Enter');
    await tabulaHasta(page, registro.declaracion);
    await page.keyboard.press('Space');
    await tabulaHasta(page, registro.terminos);
    await page.keyboard.press('Space');
    await tabulaHasta(page, registro.crearCuenta);
    await page.keyboard.press('Enter');

    await expect(registro.confirmacion).toBeVisible();
    expect(api.peticiones).toHaveLength(1);
  });

  test('CU-01 · el formulario no tiene violaciones graves de accesibilidad @a11y', async ({
    page,
  }) => {
    const registro = new RegistroPagina(page);
    await registro.ir();
    await registro.crearCuenta.click(); // deja visibles todos los errores
    await expect(page.getByText('Este campo es obligatorio').first()).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).analyze();
    const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(graves.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
