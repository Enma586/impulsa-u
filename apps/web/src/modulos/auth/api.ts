import { auth } from '@impulsau/contracts';

export type FalloRegistro =
  | { tipo: 'api'; codigo: auth.ErrorRegistro['code']; detalles: auth.ErrorRegistro['details'] }
  | { tipo: 'red' }
  | { tipo: 'respuesta_invalida' };

export type ResultadoRegistro = { ok: true } | { ok: false; fallo: FalloRegistro };

/** `POST /auth/register`. Los errores esperados vuelven como resultado, no como excepción. */
export async function registrarTalento(
  urlBase: string,
  entrada: auth.RegistrarTalentoEntrada,
  llaveIdempotencia: string,
): Promise<ResultadoRegistro> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${urlBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': llaveIdempotencia },
      body: JSON.stringify(entrada),
    });
  } catch {
    return { ok: false, fallo: { tipo: 'red' } };
  }

  let cuerpo: unknown;
  try {
    cuerpo = await respuesta.json();
  } catch {
    return { ok: false, fallo: { tipo: 'respuesta_invalida' } };
  }

  if (respuesta.status === 202) {
    const exito = auth.RegistrarTalentoRespuesta.safeParse(cuerpo);
    return exito.success ? { ok: true } : { ok: false, fallo: { tipo: 'respuesta_invalida' } };
  }

  const error = auth.ErrorRegistro.safeParse(cuerpo);
  if (!error.success) return { ok: false, fallo: { tipo: 'respuesta_invalida' } };
  return {
    ok: false,
    fallo: { tipo: 'api', codigo: error.data.code, detalles: error.data.details },
  };
}
