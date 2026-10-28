import type { proyectos } from '@impulsau/contracts';
import type { ResultadoEscritura } from '../../../compartido/dominio/errores.js';

export const REPOSITORIO_PROYECTOS = Symbol('RepositorioProyectos');

export interface RepositorioProyectos {
  crear(
    autorId: string,
    entrada: proyectos.PublicarProyectoEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>>;
  /** Visible si está publicado o si lo pide su autor; nunca los eliminados. */
  obtener(id: string, usuarioId: string): Promise<proyectos.ProyectoDetalle | null>;
  explorar(usuarioId: string, consulta: proyectos.ConsultaFeed): Promise<proyectos.PaginaProyectos>;
  /** Guarda solo si `version` coincide, y reemplaza tecnologías e imágenes. */
  editar(
    id: string,
    autorId: string,
    entrada: proyectos.EditarProyectoEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>>;
  eliminar(id: string, autorId: string, ahora: Date): Promise<ResultadoEscritura<{ id: string }>>;
}
