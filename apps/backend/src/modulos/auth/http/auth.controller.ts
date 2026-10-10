import { Body, Controller, HttpCode, Inject, Post, UseInterceptors } from '@nestjs/common';
import { auth } from '@impulsau/contracts';
import { ErrorHttpApi } from '../../../compartido/http/error-api.js';
import { IdempotenciaInterceptor } from '../../../compartido/http/idempotencia.interceptor.js';
import { LimiteTasa } from '../../../compartido/http/limite-tasa.guard.js';
import { Publica } from '../../../compartido/http/publica.js';
import { ZodValidationPipe } from '../../../compartido/http/zod-validation.pipe.js';
import { RegistrarTalento } from '../aplicacion/registrar-talento.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(RegistrarTalento) private readonly registrarTalento: RegistrarTalento) {}

  @Publica()
  @LimiteTasa({ maximo: 10, ventanaSegundos: 600 })
  @UseInterceptors(IdempotenciaInterceptor)
  @HttpCode(202)
  @Post('register')
  async registrar(
    @Body(new ZodValidationPipe(auth.RegistrarTalentoEntrada))
    entrada: auth.RegistrarTalentoEntrada,
  ): Promise<auth.RegistrarTalentoRespuesta> {
    const resultado = await this.registrarTalento.ejecutar(entrada);
    if (resultado.ok) return resultado.valor;

    const { error } = resultado;
    switch (error.tipo) {
      case 'menor_de_edad':
        throw new ErrorHttpApi(422, 'menor_de_edad', 'Debes tener 18 años o más');
      case 'demasiados_intentos':
        throw new ErrorHttpApi(
          429,
          'demasiadas_peticiones',
          `Demasiados intentos. Vuelve a intentarlo en ${String(Math.ceil(error.reintentarEnMs / 1000))} segundos`,
        );
      case 'proveedor_no_disponible':
        throw new ErrorHttpApi(
          503,
          'error_interno',
          'No pudimos crear tu cuenta. Intenta más tarde',
        );
    }
  }
}
