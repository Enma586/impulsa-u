import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { vacantes } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { IdempotenciaInterceptor } from '../../../compartido/http/idempotencia.interceptor.js';
import { ParamUuid } from '../../../compartido/http/param-uuid.js';
import { aErrorHttp } from '../../../compartido/http/traducir-error.js';
import { UsuarioActual } from '../../../compartido/http/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../../compartido/http/zod-validation.pipe.js';
import {
  CambiarEstadoPostulacion,
  CambiarEstadoVacante,
  EditarVacante,
  ExplorarVacantes,
  MisPostulaciones,
  ObtenerVacante,
  PostulacionesDeVacante,
  Postularse,
  PublicarVacante,
} from '../aplicacion/vacantes.js';

@Controller()
export class VacantesController {
  constructor(
    @Inject(PublicarVacante) private readonly publicar: PublicarVacante,
    @Inject(EditarVacante) private readonly editar: EditarVacante,
    @Inject(CambiarEstadoVacante) private readonly cambiarEstado: CambiarEstadoVacante,
    @Inject(ObtenerVacante) private readonly obtener: ObtenerVacante,
    @Inject(ExplorarVacantes) private readonly explorar: ExplorarVacantes,
    @Inject(Postularse) private readonly postularse: Postularse,
    @Inject(MisPostulaciones) private readonly misPostulaciones: MisPostulaciones,
    @Inject(PostulacionesDeVacante) private readonly deVacante: PostulacionesDeVacante,
    @Inject(CambiarEstadoPostulacion) private readonly cambiarPostulacion: CambiarEstadoPostulacion,
  ) {}

  @HttpCode(201)
  @UseInterceptors(IdempotenciaInterceptor)
  @Post('vacantes')
  async crear(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(vacantes.PublicarVacanteEntrada))
    entrada: vacantes.PublicarVacanteEntrada,
  ): Promise<vacantes.VacanteDetalle> {
    const resultado = await this.publicar.ejecutar(usuario, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Get('vacantes')
  lista(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query(new ZodValidationPipe(vacantes.ConsultaVacantes)) consulta: vacantes.ConsultaVacantes,
  ): Promise<vacantes.PaginaVacantes> {
    return this.explorar.ejecutar(usuario, consulta);
  }

  @Get('vacantes/:id')
  async detalle(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<vacantes.VacanteDetalle> {
    const resultado = await this.obtener.ejecutar(usuario, id);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Put('vacantes/:id')
  async actualizar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
    @Body(new ZodValidationPipe(vacantes.EditarVacanteEntrada))
    entrada: vacantes.EditarVacanteEntrada,
  ): Promise<vacantes.VacanteDetalle> {
    const resultado = await this.editar.ejecutar(usuario, id, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Put('vacantes/:id/estado')
  async estado(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
    @Body(new ZodValidationPipe(vacantes.CambiarEstadoVacanteEntrada))
    entrada: vacantes.CambiarEstadoVacanteEntrada,
  ): Promise<vacantes.VacanteDetalle> {
    const resultado = await this.cambiarEstado.ejecutar(usuario, id, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @HttpCode(201)
  @UseInterceptors(IdempotenciaInterceptor)
  @Post('vacantes/:id/postulaciones')
  async postular(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
    @Body(new ZodValidationPipe(vacantes.PostularseEntrada)) entrada: vacantes.PostularseEntrada,
  ): Promise<vacantes.Postulacion> {
    const resultado = await this.postularse.ejecutar(usuario, id, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Get('vacantes/:id/postulaciones')
  async recibidas(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<vacantes.PostulacionRecibida[]> {
    const resultado = await this.deVacante.ejecutar(usuario, id);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Get('postulaciones/mias')
  async mias(@UsuarioActual() usuario: UsuarioAutenticado): Promise<vacantes.Postulacion[]> {
    const resultado = await this.misPostulaciones.ejecutar(usuario);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Put('postulaciones/:id/estado')
  async cambiarEstadoPostulacion(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
    @Body(new ZodValidationPipe(vacantes.CambiarEstadoPostulacionEntrada))
    entrada: vacantes.CambiarEstadoPostulacionEntrada,
  ): Promise<vacantes.PostulacionRecibida> {
    const resultado = await this.cambiarPostulacion.ejecutar(usuario, id, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }
}
