import { Body, Controller, Get, Inject, Param, Put } from '@nestjs/common';
import { perfiles } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { ErrorHttpApi } from '../../../compartido/http/error-api.js';
import { ParamUuid } from '../../../compartido/http/param-uuid.js';
import { aErrorHttp } from '../../../compartido/http/traducir-error.js';
import { UsuarioActual } from '../../../compartido/http/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../../compartido/http/zod-validation.pipe.js';
import {
  ActualizarPerfilEmpresa,
  ActualizarPerfilTalento,
  ObtenerPerfilEmpresa,
  ObtenerPerfilTalento,
} from '../aplicacion/perfiles.js';

@Controller('perfiles')
export class PerfilesController {
  constructor(
    @Inject(ObtenerPerfilTalento) private readonly verTalento: ObtenerPerfilTalento,
    @Inject(ActualizarPerfilTalento) private readonly editarTalento: ActualizarPerfilTalento,
    @Inject(ObtenerPerfilEmpresa) private readonly verEmpresa: ObtenerPerfilEmpresa,
    @Inject(ActualizarPerfilEmpresa) private readonly editarEmpresa: ActualizarPerfilEmpresa,
  ) {}

  @Get('talentos/me')
  async miPerfilTalento(@UsuarioActual() usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'talento') throw new ErrorHttpApi(403, 'prohibido', 'Solo para talentos');
    return this.talento(usuario.id);
  }

  @Put('talentos/me')
  async actualizarPerfilTalento(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(perfiles.ActualizarPerfilTalentoEntrada))
    entrada: perfiles.ActualizarPerfilTalentoEntrada,
  ): Promise<perfiles.PerfilTalento> {
    const resultado = await this.editarTalento.ejecutar(usuario, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Get('talentos/:id')
  talentoPorId(@Param('id', ParamUuid) id: string): Promise<perfiles.PerfilTalento> {
    return this.talento(id);
  }

  @Get('empresas/me')
  async miPerfilEmpresa(@UsuarioActual() usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'empresa') throw new ErrorHttpApi(403, 'prohibido', 'Solo para empresas');
    return this.empresa(usuario.id);
  }

  @Put('empresas/me')
  async actualizarPerfilEmpresa(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(perfiles.ActualizarPerfilEmpresaEntrada))
    entrada: perfiles.ActualizarPerfilEmpresaEntrada,
  ): Promise<perfiles.PerfilEmpresa> {
    const resultado = await this.editarEmpresa.ejecutar(usuario, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Get('empresas/:id')
  empresaPorId(@Param('id', ParamUuid) id: string): Promise<perfiles.PerfilEmpresa> {
    return this.empresa(id);
  }

  private async talento(id: string): Promise<perfiles.PerfilTalento> {
    const resultado = await this.verTalento.ejecutar(id);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  private async empresa(id: string): Promise<perfiles.PerfilEmpresa> {
    const resultado = await this.verEmpresa.ejecutar(id);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }
}
