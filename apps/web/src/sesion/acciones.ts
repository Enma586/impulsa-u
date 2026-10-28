import { auth } from '@impulsau/contracts';
import { z } from 'zod';
import { pedir } from '../api/cliente';
import { clienteConsultas } from '../api/clienteConsultas';
import { almacenSesion } from './almacen';

export function iniciarSesion(entrada: auth.IniciarSesionEntrada): Promise<auth.Sesion> {
  return pedir('/auth/login', auth.Sesion, { metodo: 'POST', cuerpo: entrada, sinSesion: true });
}

/**
 * CU-06: revoca la sesión en el servidor (este dispositivo o todos) y limpia la local. Si el
 * servidor no responde la sesión local se cierra igual: el usuario no queda atrapado.
 */
export async function cerrarSesion(alcance: auth.CerrarSesionEntrada['alcance']): Promise<void> {
  try {
    await pedir('/auth/logout', z.undefined(), { metodo: 'POST', cuerpo: { alcance } });
  } catch {
    // El token puede haber vencido ya; lo importante es borrar la sesión del navegador.
  }
  almacenSesion.limpiar();
  clienteConsultas.clear();
}

export function registrarEmpresa(
  entrada: auth.RegistrarEmpresaEntrada,
  llave: string,
): Promise<auth.RegistrarTalentoRespuesta> {
  return pedir('/auth/register/empresa', auth.RegistrarTalentoRespuesta, {
    metodo: 'POST',
    cuerpo: entrada,
    llave,
    sinSesion: true,
  });
}
