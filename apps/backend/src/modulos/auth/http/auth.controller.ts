import { Body, Controller, Get, HttpCode, Inject, Post, UseInterceptors } from '@nestjs/common';
import { auth } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { ErrorHttpApi } from '../../../compartido/http/error-api.js';
import { IdempotenciaInterceptor } from '../../../compartido/http/idempotencia.interceptor.js';
import { LimiteTasa } from '../../../compartido/http/limite-tasa.guard.js';
import { Publica } from '../../../compartido/http/publica.js';
import { TokenActual } from '../../../compartido/http/token-actual.decorator.js';
import { UsuarioActual } from '../../../compartido/http/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../../compartido/http/zod-validation.pipe.js';
import { RegistrarEmpresa } from '../aplicacion/registrar-empresa.js';
import { RegistrarTalento } from '../aplicacion/registrar-talento.js';
import {
  CerrarSesion,
  IniciarSesion,
  ObtenerSesionActual,
  RenovarSesion,
} from '../aplicacion/sesion.js';
import type { ErrorRegistrar, ErrorSesion } from '../dominio/errores.js';

function aErrorRegistro(error: ErrorRegistrar): ErrorHttpApi {
  switch (error.tipo) {
    case 'menor_de_edad':
      return new ErrorHttpApi(422, 'menor_de_edad', 'Debes tener 18 años o más');
    case 'demasiados_intentos':
      return esperar(error.reintentarEnMs);
    case 'proveedor_no_disponible':
      return new ErrorHttpApi(
        503,
        'error_interno',
        'No pudimos crear tu cuenta. Intenta más tarde',
      );
  }
}

function aErrorSesion(error: ErrorSesion): ErrorHttpApi {
  switch (error.tipo) {
    case 'credenciales_invalidas':
      return new ErrorHttpApi(401, 'credenciales_invalidas', 'Correo o contraseña incorrectos');
    case 'correo_no_verificado':
      return new ErrorHttpApi(
        403,
        'correo_no_verificado',
        'Confirma tu correo con el enlace que te enviamos',
      );
    case 'sin_perfil':
      return new ErrorHttpApi(403, 'perfil_incompleto', 'Completa tu registro');
    case 'demasiados_intentos':
      return esperar(error.reintentarEnMs);
    case 'proveedor_no_disponible':
      return new ErrorHttpApi(
        503,
        'error_interno',
        'No pudimos procesar tu sesión. Intenta más tarde',
      );
  }
}

function esperar(reintentarEnMs: number): ErrorHttpApi {
  return new ErrorHttpApi(
    429,
    'demasiadas_peticiones',
    `Demasiados intentos. Vuelve a intentarlo en ${String(Math.ceil(reintentarEnMs / 1000))} segundos`,
  );
}

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(RegistrarTalento) private readonly registrarTalento: RegistrarTalento,
    @Inject(RegistrarEmpresa) private readonly registrarEmpresa: RegistrarEmpresa,
    @Inject(IniciarSesion) private readonly iniciarSesion: IniciarSesion,
    @Inject(RenovarSesion) private readonly renovarSesion: RenovarSesion,
    @Inject(CerrarSesion) private readonly cerrarSesion: CerrarSesion,
    @Inject(ObtenerSesionActual) private readonly sesionActual: ObtenerSesionActual,
  ) {}

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
    throw aErrorRegistro(resultado.error);
  }

  @Publica()
  @LimiteTasa({ maximo: 10, ventanaSegundos: 600 })
  @UseInterceptors(IdempotenciaInterceptor)
  @HttpCode(202)
  @Post('register/empresa')
  async registrarComoEmpresa(
    @Body(new ZodValidationPipe(auth.RegistrarEmpresaEntrada))
    entrada: auth.RegistrarEmpresaEntrada,
  ): Promise<auth.RegistrarTalentoRespuesta> {
    const resultado = await this.registrarEmpresa.ejecutar(entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorRegistro(resultado.error);
  }

  @Publica()
  @LimiteTasa({ maximo: 30, ventanaSegundos: 600 })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(auth.IniciarSesionEntrada)) entrada: auth.IniciarSesionEntrada,
  ): Promise<auth.Sesion> {
    const resultado = await this.iniciarSesion.ejecutar(entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorSesion(resultado.error);
  }

  @Publica()
  @LimiteTasa({ maximo: 60, ventanaSegundos: 600 })
  @HttpCode(200)
  @Post('refresh')
  async refrescar(
    @Body(new ZodValidationPipe(auth.RenovarSesionEntrada)) entrada: auth.RenovarSesionEntrada,
  ): Promise<auth.Sesion> {
    const resultado = await this.renovarSesion.ejecutar(entrada);
    if (resultado.ok) return resultado.valor;
    throw aErrorSesion(resultado.error);
  }

  @HttpCode(204)
  @Post('logout')
  async salir(
    @TokenActual() token: string,
    @Body(new ZodValidationPipe(auth.CerrarSesionEntrada)) entrada: auth.CerrarSesionEntrada,
  ): Promise<void> {
    const resultado = await this.cerrarSesion.ejecutar(token, entrada);
    if (!resultado.ok) throw aErrorSesion(resultado.error);
  }

  @Get('me')
  async yo(@UsuarioActual() usuario: UsuarioAutenticado): Promise<auth.UsuarioSesion> {
    const resumen = await this.sesionActual.ejecutar(usuario.id);
    if (!resumen) throw new ErrorHttpApi(403, 'perfil_incompleto', 'Completa tu registro');
    return resumen;
  }
}
