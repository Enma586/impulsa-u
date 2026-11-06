import { z } from 'zod';
import { crearEsquemaError } from '../comun/index.js';
import { Contrasena, Correo } from './rest.js';
import { EstadoUsuario, Rol } from './usuario.js';

/** `POST /auth/login` (CU-05). */
export const IniciarSesionEntrada = z.object({
  correo: Correo,
  contrasena: z.string().min(1).max(72),
});
export type IniciarSesionEntrada = z.infer<typeof IniciarSesionEntrada>;

export const UsuarioSesion = z.object({
  id: z.uuid(),
  correo: z.string(),
  rol: Rol,
  estado: EstadoUsuario,
  nombre: z.string(),
});
export type UsuarioSesion = z.infer<typeof UsuarioSesion>;

/** Respuesta de `login` y `refresh`. `expiraEn` es un instante Unix en segundos. */
export const Sesion = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiraEn: z.number().int(),
  usuario: UsuarioSesion,
});
export type Sesion = z.infer<typeof Sesion>;

/** `POST /auth/refresh` (CU-07). */
export const RenovarSesionEntrada = z.object({ refreshToken: z.string().min(1) });
export type RenovarSesionEntrada = z.infer<typeof RenovarSesionEntrada>;

/** `POST /auth/logout` (CU-06): solo este dispositivo o todos. */
export const CerrarSesionEntrada = z.object({ alcance: z.enum(['local', 'global']) });
export type CerrarSesionEntrada = z.infer<typeof CerrarSesionEntrada>;

/** `credenciales_invalidas` → 401; `correo_no_verificado` → 403. */
export const ErrorSesion = crearEsquemaError([
  'validacion',
  'credenciales_invalidas',
  'correo_no_verificado',
  'no_autenticado',
  'demasiadas_peticiones',
  'error_interno',
]);
export type ErrorSesion = z.infer<typeof ErrorSesion>;

/** `POST /auth/register/empresa` (CU-02). */
export const RegistrarEmpresaEntrada = z
  .object({
    nombreComercial: z.string().trim().min(2).max(120),
    correo: Correo,
    contrasena: Contrasena,
    esAgencia: z.boolean().default(false),
    clienteDeclarado: z.string().trim().min(2).max(120).optional(),
    aceptaTerminos: z.literal(true, { error: 'Debes aceptar los términos' }),
  })
  .refine((datos) => !datos.esAgencia || datos.clienteDeclarado !== undefined, {
    path: ['clienteDeclarado'],
    message: 'Indica para qué cliente reclutas',
  });
export type RegistrarEmpresaEntrada = z.infer<typeof RegistrarEmpresaEntrada>;
