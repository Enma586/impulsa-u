export const RELOJ = Symbol('Reloj');

export interface Reloj {
  ahora(): Date;
}
