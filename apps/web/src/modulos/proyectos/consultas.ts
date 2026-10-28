import { archivos, interacciones, proyectos } from '@impulsau/contracts';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ErrorDeApi, pedir } from '../../api/cliente';

interface FiltrosFeed {
  autorId?: string;
  mios?: boolean;
}

/** Feed paginado por cursor (CU-20). */
export function useFeed(filtros: FiltrosFeed) {
  return useInfiniteQuery({
    queryKey: ['proyectos', 'feed', filtros],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const consulta = new URLSearchParams({ limite: '9' });
      if (pageParam !== '') consulta.set('cursor', pageParam);
      if (filtros.autorId) consulta.set('autorId', filtros.autorId);
      if (filtros.mios) consulta.set('mios', 'true');
      return pedir(`/proyectos?${consulta.toString()}`, proyectos.PaginaProyectos);
    },
    getNextPageParam: (pagina) => pagina.siguienteCursor ?? undefined,
  });
}

export function useProyecto(id: string) {
  return useQuery({
    queryKey: ['proyectos', 'detalle', id],
    queryFn: () => pedir(`/proyectos/${id}`, proyectos.ProyectoDetalle),
  });
}

/** CU-22: `PUT` para dar like, `DELETE` para quitarlo; ambos son idempotentes. */
export function alternarLike(proyectoId: string, meGusta: boolean) {
  return pedir(`/proyectos/${proyectoId}/like`, interacciones.EstadoLike, {
    metodo: meGusta ? 'PUT' : 'DELETE',
  });
}

export function publicarProyecto(entrada: proyectos.PublicarProyectoEntrada, llave: string) {
  return pedir('/proyectos', proyectos.ProyectoDetalle, { metodo: 'POST', cuerpo: entrada, llave });
}

export function editarProyecto(id: string, entrada: proyectos.EditarProyectoEntrada) {
  return pedir(`/proyectos/${id}`, proyectos.ProyectoDetalle, { metodo: 'PUT', cuerpo: entrada });
}

export function eliminarProyecto(id: string) {
  return pedir(`/proyectos/${id}`, z.undefined(), { metodo: 'DELETE' });
}

/**
 * Sube una imagen directo al almacenamiento (el backend nunca la recibe): reserva la subida,
 * envía el archivo a la URL firmada y confirma que llegó.
 */
export async function subirImagen(archivo: File): Promise<{ id: string; url: string }> {
  const tipo = archivos.SolicitarSubidaEntrada.shape.tipoMime.safeParse(archivo.type);
  if (!tipo.success) throw new ErrorDeApi(422, 'validacion', 'Usa una imagen JPG, PNG o WebP');
  if (archivo.size > archivos.TAMANO_MAXIMO_IMAGEN_BYTES) {
    throw new ErrorDeApi(422, 'validacion', 'La imagen no puede superar los 2 MB');
  }

  const subida = await pedir('/archivos/subidas', archivos.SubidaSolicitada, {
    metodo: 'POST',
    llave: crypto.randomUUID(),
    cuerpo: { proposito: 'imagen_proyecto', tipoMime: tipo.data, tamanoBytes: archivo.size },
  });

  const formulario = new FormData();
  formulario.append('cacheControl', '3600');
  formulario.append('', archivo);
  let respuesta: Response;
  try {
    respuesta = await fetch(subida.urlSubida, { method: 'PUT', body: formulario });
  } catch {
    throw new ErrorDeApi(0, 'red', 'No pudimos subir la imagen. Revisa tu conexión');
  }
  if (!respuesta.ok)
    throw new ErrorDeApi(respuesta.status, 'error_interno', 'No pudimos subir la imagen');

  const confirmado = await pedir(
    `/archivos/${subida.archivoId}/confirmar`,
    archivos.ArchivoConfirmado,
    {
      metodo: 'POST',
      llave: crypto.randomUUID(),
    },
  );
  return { id: confirmado.id, url: confirmado.url };
}
