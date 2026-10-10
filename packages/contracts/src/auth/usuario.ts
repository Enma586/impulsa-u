import { z } from 'zod';

export const Rol = z.enum(['talento', 'empresa', 'docente', 'admin']);
export type Rol = z.infer<typeof Rol>;

export const EstadoUsuario = z.enum([
  'pendiente_verificacion',
  'activo',
  'suspendido',
  'eliminado',
]);
export type EstadoUsuario = z.infer<typeof EstadoUsuario>;
