import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';

export const REPOSITORIO_USUARIOS = Symbol('RepositorioUsuarios');

export interface NuevoTalento {
  id: string;
  correo: string;
  nombreCompleto: string;
  fechaNacimiento: string;
  estadoAcademico: 'estudiante' | 'egresado';
  ciclo: number | null;
  anioEgreso: number | null;
  declaracionSinExperienciaEn: Date;
}

export interface RepositorioUsuarios {
  /** Crea `usuarios` y `talentos` en una sola transacción; `ya_existia` si el perfil ya estaba. */
  crearTalento(talento: NuevoTalento): Promise<'creado' | 'ya_existia'>;
  buscarPorId(id: string): Promise<UsuarioAutenticado | null>;
}
