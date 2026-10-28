import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { archivos } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { NO_ENCONTRADO } from '../../../compartido/dominio/errores.js';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { ALMACEN_ARCHIVOS, REPOSITORIO_ARCHIVOS } from '../puertos/puertos.js';
import type { AlmacenArchivos, RepositorioArchivos } from '../puertos/puertos.js';

export type ErrorArchivos =
  | { tipo: 'no_encontrado' }
  | { tipo: 'limite_almacenamiento' }
  | { tipo: 'archivo_no_subido' }
  | { tipo: 'almacen_no_disponible' };

const EXTENSION: Record<(typeof archivos.TIPOS_IMAGEN)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class SolicitarSubida {
  constructor(
    @Inject(REPOSITORIO_ARCHIVOS) private readonly repositorio: RepositorioArchivos,
    @Inject(ALMACEN_ARCHIVOS) private readonly almacen: AlmacenArchivos,
  ) {}

  /** CU-17: reserva el archivo y entrega la URL de subida directa. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    entrada: archivos.SolicitarSubidaEntrada,
  ): Promise<Resultado<archivos.SubidaSolicitada, ErrorArchivos>> {
    const clave = `${usuario.id}/${randomUUID()}.${EXTENSION[entrada.tipoMime]}`;
    const reserva = await this.repositorio.reservar({
      propietarioId: usuario.id,
      clave,
      proposito: entrada.proposito,
      tipoMime: entrada.tipoMime,
      tamanoBytes: entrada.tamanoBytes,
    });
    if (reserva.tipo === 'limite') return fallo({ tipo: 'limite_almacenamiento' });

    const url = await this.almacen.firmarSubida(clave);
    if (!url.ok) return fallo({ tipo: 'almacen_no_disponible' });
    return ok({ archivoId: reserva.id, urlSubida: url.valor });
  }
}

@Injectable()
export class ConfirmarArchivo {
  constructor(
    @Inject(REPOSITORIO_ARCHIVOS) private readonly repositorio: RepositorioArchivos,
    @Inject(ALMACEN_ARCHIVOS) private readonly almacen: AlmacenArchivos,
  ) {}

  /** Comprueba que el objeto llegó al almacenamiento antes de dejarlo listo para usarse. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    id: string,
  ): Promise<Resultado<archivos.ArchivoConfirmado, ErrorArchivos>> {
    const archivo = await this.repositorio.buscarDelPropietario(id, usuario.id);
    if (!archivo) return fallo(NO_ENCONTRADO);
    if (archivo.estado !== 'pendiente') {
      return ok({ id: archivo.id, url: this.almacen.urlPublica(archivo.clave) });
    }

    const tamano = await this.almacen.tamanoSubido(archivo.clave);
    if (!tamano.ok) return fallo({ tipo: 'almacen_no_disponible' });
    if (tamano.valor === null || tamano.valor > archivos.TAMANO_MAXIMO_IMAGEN_BYTES) {
      return fallo({ tipo: 'archivo_no_subido' });
    }

    const marca = await this.repositorio.marcarListo(archivo, usuario.id);
    if (marca === 'limite') return fallo({ tipo: 'limite_almacenamiento' });
    return ok({ id: archivo.id, url: this.almacen.urlPublica(archivo.clave) });
  }
}
