import { and, empresas, eq, isNull, talentos, usuarios } from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import type { auth } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import type {
  NuevaEmpresa,
  NuevoTalento,
  RepositorioUsuarios,
} from '../puertos/repositorio-usuarios.js';

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

  crearEmpresa(empresa: NuevaEmpresa): Promise<'creado' | 'ya_existia'> {
    return this.db.transaction(async (tx) => {
      const insertados = await tx
        .insert(usuarios)
        .values({ id: empresa.id, correo: empresa.correo, rol: 'empresa' })
        .onConflictDoNothing({ target: usuarios.id })
        .returning({ id: usuarios.id });
      if (insertados.length === 0) return 'ya_existia';

      await tx.insert(empresas).values({
        usuarioId: empresa.id,
        nombreComercial: empresa.nombreComercial,
        esAgencia: empresa.esAgencia,
        clienteDeclarado: empresa.clienteDeclarado,
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

  async resumenSesion(id: string): Promise<auth.UsuarioSesion | null> {
    const [fila] = await this.db
      .select({
        id: usuarios.id,
        correo: usuarios.correo,
        rol: usuarios.rol,
        estado: usuarios.estado,
        nombreTalento: talentos.nombreCompleto,
        nombreEmpresa: empresas.nombreComercial,
      })
      .from(usuarios)
      .leftJoin(talentos, eq(talentos.usuarioId, usuarios.id))
      .leftJoin(empresas, eq(empresas.usuarioId, usuarios.id))
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .limit(1);
    if (!fila) return null;
    return {
      id: fila.id,
      correo: fila.correo,
      rol: fila.rol,
      estado: fila.estado,
      nombre: fila.nombreTalento ?? fila.nombreEmpresa ?? fila.correo,
    };
  }

  async activar(id: string): Promise<void> {
    await this.db
      .update(usuarios)
      .set({ estado: 'activo', actualizadoEn: new Date() })
      .where(and(eq(usuarios.id, id), eq(usuarios.estado, 'pendiente_verificacion')));
  }
}
