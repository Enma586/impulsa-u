import {
  and,
  bloqueos,
  conversaciones,
  desc,
  empresas,
  eq,
  inArray,
  intereses,
  or,
  sql,
  talentos,
  usuarios,
} from '@impulsau/db';
import type { BaseDeDatos, SQL } from '@impulsau/db';
import type { conexiones } from '@impulsau/contracts';
import { z } from 'zod';
import type {
  ParInteres,
  RepositorioIntereses,
  ResultadoMostrar,
  ResultadoResponder,
  ResultadoRetirar,
} from '../puertos/puertos.js';

type Consulta = Pick<BaseDeDatos, 'select'>;

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

const columnasInteres = {
  id: intereses.id,
  empresaId: intereses.empresaId,
  empresaNombre: empresas.nombreComercial,
  talentoId: intereses.talentoId,
  talentoNombre: talentos.nombreCompleto,
  direccion: intereses.direccion,
  mensaje: intereses.mensaje,
  estado: intereses.estado,
  creadoEn: intereses.creadoEn,
  respondidoEn: intereses.respondidoEn,
  conversacionId: conversaciones.id,
};

function consultarIntereses(ejecutor: Consulta) {
  return ejecutor
    .select(columnasInteres)
    .from(intereses)
    .innerJoin(empresas, eq(empresas.usuarioId, intereses.empresaId))
    .innerJoin(talentos, eq(talentos.usuarioId, intereses.talentoId))
    .leftJoin(
      conversaciones,
      and(
        eq(conversaciones.empresaId, intereses.empresaId),
        eq(conversaciones.talentoId, intereses.talentoId),
        eq(intereses.estado, 'aceptado'),
      ),
    );
}

type FilaInteres = Awaited<ReturnType<typeof consultarIntereses>>[number];

function aInteres(fila: FilaInteres): conexiones.Interes {
  return {
    id: fila.id,
    empresa: { id: fila.empresaId, nombre: fila.empresaNombre },
    talento: { id: fila.talentoId, nombre: fila.talentoNombre },
    direccion: fila.direccion,
    mensaje: fila.mensaje,
    estado: fila.estado,
    conversacionId: fila.conversacionId,
    creadoEn: fila.creadoEn.toISOString(),
    respondidoEn: fila.respondidoEn?.toISOString() ?? null,
  };
}

async function leerInteres(ejecutor: Consulta, id: string): Promise<conexiones.Interes | null> {
  const [fila] = await consultarIntereses(ejecutor).where(eq(intereses.id, id)).limit(1);
  return fila ? aInteres(fila) : null;
}

const opuesta = (direccion: conexiones.DireccionInteres): conexiones.DireccionInteres =>
  direccion === 'empresa_a_talento' ? 'talento_a_empresa' : 'empresa_a_talento';

export class DrizzleRepositorioIntereses implements RepositorioIntereses {
  constructor(private readonly db: BaseDeDatos) {}

  mostrar(par: ParInteres, mensaje: string | null, ahora: Date): Promise<ResultadoMostrar> {
    return this.db.transaction(async (tx) => {
      await this.bloquearPar(tx, par);
      const actorEsEmpresa = par.direccion === 'empresa_a_talento';
      const actorId = actorEsEmpresa ? par.empresaId : par.talentoId;
      const destinoId = actorEsEmpresa ? par.talentoId : par.empresaId;

      if (actorEsEmpresa) {
        const [empresa] = await tx
          .select({ verificacion: empresas.estadoVerificacion })
          .from(empresas)
          .where(eq(empresas.usuarioId, par.empresaId))
          .limit(1);
        if (empresa?.verificacion !== 'verificada') return { tipo: 'empresa_no_verificada' };
      }

      const destino = actorEsEmpresa
        ? await this.talentoDestino(tx, destinoId)
        : await this.empresaDestino(tx, destinoId);
      if (destino === 'inexistente') return { tipo: 'destino_no_encontrado' };
      if (destino === 'sin_disponibilidad') return { tipo: 'talento_no_disponible' };

      const [bloqueo] = await tx
        .select({ bloqueadorId: bloqueos.bloqueadorId })
        .from(bloqueos)
        .where(this.entreEllos(actorId, destinoId))
        .limit(1);
      if (bloqueo) {
        // Quien fue bloqueado no debe enterarse: para él el destino simplemente no existe.
        return bloqueo.bloqueadorId === actorId
          ? { tipo: 'usuario_bloqueado' }
          : { tipo: 'destino_no_encontrado' };
      }

      const [creado] = await tx
        .insert(intereses)
        .values({ ...par, mensaje, estado: 'pendiente', creadoEn: ahora })
        .onConflictDoNothing({
          target: [intereses.empresaId, intereses.talentoId, intereses.direccion],
        })
        .returning({ id: intereses.id });

      if (!creado) return this.repetido(tx, par);

      const [contraparte] = await tx
        .select({ id: intereses.id, estado: intereses.estado })
        .from(intereses)
        .where(
          and(
            eq(intereses.empresaId, par.empresaId),
            eq(intereses.talentoId, par.talentoId),
            eq(intereses.direccion, opuesta(par.direccion)),
            inArray(intereses.estado, ['pendiente', 'aceptado']),
          ),
        )
        .limit(1);

      let abrioConversacion = false;
      if (contraparte) {
        // Interés mutuo: ambos lados quedan aceptados y se abre una sola conversación.
        await tx
          .update(intereses)
          .set({ estado: 'aceptado', respondidoEn: ahora })
          .where(
            and(
              inArray(intereses.id, [creado.id, contraparte.id]),
              eq(intereses.estado, 'pendiente'),
            ),
          );
        await this.abrirConversacion(tx, par, contraparte.id);
        abrioConversacion = contraparte.estado === 'pendiente';
      }

      const interes = await leerInteres(tx, creado.id);
      return interes
        ? { tipo: 'ok', interes, abrioConversacion }
        : { tipo: 'destino_no_encontrado' };
    });
  }

  retirar(par: ParInteres): Promise<ResultadoRetirar> {
    return this.db.transaction(async (tx) => {
      await this.bloquearPar(tx, par);
      const condicion = and(
        eq(intereses.empresaId, par.empresaId),
        eq(intereses.talentoId, par.talentoId),
        eq(intereses.direccion, par.direccion),
      );
      const eliminados = await tx
        .delete(intereses)
        .where(and(condicion, eq(intereses.estado, 'pendiente')))
        .returning({ id: intereses.id });
      if (eliminados.length > 0) return 'ok';

      const [existente] = await tx
        .select({ id: intereses.id })
        .from(intereses)
        .where(condicion)
        .limit(1);
      return existente ? 'ya_respondido' : 'ok';
    });
  }

  responder(
    interesId: string,
    receptorId: string,
    aceptar: boolean,
    ahora: Date,
  ): Promise<ResultadoResponder> {
    return this.db.transaction(async (tx) => {
      const [previa] = await tx
        .select({ empresaId: intereses.empresaId, talentoId: intereses.talentoId })
        .from(intereses)
        .where(eq(intereses.id, interesId))
        .limit(1);
      if (!previa) return { tipo: 'no_encontrado' };

      await this.bloquearPar(tx, previa);
      const [fila] = await tx.select().from(intereses).where(eq(intereses.id, interesId)).limit(1);
      if (!fila) return { tipo: 'no_encontrado' };

      const empresaRecibe = fila.direccion === 'talento_a_empresa';
      const receptor = empresaRecibe ? fila.empresaId : fila.talentoId;
      const emisor = empresaRecibe ? fila.talentoId : fila.empresaId;
      if (receptorId !== receptor) {
        // Quien envió el interés no puede responderlo; un tercero ni siquiera debe saber que existe.
        return receptorId === emisor ? { tipo: 'prohibido' } : { tipo: 'no_encontrado' };
      }

      const decision = aceptar ? 'aceptado' : 'declinado';
      let nuevo = false;
      if (fila.estado !== decision) {
        if (fila.estado !== 'pendiente') return { tipo: 'conflicto' };
        if (aceptar) {
          const [bloqueo] = await tx
            .select({ bloqueadorId: bloqueos.bloqueadorId })
            .from(bloqueos)
            .where(this.entreEllos(fila.empresaId, fila.talentoId))
            .limit(1);
          if (bloqueo) return { tipo: 'usuario_bloqueado' };
        }
        await tx
          .update(intereses)
          .set({ estado: decision, respondidoEn: ahora })
          .where(eq(intereses.id, interesId));
        if (aceptar) await this.abrirConversacion(tx, fila, interesId);
        nuevo = true;
      }

      const interes = await leerInteres(tx, interesId);
      return interes
        ? { tipo: 'ok', interes, nuevo, empresaId: fila.empresaId, talentoId: fila.talentoId }
        : { tipo: 'no_encontrado' };
    });
  }

  async listar(
    usuarioId: string,
    rol: 'empresa' | 'talento',
    consulta: conexiones.ConsultaIntereses,
  ): Promise<conexiones.PaginaIntereses> {
    const recibidos = consulta.tipo === 'recibidos';
    // Un interés "recibido" por la empresa es el que mandó un talento, y al revés.
    const direccion: conexiones.DireccionInteres =
      (rol === 'empresa') === recibidos ? 'talento_a_empresa' : 'empresa_a_talento';
    const mio = rol === 'empresa' ? intereses.empresaId : intereses.talentoId;

    const condiciones: SQL[] = [eq(mio, usuarioId), eq(intereses.direccion, direccion)];
    if (consulta.estado) condiciones.push(eq(intereses.estado, consulta.estado));

    const orden = sql<string>`${intereses.creadoEn}::text`;
    if (consulta.cursor) {
      const cursor = decodificarCursor(consulta.cursor);
      if (cursor) {
        condiciones.push(
          sql`(${intereses.creadoEn}, ${intereses.id}) < (${cursor.orden}::timestamptz, ${cursor.id}::uuid)`,
        );
      }
    }

    const filas = await this.db
      .select({ ...columnasInteres, orden })
      .from(intereses)
      .innerJoin(empresas, eq(empresas.usuarioId, intereses.empresaId))
      .innerJoin(talentos, eq(talentos.usuarioId, intereses.talentoId))
      .leftJoin(
        conversaciones,
        and(
          eq(conversaciones.empresaId, intereses.empresaId),
          eq(conversaciones.talentoId, intereses.talentoId),
          eq(intereses.estado, 'aceptado'),
        ),
      )
      .where(and(...condiciones))
      .orderBy(desc(intereses.creadoEn), desc(intereses.id))
      .limit(consulta.limite + 1);

    const hayMas = filas.length > consulta.limite;
    const pagina = filas.slice(0, consulta.limite);
    const ultima = pagina.at(-1);
    return {
      items: pagina.map(aInteres),
      siguienteCursor: hayMas && ultima ? codificarCursor(ultima.orden, ultima.id) : null,
    };
  }

  /** Serializa las operaciones sobre un mismo par para que dos intereses opuestos no se crucen. */
  private async bloquearPar(
    tx: Pick<BaseDeDatos, 'execute'>,
    par: { empresaId: string; talentoId: string },
  ): Promise<void> {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${par.empresaId}:${par.talentoId}`}, 0))`,
    );
  }

  private entreEllos(a: string, b: string): SQL | undefined {
    return or(
      and(eq(bloqueos.bloqueadorId, a), eq(bloqueos.bloqueadoId, b)),
      and(eq(bloqueos.bloqueadorId, b), eq(bloqueos.bloqueadoId, a)),
    );
  }

  private async talentoDestino(
    tx: Consulta,
    id: string,
  ): Promise<'ok' | 'inexistente' | 'sin_disponibilidad'> {
    const [talento] = await tx
      .select({ estado: usuarios.estado, primerEmpleoEn: talentos.primerEmpleoEn })
      .from(talentos)
      .innerJoin(usuarios, eq(usuarios.id, talentos.usuarioId))
      .where(eq(talentos.usuarioId, id))
      .limit(1);
    if (talento?.estado !== 'activo') return 'inexistente';
    return talento.primerEmpleoEn ? 'sin_disponibilidad' : 'ok';
  }

  private async empresaDestino(tx: Consulta, id: string): Promise<'ok' | 'inexistente'> {
    const [empresa] = await tx
      .select({ estado: usuarios.estado })
      .from(empresas)
      .innerJoin(usuarios, eq(usuarios.id, empresas.usuarioId))
      .where(eq(empresas.usuarioId, id))
      .limit(1);
    return empresa?.estado === 'activo' ? 'ok' : 'inexistente';
  }

  /** Reintento del mismo interés: devuelve el existente, salvo que ya haya sido declinado. */
  private async repetido(tx: Consulta, par: ParInteres): Promise<ResultadoMostrar> {
    const [existente] = await consultarIntereses(tx).where(
      and(
        eq(intereses.empresaId, par.empresaId),
        eq(intereses.talentoId, par.talentoId),
        eq(intereses.direccion, par.direccion),
      ),
    );
    if (!existente) return { tipo: 'destino_no_encontrado' };
    if (existente.estado === 'declinado') return { tipo: 'ya_declinado' };
    return { tipo: 'ok', interes: aInteres(existente), abrioConversacion: false };
  }

  private async abrirConversacion(
    tx: Pick<BaseDeDatos, 'insert'>,
    par: { empresaId: string; talentoId: string },
    interesId: string,
  ): Promise<void> {
    await tx
      .insert(conversaciones)
      .values({ empresaId: par.empresaId, talentoId: par.talentoId, interesId })
      .onConflictDoNothing({ target: [conversaciones.empresaId, conversaciones.talentoId] });
  }
}
