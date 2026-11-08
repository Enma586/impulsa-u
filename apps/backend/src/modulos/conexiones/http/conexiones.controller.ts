import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { conexiones } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { ErrorHttpApi } from '../../../compartido/http/error-api.js';
import { ParamUuid } from '../../../compartido/http/param-uuid.js';
import { aErrorHttp } from '../../../compartido/http/traducir-error.js';
import { UsuarioActual } from '../../../compartido/http/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../../compartido/http/zod-validation.pipe.js';
import {
  ListarIntereses,
  MostrarInteres,
  ResponderInteres,
  RetirarInteres,
} from '../aplicacion/intereses.js';
import type { ErrorConexion } from '../dominio/errores.js';

function aErrorConexion(error: ErrorConexion): ErrorHttpApi {
  switch (error.tipo) {
    case 'empresa_no_verificada':
      return new ErrorHttpApi(
        403,
        'empresa_no_verificada',
        'Tu empresa debe estar verificada para mostrar interés en un talento',
      );
    case 'talento_no_disponible':
      return new ErrorHttpApi(
        409,
        'talento_no_disponible',
        'Este talento ya consiguió su primer empleo',
      );
    case 'usuario_bloqueado':
      return new ErrorHttpApi(403, 'usuario_bloqueado', 'Bloqueaste a este usuario');
    case 'no_encontrado':
    case 'prohibido':
    case 'conflicto':
    case 'invalido':
      return aErrorHttp(error);
  }
}

const CuerpoInteres = new ZodValidationPipe(conexiones.MostrarInteresEntrada.default({}));

@Controller()
export class ConexionesController {
  constructor(
    @Inject(MostrarInteres) private readonly mostrar: MostrarInteres,
    @Inject(RetirarInteres) private readonly retirar: RetirarInteres,
    @Inject(ResponderInteres) private readonly responder: ResponderInteres,
    @Inject(ListarIntereses) private readonly listar: ListarIntereses,
  ) {}

  /** CU-29: una empresa verificada muestra interés en un talento. */
  @Put('talentos/:id/interes')
  async deEmpresa(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) talentoId: string,
    @Body(CuerpoInteres) entrada: conexiones.MostrarInteresEntrada,
  ): Promise<conexiones.Interes> {
    const resultado = await this.mostrar.ejecutar(usuario, 'empresa_a_talento', talentoId, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorConexion(resultado.error);
  }

  /** CU-30: un talento muestra interés en una empresa. */
  @Put('empresas/:id/interes')
  async deTalento(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) empresaId: string,
    @Body(CuerpoInteres) entrada: conexiones.MostrarInteresEntrada,
  ): Promise<conexiones.Interes> {
    const resultado = await this.mostrar.ejecutar(usuario, 'talento_a_empresa', empresaId, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorConexion(resultado.error);
  }

  @HttpCode(204)
  @Delete('talentos/:id/interes')
  async retirarDeEmpresa(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) talentoId: string,
  ): Promise<void> {
    const resultado = await this.retirar.ejecutar(usuario, 'empresa_a_talento', talentoId);
    if (!resultado.ok) throw aErrorConexion(resultado.error);
  }

  @HttpCode(204)
  @Delete('empresas/:id/interes')
  async retirarDeTalento(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) empresaId: string,
  ): Promise<void> {
    const resultado = await this.retirar.ejecutar(usuario, 'talento_a_empresa', empresaId);
    if (!resultado.ok) throw aErrorConexion(resultado.error);
  }

  @Get('intereses')
  async lista(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query(new ZodValidationPipe(conexiones.ConsultaIntereses))
    consulta: conexiones.ConsultaIntereses,
  ): Promise<conexiones.PaginaIntereses> {
    const resultado = await this.listar.ejecutar(usuario, consulta);
    if (resultado.ok) return resultado.valor;
    throw aErrorConexion(resultado.error);
  }

  /** CU-31: acepta y abre la conversación. */
  @HttpCode(200)
  @Post('intereses/:id/aceptar')
  async aceptar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<conexiones.Interes> {
    const resultado = await this.responder.ejecutar(usuario, id, 'aceptar');
    if (resultado.ok) return resultado.valor;
    throw aErrorConexion(resultado.error);
  }

  @HttpCode(200)
  @Post('intereses/:id/declinar')
  async declinar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<conexiones.Interes> {
    const resultado = await this.responder.ejecutar(usuario, id, 'declinar');
    if (resultado.ok) return resultado.valor;
    throw aErrorConexion(resultado.error);
  }
}
