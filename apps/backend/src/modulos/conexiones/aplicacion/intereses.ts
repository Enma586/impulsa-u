import { Inject, Injectable } from '@nestjs/common';
import type { conexiones } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { NO_ENCONTRADO, PROHIBIDO } from '../../../compartido/dominio/errores.js';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { EMISOR_TIEMPO_REAL } from '../../../compartido/dominio/tiempo-real.js';
import type { EmisorTiempoReal } from '../../../compartido/dominio/tiempo-real.js';
import type { ErrorConexion } from '../dominio/errores.js';
import { REPOSITORIO_INTERESES } from '../puertos/puertos.js';
import type { ParInteres, RepositorioIntereses } from '../puertos/puertos.js';

/** Quién es el origen del interés según su rol; `null` si el rol no puede mostrar interés. */
function armarPar(
  usuario: UsuarioAutenticado,
  direccion: conexiones.DireccionInteres,
  destinoId: string,
): ParInteres | null {
  switch (direccion) {
    case 'empresa_a_talento':
      return usuario.rol === 'empresa'
        ? { empresaId: usuario.id, talentoId: destinoId, direccion }
        : null;
    case 'talento_a_empresa':
      return usuario.rol === 'talento'
        ? { empresaId: destinoId, talentoId: usuario.id, direccion }
        : null;
  }
}

function avisarConversacion(
  emisor: EmisorTiempoReal,
  interes: conexiones.Interes,
  conversacionId: string,
): void {
  const evento = { interesId: interes.id, conversacionId };
  emisor.aUsuario(interes.empresa.id, 'interest:accepted', evento);
  emisor.aUsuario(interes.talento.id, 'interest:accepted', evento);
}

@Injectable()
export class MostrarInteres {
  constructor(
    @Inject(REPOSITORIO_INTERESES) private readonly intereses: RepositorioIntereses,
    @Inject(EMISOR_TIEMPO_REAL) private readonly emisor: EmisorTiempoReal,
  ) {}

  /** CU-29 (empresa → talento) y CU-30 (talento → empresa). Idempotente. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    direccion: conexiones.DireccionInteres,
    destinoId: string,
    entrada: conexiones.MostrarInteresEntrada,
  ): Promise<Resultado<conexiones.Interes, ErrorConexion>> {
    const par = armarPar(usuario, direccion, destinoId);
    if (!par) return fallo(PROHIBIDO);

    const resultado = await this.intereses.mostrar(par, entrada.mensaje ?? null, new Date());
    switch (resultado.tipo) {
      case 'ok':
        if (resultado.abrioConversacion && resultado.interes.conversacionId) {
          avisarConversacion(this.emisor, resultado.interes, resultado.interes.conversacionId);
        }
        return ok(resultado.interes);
      case 'destino_no_encontrado':
        return fallo(NO_ENCONTRADO);
      case 'empresa_no_verificada':
        return fallo({ tipo: 'empresa_no_verificada' });
      case 'talento_no_disponible':
        return fallo({ tipo: 'talento_no_disponible' });
      case 'usuario_bloqueado':
        return fallo({ tipo: 'usuario_bloqueado' });
      case 'ya_declinado':
        return fallo({ tipo: 'conflicto', mensaje: 'Este interés ya fue respondido' });
    }
  }
}

@Injectable()
export class RetirarInteres {
  constructor(@Inject(REPOSITORIO_INTERESES) private readonly intereses: RepositorioIntereses) {}

  /** Retira un interés propio que sigue pendiente. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    direccion: conexiones.DireccionInteres,
    destinoId: string,
  ): Promise<Resultado<true, ErrorConexion>> {
    const par = armarPar(usuario, direccion, destinoId);
    if (!par) return fallo(PROHIBIDO);
    const resultado = await this.intereses.retirar(par);
    return resultado === 'ok'
      ? ok(true)
      : fallo({
          tipo: 'conflicto',
          mensaje: 'Este interés ya fue respondido y no se puede retirar',
        });
  }
}

@Injectable()
export class ResponderInteres {
  constructor(
    @Inject(REPOSITORIO_INTERESES) private readonly intereses: RepositorioIntereses,
    @Inject(EMISOR_TIEMPO_REAL) private readonly emisor: EmisorTiempoReal,
  ) {}

  /** CU-31. Aceptar abre la conversación única del par y avisa a ambos por socket. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    interesId: string,
    decision: 'aceptar' | 'declinar',
  ): Promise<Resultado<conexiones.Interes, ErrorConexion>> {
    if (usuario.rol !== 'empresa' && usuario.rol !== 'talento') return fallo(PROHIBIDO);

    const resultado = await this.intereses.responder(
      interesId,
      usuario.id,
      decision === 'aceptar',
      new Date(),
    );
    switch (resultado.tipo) {
      case 'ok':
        if (resultado.nuevo && decision === 'aceptar' && resultado.interes.conversacionId) {
          avisarConversacion(this.emisor, resultado.interes, resultado.interes.conversacionId);
        }
        return ok(resultado.interes);
      case 'no_encontrado':
        return fallo(NO_ENCONTRADO);
      case 'prohibido':
        return fallo(PROHIBIDO);
      case 'conflicto':
        return fallo({ tipo: 'conflicto', mensaje: 'Este interés ya fue respondido' });
      case 'usuario_bloqueado':
        return fallo({ tipo: 'usuario_bloqueado' });
    }
  }
}

@Injectable()
export class ListarIntereses {
  constructor(@Inject(REPOSITORIO_INTERESES) private readonly intereses: RepositorioIntereses) {}

  /** Intereses que recibí o que envié, del más reciente al más antiguo. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    consulta: conexiones.ConsultaIntereses,
  ): Promise<Resultado<conexiones.PaginaIntereses, ErrorConexion>> {
    if (usuario.rol !== 'empresa' && usuario.rol !== 'talento') return fallo(PROHIBIDO);
    return ok(await this.intereses.listar(usuario.id, usuario.rol, consulta));
  }
}
