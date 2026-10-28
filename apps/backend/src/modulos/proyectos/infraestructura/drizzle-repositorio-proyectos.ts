import {
  and,
  archivos,
  desc,
  eq,
  habilidades,
  inArray,
  isNull,
  likes,
  or,
  proyectoArchivos,
  proyectoTecnologias,
  proyectos,
  sql,
  talentos,
} from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import type { proyectos as contrato } from '@impulsau/contracts';
import { z } from 'zod';
import { imagenesDeProyectos } from '../../../compartido/infraestructura/imagenes-proyecto.js';
import { recalcularEvidencia } from '../../../compartido/infraestructura/evidencia.js';
import type { ResultadoEscritura } from '../../../compartido/dominio/errores.js';
import type { RepositorioProyectos } from '../puertos/repositorio-proyectos.js';

const LARGO_EXTRACTO = 180;

/** Cursor del feed: instante (con microsegundos, como texto de Postgres) e id del último elemento. */
const CursorFeed = z.object({ orden: z.string().min(1).max(64), id: z.uuid() });

function codificarCursor(orden: string, id: string): string {
  return Buffer.from(JSON.stringify({ orden, id })).toString('base64url');
}

function decodificarCursor(cursor: string): z.infer<typeof CursorFeed> | null {
  try {
    const crudo: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const resultado = CursorFeed.safeParse(crudo);
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

export class DrizzleRepositorioProyectos implements RepositorioProyectos {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly urlSupabase: string,
  ) {}

  crear(
    autorId: string,
    entrada: contrato.PublicarProyectoEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>> {
    return this.db.transaction(async (tx) => {
      const campo = await this.referenciaInvalida(tx, autorId, entrada);
      if (campo) return { tipo: 'referencia_invalida' as const, campo };

      const [fila] = await tx
        .insert(proyectos)
        .values({
          autorId,
          titulo: entrada.titulo,
          descripcion: entrada.descripcion,
          materia: entrada.materia,
          periodo: entrada.periodo,
          urlRepositorio: entrada.urlRepositorio,
          urlDemo: entrada.urlDemo,
          urlVideo: entrada.urlVideo,
          estado: entrada.publicar ? 'publicado' : 'borrador',
          publicadoEn: entrada.publicar ? ahora : null,
        })
        .returning({ id: proyectos.id });
      if (!fila) throw new Error('No se pudo crear el proyecto');

      await this.guardarRelaciones(tx, fila.id, entrada);
      await recalcularEvidencia(tx, autorId);
      return { tipo: 'ok' as const, valor: { id: fila.id } };
    });
  }

  async obtener(id: string, usuarioId: string): Promise<contrato.ProyectoDetalle | null> {
    const [fila] = await this.db
      .select({ proyecto: proyectos, autorNombre: talentos.nombreCompleto })
      .from(proyectos)
      .innerJoin(talentos, eq(talentos.usuarioId, proyectos.autorId))
      .where(
        and(
          eq(proyectos.id, id),
          isNull(proyectos.eliminadoEn),
          or(eq(proyectos.estado, 'publicado'), eq(proyectos.autorId, usuarioId)),
        ),
      )
      .limit(1);
    if (!fila) return null;
    const { proyecto } = fila;

    const [tecnologias, imagenes, meGusta] = await Promise.all([
      this.tecnologiasDe([proyecto.id]),
      imagenesDeProyectos(this.db, this.urlSupabase, [proyecto.id]),
      this.likesDe(usuarioId, [proyecto.id]),
    ]);

    return {
      id: proyecto.id,
      titulo: proyecto.titulo,
      descripcion: proyecto.descripcion,
      materia: proyecto.materia,
      periodo: proyecto.periodo,
      urlRepositorio: proyecto.urlRepositorio,
      urlDemo: proyecto.urlDemo,
      urlVideo: proyecto.urlVideo,
      autor: { id: proyecto.autorId, nombre: fila.autorNombre },
      tecnologias: tecnologias.get(proyecto.id) ?? [],
      imagenes: imagenes.get(proyecto.id) ?? [],
      likes: proyecto.likes,
      meGusta: meGusta.has(proyecto.id),
      estado: proyecto.estado,
      publicadoEn: proyecto.publicadoEn?.toISOString() ?? null,
      esMio: proyecto.autorId === usuarioId,
      version: proyecto.version,
    };
  }

  async explorar(
    usuarioId: string,
    consulta: contrato.ConsultaFeed,
  ): Promise<contrato.PaginaProyectos> {
    const orden = sql`coalesce(${proyectos.publicadoEn}, ${proyectos.creadoEn})`;
    const condiciones = [isNull(proyectos.eliminadoEn)];
    if (consulta.mios === true) {
      condiciones.push(
        eq(proyectos.autorId, usuarioId),
        inArray(proyectos.estado, ['borrador', 'publicado']),
      );
    } else {
      condiciones.push(eq(proyectos.estado, 'publicado'));
      if (consulta.autorId) condiciones.push(eq(proyectos.autorId, consulta.autorId));
    }
    if (consulta.cursor) {
      const cursor = decodificarCursor(consulta.cursor);
      if (cursor) {
        condiciones.push(
          sql`(${orden}, ${proyectos.id}) < (${cursor.orden}::timestamptz, ${cursor.id}::uuid)`,
        );
      }
    }

    const filas = await this.db
      .select({
        proyecto: proyectos,
        extracto: sql<string>`left(${proyectos.descripcion}, ${LARGO_EXTRACTO})`,
        orden: sql<string>`(${orden})::text`,
        autorNombre: talentos.nombreCompleto,
      })
      .from(proyectos)
      .innerJoin(talentos, eq(talentos.usuarioId, proyectos.autorId))
      .where(and(...condiciones))
      .orderBy(desc(orden), desc(proyectos.id))
      .limit(consulta.limite + 1);

    const hayMas = filas.length > consulta.limite;
    const pagina = hayMas ? filas.slice(0, consulta.limite) : filas;
    const ids = pagina.map((fila) => fila.proyecto.id);
    const [tecnologias, imagenes, meGusta] = await Promise.all([
      this.tecnologiasDe(ids),
      imagenesDeProyectos(this.db, this.urlSupabase, ids),
      this.likesDe(usuarioId, ids),
    ]);

    const ultima = pagina.at(-1);
    return {
      items: pagina.map((fila) => ({
        id: fila.proyecto.id,
        titulo: fila.proyecto.titulo,
        extracto: fila.extracto,
        autor: { id: fila.proyecto.autorId, nombre: fila.autorNombre },
        tecnologias: tecnologias.get(fila.proyecto.id) ?? [],
        imagenUrl: imagenes.get(fila.proyecto.id)?.[0]?.url ?? null,
        likes: fila.proyecto.likes,
        meGusta: meGusta.has(fila.proyecto.id),
        estado: fila.proyecto.estado,
        publicadoEn: fila.proyecto.publicadoEn?.toISOString() ?? null,
      })),
      siguienteCursor: hayMas && ultima ? codificarCursor(ultima.orden, ultima.proyecto.id) : null,
    };
  }

  editar(
    id: string,
    autorId: string,
    entrada: contrato.EditarProyectoEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>> {
    return this.db.transaction(async (tx) => {
      const [actual] = await tx
        .select({
          autorId: proyectos.autorId,
          estado: proyectos.estado,
          publicadoEn: proyectos.publicadoEn,
        })
        .from(proyectos)
        .where(and(eq(proyectos.id, id), isNull(proyectos.eliminadoEn)))
        .limit(1);
      if (!actual) return { tipo: 'no_encontrado' as const };
      if (actual.autorId !== autorId || actual.estado === 'oculto') {
        return { tipo: 'prohibido' as const };
      }

      const campo = await this.referenciaInvalida(tx, autorId, entrada);
      if (campo) return { tipo: 'referencia_invalida' as const, campo };

      const actualizados = await tx
        .update(proyectos)
        .set({
          titulo: entrada.titulo,
          descripcion: entrada.descripcion,
          materia: entrada.materia,
          periodo: entrada.periodo,
          urlRepositorio: entrada.urlRepositorio,
          urlDemo: entrada.urlDemo,
          urlVideo: entrada.urlVideo,
          estado: entrada.estado,
          publicadoEn: entrada.estado === 'publicado' ? (actual.publicadoEn ?? ahora) : null,
          version: sql`${proyectos.version} + 1`,
          versionContenido: sql`${proyectos.versionContenido} + 1`,
          actualizadoEn: ahora,
        })
        .where(and(eq(proyectos.id, id), eq(proyectos.version, entrada.version)))
        .returning({ id: proyectos.id });
      if (actualizados.length === 0) return { tipo: 'conflicto' as const };

      await tx.delete(proyectoTecnologias).where(eq(proyectoTecnologias.proyectoId, id));
      await tx.delete(proyectoArchivos).where(eq(proyectoArchivos.proyectoId, id));
      await this.guardarRelaciones(tx, id, entrada);
      await recalcularEvidencia(tx, autorId);
      return { tipo: 'ok' as const, valor: { id } };
    });
  }

  eliminar(id: string, autorId: string, ahora: Date): Promise<ResultadoEscritura<{ id: string }>> {
    return this.db.transaction(async (tx) => {
      const [actual] = await tx
        .select({ autorId: proyectos.autorId })
        .from(proyectos)
        .where(and(eq(proyectos.id, id), isNull(proyectos.eliminadoEn)))
        .limit(1);
      if (!actual) return { tipo: 'no_encontrado' as const };
      if (actual.autorId !== autorId) return { tipo: 'prohibido' as const };

      await tx.update(proyectos).set({ eliminadoEn: ahora }).where(eq(proyectos.id, id));
      await recalcularEvidencia(tx, autorId);
      return { tipo: 'ok' as const, valor: { id } };
    });
  }

  private async guardarRelaciones(
    tx: Pick<BaseDeDatos, 'insert'>,
    proyectoId: string,
    entrada: { tecnologiaIds: string[]; archivoIds: string[] },
  ): Promise<void> {
    const tecnologias = [...new Set(entrada.tecnologiaIds)];
    await tx
      .insert(proyectoTecnologias)
      .values(tecnologias.map((habilidadId) => ({ proyectoId, habilidadId })));
    const imagenes = [...new Set(entrada.archivoIds)];
    if (imagenes.length > 0) {
      await tx
        .insert(proyectoArchivos)
        .values(imagenes.map((archivoId, orden) => ({ proyectoId, archivoId, orden })));
    }
  }

  /** Campo con una tecnología inexistente o una imagen que no es del autor ni está lista. */
  private async referenciaInvalida(
    tx: Pick<BaseDeDatos, 'select'>,
    autorId: string,
    entrada: { tecnologiaIds: string[]; archivoIds: string[] },
  ): Promise<string | null> {
    const tecnologias = [...new Set(entrada.tecnologiaIds)];
    const existentes = await tx
      .select({ id: habilidades.id })
      .from(habilidades)
      .where(and(inArray(habilidades.id, tecnologias), eq(habilidades.activa, true)));
    if (existentes.length !== tecnologias.length) return 'tecnologiaIds';

    const imagenes = [...new Set(entrada.archivoIds)];
    if (imagenes.length > 0) {
      const propias = await tx
        .select({ id: archivos.id })
        .from(archivos)
        .where(
          and(
            inArray(archivos.id, imagenes),
            eq(archivos.propietarioId, autorId),
            eq(archivos.estado, 'listo'),
            eq(archivos.proposito, 'imagen_proyecto'),
          ),
        );
      if (propias.length !== imagenes.length) return 'archivoIds';
    }
    return null;
  }

  private async tecnologiasDe(
    proyectoIds: string[],
  ): Promise<Map<string, { id: string; nombre: string }[]>> {
    const porProyecto = new Map<string, { id: string; nombre: string }[]>();
    if (proyectoIds.length === 0) return porProyecto;
    const filas = await this.db
      .select({
        proyectoId: proyectoTecnologias.proyectoId,
        id: habilidades.id,
        nombre: habilidades.nombre,
      })
      .from(proyectoTecnologias)
      .innerJoin(habilidades, eq(habilidades.id, proyectoTecnologias.habilidadId))
      .where(inArray(proyectoTecnologias.proyectoId, proyectoIds))
      .orderBy(habilidades.nombre);
    for (const fila of filas) {
      const lista = porProyecto.get(fila.proyectoId) ?? [];
      lista.push({ id: fila.id, nombre: fila.nombre });
      porProyecto.set(fila.proyectoId, lista);
    }
    return porProyecto;
  }

  private async likesDe(usuarioId: string, proyectoIds: string[]): Promise<Set<string>> {
    if (proyectoIds.length === 0) return new Set();
    const filas = await this.db
      .select({ proyectoId: likes.proyectoId })
      .from(likes)
      .where(and(eq(likes.usuarioId, usuarioId), inArray(likes.proyectoId, proyectoIds)));
    return new Set(filas.map((fila) => fila.proyectoId));
  }
}
