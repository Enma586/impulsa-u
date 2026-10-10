export type ErrorRegistrar =
  | { tipo: 'menor_de_edad' }
  | { tipo: 'demasiados_intentos'; reintentarEnMs: number }
  | { tipo: 'proveedor_no_disponible' };
