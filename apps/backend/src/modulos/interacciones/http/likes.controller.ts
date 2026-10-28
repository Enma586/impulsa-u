import { Controller, Delete, HttpCode, Inject, Param, Put } from '@nestjs/common';
import type { interacciones } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { ParamUuid } from '../../../compartido/http/param-uuid.js';
import { aErrorHttp } from '../../../compartido/http/traducir-error.js';
import { UsuarioActual } from '../../../compartido/http/usuario-actual.decorator.js';
import { PonerLike, QuitarLike } from '../aplicacion/likes.js';

@Controller('proyectos/:id/like')
export class LikesController {
  constructor(
    @Inject(PonerLike) private readonly ponerLike: PonerLike,
    @Inject(QuitarLike) private readonly quitarLike: QuitarLike,
  ) {}

  @HttpCode(200)
  @Put()
  async poner(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<interacciones.EstadoLike> {
    const resultado = await this.ponerLike.ejecutar(usuario, id);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @HttpCode(200)
  @Delete()
  async quitar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<interacciones.EstadoLike> {
    const resultado = await this.quitarLike.ejecutar(usuario, id);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }
}
