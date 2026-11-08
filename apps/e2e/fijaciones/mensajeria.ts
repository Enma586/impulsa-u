import { mensajeria } from '@impulsau/contracts';
import type { conexiones } from '@impulsau/contracts';
import type { Page, Route } from '@playwright/test';
import { ID_ANA, ID_EMPRESA } from './plataforma.js';

export const ID_CONVERSACION = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c60';
export const ID_INTERES = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c61';

const cabeceras = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization, idempotency-key',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export interface Mensajeria {
  /** Cuerpos enviados a `POST /conversaciones/:id/mensajes`, en orden. */
  envios: { clientMessageId: string; cuerpo: string }[];
  lecturas: number[];
  bloqueos: string[];
  aceptados: string[];
  /** Hace que el siguiente envío falle con 500 (para probar el reintento). */
  fallarProximoEnvio: boolean;
}

export interface OpcionesMensajeria {
  interesPendiente?: boolean;
  bloqueadaPorOtro?: boolean;
}

/**
 * Doble de la API de conexiones y mensajería. No simula el socket: la conexión en vivo falla y la
 * app sigue funcionando por REST, que es justamente el modo degradado que se prueba aquí.
 */
export async function simularMensajeria(
  page: Page,
  opciones: OpcionesMensajeria = {},
): Promise<Mensajeria> {
  const estado: Mensajeria = {
    envios: [],
    lecturas: [],
    bloqueos: [],
    aceptados: [],
    fallarProximoEnvio: false,
  };
  let bloqueadaPorMi = false;
  let aceptado = opciones.interesPendiente !== true;
  const mensajes: mensajeria.Mensaje[] = [
    {
      conversacionId: ID_CONVERSACION,
      secuencia: 1,
      clientMessageId: '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c62',
      remitenteId: ID_EMPRESA,
      cuerpo: 'Hola Ana, vimos tu portafolio',
      creadoEn: new Date().toISOString(),
    },
  ];

  const interes = (): conexiones.Interes => ({
    id: ID_INTERES,
    empresa: { id: ID_EMPRESA, nombre: '[Empresa Demo]' },
    talento: { id: ID_ANA, nombre: 'Ana Demo' },
    direccion: 'empresa_a_talento',
    mensaje: 'Nos gustó tu proyecto de tienda en línea',
    estado: aceptado ? 'aceptado' : 'pendiente',
    conversacionId: aceptado ? ID_CONVERSACION : null,
    creadoEn: new Date().toISOString(),
    respondidoEn: aceptado ? new Date().toISOString() : null,
  });

  const resumen = (): mensajeria.ConversacionResumen => ({
    id: ID_CONVERSACION,
    interlocutor: { id: ID_EMPRESA, nombre: '[Empresa Demo]' },
    vacanteTitulo: null,
    ultimoMensaje: mensajes.at(-1) ?? null,
    noLeidos: 0,
    leidoPorOtroHasta: 0,
    bloqueada: opciones.bloqueadaPorOtro === true || bloqueadaPorMi,
    bloqueadaPorMi,
  });

  const responder = (ruta: Route, status: number, cuerpo?: unknown) =>
    ruta.fulfill({
      status,
      headers: cabeceras,
      ...(cuerpo === undefined
        ? {}
        : { contentType: 'application/json', body: JSON.stringify(cuerpo) }),
    });

  await page.route(
    /localhost:3000\/(conversaciones|intereses|usuarios|talentos|empresas)/,
    async (ruta) => {
      const peticion = ruta.request();
      const { pathname } = new URL(peticion.url());
      const metodo = peticion.method();
      if (metodo === 'OPTIONS') return responder(ruta, 204);

      if (pathname === '/intereses' && metodo === 'GET') {
        const tipo = new URL(peticion.url()).searchParams.get('tipo');
        return responder(ruta, 200, {
          items: tipo === 'recibidos' ? [interes()] : [],
          siguienteCursor: null,
        });
      }
      if (pathname.endsWith('/aceptar')) {
        aceptado = true;
        estado.aceptados.push(ID_INTERES);
        return responder(ruta, 200, interes());
      }
      if (pathname === '/conversaciones' && metodo === 'GET') {
        return responder(ruta, 200, {
          items: aceptado ? [resumen()] : [],
          siguienteCursor: null,
        });
      }
      if (pathname.endsWith('/mensajes') && metodo === 'GET') {
        return responder(ruta, 200, {
          items: [...mensajes].reverse(),
          siguienteAntesDeSecuencia: null,
        });
      }
      if (pathname.endsWith('/mensajes') && metodo === 'POST') {
        const entrada = mensajeria.EnviarMensajeEntrada.parse(peticion.postDataJSON());
        estado.envios.push(entrada);
        if (estado.fallarProximoEnvio) {
          estado.fallarProximoEnvio = false;
          return responder(ruta, 500, { code: 'error_interno', message: 'Falló' });
        }
        const nuevo: mensajeria.Mensaje = {
          conversacionId: ID_CONVERSACION,
          secuencia: mensajes.length + 1,
          clientMessageId: entrada.clientMessageId,
          remitenteId: ID_ANA,
          cuerpo: entrada.cuerpo,
          creadoEn: new Date().toISOString(),
        };
        mensajes.push(nuevo);
        return responder(ruta, 201, nuevo);
      }
      if (pathname.endsWith('/lectura')) {
        const { secuencia } = mensajeria.MarcarLeidoEntrada.parse(peticion.postDataJSON());
        estado.lecturas.push(secuencia);
        return responder(ruta, 200, {
          conversacionId: ID_CONVERSACION,
          usuarioId: ID_ANA,
          secuencia,
        });
      }
      if (pathname.startsWith('/usuarios/') && pathname.endsWith('/bloqueo')) {
        bloqueadaPorMi = metodo === 'PUT';
        if (bloqueadaPorMi) estado.bloqueos.push(pathname.split('/')[2] ?? '');
        return responder(ruta, 204);
      }
      return responder(ruta, 404, { code: 'no_encontrado', message: 'No existe' });
    },
  );

  return estado;
}
