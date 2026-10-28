import type { Resultado } from '../../../compartido/dominio/resultado.js';

export const PROVEEDOR_IDENTIDAD = Symbol('ProveedorIdentidad');

export type CuentaCreada = { tipo: 'nueva'; id: string } | { tipo: 'ya_registrada' };

/** Tokens que entrega el proveedor al iniciar o renovar una sesión. `expiraEn` en segundos Unix. */
export interface TokensSesion {
  usuarioId: string;
  accessToken: string;
  refreshToken: string;
  expiraEn: number;
}

export type ErrorInicioSesion = 'credenciales_invalidas' | 'correo_no_verificado' | 'no_disponible';

/** Cuentas de acceso (correo y contraseña); hoy las administra Supabase Auth. */
export interface ProveedorIdentidad {
  /** Crea la cuenta y dispara el correo de verificación. No revela si el correo ya existía. */
  crearCuenta(datos: {
    correo: string;
    contrasena: string;
  }): Promise<Resultado<CuentaCreada, 'no_disponible'>>;
  /** Compensación: elimina la cuenta creada. No lanza si falla; la limpieza diaria la recoge. */
  eliminarCuenta(id: string): Promise<void>;
  iniciarSesion(datos: {
    correo: string;
    contrasena: string;
  }): Promise<Resultado<TokensSesion, ErrorInicioSesion>>;
  renovarSesion(
    refreshToken: string,
  ): Promise<Resultado<TokensSesion, 'sesion_invalida' | 'no_disponible'>>;
  /** Revoca los refresh tokens de este dispositivo (`local`) o de todos (`global`). */
  cerrarSesion(
    accessToken: string,
    alcance: 'local' | 'global',
  ): Promise<Resultado<true, 'no_disponible'>>;
}
