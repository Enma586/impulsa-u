import { HttpException } from '@nestjs/common';
import type { DetalleError, ErrorApi } from '@impulsau/contracts';

/** Error esperado de la API, con el `code` del contrato y el estado HTTP que le corresponde. */
export class ErrorHttpApi extends HttpException {
  constructor(
    estado: number,
    readonly codigo: ErrorApi['code'],
    mensaje: string,
    readonly detalles?: DetalleError[],
  ) {
    super(mensaje, estado);
  }
}
