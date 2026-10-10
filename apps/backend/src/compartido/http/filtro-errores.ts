import { Catch, HttpException, Inject, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { ErrorApi } from '@impulsau/contracts';
import type { FastifyReply } from 'fastify';
import { ErrorHttpApi } from './error-api.js';

function codigoPorEstado(estado: number): ErrorApi['code'] {
  switch (estado) {
    case 400:
    case 422:
      return 'validacion';
    case 401:
      return 'no_autenticado';
    case 403:
      return 'prohibido';
    case 404:
      return 'no_encontrado';
    case 409:
      return 'conflicto';
    case 429:
      return 'demasiadas_peticiones';
    default:
      return 'error_interno';
  }
}

/** Convierte cualquier excepción al formato `{ code, message, details? }` del contrato. */
@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly registro = new Logger(FiltroErrores.name);

  constructor(@Inject(HttpAdapterHost) private readonly anfitrion: HttpAdapterHost) {}

  catch(excepcion: unknown, contexto: ArgumentsHost): void {
    const respuesta = contexto.switchToHttp().getResponse<FastifyReply>();
    const { estado, error } = this.aCuerpo(excepcion);
    this.anfitrion.httpAdapter.reply(respuesta, error, estado);
  }

  private aCuerpo(excepcion: unknown): { estado: number; error: ErrorApi } {
    if (excepcion instanceof ErrorHttpApi) {
      const error: ErrorApi = { code: excepcion.codigo, message: excepcion.message };
      if (excepcion.detalles) error.details = excepcion.detalles;
      return { estado: excepcion.getStatus(), error };
    }
    if (excepcion instanceof HttpException && excepcion.getStatus() < 500) {
      const estado = excepcion.getStatus();
      return { estado, error: { code: codigoPorEstado(estado), message: excepcion.message } };
    }
    this.registro.error(excepcion);
    return {
      estado: 500,
      error: { code: 'error_interno', message: 'Ocurrió un error inesperado' },
    };
  }
}
