import type { vacantes } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import type { ResultadoEscritura } from '../../../compartido/dominio/errores.js';

export const REPOSITORIO_VACANTES = Symbol('RepositorioVacantes');
export const REPOSITORIO_POSTULACIONES = Symbol('RepositorioPostulaciones');

export interface RepositorioVacantes {
  crear(
    empresaId: string,
    entrada: vacantes.PublicarVacanteEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>>;
  /** Visible si no es borrador o si la pide su empresa; nunca las eliminadas. */
  obtener(id: string, usuario: UsuarioAutenticado): Promise<vacantes.VacanteDetalle | null>;
  /** Para talentos calcula la coincidencia con sus habilidades declaradas y demostradas. */
  listar(
    usuario: UsuarioAutenticado,
    consulta: vacantes.ConsultaVacantes,
  ): Promise<vacantes.PaginaVacantes>;
  editar(
    id: string,
    empresaId: string,
    entrada: vacantes.EditarVacanteEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>>;
  cambiarEstado(
    id: string,
    empresaId: string,
    estado: vacantes.CambiarEstadoVacanteEntrada['estado'],
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>>;
}

export type ResultadoPostular =
  | { tipo: 'ok'; id: string }
  | { tipo: 'vacante_no_encontrada' }
  | { tipo: 'vacante_no_abierta' }
  | { tipo: 'ya_postulado' }
  | { tipo: 'proyecto_invalido' };

export interface RepositorioPostulaciones {
  postular(talentoId: string, vacanteId: string, proyectoIds: string[]): Promise<ResultadoPostular>;
  obtenerDelTalento(id: string, talentoId: string): Promise<vacantes.Postulacion | null>;
  delTalento(talentoId: string): Promise<vacantes.Postulacion[]>;
  /** `null` si la vacante no existe o no es de la empresa. */
  deLaVacante(vacanteId: string, empresaId: string): Promise<vacantes.PostulacionRecibida[] | null>;
  cambiarEstado(
    id: string,
    empresaId: string,
    entrada: vacantes.CambiarEstadoPostulacionEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<vacantes.PostulacionRecibida>>;
}
