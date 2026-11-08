import { z } from 'zod';
import { ConsultaPagina, crearEsquemaError, crearEsquemaPagina } from '../comun/index.js';

export const CUERPO_MENSAJE_MAXIMO = 4000;

const CuerpoMensaje = z.string().trim().min(1).max(CUERPO_MENSAJE_MAXIMO);

export const Mensaje = z.object({
  conversacionId: z.uuid(),
  secuencia: z.number().int().min(1),
  clientMessageId: z.uuid(),
  remitenteId: z.uuid(),
  cuerpo: CuerpoMensaje,
  creadoEn: z.iso.datetime(),
});
export type Mensaje = z.infer<typeof Mensaje>;

export const ConversacionResumen = z.object({
  id: z.uuid(),
  interlocutor: z.object({ id: z.uuid(), nombre: z.string() }),
  vacanteTitulo: z.string().nullable(),
  ultimoMensaje: Mensaje.nullable(),
  noLeidos: z.number().int().min(0),
  /** Hasta qué secuencia leyó el otro participante (para mostrar "leído"). */
  leidoPorOtroHasta: z.number().int().min(0),
  bloqueada: z.boolean(),
});
export type ConversacionResumen = z.infer<typeof ConversacionResumen>;

export const PaginaConversaciones = crearEsquemaPagina(ConversacionResumen);
export type PaginaConversaciones = z.infer<typeof PaginaConversaciones>;

/** `GET /conversaciones`. */
export const ConsultaConversaciones = ConsultaPagina;
export type ConsultaConversaciones = z.infer<typeof ConsultaConversaciones>;

/** `GET /conversaciones/:id/mensajes?antesDeSecuencia=&limite=` (CU-33): del más nuevo al más antiguo. */
export const ConsultaHistorial = z.object({
  antesDeSecuencia: z.coerce.number().int().min(1).optional(),
  limite: z.coerce.number().int().min(1).max(50).default(30),
});
export type ConsultaHistorial = z.infer<typeof ConsultaHistorial>;

export const PaginaMensajes = z.object({
  items: z.array(Mensaje),
  /** `null` cuando ya no hay mensajes más antiguos. */
  siguienteAntesDeSecuencia: z.number().int().min(1).nullable(),
});
export type PaginaMensajes = z.infer<typeof PaginaMensajes>;

/** `POST /conversaciones/:id/mensajes`: alternativa REST si falla el socket. Idempotente por `clientMessageId`. */
export const EnviarMensajeEntrada = z.object({
  clientMessageId: z.uuid(),
  cuerpo: CuerpoMensaje,
});
export type EnviarMensajeEntrada = z.infer<typeof EnviarMensajeEntrada>;

/** `PUT /conversaciones/:id/lectura`: solo avanza. */
export const MarcarLeidoEntrada = z.object({ secuencia: z.number().int().min(1) });
export type MarcarLeidoEntrada = z.infer<typeof MarcarLeidoEntrada>;

export const ErrorMensajeria = crearEsquemaError([
  'no_autenticado',
  'prohibido',
  'no_encontrado',
  'validacion',
  'conversacion_bloqueada',
  'demasiadas_peticiones',
  'error_interno',
]);
export type ErrorMensajeria = z.infer<typeof ErrorMensajeria>;

/** Resultado del envío por socket (acknowledgment) y por REST: ok con el mensaje, o error. */
export const ResultadoEnvio = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), mensaje: Mensaje }),
  z.object({ ok: z.literal(false), error: ErrorMensajeria }),
]);
export type ResultadoEnvio = z.infer<typeof ResultadoEnvio>;

// ---------------------------------------------------------------------------
// Eventos de Socket.IO. Los nombres de evento son los de la especificación (7.3).
// ---------------------------------------------------------------------------

const ConversacionRef = z.object({ conversacionId: z.uuid() });

export const EventoEnviarMensaje = EnviarMensajeEntrada.extend(ConversacionRef.shape);
export type EventoEnviarMensaje = z.infer<typeof EventoEnviarMensaje>;

export const EventoMarcarLeido = ConversacionRef.extend(MarcarLeidoEntrada.shape);
export type EventoMarcarLeido = z.infer<typeof EventoMarcarLeido>;

export const EventoEscribiendo = ConversacionRef;
export type EventoEscribiendo = z.infer<typeof EventoEscribiendo>;

/** Recupera los mensajes con secuencia mayor a `despuesDeSecuencia` tras una reconexión (RNF-09). */
export const EventoSincronizar = ConversacionRef.extend({
  despuesDeSecuencia: z.number().int().min(0),
});
export type EventoSincronizar = z.infer<typeof EventoSincronizar>;

export const ResultadoSincronizacion = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    mensajes: z.array(Mensaje),
    /** `true` si hay más de los devueltos y el cliente debe volver a sincronizar. */
    hayMas: z.boolean(),
  }),
  z.object({ ok: z.literal(false), error: ErrorMensajeria }),
]);
export type ResultadoSincronizacion = z.infer<typeof ResultadoSincronizacion>;

export const EventoLecturaActualizada = ConversacionRef.extend({
  usuarioId: z.uuid(),
  secuencia: z.number().int().min(0),
});
export type EventoLecturaActualizada = z.infer<typeof EventoLecturaActualizada>;

export const EventoEscribiendoActualizado = ConversacionRef.extend({
  usuarioId: z.uuid(),
  activo: z.boolean(),
});
export type EventoEscribiendoActualizado = z.infer<typeof EventoEscribiendoActualizado>;

export const EventoInteresAceptado = z.object({
  interesId: z.uuid(),
  conversacionId: z.uuid(),
});
export type EventoInteresAceptado = z.infer<typeof EventoInteresAceptado>;

/**
 * Mapa tipado de eventos cliente → servidor. El segundo parámetro es el `ack`.
 * Es un `type` y no una `interface` porque Socket.IO exige una firma de índice.
 */
export type EventosClienteAServidor = {
  'message:send': (datos: EventoEnviarMensaje, ack: (resultado: ResultadoEnvio) => void) => void;
  'message:read': (datos: EventoMarcarLeido) => void;
  'typing:start': (datos: EventoEscribiendo) => void;
  'typing:stop': (datos: EventoEscribiendo) => void;
  'conversation:sync': (
    datos: EventoSincronizar,
    ack: (resultado: ResultadoSincronizacion) => void,
  ) => void;
};

/** Mapa tipado de eventos servidor → cliente. */
export type EventosServidorACliente = {
  'message:new': (mensaje: Mensaje) => void;
  'message:read': (datos: EventoLecturaActualizada) => void;
  typing: (datos: EventoEscribiendoActualizado) => void;
  'interest:accepted': (datos: EventoInteresAceptado) => void;
};
