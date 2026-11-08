import { z } from 'zod';
import type { BuscadorUsuario, VerificadorToken } from '../../dominio/autenticacion.js';
import { fallo, ok } from '../../dominio/resultado.js';
import type { Resultado } from '../../dominio/resultado.js';
import type { DatosSocket } from './tipos.js';

const AuthHandshake = z.object({ token: z.string().min(1) });

export type ErrorHandshake = 'no_autenticado' | 'cuenta_suspendida' | 'perfil_incompleto';

/**
 * Valida el JWT que el cliente manda en `handshake.auth.token`, con las mismas reglas del guard HTTP:
 * token válido, perfil existente y cuenta no suspendida ni eliminada.
 */
export async function autenticarSocket(
  verificador: VerificadorToken,
  usuarios: BuscadorUsuario,
  auth: unknown,
): Promise<Resultado<DatosSocket, ErrorHandshake>> {
  const entrada = AuthHandshake.safeParse(auth);
  if (!entrada.success) return fallo('no_autenticado');

  const verificacion = await verificador.verificar(entrada.data.token);
  if (!verificacion.ok) return fallo('no_autenticado');

  const usuario = await usuarios.buscarPorId(verificacion.valor.usuarioId);
  if (!usuario) return fallo('perfil_incompleto');

  switch (usuario.estado) {
    case 'pendiente_verificacion':
    case 'activo':
      return ok({
        usuarioId: usuario.id,
        sesionId: verificacion.valor.sesionId,
        rol: usuario.rol,
      });
    case 'suspendido':
      return fallo('cuenta_suspendida');
    case 'eliminado':
      return fallo('perfil_incompleto');
  }
}
