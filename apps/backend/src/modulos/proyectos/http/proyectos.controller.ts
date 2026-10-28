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
  UseInterceptors,
} from '@nestjs/common';
import { proyectos } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { IdempotenciaInterceptor } from '../../../compartido/http/idempotencia.interceptor.js';
import { ParamUuid } from '../../../compartido/http/param-uuid.js';
import { aErrorHttp } from '../../../compartido/http/traducir-error.js';
import { UsuarioActual } from '../../../compartido/http/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../../compartido/http/zod-validation.pipe.js';
import {
  EditarProyecto,
  EliminarProyecto,
  ExplorarProyectos,
  ObtenerProyecto,
  PublicarProyecto,
} from '../aplicacion/proyectos.js';

@Controller('proyectos')
export class ProyectosController {
  constructor(
    @Inject(PublicarProyecto) private readonly publicar: PublicarProyecto,
    @Inject(ObtenerProyecto) private readonly obtener: ObtenerProyecto,
    @Inject(ExplorarProyectos) private readonly explorar: ExplorarProyectos,
    @Inject(EditarProyecto) private readonly editar: EditarProyecto,
    @Inject(EliminarProyecto) private readonly eliminar: EliminarProyecto,
  ) {}

  @UseInterceptors(IdempotenciaInterceptor)
  @HttpCode(201)
  @Post()
  async crear(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(proyectos.PublicarProyectoEntrada))
    entrada: proyectos.PublicarProyectoEntrada,
  ): Promise<proyectos.ProyectoDetalle> {
    const resultado = await this.publicar.ejecutar(usuario, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Get()
  feed(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query(new ZodValidationPipe(proyectos.ConsultaFeed)) consulta: proyectos.ConsultaFeed,
  ): Promise<proyectos.PaginaProyectos> {
    return this.explorar.ejecutar(usuario, consulta);
  }

  @Get(':id')
  async detalle(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<proyectos.ProyectoDetalle> {
    const resultado = await this.obtener.ejecutar(usuario, id);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @Put(':id')
  async actualizar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
    @Body(new ZodValidationPipe(proyectos.EditarProyectoEntrada))
    entrada: proyectos.EditarProyectoEntrada,
  ): Promise<proyectos.ProyectoDetalle> {
    const resultado = await this.editar.ejecutar(usuario, id, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @HttpCode(204)
  @Delete(':id')
  async borrar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<void> {
    const resultado = await this.eliminar.ejecutar(usuario, id);
    if (!resultado.ok) throw aErrorHttp(resultado.error);
  }
}
