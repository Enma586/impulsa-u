import type { Resultado } from '../../../compartido/dominio/resultado.js';

export const REPOSITORIO_ARCHIVOS = Symbol('RepositorioArchivos');
export const ALMACEN_ARCHIVOS = Symbol('AlmacenArchivos');

export interface ArchivoReservado {
  id: string;
  clave: string;
  tamanoBytes: number;
  estado: 'pendiente' | 'listo' | 'procesado' | 'rechazado';
}

export interface NuevaReserva {
  propietarioId: string;
  clave: string;
  proposito: 'imagen_proyecto' | 'avatar';
  tipoMime: string;
  tamanoBytes: number;
}

export interface RepositorioArchivos {
  /** Reserva el archivo; `limite` si el talento no tiene cupo de almacenamiento. */
  reservar(reserva: NuevaReserva): Promise<{ tipo: 'ok'; id: string } | { tipo: 'limite' }>;
  buscarDelPropietario(id: string, propietarioId: string): Promise<ArchivoReservado | null>;
  /** Pasa a `listo` y suma el tamaño al almacenamiento usado del talento. */
  marcarListo(archivo: ArchivoReservado, propietarioId: string): Promise<'ok' | 'limite'>;
}

/** Almacenamiento de objetos con subida directa desde el navegador (hoy Supabase Storage). */
export interface AlmacenArchivos {
  /** URL temporal a la que el navegador hace `PUT` con el archivo. */
  firmarSubida(clave: string): Promise<Resultado<string, 'no_disponible'>>;
  /** Tamaño del objeto subido, o `null` si todavía no existe. */
  tamanoSubido(clave: string): Promise<Resultado<number | null, 'no_disponible'>>;
  urlPublica(clave: string): string;
}
