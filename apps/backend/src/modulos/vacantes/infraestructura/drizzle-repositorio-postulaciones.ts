import {
  and,
  carreras,
  desc,
  empresas,
  eq,
  historialPostulaciones,
  inArray,
  isNull,
  postulacionProyectos,
  postulaciones,
  proyectos,
  sql,
  talentos,
  vacantes,
} from '@impulsau/db';
import type { BaseDeDatos, SQL } from '@impulsau/db';
import type { vacantes as contrato } from '@impulsau/contracts';
import type { ResultadoEscritura } from '../../../compartido/dominio/errores.js';
import type { RepositorioPostulaciones, ResultadoPostular } from '../puertos/puertos.js';

type ProyectosAdjuntos = Map<string, { id: string; titulo: string }[]>;

export class DrizzleRepositorioPostulaciones implements RepositorioPostulaciones {
  constructor(private readonly db: BaseDeDatos) {}

  postular(
    talentoId: string,
    vacanteId: string,
    proyectoIds: string[],
  ): Promise<ResultadoPostular> {
    return this.db.transaction(async (tx) => {
      const [vacante] = await tx
        .select({ estado: vacantes.estado })
        .from(vacantes)
        .where(and(eq(vacantes.id, vacanteId), isNull(vacantes.eliminadoEn)))
        .limit(1);
      if (!vacante || vacante.estado === 'borrador') {
        return { tipo: 'vacante_no_encontrada' as const };
      }
      if (vacante.estado !== 'abierta') return { tipo: 'vacante_no_abierta' as const };

      const unicos = [...new Set(proyectoIds)];
      const propios = await tx
        .select({ id: proyectos.id })
        .from(proyectos)
        .where(
          and(
            inArray(proyectos.id, unicos),
            eq(proyectos.autorId, talentoId),
            eq(proyectos.estado, 'publicado'),
            isNull(proyectos.eliminadoEn),
          ),
        );
      if (propios.length !== unicos.length) return { tipo: 'proyecto_invalido' as const };

      const [fila] = await tx
        .insert(postulaciones)
        .values({ vacanteId, talentoId })
        .onConflictDoNothing()
        .returning({ id: postulaciones.id });
      if (!fila) return { tipo: 'ya_postulado' as const };

      await tx
        .insert(postulacionProyectos)
        .values(unicos.map((proyectoId) => ({ postulacionId: fila.id, proyectoId })));
      await tx.insert(historialPostulaciones).values({
        postulacionId: fila.id,
        deEstado: null,
        aEstado: 'recibida',
        actorId: talentoId,
      });
      return { tipo: 'ok' as const, id: fila.id };
    });
  }

  async obtenerDelTalento(id: string, talentoId: string): Promise<contrato.Postulacion | null> {
    const lista = await this.cargarDelTalento(
      and(eq(postulaciones.id, id), eq(postulaciones.talentoId, talentoId)),
    );
    return lista[0] ?? null;
  }

  delTalento(talentoId: string): Promise<contrato.Postulacion[]> {
    return this.cargarDelTalento(eq(postulaciones.talentoId, talentoId));
  }

  async deLaVacante(
    vacanteId: string,
    empresaId: string,
  ): Promise<contrato.PostulacionRecibida[] | null> {
    const [vacante] = await this.db
      .select({ id: vacantes.id })
      .from(vacantes)
      .where(and(eq(vacantes.id, vacanteId), eq(vacantes.empresaId, empresaId)))
      .limit(1);
    if (!vacante) return null;
    return this.cargarRecibidas(eq(postulaciones.vacanteId, vacanteId));
  }

  cambiarEstado(
    id: string,
    empresaId: string,
    entrada: contrato.CambiarEstadoPostulacionEntrada,
    ahora: Date,
  ): Promise<ResultadoEscritura<contrato.PostulacionRecibida>> {
    return this.db.transaction(async (tx) => {
      const [actual] = await tx
        .select({ estado: postulaciones.estado })
        .from(postulaciones)
        .innerJoin(vacantes, eq(vacantes.id, postulaciones.vacanteId))
        .where(and(eq(postulaciones.id, id), eq(vacantes.empresaId, empresaId)))
        .limit(1);
      if (!actual) return { tipo: 'no_encontrado' as const };

      const descartada = entrada.estado === 'descartada';
      const actualizadas = await tx
        .update(postulaciones)
        .set({
          estado: entrada.estado,
          motivoDescarte: descartada ? (entrada.motivoDescarte ?? null) : null,
          detalleDescarte: descartada ? (entrada.detalleDescarte ?? null) : null,
          version: sql`${postulaciones.version} + 1`,
          actualizadoEn: ahora,
        })
        .where(and(eq(postulaciones.id, id), eq(postulaciones.version, entrada.version)))
        .returning({ id: postulaciones.id });
      if (actualizadas.length === 0) return { tipo: 'conflicto' as const };

      await tx.insert(historialPostulaciones).values({
        postulacionId: id,
        deEstado: actual.estado,
        aEstado: entrada.estado,
        actorId: empresaId,
      });

      const [recibida] = await this.cargarRecibidas(eq(postulaciones.id, id), tx);
      return recibida
        ? { tipo: 'ok' as const, valor: recibida }
        : { tipo: 'no_encontrado' as const };
    });
  }

  private async proyectosAdjuntos(
    ids: string[],
    lector: Pick<BaseDeDatos, 'select'>,
  ): Promise<ProyectosAdjuntos> {
    const porPostulacion: ProyectosAdjuntos = new Map();
    if (ids.length === 0) return porPostulacion;
    const filas = await lector
      .select({
        postulacionId: postulacionProyectos.postulacionId,
        id: proyectos.id,
        titulo: proyectos.titulo,
      })
      .from(postulacionProyectos)
      .innerJoin(proyectos, eq(proyectos.id, postulacionProyectos.proyectoId))
      .where(inArray(postulacionProyectos.postulacionId, ids));
    for (const fila of filas) {
      const lista = porPostulacion.get(fila.postulacionId) ?? [];
      lista.push({ id: fila.id, titulo: fila.titulo });
      porPostulacion.set(fila.postulacionId, lista);
    }
    return porPostulacion;
  }

  private async cargarDelTalento(condicion: SQL | undefined): Promise<contrato.Postulacion[]> {
    const filas = await this.db
      .select({
        postulacion: postulaciones,
        vacanteTitulo: vacantes.titulo,
        empresaNombre: empresas.nombreComercial,
      })
      .from(postulaciones)
      .innerJoin(vacantes, eq(vacantes.id, postulaciones.vacanteId))
      .innerJoin(empresas, eq(empresas.usuarioId, vacantes.empresaId))
      .where(condicion)
      .orderBy(desc(postulaciones.creadoEn));
    const adjuntos = await this.proyectosAdjuntos(
      filas.map((fila) => fila.postulacion.id),
      this.db,
    );
    return filas.map(({ postulacion, vacanteTitulo, empresaNombre }) => ({
      id: postulacion.id,
      vacante: { id: postulacion.vacanteId, titulo: vacanteTitulo, empresa: empresaNombre },
      estado: postulacion.estado,
      motivoDescarte: postulacion.motivoDescarte,
      proyectos: adjuntos.get(postulacion.id) ?? [],
      creadaEn: postulacion.creadoEn.toISOString(),
    }));
  }

  private async cargarRecibidas(
    condicion: SQL | undefined,
    lector: Pick<BaseDeDatos, 'select'> = this.db,
  ): Promise<contrato.PostulacionRecibida[]> {
    const filas = await lector
      .select({
        postulacion: postulaciones,
        talentoNombre: talentos.nombreCompleto,
        carreraNombre: carreras.nombre,
      })
      .from(postulaciones)
      .innerJoin(talentos, eq(talentos.usuarioId, postulaciones.talentoId))
      .leftJoin(carreras, eq(carreras.id, talentos.carreraId))
      .where(condicion)
      .orderBy(desc(postulaciones.creadoEn));
    const adjuntos = await this.proyectosAdjuntos(
      filas.map((fila) => fila.postulacion.id),
      lector,
    );
    return filas.map(({ postulacion, talentoNombre, carreraNombre }) => ({
      id: postulacion.id,
      talento: { id: postulacion.talentoId, nombre: talentoNombre, carrera: carreraNombre },
      estado: postulacion.estado,
      motivoDescarte: postulacion.motivoDescarte,
      detalleDescarte: postulacion.detalleDescarte,
      proyectos: adjuntos.get(postulacion.id) ?? [],
      creadaEn: postulacion.creadoEn.toISOString(),
      version: postulacion.version,
    }));
  }
}
