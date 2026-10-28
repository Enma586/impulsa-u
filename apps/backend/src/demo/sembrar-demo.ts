import {
  carreras,
  empresas,
  enlacesTalento,
  eq,
  habilidades,
  historialPostulaciones,
  instituciones,
  likes,
  postulacionProyectos,
  postulaciones,
  proyectoTecnologias,
  proyectos,
  sembrarCatalogos,
  talentoHabilidades,
  talentos,
  usuarios,
  vacanteHabilidades,
  vacantes,
} from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import { recalcularEvidencia } from '../compartido/infraestructura/evidencia.js';
import {
  EMPRESA_DEMO,
  POSTULACIONES_DEMO,
  PROYECTOS_DEMO,
  TALENTOS_DEMO,
  VACANTES_DEMO,
} from './historia.js';

/** Crea la cuenta en el proveedor de identidad (ya confirmada) y devuelve su id. */
export type CrearCuenta = (correo: string) => Promise<string>;

export type ResultadoSiembra = 'sembrada' | 'ya_sembrada';

function buscar(filas: { nombre: string; id: string }[], nombre: string): string {
  const fila = filas.find((candidata) => candidata.nombre === nombre);
  if (!fila) throw new Error(`Falta "${nombre}" en los catálogos`);
  return fila.id;
}

function porTitulo(filas: { id: string; titulo: string }[], titulo: string): string {
  const fila = filas.find((candidata) => candidata.titulo === titulo);
  if (!fila) throw new Error(`Falta "${titulo}" en la historia de la demo`);
  return fila.id;
}

/**
 * Carga la historia de la demo: una empresa, tres talentos con proyectos y likes, vacantes y
 * postulaciones en distintos estados. Se puede repetir: si la empresa ya existe no hace nada.
 */
export async function sembrarHistoria(
  db: BaseDeDatos,
  crearCuenta: CrearCuenta,
): Promise<ResultadoSiembra> {
  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.correo, EMPRESA_DEMO.correo))
    .limit(1);
  if (existente) return 'ya_sembrada';

  await sembrarCatalogos(db);
  const catalogoHabilidades = await db
    .select({ id: habilidades.id, nombre: habilidades.nombre })
    .from(habilidades);
  const catalogoCarreras = await db
    .select({ id: carreras.id, nombre: carreras.nombre })
    .from(carreras);
  const catalogoInstituciones = await db
    .select({ id: instituciones.id, nombre: instituciones.nombre })
    .from(instituciones);

  const idEmpresa = await crearCuenta(EMPRESA_DEMO.correo);
  const idsTalento = new Map<string, string>();
  for (const talento of TALENTOS_DEMO) {
    idsTalento.set(talento.correo, await crearCuenta(talento.correo));
  }
  const idDe = (correo: string): string => {
    const id = idsTalento.get(correo);
    if (!id) throw new Error(`Falta el talento ${correo} en la historia de la demo`);
    return id;
  };

  await db.transaction(async (tx) => {
    await tx.insert(usuarios).values([
      { id: idEmpresa, correo: EMPRESA_DEMO.correo, rol: 'empresa', estado: 'activo' },
      ...TALENTOS_DEMO.map((talento) => ({
        id: idDe(talento.correo),
        correo: talento.correo,
        rol: 'talento' as const,
        estado: 'activo' as const,
        fechaNacimiento: '2002-05-14',
      })),
    ]);
    await tx.insert(empresas).values({
      usuarioId: idEmpresa,
      nombreComercial: EMPRESA_DEMO.nombreComercial,
      sector: EMPRESA_DEMO.sector,
      sitioWeb: EMPRESA_DEMO.sitioWeb,
      descripcion: EMPRESA_DEMO.descripcion,
      estadoVerificacion: 'verificada',
      verificadaEn: new Date(),
    });

    for (const talento of TALENTOS_DEMO) {
      const id = idDe(talento.correo);
      await tx.insert(talentos).values({
        usuarioId: id,
        nombreCompleto: talento.nombre,
        carreraId: buscar(catalogoCarreras, talento.carrera),
        institucionId: buscar(catalogoInstituciones, talento.institucion),
        estadoAcademico: talento.estado,
        ciclo: talento.ciclo,
        anioEgreso: talento.anioEgreso,
        departamento: talento.departamento,
        bio: talento.bio,
        declaracionSinExperienciaEn: new Date(),
      });
      await tx.insert(talentoHabilidades).values(
        talento.habilidades.map((nombre) => ({
          talentoId: id,
          habilidadId: buscar(catalogoHabilidades, nombre),
        })),
      );
      if (talento.enlaces.length > 0) {
        await tx
          .insert(enlacesTalento)
          .values(talento.enlaces.map((enlace, orden) => ({ talentoId: id, ...enlace, orden })));
      }
    }

    // Cada proyecto se publica un día antes que el anterior para que el feed tenga orden.
    const ahora = Date.now();
    const filasProyecto = await tx
      .insert(proyectos)
      .values(
        PROYECTOS_DEMO.map((proyecto, indice) => ({
          autorId: idDe(proyecto.autor),
          titulo: proyecto.titulo,
          descripcion: proyecto.descripcion,
          materia: proyecto.materia,
          periodo: proyecto.periodo,
          urlRepositorio: proyecto.urlRepositorio,
          estado: 'publicado' as const,
          likes: proyecto.likesDe.length,
          publicadoEn: new Date(ahora - indice * 86_400_000),
        })),
      )
      .returning({ id: proyectos.id, titulo: proyectos.titulo });

    for (const proyecto of PROYECTOS_DEMO) {
      const proyectoId = porTitulo(filasProyecto, proyecto.titulo);
      await tx.insert(proyectoTecnologias).values(
        proyecto.tecnologias.map((nombre) => ({
          proyectoId,
          habilidadId: buscar(catalogoHabilidades, nombre),
        })),
      );
      if (proyecto.likesDe.length > 0) {
        await tx
          .insert(likes)
          .values(proyecto.likesDe.map((correo) => ({ usuarioId: idDe(correo), proyectoId })));
      }
    }
    for (const talento of TALENTOS_DEMO) await recalcularEvidencia(tx, idDe(talento.correo));

    const filasVacante = await tx
      .insert(vacantes)
      .values(
        VACANTES_DEMO.map((vacante) => ({
          empresaId: idEmpresa,
          titulo: vacante.titulo,
          descripcion: vacante.descripcion,
          tipo: vacante.tipo,
          modalidad: vacante.modalidad,
          departamento: vacante.departamento,
          estado: vacante.estado,
          publicadaEn: vacante.estado === 'abierta' ? new Date() : null,
        })),
      )
      .returning({ id: vacantes.id, titulo: vacantes.titulo });
    for (const vacante of VACANTES_DEMO) {
      const vacanteId = porTitulo(filasVacante, vacante.titulo);
      await tx.insert(vacanteHabilidades).values([
        ...vacante.requeridas.map((nombre) => ({
          vacanteId,
          habilidadId: buscar(catalogoHabilidades, nombre),
          requerida: true,
        })),
        ...vacante.deseables.map((nombre) => ({
          vacanteId,
          habilidadId: buscar(catalogoHabilidades, nombre),
          requerida: false,
        })),
      ]);
    }

    for (const postulacion of POSTULACIONES_DEMO) {
      const talentoId = idDe(postulacion.talento);
      const [creada] = await tx
        .insert(postulaciones)
        .values({
          vacanteId: porTitulo(filasVacante, postulacion.vacante),
          talentoId,
          estado: postulacion.estado,
        })
        .returning({ id: postulaciones.id });
      if (!creada) throw new Error('No se pudo crear la postulación de la demo');
      await tx.insert(postulacionProyectos).values(
        postulacion.proyectos.map((titulo) => ({
          postulacionId: creada.id,
          proyectoId: porTitulo(filasProyecto, titulo),
        })),
      );
      await tx.insert(historialPostulaciones).values({
        postulacionId: creada.id,
        deEstado: null,
        aEstado: 'recibida',
        actorId: talentoId,
      });
      if (postulacion.estado !== 'recibida') {
        await tx.insert(historialPostulaciones).values({
          postulacionId: creada.id,
          deEstado: 'recibida',
          aEstado: postulacion.estado,
          actorId: idEmpresa,
        });
      }
    }
  });
  return 'sembrada';
}
