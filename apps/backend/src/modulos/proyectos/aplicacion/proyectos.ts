import { Inject, Injectable } from '@nestjs/common';
import type { proyectos } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { NO_ENCONTRADO, PROHIBIDO } from '../../../compartido/dominio/errores.js';
import type { ErrorCasoUso, ResultadoEscritura } from '../../../compartido/dominio/errores.js';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { REPOSITORIO_PROYECTOS } from '../puertos/repositorio-proyectos.js';
import type { RepositorioProyectos } from '../puertos/repositorio-proyectos.js';

const CONFLICTO_VERSION: ErrorCasoUso = {
  tipo: 'conflicto',
  mensaje: 'El proyecto cambió en otro lugar. Recarga para ver la versión más reciente',
};

function traducir(resultado: ResultadoEscritura<{ id: string }>): Resultado<string, ErrorCasoUso> {
  switch (resultado.tipo) {
    case 'ok':
      return ok(resultado.valor.id);
    case 'no_encontrado':
      return fallo(NO_ENCONTRADO);
    case 'prohibido':
      return fallo(PROHIBIDO);
    case 'conflicto':
      return fallo(CONFLICTO_VERSION);
    case 'referencia_invalida':
      return fallo({
        tipo: 'invalido',
        campo: resultado.campo,
        mensaje: 'Contiene un valor que no existe o que no te pertenece',
      });
  }
}

@Injectable()
export class PublicarProyecto {
  constructor(@Inject(REPOSITORIO_PROYECTOS) private readonly proyectos: RepositorioProyectos) {}

  /** CU-17. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    entrada: proyectos.PublicarProyectoEntrada,
  ): Promise<Resultado<proyectos.ProyectoDetalle, ErrorCasoUso>> {
    if (usuario.rol !== 'talento') return fallo(PROHIBIDO);
    const creado = traducir(await this.proyectos.crear(usuario.id, entrada, new Date()));
    if (!creado.ok) return creado;
    const detalle = await this.proyectos.obtener(creado.valor, usuario.id);
    return detalle ? ok(detalle) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class ObtenerProyecto {
  constructor(@Inject(REPOSITORIO_PROYECTOS) private readonly proyectos: RepositorioProyectos) {}

  /** CU-19. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    id: string,
  ): Promise<Resultado<proyectos.ProyectoDetalle, ErrorCasoUso>> {
    const detalle = await this.proyectos.obtener(id, usuario.id);
    return detalle ? ok(detalle) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class ExplorarProyectos {
  constructor(@Inject(REPOSITORIO_PROYECTOS) private readonly proyectos: RepositorioProyectos) {}

  /** CU-20. */
  ejecutar(
    usuario: UsuarioAutenticado,
    consulta: proyectos.ConsultaFeed,
  ): Promise<proyectos.PaginaProyectos> {
    return this.proyectos.explorar(usuario.id, consulta);
  }
}

@Injectable()
export class EditarProyecto {
  constructor(@Inject(REPOSITORIO_PROYECTOS) private readonly proyectos: RepositorioProyectos) {}

  /** CU-18, con bloqueo optimista. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    id: string,
    entrada: proyectos.EditarProyectoEntrada,
  ): Promise<Resultado<proyectos.ProyectoDetalle, ErrorCasoUso>> {
    const editado = traducir(await this.proyectos.editar(id, usuario.id, entrada, new Date()));
    if (!editado.ok) return editado;
    const detalle = await this.proyectos.obtener(editado.valor, usuario.id);
    return detalle ? ok(detalle) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class EliminarProyecto {
  constructor(@Inject(REPOSITORIO_PROYECTOS) private readonly proyectos: RepositorioProyectos) {}

  /** CU-18: borrado lógico. */
  async ejecutar(usuario: UsuarioAutenticado, id: string): Promise<Resultado<true, ErrorCasoUso>> {
    const eliminado = traducir(await this.proyectos.eliminar(id, usuario.id, new Date()));
    return eliminado.ok ? ok(true) : eliminado;
  }
}
