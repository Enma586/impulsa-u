import type { auth } from '@impulsau/contracts';
import type { Resultado } from './resultado.js';

/** Usuario ya autenticado, con el rol y el estado que guarda ImpulsaU. */
export interface UsuarioAutenticado {
  id: string;
  rol: auth.Rol;
  estado: auth.EstadoUsuario;
}

export const VERIFICADOR_TOKEN = Symbol('VerificadorToken');

/** Valida el token de acceso del proveedor de identidad (firma, expiración, emisor y audiencia). */
export interface VerificadorToken {
  verificar(token: string): Promise<Resultado<{ usuarioId: string }, 'token_invalido'>>;
}

export const BUSCADOR_USUARIO = Symbol('BuscadorUsuario');

/** Carga el perfil de ImpulsaU; devuelve `null` si la cuenta existe en Auth pero no tiene perfil. */
export interface BuscadorUsuario {
  buscarPorId(id: string): Promise<UsuarioAutenticado | null>;
}
