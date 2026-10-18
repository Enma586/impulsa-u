import { expect, type Locator, type Page } from '@playwright/test';

export interface DatosRegistro {
  nombre: string;
  correo: string;
  contrasena: string;
  /** `YYYY-MM-DD`, el formato del campo de fecha nativo. */
  fechaNacimiento: string;
  ciclo: string | null;
  declaracion: boolean;
  terminos: boolean;
}

export const datosValidos: DatosRegistro = {
  nombre: 'María López',
  correo: 'maria.lopez@correo.test',
  contrasena: 'una-clave-larga',
  fechaNacimiento: '2002-03-14',
  ciclo: 'Ciclo 3',
  declaracion: true,
  terminos: true,
};

/** Page object de `/registro`, con selectores accesibles. */
export class RegistroPagina {
  readonly nombre: Locator;
  readonly correo: Locator;
  readonly contrasena: Locator;
  readonly fechaNacimiento: Locator;
  readonly selectorCiclo: Locator;
  readonly declaracion: Locator;
  readonly terminos: Locator;
  readonly crearCuenta: Locator;
  readonly confirmacion: Locator;

  constructor(readonly page: Page) {
    this.nombre = page.getByLabel('Nombre completo');
    this.correo = page.getByLabel('Correo electrónico');
    this.contrasena = page.getByLabel('Crea una contraseña');
    this.fechaNacimiento = page.getByLabel('Fecha de nacimiento');
    this.selectorCiclo = page.getByRole('button', { name: /Ciclo actual/ });
    this.declaracion = page.getByRole('checkbox', { name: /Declaro que no tengo/ });
    this.terminos = page.getByRole('checkbox', { name: /Acepto los términos/ });
    this.crearCuenta = page.getByRole('button', { name: 'Crear cuenta' });
    this.confirmacion = page.getByRole('heading', { name: 'Revisa tu correo' });
  }

  async ir(): Promise<void> {
    await this.page.goto('/registro');
    await this.nombre.waitFor();
  }

  async llenar(datos: DatosRegistro): Promise<void> {
    await this.nombre.fill(datos.nombre);
    await this.correo.fill(datos.correo);
    await this.contrasena.fill(datos.contrasena);
    await this.fechaNacimiento.fill(datos.fechaNacimiento);
    if (datos.ciclo !== null) {
      await this.selectorCiclo.click();
      await this.page.getByRole('option', { name: datos.ciclo }).click();
    }
    if (datos.declaracion) await this.marcar(this.declaracion, /Declaro que no tengo/);
    if (datos.terminos) await this.marcar(this.terminos, /Acepto los términos/);
  }

  /** El input nativo está oculto: se hace clic en el texto visible y se comprueba el resultado. */
  private async marcar(casilla: Locator, texto: RegExp): Promise<void> {
    await this.page.getByText(texto).click();
    await expect(casilla).toBeChecked();
  }
}
