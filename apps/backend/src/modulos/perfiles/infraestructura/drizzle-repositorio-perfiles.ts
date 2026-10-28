import {
  and,
  asc,
  carreras,
  desc,
  empresas,
  enlacesTalento,
  eq,
  evidenciaHabilidades,
  habilidades,
  inArray,
  instituciones,
  isNull,
  proyectos,
  sql,
  talentoHabilidades,
  talentos,
  usuarios,
} from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import type { perfiles } from '@impulsau/contracts';
import { imagenesDeProyectos } from '../../../compartido/infraestructura/imagenes-proyecto.js';
import type {
  RepositorioPerfiles,
  ResultadoActualizacion,
} from '../puertos/repositorio-perfiles.js';

const MAXIMO_PROYECTOS_EN_PERFIL = 24;

export class DrizzleRepositorioPerfiles implements RepositorioPerfiles {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly urlSupabase: string,
  ) {}

  async obtenerTalento(id: string): Promise<perfiles.PerfilTalento | null> {
    const [fila] = await this.db
      .select({
        talento: talentos,
        carreraNombre: carreras.nombre,
        institucionNombre: instituciones.nombre,
      })
      .from(talentos)
      .innerJoin(usuarios, eq(usuarios.id, talentos.usuarioId))
      .leftJoin(carreras, eq(carreras.id, talentos.carreraId))
      .leftJoin(instituciones, eq(instituciones.id, talentos.institucionId))
      .where(and(eq(talentos.usuarioId, id), isNull(usuarios.eliminadoEn)))
      .limit(1);
    if (!fila) return null;
    const { talento } = fila;

    const [declaradas, demostradas, enlaces, publicados] = await Promise.all([
      this.db
        .select({
          id: habilidades.id,
          nombre: habilidades.nombre,
          categoria: habilidades.categoria,
        })
        .from(talentoHabilidades)
        .innerJoin(habilidades, eq(habilidades.id, talentoHabilidades.habilidadId))
        .where(eq(talentoHabilidades.talentoId, id)),
      this.db
        .select({
          id: habilidades.id,
          nombre: habilidades.nombre,
          categoria: habilidades.categoria,
          proyectos: evidenciaHabilidades.proyectos,
        })
        .from(evidenciaHabilidades)
        .innerJoin(habilidades, eq(habilidades.id, evidenciaHabilidades.habilidadId))
        .where(eq(evidenciaHabilidades.talentoId, id)),
      this.db
        .select({ tipo: enlacesTalento.tipo, url: enlacesTalento.url })
        .from(enlacesTalento)
        .where(eq(enlacesTalento.talentoId, id))
        .orderBy(asc(enlacesTalento.orden)),
      this.db
        .select({
          id: proyectos.id,
          titulo: proyectos.titulo,
          likes: proyectos.likes,
          publicadoEn: proyectos.publicadoEn,
        })
        .from(proyectos)
        .where(
          and(
            eq(proyectos.autorId, id),
            eq(proyectos.estado, 'publicado'),
            isNull(proyectos.eliminadoEn),
          ),
        )
        .orderBy(desc(proyectos.publicadoEn))
        .limit(MAXIMO_PROYECTOS_EN_PERFIL),
    ]);

    const habilidadesPerfil = new Map<string, perfiles.HabilidadPerfil>();
    for (const habilidad of declaradas) {
      habilidadesPerfil.set(habilidad.id, { ...habilidad, proyectos: 0 });
    }
    for (const habilidad of demostradas) habilidadesPerfil.set(habilidad.id, habilidad);

    const imagenes = await imagenesDeProyectos(
      this.db,
      this.urlSupabase,
      publicados.map((proyecto) => proyecto.id),
    );

    return {
      id: talento.usuarioId,
      nombreCompleto: talento.nombreCompleto,
      estadoAcademico: talento.estadoAcademico,
      ciclo: talento.ciclo,
      anioEgreso: talento.anioEgreso,
      carrera:
        talento.carreraId && fila.carreraNombre
          ? { id: talento.carreraId, nombre: fila.carreraNombre }
          : null,
      institucion:
        talento.institucionId && fila.institucionNombre
          ? { id: talento.institucionId, nombre: fila.institucionNombre }
          : null,
      departamento: talento.departamento,
      bio: talento.bio,
      habilidades: [...habilidadesPerfil.values()].sort(
        (a, b) => b.proyectos - a.proyectos || a.nombre.localeCompare(b.nombre),
      ),
      enlaces,
      proyectos: publicados.map((proyecto) => ({
        id: proyecto.id,
        titulo: proyecto.titulo,
        imagenUrl: imagenes.get(proyecto.id)?.[0]?.url ?? null,
        likes: proyecto.likes,
        publicadoEn: (proyecto.publicadoEn ?? new Date(0)).toISOString(),
      })),
      version: talento.version,
    };
  }

  async actualizarTalento(
    id: string,
    entrada: perfiles.ActualizarPerfilTalentoEntrada,
  ): Promise<ResultadoActualizacion<perfiles.PerfilTalento>> {
    const referencia = await this.referenciaInvalida(entrada);
    if (referencia) return { tipo: 'referencia_invalida', campo: referencia };

    const resultado = await this.db.transaction(async (tx) => {
      const actualizados = await tx
        .update(talentos)
        .set({
          nombreCompleto: entrada.nombreCompleto,
          carreraId: entrada.carreraId,
          institucionId: entrada.institucionId,
          departamento: entrada.departamento,
          bio: entrada.bio === '' ? null : entrada.bio,
          version: sql`${talentos.version} + 1`,
          actualizadoEn: new Date(),
        })
        .where(and(eq(talentos.usuarioId, id), eq(talentos.version, entrada.version)))
        .returning({ id: talentos.usuarioId });
      if (actualizados.length === 0) {
        const [existe] = await tx
          .select({ id: talentos.usuarioId })
          .from(talentos)
          .where(eq(talentos.usuarioId, id))
          .limit(1);
        return existe ? ('conflicto' as const) : ('no_encontrado' as const);
      }

      await tx.delete(talentoHabilidades).where(eq(talentoHabilidades.talentoId, id));
      const unicas = [...new Set(entrada.habilidadIds)];
      if (unicas.length > 0) {
        await tx
          .insert(talentoHabilidades)
          .values(unicas.map((habilidadId) => ({ talentoId: id, habilidadId })));
      }
      await tx.delete(enlacesTalento).where(eq(enlacesTalento.talentoId, id));
      if (entrada.enlaces.length > 0) {
        await tx.insert(enlacesTalento).values(
          entrada.enlaces.map((enlace, orden) => ({
            talentoId: id,
            tipo: enlace.tipo,
            url: enlace.url,
            orden,
          })),
        );
      }
      return 'ok' as const;
    });

    if (resultado !== 'ok') return { tipo: resultado };
    const perfil = await this.obtenerTalento(id);
    return perfil ? { tipo: 'ok', perfil } : { tipo: 'no_encontrado' };
  }

  async obtenerEmpresa(id: string): Promise<perfiles.PerfilEmpresa | null> {
    const [fila] = await this.db
      .select()
      .from(empresas)
      .innerJoin(usuarios, eq(usuarios.id, empresas.usuarioId))
      .where(and(eq(empresas.usuarioId, id), isNull(usuarios.eliminadoEn)))
      .limit(1);
    if (!fila) return null;
    const empresa = fila.empresas;
    return {
      id: empresa.usuarioId,
      nombreComercial: empresa.nombreComercial,
      nombreLegal: empresa.nombreLegal,
      sector: empresa.sector,
      sitioWeb: empresa.sitioWeb,
      descripcion: empresa.descripcion,
      estadoVerificacion: empresa.estadoVerificacion,
      esAgencia: empresa.esAgencia,
      clienteDeclarado: empresa.clienteDeclarado,
      version: empresa.version,
    };
  }

  async actualizarEmpresa(
    id: string,
    entrada: perfiles.ActualizarPerfilEmpresaEntrada,
  ): Promise<ResultadoActualizacion<perfiles.PerfilEmpresa>> {
    const actualizadas = await this.db
      .update(empresas)
      .set({
        nombreComercial: entrada.nombreComercial,
        nombreLegal: entrada.nombreLegal,
        sector: entrada.sector,
        sitioWeb: entrada.sitioWeb,
        descripcion: entrada.descripcion,
        esAgencia: entrada.esAgencia,
        clienteDeclarado: entrada.esAgencia ? entrada.clienteDeclarado : null,
        version: sql`${empresas.version} + 1`,
        actualizadoEn: new Date(),
      })
      .where(and(eq(empresas.usuarioId, id), eq(empresas.version, entrada.version)))
      .returning({ id: empresas.usuarioId });

    if (actualizadas.length === 0) {
      const existente = await this.obtenerEmpresa(id);
      return { tipo: existente ? 'conflicto' : 'no_encontrado' };
    }
    const perfil = await this.obtenerEmpresa(id);
    return perfil ? { tipo: 'ok', perfil } : { tipo: 'no_encontrado' };
  }

  /** Devuelve el campo con una referencia que no existe en los catálogos, o `null` si todo es válido. */
  private async referenciaInvalida(
    entrada: perfiles.ActualizarPerfilTalentoEntrada,
  ): Promise<string | null> {
    if (entrada.carreraId) {
      const [carrera] = await this.db
        .select({ id: carreras.id })
        .from(carreras)
        .where(eq(carreras.id, entrada.carreraId))
        .limit(1);
      if (!carrera) return 'carreraId';
    }
    if (entrada.institucionId) {
      const [institucion] = await this.db
        .select({ id: instituciones.id })
        .from(instituciones)
        .where(eq(instituciones.id, entrada.institucionId))
        .limit(1);
      if (!institucion) return 'institucionId';
    }
    const unicas = [...new Set(entrada.habilidadIds)];
    if (unicas.length > 0) {
      const existentes = await this.db
        .select({ id: habilidades.id })
        .from(habilidades)
        .where(and(inArray(habilidades.id, unicas), eq(habilidades.activa, true)));
      if (existentes.length !== unicas.length) return 'habilidadIds';
    }
    return null;
  }
}
