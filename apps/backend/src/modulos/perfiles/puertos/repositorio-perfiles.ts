import type { perfiles } from '@impulsau/contracts';

export const REPOSITORIO_PERFILES = Symbol('RepositorioPerfiles');

export type ResultadoActualizacion<T> =
  | { tipo: 'ok'; perfil: T }
  | { tipo: 'no_encontrado' }
  | { tipo: 'conflicto' }
  | { tipo: 'referencia_invalida'; campo: string };

export interface RepositorioPerfiles {
  obtenerTalento(id: string): Promise<perfiles.PerfilTalento | null>;
  /** Guarda el perfil si `version` coincide; sube la versión y reemplaza habilidades y enlaces. */
  actualizarTalento(
    id: string,
    entrada: perfiles.ActualizarPerfilTalentoEntrada,
  ): Promise<ResultadoActualizacion<perfiles.PerfilTalento>>;
  obtenerEmpresa(id: string): Promise<perfiles.PerfilEmpresa | null>;
  actualizarEmpresa(
    id: string,
    entrada: perfiles.ActualizarPerfilEmpresaEntrada,
  ): Promise<ResultadoActualizacion<perfiles.PerfilEmpresa>>;
}
