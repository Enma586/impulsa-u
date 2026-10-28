import { Inject, Injectable } from '@nestjs/common';
import type { interacciones } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { NO_ENCONTRADO } from '../../../compartido/dominio/errores.js';
import type { ErrorCasoUso } from '../../../compartido/dominio/errores.js';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { REPOSITORIO_LIKES } from '../puertos/repositorio-likes.js';
import type { RepositorioLikes } from '../puertos/repositorio-likes.js';

@Injectable()
export class PonerLike {
  constructor(@Inject(REPOSITORIO_LIKES) private readonly likes: RepositorioLikes) {}

  /** CU-22 (dar like): `PUT`, idempotente. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    proyectoId: string,
  ): Promise<Resultado<interacciones.EstadoLike, ErrorCasoUso>> {
    const estado = await this.likes.poner(usuario.id, proyectoId);
    return estado ? ok(estado) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class QuitarLike {
  constructor(@Inject(REPOSITORIO_LIKES) private readonly likes: RepositorioLikes) {}

  /** CU-22 (quitar like): `DELETE`, idempotente. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    proyectoId: string,
  ): Promise<Resultado<interacciones.EstadoLike, ErrorCasoUso>> {
    const estado = await this.likes.quitar(usuario.id, proyectoId);
    return estado ? ok(estado) : fallo(NO_ENCONTRADO);
  }
}
