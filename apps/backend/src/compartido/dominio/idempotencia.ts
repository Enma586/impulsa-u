export const ALMACEN_IDEMPOTENCIA = Symbol('AlmacenIdempotencia');

export type InicioIdempotencia =
  | { tipo: 'nueva' }
  | { tipo: 'en_curso' }
  | { tipo: 'huella_distinta' }
  | { tipo: 'repetida'; cuerpo: unknown };

/** Guarda el resultado de las creaciones para que repetir la misma llave no repita el efecto. */
export interface AlmacenIdempotencia {
  iniciar(llave: string, huella: string): Promise<InicioIdempotencia>;
  completar(llave: string, huella: string, cuerpo: unknown): Promise<void>;
  liberar(llave: string): Promise<void>;
}
