import { Body, Controller, HttpCode, Inject, Param, Post, UseInterceptors } from '@nestjs/common';
import { archivos } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { ErrorHttpApi } from '../../../compartido/http/error-api.js';
import { IdempotenciaInterceptor } from '../../../compartido/http/idempotencia.interceptor.js';
import { ParamUuid } from '../../../compartido/http/param-uuid.js';
import { UsuarioActual } from '../../../compartido/http/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../../compartido/http/zod-validation.pipe.js';
import { ConfirmarArchivo, SolicitarSubida } from '../aplicacion/archivos.js';
import type { ErrorArchivos } from '../aplicacion/archivos.js';

function aErrorHttp(error: ErrorArchivos): ErrorHttpApi {
  switch (error.tipo) {
    case 'no_encontrado':
      return new ErrorHttpApi(404, 'no_encontrado', 'No encontramos ese archivo');
    case 'limite_almacenamiento':
      return new ErrorHttpApi(422, 'limite_almacenamiento', 'No tienes espacio para más archivos');
    case 'archivo_no_subido':
      return new ErrorHttpApi(422, 'archivo_no_subido', 'El archivo no llegó al almacenamiento');
    case 'almacen_no_disponible':
      return new ErrorHttpApi(503, 'error_interno', 'El almacenamiento no está disponible');
  }
}

@Controller('archivos')
export class ArchivosController {
  constructor(
    @Inject(SolicitarSubida) private readonly solicitarSubida: SolicitarSubida,
    @Inject(ConfirmarArchivo) private readonly confirmarArchivo: ConfirmarArchivo,
  ) {}

  @UseInterceptors(IdempotenciaInterceptor)
  @HttpCode(201)
  @Post('subidas')
  async solicitar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(archivos.SolicitarSubidaEntrada))
    entrada: archivos.SolicitarSubidaEntrada,
  ): Promise<archivos.SubidaSolicitada> {
    const resultado = await this.solicitarSubida.ejecutar(usuario, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }

  @HttpCode(200)
  @Post(':id/confirmar')
  async confirmar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<archivos.ArchivoConfirmado> {
    const resultado = await this.confirmarArchivo.ejecutar(usuario, id);
    if (resultado.ok) return resultado.valor;
    throw aErrorHttp(resultado.error);
  }
}
