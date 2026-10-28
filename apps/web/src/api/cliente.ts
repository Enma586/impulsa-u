import { auth, ErrorApi } from '@impulsau/contracts';
import type { DetalleError } from '@impulsau/contracts';
import type { z } from 'zod';
import { entorno } from '../entorno';
import { almacenSesion } from '../sesion/almacen';

type CodigoError = ErrorApi['code'] | 'red' | 'respuesta_invalida';

/** Fallo de una llamada a la API; los errores esperados llevan el `code` del contrato. */
export class ErrorDeApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: CodigoError,
    mensaje: string,
    readonly detalles: readonly DetalleError[] = [],
  ) {
    super(mensaje);
  }
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
  /** `Idempotency-Key` de las creaciones; el mismo valor al reintentar el mismo envío. */
  llave?: string;
  /** Rutas públicas (login, refresh): no llevan token ni intentan renovarlo. */
  sinSesion?: boolean;
}

const MARGEN_RENOVACION_MS = 30_000;
let renovacion: Promise<string | null> | null = null;

async function llamar(ruta: string, opciones: Opciones, token: string | null): Promise<Response> {
  const encabezados: Record<string, string> = {};
  if (opciones.cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';
  if (opciones.llave) encabezados['Idempotency-Key'] = opciones.llave;
  if (token) encabezados['Authorization'] = `Bearer ${token}`;
  try {
    return await fetch(`${entorno.VITE_API_URL}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: encabezados,
      ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
    });
  } catch {
    throw new ErrorDeApi(0, 'red', 'No pudimos conectar con el servidor');
  }
}

/** Renueva la sesión una sola vez aunque varias llamadas lo pidan a la vez. */
function renovar(): Promise<string | null> {
  renovacion ??= (async () => {
    const actual = almacenSesion.obtener();
    if (!actual) return null;
    try {
      const respuesta = await llamar(
        '/auth/refresh',
        { metodo: 'POST', cuerpo: { refreshToken: actual.refreshToken } },
        null,
      );
      const sesion = auth.Sesion.safeParse(await respuesta.json().catch(() => null));
      if (!respuesta.ok || !sesion.success) {
        almacenSesion.limpiar();
        return null;
      }
      almacenSesion.guardar(sesion.data);
      return sesion.data.accessToken;
    } catch {
      return null;
    } finally {
      renovacion = null;
    }
  })();
  return renovacion;
}

async function tokenVigente(): Promise<string | null> {
  const actual = almacenSesion.obtener();
  if (!actual) return null;
  return actual.expiraEn * 1000 - Date.now() > MARGEN_RENOVACION_MS
    ? actual.accessToken
    : renovar();
}

async function aError(respuesta: Response): Promise<ErrorDeApi> {
  const cuerpo = ErrorApi.safeParse(await respuesta.json().catch(() => null));
  return cuerpo.success
    ? new ErrorDeApi(respuesta.status, cuerpo.data.code, cuerpo.data.message, cuerpo.data.details)
    : new ErrorDeApi(respuesta.status, 'error_interno', 'Algo salió mal. Inténtalo de nuevo');
}

/**
 * Llama a la API y valida la respuesta con el esquema del contrato. Si el token venció intenta
 * renovarlo una vez; si no se puede, cierra la sesión local.
 */
export async function pedir<S extends z.ZodType>(
  ruta: string,
  esquema: S,
  opciones: Opciones = {},
): Promise<z.output<S>> {
  let respuesta = await llamar(ruta, opciones, opciones.sinSesion ? null : await tokenVigente());
  if (respuesta.status === 401 && !opciones.sinSesion) {
    const nuevo = await renovar();
    if (nuevo) respuesta = await llamar(ruta, opciones, nuevo);
    else almacenSesion.limpiar();
  }
  if (!respuesta.ok) throw await aError(respuesta);

  const cuerpo: unknown =
    respuesta.status === 204 ? undefined : await respuesta.json().catch(() => null);
  const validado = esquema.safeParse(cuerpo);
  if (!validado.success) {
    throw new ErrorDeApi(
      respuesta.status,
      'respuesta_invalida',
      'Recibimos una respuesta inesperada',
    );
  }
  return validado.data;
}

/** Texto para mostrar al usuario cuando una consulta o un envío falla. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorDeApi) return error.message;
  return 'Algo salió mal. Inténtalo de nuevo';
}
