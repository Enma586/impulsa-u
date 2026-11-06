import {
  and,
  desc,
  empresas,
  eq,
  evidenciaHabilidades,
  habilidades,
  ilike,
  inArray,
  isNull,
  or,
  postulaciones,
  sql,
  talentoHabilidades,
  vacanteHabilidades,
  vacantes,
} from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import type { vacantes as contrato } from '@impulsau/contracts';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import type { ResultadoEscritura } from '../../../compartido/dominio/errores.js';
import type { RepositorioVacantes } from '../puertos/puertos.js';

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

type FilaVacante = typeof vacantes.$inferSelect;

export class DrizzleRepositorioVacantes implements RepositorioVacantes {
  constructor(private readonly db: BaseDeDatos) {}

  crear(
    empresaId: string,
    entrada: contrato.PublicarVacanteEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>> {
    return this.db.transaction(async (tx) => {
      const campo = await this.habilidadInvalida(tx, entrada.habilidades);
      if (campo) return { tipo: 'referencia_invalida' as const, campo };

      const [fila] = await tx
        .insert(vacantes)
        .values({
          empresaId,
          titulo: entrada.titulo,
          descripcion: entrada.descripcion,
          tipo: entrada.tipo,
          modalidad: entrada.modalidad,
          departamento: entrada.modalidad === 'remota' ? null : entrada.departamento,
          estado: entrada.publicar ? 'abierta' : 'borrador',
          publicadaEn: entrada.publicar ? ahora : null,
        })
        .returning({ id: vacantes.id });
      if (!fila) throw new Error('No se pudo crear la vacante');

      await this.guardarHabilidades(tx, fila.id, entrada.habilidades);
      return { tipo: 'ok' as const, valor: { id: fila.id } };
    });
  }

  async obtener(id: string, usuario: UsuarioAutenticado): Promise<contrato.VacanteDetalle | null> {
    const [fila] = await this.db
      .select({ vacante: vacantes, empresaNombre: empresas.nombreComercial })
      .from(vacantes)
      .innerJoin(empresas, eq(empresas.usuarioId, vacantes.empresaId))
      .where(
        and(
          eq(vacantes.id, id),
          isNull(vacantes.eliminadoEn),
          or(sql`${vacantes.estado} <> 'borrador'`, eq(vacantes.empresaId, usuario.id)),
        ),
      )
      .limit(1);
    if (!fila) return null;

    const resumen = (await this.resumir([fila], usuario))[0];
    if (!resumen) return null;

    let yaPostulado = false;
    if (usuario.rol === 'talento') {
      const [postulacion] = await this.db
        .select({ id: postulaciones.id })
        .from(postulaciones)
        .where(and(eq(postulaciones.vacanteId, id), eq(postulaciones.talentoId, usuario.id)))
        .limit(1);
      yaPostulado = postulacion !== undefined;
    }

    return {
      ...resumen,
      descripcion: fila.vacante.descripcion,
      esMia: fila.vacante.empresaId === usuario.id,
      yaPostulado,
      version: fila.vacante.version,
    };
  }

  async listar(
    usuario: UsuarioAutenticado,
    consulta: contrato.ConsultaVacantes,
  ): Promise<contrato.PaginaVacantes> {
    const orden = sql`coalesce(${vacantes.publicadaEn}, ${vacantes.creadoEn})`;
    const condiciones = [isNull(vacantes.eliminadoEn)];
    if (consulta.mias === true && usuario.rol === 'empresa') {
      condiciones.push(eq(vacantes.empresaId, usuario.id));
    } else {
      condiciones.push(eq(vacantes.estado, 'abierta'));
    }
    if (consulta.tipo) condiciones.push(eq(vacantes.tipo, consulta.tipo));
    if (consulta.modalidad) condiciones.push(eq(vacantes.modalidad, consulta.modalidad));
    if (consulta.q) {
      const patron = `%${consulta.q.replace(/[%_\\]/g, '\\$&')}%`;
      const coincide = or(ilike(vacantes.titulo, patron), ilike(empresas.nombreComercial, patron));
      if (coincide) condiciones.push(coincide);
    }
    if (consulta.cursor) {
      const cursor = decodificarCursor(consulta.cursor);
      if (cursor) {
        condiciones.push(
          sql`(${orden}, ${vacantes.id}) < (${cursor.orden}::timestamptz, ${cursor.id}::uuid)`,
        );
      }
    }

    const filas = await this.db
      .select({
        vacante: vacantes,
        empresaNombre: empresas.nombreComercial,
        orden: sql<string>`(${orden})::text`,
      })
      .from(vacantes)
      .innerJoin(empresas, eq(empresas.usuarioId, vacantes.empresaId))
      .where(and(...condiciones))
      .orderBy(desc(orden), desc(vacantes.id))
      .limit(consulta.limite + 1);

    const hayMas = filas.length > consulta.limite;
    const pagina = hayMas ? filas.slice(0, consulta.limite) : filas;
    const ultima = pagina.at(-1);
    return {
      items: await this.resumir(pagina, usuario),
      siguienteCursor: hayMas && ultima ? codificarCursor(ultima.orden, ultima.vacante.id) : null,
    };
  }

  editar(
    id: string,
    empresaId: string,
    entrada: contrato.EditarVacanteEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>> {
    return this.db.transaction(async (tx) => {
      const [actual] = await tx
        .select({ empresaId: vacantes.empresaId })
        .from(vacantes)
        .where(and(eq(vacantes.id, id), isNull(vacantes.eliminadoEn)))
        .limit(1);
      if (!actual) return { tipo: 'no_encontrado' as const };
      if (actual.empresaId !== empresaId) return { tipo: 'prohibido' as const };

      const campo = await this.habilidadInvalida(tx, entrada.habilidades);
      if (campo) return { tipo: 'referencia_invalida' as const, campo };

      const actualizadas = await tx
        .update(vacantes)
        .set({
          titulo: entrada.titulo,
          descripcion: entrada.descripcion,
          tipo: entrada.tipo,
          modalidad: entrada.modalidad,
          departamento: entrada.modalidad === 'remota' ? null : entrada.departamento,
          version: sql`${vacantes.version} + 1`,
          actualizadoEn: ahora,
        })
        .where(and(eq(vacantes.id, id), eq(vacantes.version, entrada.version)))
        .returning({ id: vacantes.id });
      if (actualizadas.length === 0) return { tipo: 'conflicto' as const };

      await tx.delete(vacanteHabilidades).where(eq(vacanteHabilidades.vacanteId, id));
      await this.guardarHabilidades(tx, id, entrada.habilidades);
      return { tipo: 'ok' as const, valor: { id } };
    });
  }

  async cambiarEstado(
    id: string,
    empresaId: string,
    estado: contrato.CambiarEstadoVacanteEntrada['estado'],
    ahora: Date,
  ): Promise<ResultadoEscritura<{ id: string }>> {
    const [actual] = await this.db
      .select({ empresaId: vacantes.empresaId, publicadaEn: vacantes.publicadaEn })
      .from(vacantes)
      .where(and(eq(vacantes.id, id), isNull(vacantes.eliminadoEn)))
      .limit(1);
    if (!actual) return { tipo: 'no_encontrado' };
    if (actual.empresaId !== empresaId) return { tipo: 'prohibido' };

    await this.db
      .update(vacantes)
      .set({
        estado,
        publicadaEn: estado === 'abierta' ? (actual.publicadaEn ?? ahora) : actual.publicadaEn,
        cerradaEn: estado === 'cerrada' ? ahora : null,
        version: sql`${vacantes.version} + 1`,
        actualizadoEn: ahora,
      })
      .where(eq(vacantes.id, id));
    return { tipo: 'ok', valor: { id } };
  }

  private async resumir(
    filas: { vacante: FilaVacante; empresaNombre: string }[],
    usuario: UsuarioAutenticado,
  ): Promise<contrato.VacanteResumen[]> {
    const ids = filas.map((fila) => fila.vacante.id);
    const habilidadesPorVacante = new Map<string, contrato.VacanteResumen['habilidades']>();
    if (ids.length > 0) {
      const requeridas = await this.db
        .select({
          vacanteId: vacanteHabilidades.vacanteId,
          id: habilidades.id,
          nombre: habilidades.nombre,
          requerida: vacanteHabilidades.requerida,
        })
        .from(vacanteHabilidades)
        .innerJoin(habilidades, eq(habilidades.id, vacanteHabilidades.habilidadId))
        .where(inArray(vacanteHabilidades.vacanteId, ids))
        .orderBy(desc(vacanteHabilidades.requerida), habilidades.nombre);
      for (const fila of requeridas) {
        const lista = habilidadesPorVacante.get(fila.vacanteId) ?? [];
        lista.push({ id: fila.id, nombre: fila.nombre, requerida: fila.requerida });
        habilidadesPorVacante.set(fila.vacanteId, lista);
      }
    }

    const propias = usuario.rol === 'talento' ? await this.habilidadesDelTalento(usuario.id) : null;

    return filas.map(({ vacante, empresaNombre }) => {
      const lista = habilidadesPorVacante.get(vacante.id) ?? [];
      const coincidencia =
        propias && lista.length > 0
          ? Math.round((100 * lista.filter((h) => propias.has(h.id)).length) / lista.length)
          : null;
      return {
        id: vacante.id,
        titulo: vacante.titulo,
        empresa: { id: vacante.empresaId, nombre: empresaNombre },
        tipo: vacante.tipo,
        modalidad: vacante.modalidad,
        departamento: vacante.departamento,
        estado: vacante.estado,
        habilidades: lista,
        coincidencia,
        publicadaEn: vacante.publicadaEn?.toISOString() ?? null,
      };
    });
  }

  /** Habilidades que el talento declaró más las que demostró con proyectos publicados. */
  private async habilidadesDelTalento(talentoId: string): Promise<Set<string>> {
    const [declaradas, demostradas] = await Promise.all([
      this.db
        .select({ id: talentoHabilidades.habilidadId })
        .from(talentoHabilidades)
        .where(eq(talentoHabilidades.talentoId, talentoId)),
      this.db
        .select({ id: evidenciaHabilidades.habilidadId })
        .from(evidenciaHabilidades)
        .where(eq(evidenciaHabilidades.talentoId, talentoId)),
    ]);
    return new Set([...declaradas, ...demostradas].map((fila) => fila.id));
  }

  private async habilidadInvalida(
    tx: Pick<BaseDeDatos, 'select'>,
    elegidas: { id: string }[],
  ): Promise<string | null> {
    const ids = [...new Set(elegidas.map((habilidad) => habilidad.id))];
    const existentes = await tx
      .select({ id: habilidades.id })
      .from(habilidades)
      .where(and(inArray(habilidades.id, ids), eq(habilidades.activa, true)));
    return existentes.length === ids.length ? null : 'habilidades';
  }

  private async guardarHabilidades(
    tx: Pick<BaseDeDatos, 'insert'>,
    vacanteId: string,
    elegidas: { id: string; requerida: boolean }[],
  ): Promise<void> {
    const unicas = new Map(elegidas.map((habilidad) => [habilidad.id, habilidad.requerida]));
    await tx
      .insert(vacanteHabilidades)
      .values(
        [...unicas].map(([habilidadId, requerida]) => ({ vacanteId, habilidadId, requerida })),
      );
  }
}
