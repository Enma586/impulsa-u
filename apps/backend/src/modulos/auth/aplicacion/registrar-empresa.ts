import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { auth } from '@impulsau/contracts';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { LIMITADOR_TASA } from '../../../compartido/dominio/limite-tasa.js';
import type { LimitadorTasa } from '../../../compartido/dominio/limite-tasa.js';
import type { ErrorRegistrar } from '../dominio/errores.js';
import { PROVEEDOR_IDENTIDAD } from '../puertos/proveedor-identidad.js';
import type { ProveedorIdentidad } from '../puertos/proveedor-identidad.js';
import { REPOSITORIO_USUARIOS } from '../puertos/repositorio-usuarios.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';

const INTENTOS_POR_CORREO = 3;
const UNA_HORA_MS = 3_600_000;

@Injectable()
export class RegistrarEmpresa {
  constructor(
    @Inject(PROVEEDOR_IDENTIDAD) private readonly identidad: ProveedorIdentidad,
    @Inject(REPOSITORIO_USUARIOS) private readonly usuarios: RepositorioUsuarios,
    @Inject(LIMITADOR_TASA) private readonly limitador: LimitadorTasa,
  ) {}

  /** CU-02. La respuesta es idéntica para un correo nuevo y para uno ya registrado. */
  async ejecutar(
    entrada: auth.RegistrarEmpresaEntrada,
  ): Promise<Resultado<auth.RegistrarTalentoRespuesta, ErrorRegistrar>> {
    const huellaCorreo = createHash('sha256').update(entrada.correo).digest('hex');
    const limite = await this.limitador.intentar(
      `registro:correo:${huellaCorreo}`,
      INTENTOS_POR_CORREO,
      UNA_HORA_MS,
    );
    if (!limite.permitido) {
      return fallo({ tipo: 'demasiados_intentos', reintentarEnMs: limite.reintentarEnMs });
    }

    const cuenta = await this.identidad.crearCuenta({
      correo: entrada.correo,
      contrasena: entrada.contrasena,
    });
    if (!cuenta.ok) return fallo({ tipo: 'proveedor_no_disponible' });

    const respuesta = ok({ estado: 'revisa_tu_correo' as const });
    if (cuenta.valor.tipo === 'ya_registrada') return respuesta;

    try {
      await this.usuarios.crearEmpresa({
        id: cuenta.valor.id,
        correo: entrada.correo,
        nombreComercial: entrada.nombreComercial,
        esAgencia: entrada.esAgencia,
        clienteDeclarado: entrada.esAgencia ? (entrada.clienteDeclarado ?? null) : null,
      });
    } catch (error: unknown) {
      await this.identidad.eliminarCuenta(cuenta.valor.id);
      throw error;
    }
    return respuesta;
  }
}
