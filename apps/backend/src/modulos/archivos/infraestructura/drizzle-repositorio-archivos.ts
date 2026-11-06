import { and, archivos, eq, sql, talentos } from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import type { ArchivoReservado, NuevaReserva, RepositorioArchivos } from '../puertos/puertos.js';

export class DrizzleRepositorioArchivos implements RepositorioArchivos {
  constructor(private readonly db: BaseDeDatos) {}

  reservar(reserva: NuevaReserva): Promise<{ tipo: 'ok'; id: string } | { tipo: 'limite' }> {
    return this.db.transaction(async (tx) => {
      const [cupo] = await tx
        .select({
          usado: talentos.almacenamientoUsadoBytes,
          limite: talentos.almacenamientoLimiteBytes,
        })
        .from(talentos)
        .where(eq(talentos.usuarioId, reserva.propietarioId))
        .limit(1);
      if (cupo && cupo.usado + reserva.tamanoBytes > cupo.limite)
        return { tipo: 'limite' as const };

      const [fila] = await tx
        .insert(archivos)
        .values({
          propietarioId: reserva.propietarioId,
          clave: reserva.clave,
          proposito: reserva.proposito,
          visibilidad: 'publico',
          tipoMime: reserva.tipoMime,
          tamanoBytes: reserva.tamanoBytes,
        })
        .returning({ id: archivos.id });
      if (!fila) throw new Error('No se pudo reservar el archivo');
      return { tipo: 'ok' as const, id: fila.id };
    });
  }

  async buscarDelPropietario(id: string, propietarioId: string): Promise<ArchivoReservado | null> {
    const [fila] = await this.db
      .select({
        id: archivos.id,
        clave: archivos.clave,
        tamanoBytes: archivos.tamanoBytes,
        estado: archivos.estado,
      })
      .from(archivos)
      .where(and(eq(archivos.id, id), eq(archivos.propietarioId, propietarioId)))
      .limit(1);
    return fila ?? null;
  }

  marcarListo(archivo: ArchivoReservado, propietarioId: string): Promise<'ok' | 'limite'> {
    return this.db.transaction(async (tx) => {
      const [cupo] = await tx
        .select({
          usado: talentos.almacenamientoUsadoBytes,
          limite: talentos.almacenamientoLimiteBytes,
        })
        .from(talentos)
        .where(eq(talentos.usuarioId, propietarioId))
        .for('update')
        .limit(1);
      if (cupo) {
        if (cupo.usado + archivo.tamanoBytes > cupo.limite) return 'limite' as const;
        await tx
          .update(talentos)
          .set({
            almacenamientoUsadoBytes: sql`${talentos.almacenamientoUsadoBytes} + ${archivo.tamanoBytes}`,
          })
          .where(eq(talentos.usuarioId, propietarioId));
      }
      await tx
        .update(archivos)
        .set({ estado: 'listo', confirmadoEn: new Date() })
        .where(and(eq(archivos.id, archivo.id), eq(archivos.estado, 'pendiente')));
      return 'ok' as const;
    });
  }
}
