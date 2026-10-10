import { and, eq, isNull, talentos, usuarios } from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import type { NuevoTalento, RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';

export class DrizzleRepositorioUsuarios implements RepositorioUsuarios {
  constructor(private readonly db: BaseDeDatos) {}

  crearTalento(talento: NuevoTalento): Promise<'creado' | 'ya_existia'> {
    return this.db.transaction(async (tx) => {
      const insertados = await tx
        .insert(usuarios)
        .values({
          id: talento.id,
          correo: talento.correo,
          rol: 'talento',
          fechaNacimiento: talento.fechaNacimiento,
        })
        .onConflictDoNothing({ target: usuarios.id })
        .returning({ id: usuarios.id });
      if (insertados.length === 0) return 'ya_existia';

      await tx.insert(talentos).values({
        usuarioId: talento.id,
        nombreCompleto: talento.nombreCompleto,
        estadoAcademico: talento.estadoAcademico,
        ciclo: talento.ciclo,
        anioEgreso: talento.anioEgreso,
        declaracionSinExperienciaEn: talento.declaracionSinExperienciaEn,
      });
      return 'creado';
    });
  }

  async buscarPorId(id: string): Promise<UsuarioAutenticado | null> {
    const [fila] = await this.db
      .select({ id: usuarios.id, rol: usuarios.rol, estado: usuarios.estado })
      .from(usuarios)
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .limit(1);
    return fila ?? null;
  }
}
