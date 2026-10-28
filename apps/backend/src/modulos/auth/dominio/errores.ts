export type ErrorRegistrar =
  | { tipo: 'menor_de_edad' }
  | { tipo: 'demasiados_intentos'; reintentarEnMs: number }
  | { tipo: 'proveedor_no_disponible' };

export type ErrorSesion =
  | { tipo: 'credenciales_invalidas' }
  | { tipo: 'correo_no_verificado' }
  | { tipo: 'sin_perfil' }
  | { tipo: 'demasiados_intentos'; reintentarEnMs: number }
  | { tipo: 'proveedor_no_disponible' };
