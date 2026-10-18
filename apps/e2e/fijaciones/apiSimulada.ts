import type { auth } from '@impulsau/contracts';
import type { Page, Route } from '@playwright/test';

export type RespuestaSimulada =
  | { status: 202; cuerpo: auth.RegistrarTalentoRespuesta }
  | { status: 409 | 422 | 429 | 500; cuerpo: auth.ErrorRegistro };

export interface PeticionRegistro {
  llaveIdempotencia: string | undefined;
  cuerpo: unknown;
}

export interface ApiSimulada {
  /** Peticiones de registro que llegaron al doble, en orden. */
  peticiones: PeticionRegistro[];
}

export const exito: RespuestaSimulada = { status: 202, cuerpo: { estado: 'revisa_tu_correo' } };

export function error(
  status: 409 | 422 | 429 | 500,
  code: auth.ErrorRegistro['code'],
): RespuestaSimulada {
  return { status, cuerpo: { code, message: 'Mensaje del servidor simulado' } };
}

const cabecerasCors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, idempotency-key',
  'access-control-allow-methods': 'POST, OPTIONS',
};

/**
 * Doble de `POST /auth/register`: no hay backend, Supabase ni correo reales.
 * `respuesta` puede ser una función para controlar cuándo se contesta.
 */
export async function simularRegistro(
  page: Page,
  respuesta: RespuestaSimulada | (() => Promise<RespuestaSimulada>) = exito,
): Promise<ApiSimulada> {
  const api: ApiSimulada = { peticiones: [] };

  await page.route('**/auth/register', async (ruta: Route) => {
    const peticion = ruta.request();
    if (peticion.method() === 'OPTIONS') {
      await ruta.fulfill({ status: 204, headers: cabecerasCors });
      return;
    }

    const cuerpoPeticion: unknown = peticion.postDataJSON();
    api.peticiones.push({
      llaveIdempotencia: peticion.headers()['idempotency-key'],
      cuerpo: cuerpoPeticion,
    });
    const { status, cuerpo } = typeof respuesta === 'function' ? await respuesta() : respuesta;
    await ruta.fulfill({
      status,
      headers: cabecerasCors,
      contentType: 'application/json',
      body: JSON.stringify(cuerpo),
    });
  });

  return api;
}
