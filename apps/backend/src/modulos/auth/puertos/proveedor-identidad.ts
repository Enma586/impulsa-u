import type { Resultado } from '../../../compartido/dominio/resultado.js';

export const PROVEEDOR_IDENTIDAD = Symbol('ProveedorIdentidad');

export type CuentaCreada = { tipo: 'nueva'; id: string } | { tipo: 'ya_registrada' };

/** Cuentas de acceso (correo y contraseña); hoy las administra Supabase Auth. */
export interface ProveedorIdentidad {
  /** Crea la cuenta y dispara el correo de verificación. No revela si el correo ya existía. */
  crearCuenta(datos: {
    correo: string;
    contrasena: string;
  }): Promise<Resultado<CuentaCreada, 'no_disponible'>>;
  /** Compensación: elimina la cuenta creada. No lanza si falla; la limpieza diaria la recoge. */
  eliminarCuenta(id: string): Promise<void>;
}
