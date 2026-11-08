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
import { mensajeria } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { ErrorHttpApi } from '../../../compartido/http/error-api.js';
import { ParamUuid } from '../../../compartido/http/param-uuid.js';
import { aErrorHttp } from '../../../compartido/http/traducir-error.js';
import { UsuarioActual } from '../../../compartido/http/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../../compartido/http/zod-validation.pipe.js';
import {
  BloquearUsuario,
  DesbloquearUsuario,
  EnviarMensaje,
  ListarConversaciones,
  MarcarLeido,
  ObtenerHistorial,
} from '../aplicacion/mensajes.js';
import { comoActor } from '../dominio/actor.js';
import type { ActorMensajeria, ErrorMensajeriaCaso } from '../dominio/errores.js';

function aErrorMensajeria(error: ErrorMensajeriaCaso): ErrorHttpApi {
  switch (error.tipo) {
    case 'conversacion_bloqueada':
      return new ErrorHttpApi(
        403,
        'conversacion_bloqueada',
        'No puedes escribir en esta conversación',
      );
    case 'idempotencia_reutilizada':
      return new ErrorHttpApi(
        422,
        'idempotencia_reutilizada',
        'Ese identificador de mensaje ya se usó con otro contenido',
      );
    case 'demasiadas_peticiones':
      return new ErrorHttpApi(
        429,
        'demasiadas_peticiones',
        `Escribes muy rápido. Espera ${String(Math.ceil(error.reintentarEnMs / 1000))} segundos`,
      );
    case 'no_encontrado':
    case 'prohibido':
    case 'conflicto':
    case 'invalido':
      return aErrorHttp(error);
  }
}

function actorDe(usuario: UsuarioAutenticado): ActorMensajeria {
  const actor = comoActor(usuario);
  if (!actor) throw aErrorHttp({ tipo: 'prohibido' });
  return actor;
}

@Controller()
export class MensajeriaController {
  constructor(
    @Inject(ListarConversaciones) private readonly conversaciones: ListarConversaciones,
    @Inject(ObtenerHistorial) private readonly historial: ObtenerHistorial,
    @Inject(EnviarMensaje) private readonly enviar: EnviarMensaje,
    @Inject(MarcarLeido) private readonly leer: MarcarLeido,
    @Inject(BloquearUsuario) private readonly bloquear: BloquearUsuario,
    @Inject(DesbloquearUsuario) private readonly desbloquear: DesbloquearUsuario,
  ) {}

  @Get('conversaciones')
  async lista(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query(new ZodValidationPipe(mensajeria.ConsultaConversaciones))
    consulta: mensajeria.ConsultaConversaciones,
  ): Promise<mensajeria.PaginaConversaciones> {
    const resultado = await this.conversaciones.ejecutar(actorDe(usuario), consulta);
    if (resultado.ok) return resultado.valor;
    throw aErrorMensajeria(resultado.error);
  }

  /** CU-33. */
  @Get('conversaciones/:id/mensajes')
  async mensajes(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
    @Query(new ZodValidationPipe(mensajeria.ConsultaHistorial))
    consulta: mensajeria.ConsultaHistorial,
  ): Promise<mensajeria.PaginaMensajes> {
    const resultado = await this.historial.ejecutar(actorDe(usuario), id, consulta);
    if (resultado.ok) return resultado.valor;
    throw aErrorMensajeria(resultado.error);
  }

  /** Alternativa a `message:send` por si el socket no está disponible. Idempotente por `clientMessageId`. */
  @HttpCode(201)
  @Post('conversaciones/:id/mensajes')
  async enviarMensaje(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
    @Body(new ZodValidationPipe(mensajeria.EnviarMensajeEntrada))
    entrada: mensajeria.EnviarMensajeEntrada,
  ): Promise<mensajeria.Mensaje> {
    const resultado = await this.enviar.ejecutar(actorDe(usuario), id, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorMensajeria(resultado.error);
  }

  /** CU-34: marca como leído hasta `secuencia`. Solo avanza; responde hasta dónde quedó. */
  @Put('conversaciones/:id/lectura')
  async marcarLeido(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
    @Body(new ZodValidationPipe(mensajeria.MarcarLeidoEntrada))
    entrada: mensajeria.MarcarLeidoEntrada,
  ): Promise<mensajeria.EventoLecturaActualizada> {
    const resultado = await this.leer.ejecutar(actorDe(usuario), id, entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorMensajeria(resultado.error);
  }

  /** CU-35: bloquea a un usuario. Idempotente. */
  @HttpCode(204)
  @Put('usuarios/:id/bloqueo')
  async bloquearUsuario(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<void> {
    const resultado = await this.bloquear.ejecutar(actorDe(usuario), id);
    if (!resultado.ok) throw aErrorMensajeria(resultado.error);
  }

  @HttpCode(204)
  @Delete('usuarios/:id/bloqueo')
  async desbloquearUsuario(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParamUuid) id: string,
  ): Promise<void> {
    const resultado = await this.desbloquear.ejecutar(actorDe(usuario), id);
    if (!resultado.ok) throw aErrorMensajeria(resultado.error);
  }
}
