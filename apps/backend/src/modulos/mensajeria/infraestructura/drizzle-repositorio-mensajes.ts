import {
  and,
  asc,
  bloqueos,
  conversaciones,
  desc,
  empresas,
  eq,
  gt,
  lecturas,
  lt,
  mensajes,
  or,
  sql,
  talentos,
  usuarios,
  vacantes,
} from '@impulsau/db';
import type { BaseDeDatos, SQL } from '@impulsau/db';
import type { mensajeria } from '@impulsau/contracts';
import { z } from 'zod';
import type {
  Interlocutor,
  MensajesDesde,
  RepositorioMensajes,
  ResultadoEnviar,
  ResultadoLeido,
} from '../puertos/puertos.js';

type Consulta = Pick<BaseDeDatos, 'select'>;

/** Tope de mensajes por sincronización; si hay más, el cliente vuelve a pedir desde el último. */
const LIMITE_SINCRONIZACION = 200;

const CursorLista = z.object({ orden: z.string().min(1).max(64), id: z.uuid() });

function codificarCursor(orden: string, id: string): string {
  return Buffer.from(JSON.stringify({ orden, id })).toString('base64url');
}

function decodificarCursor(cursor: string): z.infer<typeof CursorLista> | null {
  try {
    const crudo: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const resultado = CursorLista.safeParse(crudo);
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

function aMensaje(fila: typeof mensajes.$inferSelect): mensajeria.Mensaje {
  return {
    conversacionId: fila.conversacionId,
    secuencia: fila.secuencia,
    clientMessageId: fila.clientMessageId,
    remitenteId: fila.remitenteId,
    cuerpo: fila.cuerpo,
    creadoEn: fila.creadoEn.toISOString(),
  };
}

export class DrizzleRepositorioMensajes implements RepositorioMensajes {
  constructor(private readonly db: BaseDeDatos) {}

  enviar(
    usuarioId: string,
    conversacionId: string,
    entrada: mensajeria.EnviarMensajeEntrada,
    ahora: Date,
  ): Promise<ResultadoEnviar> {
    return this.db.transaction(async (tx) => {
      // El bloqueo de la fila serializa los envíos de una conversación: la secuencia no se salta
      // ni se repite, y un reenvío simultáneo espera a ver el mensaje ya guardado.
      const [conversacion] = await tx
        .select({ empresaId: conversaciones.empresaId, talentoId: conversaciones.talentoId })
        .from(conversaciones)
        .where(eq(conversaciones.id, conversacionId))
        .for('update');
      if (
        !conversacion ||
        (conversacion.empresaId !== usuarioId && conversacion.talentoId !== usuarioId)
      ) {
        return { tipo: 'no_encontrado' };
      }

      const [remitente] = await tx
        .select({ estado: usuarios.estado })
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);
      if (remitente?.estado !== 'activo' && remitente?.estado !== 'pendiente_verificacion') {
        return { tipo: 'prohibido' };
      }

      const otroId =
        conversacion.empresaId === usuarioId ? conversacion.talentoId : conversacion.empresaId;
      const [bloqueo] = await tx
        .select({ bloqueadorId: bloqueos.bloqueadorId })
        .from(bloqueos)
        .where(this.entreEllos(usuarioId, otroId))
        .limit(1);
      if (bloqueo) return { tipo: 'conversacion_bloqueada' };

      const [previo] = await tx
        .select()
        .from(mensajes)
        .where(eq(mensajes.clientMessageId, entrada.clientMessageId))
        .limit(1);
      if (previo) {
        const mismo =
          previo.conversacionId === conversacionId &&
          previo.remitenteId === usuarioId &&
          previo.cuerpo === entrada.cuerpo;
        return mismo
          ? { tipo: 'ok', mensaje: aMensaje(previo), nuevo: false, ...conversacion }
          : { tipo: 'idempotencia_reutilizada' };
      }

      const [actualizada] = await tx
        .update(conversaciones)
        .set({
          ultimaSecuencia: sql`${conversaciones.ultimaSecuencia} + 1`,
          ultimoMensajeEn: ahora,
        })
        .where(eq(conversaciones.id, conversacionId))
        .returning({ secuencia: conversaciones.ultimaSecuencia });
      if (!actualizada) return { tipo: 'no_encontrado' };

      const [guardado] = await tx
        .insert(mensajes)
        .values({
          conversacionId,
          secuencia: actualizada.secuencia,
          remitenteId: usuarioId,
          cuerpo: entrada.cuerpo,
          clientMessageId: entrada.clientMessageId,
          creadoEn: ahora,
        })
        .returning();
      if (!guardado) return { tipo: 'no_encontrado' };

      // Lo que uno escribe ya lo leyó: su marca de lectura avanza con su propio mensaje.
      await tx
        .insert(lecturas)
        .values({ conversacionId, usuarioId, ultimaSecuenciaLeida: guardado.secuencia })
        .onConflictDoUpdate({
          target: [lecturas.conversacionId, lecturas.usuarioId],
          set: {
            ultimaSecuenciaLeida: sql`GREATEST(${lecturas.ultimaSecuenciaLeida}, ${guardado.secuencia})`,
          },
        });

      return { tipo: 'ok', mensaje: aMensaje(guardado), nuevo: true, ...conversacion };
    });
  }

  async historial(
    usuarioId: string,
    conversacionId: string,
    consulta: mensajeria.ConsultaHistorial,
  ): Promise<mensajeria.PaginaMensajes | null> {
    if (!(await this.participa(this.db, usuarioId, conversacionId))) return null;

    const condiciones: SQL[] = [eq(mensajes.conversacionId, conversacionId)];
    if (consulta.antesDeSecuencia)
      condiciones.push(lt(mensajes.secuencia, consulta.antesDeSecuencia));

    const filas = await this.db
      .select()
      .from(mensajes)
      .where(and(...condiciones))
      .orderBy(desc(mensajes.secuencia))
      .limit(consulta.limite + 1);

    const hayMas = filas.length > consulta.limite;
    const pagina = filas.slice(0, consulta.limite);
    const masAntiguo = pagina.at(-1);
    return {
      items: pagina.map(aMensaje),
      siguienteAntesDeSecuencia: hayMas && masAntiguo ? masAntiguo.secuencia : null,
    };
  }

  async desde(
    usuarioId: string,
    conversacionId: string,
    despuesDeSecuencia: number,
  ): Promise<MensajesDesde | null> {
    if (!(await this.participa(this.db, usuarioId, conversacionId))) return null;

    const filas = await this.db
      .select()
      .from(mensajes)
      .where(
        and(
          eq(mensajes.conversacionId, conversacionId),
          gt(mensajes.secuencia, despuesDeSecuencia),
        ),
      )
      .orderBy(asc(mensajes.secuencia))
      .limit(LIMITE_SINCRONIZACION + 1);

    return {
      mensajes: filas.slice(0, LIMITE_SINCRONIZACION).map(aMensaje),
      hayMas: filas.length > LIMITE_SINCRONIZACION,
    };
  }

  async listar(
    usuarioId: string,
    rol: 'empresa' | 'talento',
    consulta: mensajeria.ConsultaConversaciones,
  ): Promise<mensajeria.PaginaConversaciones> {
    const mio = rol === 'empresa' ? conversaciones.empresaId : conversaciones.talentoId;
    const otro = rol === 'empresa' ? conversaciones.talentoId : conversaciones.empresaId;

    const leidoPor = (quien: SQL | typeof otro | string) =>
      sql`coalesce((select ${lecturas.ultimaSecuenciaLeida} from ${lecturas}
        where ${lecturas.conversacionId} = ${conversaciones.id} and ${lecturas.usuarioId} = ${quien}), 0)`;
    const noLeidos = sql<number>`(select count(*) from ${mensajes}
      where ${mensajes.conversacionId} = ${conversaciones.id}
        and ${mensajes.remitenteId} <> ${usuarioId}
        and ${mensajes.secuencia} > ${leidoPor(usuarioId)})::int`;
    const leidoPorOtroHasta = sql<number>`${leidoPor(otro)}::int`;
    const bloqueada = sql<boolean>`exists(select 1 from ${bloqueos}
      where (${bloqueos.bloqueadorId} = ${usuarioId} and ${bloqueos.bloqueadoId} = ${otro})
         or (${bloqueos.bloqueadorId} = ${otro} and ${bloqueos.bloqueadoId} = ${usuarioId}))`;

    const bloqueadaPorMi = sql<boolean>`exists(select 1 from ${bloqueos}
      where ${bloqueos.bloqueadorId} = ${usuarioId} and ${bloqueos.bloqueadoId} = ${otro})`;

    const actividad = sql`coalesce(${conversaciones.ultimoMensajeEn}, ${conversaciones.creadoEn})`;
    const orden = sql<string>`${actividad}::text`;

    const condiciones: SQL[] = [eq(mio, usuarioId)];
    if (consulta.cursor) {
      const cursor = decodificarCursor(consulta.cursor);
      if (cursor) {
        condiciones.push(
          sql`(${actividad}, ${conversaciones.id}) < (${cursor.orden}::timestamptz, ${cursor.id}::uuid)`,
        );
      }
    }

    const filas = await this.db
      .select({
        id: conversaciones.id,
        empresaId: conversaciones.empresaId,
        empresaNombre: empresas.nombreComercial,
        talentoId: conversaciones.talentoId,
        talentoNombre: talentos.nombreCompleto,
        vacanteTitulo: vacantes.titulo,
        ultimo: mensajes,
        noLeidos,
        leidoPorOtroHasta,
        bloqueada,
        bloqueadaPorMi,
        orden,
      })
      .from(conversaciones)
      .innerJoin(empresas, eq(empresas.usuarioId, conversaciones.empresaId))
      .innerJoin(talentos, eq(talentos.usuarioId, conversaciones.talentoId))
      .leftJoin(vacantes, eq(vacantes.id, conversaciones.vacanteId))
      .leftJoin(
        mensajes,
        and(
          eq(mensajes.conversacionId, conversaciones.id),
          eq(mensajes.secuencia, conversaciones.ultimaSecuencia),
        ),
      )
      .where(and(...condiciones))
      .orderBy(desc(actividad), desc(conversaciones.id))
      .limit(consulta.limite + 1);

    const hayMas = filas.length > consulta.limite;
    const pagina = filas.slice(0, consulta.limite);
    const ultima = pagina.at(-1);
    return {
      items: pagina.map((fila) => ({
        id: fila.id,
        interlocutor:
          rol === 'empresa'
            ? { id: fila.talentoId, nombre: fila.talentoNombre }
            : { id: fila.empresaId, nombre: fila.empresaNombre },
        vacanteTitulo: fila.vacanteTitulo,
        ultimoMensaje: fila.ultimo ? aMensaje(fila.ultimo) : null,
        noLeidos: fila.noLeidos,
        leidoPorOtroHasta: fila.leidoPorOtroHasta,
        bloqueada: fila.bloqueada,
        bloqueadaPorMi: fila.bloqueadaPorMi,
      })),
      siguienteCursor: hayMas && ultima ? codificarCursor(ultima.orden, ultima.id) : null,
    };
  }

  async marcarLeido(
    usuarioId: string,
    conversacionId: string,
    secuencia: number,
  ): Promise<ResultadoLeido | null> {
    return this.db.transaction(async (tx) => {
      const [conversacion] = await tx
        .select({
          empresaId: conversaciones.empresaId,
          talentoId: conversaciones.talentoId,
          ultima: conversaciones.ultimaSecuencia,
        })
        .from(conversaciones)
        .where(
          and(
            eq(conversaciones.id, conversacionId),
            or(eq(conversaciones.empresaId, usuarioId), eq(conversaciones.talentoId, usuarioId)),
          ),
        )
        .limit(1);
      if (!conversacion) return null;

      // No se puede haber leído más allá del último mensaje que existe.
      const objetivo = Math.min(secuencia, conversacion.ultima);
      const participantes = {
        empresaId: conversacion.empresaId,
        talentoId: conversacion.talentoId,
      };
      if (objetivo === 0) return { secuencia: 0, avanzo: false, ...participantes };

      const [avanzada] = await tx
        .insert(lecturas)
        .values({ conversacionId, usuarioId, ultimaSecuenciaLeida: objetivo })
        .onConflictDoUpdate({
          target: [lecturas.conversacionId, lecturas.usuarioId],
          set: { ultimaSecuenciaLeida: objetivo },
          setWhere: sql`${lecturas.ultimaSecuenciaLeida} < ${objetivo}`,
        })
        .returning({ secuencia: lecturas.ultimaSecuenciaLeida });

      if (avanzada) return { secuencia: avanzada.secuencia, avanzo: true, ...participantes };

      const [actual] = await tx
        .select({ secuencia: lecturas.ultimaSecuenciaLeida })
        .from(lecturas)
        .where(and(eq(lecturas.conversacionId, conversacionId), eq(lecturas.usuarioId, usuarioId)));
      return { secuencia: actual?.secuencia ?? 0, avanzo: false, ...participantes };
    });
  }

  async interlocutor(usuarioId: string, conversacionId: string): Promise<Interlocutor | null> {
    const [conversacion] = await this.db
      .select({ empresaId: conversaciones.empresaId, talentoId: conversaciones.talentoId })
      .from(conversaciones)
      .where(eq(conversaciones.id, conversacionId))
      .limit(1);
    if (!conversacion) return null;
    if (conversacion.empresaId !== usuarioId && conversacion.talentoId !== usuarioId) return null;

    const otroId =
      conversacion.empresaId === usuarioId ? conversacion.talentoId : conversacion.empresaId;
    const [bloqueo] = await this.db
      .select({ bloqueadorId: bloqueos.bloqueadorId })
      .from(bloqueos)
      .where(this.entreEllos(usuarioId, otroId))
      .limit(1);
    return { otroId, bloqueada: bloqueo !== undefined };
  }

  async bloquear(bloqueadorId: string, bloqueadoId: string): Promise<'ok' | 'no_encontrado'> {
    const [existe] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.id, bloqueadoId))
      .limit(1);
    if (!existe) return 'no_encontrado';
    await this.db.insert(bloqueos).values({ bloqueadorId, bloqueadoId }).onConflictDoNothing();
    return 'ok';
  }

  async desbloquear(bloqueadorId: string, bloqueadoId: string): Promise<void> {
    await this.db
      .delete(bloqueos)
      .where(and(eq(bloqueos.bloqueadorId, bloqueadorId), eq(bloqueos.bloqueadoId, bloqueadoId)));
  }

  private async participa(
    ejecutor: Consulta,
    usuarioId: string,
    conversacionId: string,
  ): Promise<boolean> {
    const [fila] = await ejecutor
      .select({ id: conversaciones.id })
      .from(conversaciones)
      .where(
        and(
          eq(conversaciones.id, conversacionId),
          or(eq(conversaciones.empresaId, usuarioId), eq(conversaciones.talentoId, usuarioId)),
        ),
      )
      .limit(1);
    return fila !== undefined;
  }

  private entreEllos(a: string, b: string): SQL | undefined {
    return or(
      and(eq(bloqueos.bloqueadorId, a), eq(bloqueos.bloqueadoId, b)),
      and(eq(bloqueos.bloqueadorId, b), eq(bloqueos.bloqueadoId, a)),
    );
  }
}
