import { vacantes } from '@impulsau/contracts';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { pedir } from '../../api/cliente';

export interface FiltrosVacantes {
  q?: string;
  tipo?: vacantes.TipoVacante;
  modalidad?: vacantes.ModalidadVacante;
  mias?: boolean;
}

/** Lista de vacantes paginada por cursor (CU-42). */
export function useVacantes(filtros: FiltrosVacantes) {
  return useInfiniteQuery({
    queryKey: ['vacantes', 'lista', filtros],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const consulta = new URLSearchParams({ limite: '10' });
      if (pageParam !== '') consulta.set('cursor', pageParam);
      if (filtros.q) consulta.set('q', filtros.q);
      if (filtros.tipo) consulta.set('tipo', filtros.tipo);
      if (filtros.modalidad) consulta.set('modalidad', filtros.modalidad);
      if (filtros.mias) consulta.set('mias', 'true');
      return pedir(`/vacantes?${consulta.toString()}`, vacantes.PaginaVacantes);
    },
    getNextPageParam: (pagina) => pagina.siguienteCursor ?? undefined,
  });
}

export function useVacante(id: string) {
  return useQuery({
    queryKey: ['vacantes', 'detalle', id],
    queryFn: () => pedir(`/vacantes/${id}`, vacantes.VacanteDetalle),
  });
}

export function useMisPostulaciones() {
  return useQuery({
    queryKey: ['postulaciones', 'mias'],
    queryFn: () => pedir('/postulaciones/mias', z.array(vacantes.Postulacion)),
  });
}

export function usePostulacionesRecibidas(vacanteId: string) {
  return useQuery({
    queryKey: ['postulaciones', 'recibidas', vacanteId],
    queryFn: () =>
      pedir(`/vacantes/${vacanteId}/postulaciones`, z.array(vacantes.PostulacionRecibida)),
  });
}

export function publicarVacante(entrada: vacantes.PublicarVacanteEntrada) {
  return pedir('/vacantes', vacantes.VacanteDetalle, {
    metodo: 'POST',
    cuerpo: entrada,
    llave: crypto.randomUUID(),
  });
}

export function editarVacante(id: string, entrada: vacantes.EditarVacanteEntrada) {
  return pedir(`/vacantes/${id}`, vacantes.VacanteDetalle, { metodo: 'PUT', cuerpo: entrada });
}

export function cambiarEstadoVacante(
  id: string,
  estado: vacantes.CambiarEstadoVacanteEntrada['estado'],
) {
  return pedir(`/vacantes/${id}/estado`, vacantes.VacanteDetalle, {
    metodo: 'PUT',
    cuerpo: { estado },
  });
}

export function postularse(vacanteId: string, entrada: vacantes.PostularseEntrada, llave: string) {
  return pedir(`/vacantes/${vacanteId}/postulaciones`, vacantes.Postulacion, {
    metodo: 'POST',
    cuerpo: entrada,
    llave,
  });
}

export function cambiarEstadoPostulacion(
  id: string,
  entrada: vacantes.CambiarEstadoPostulacionEntrada,
) {
  return pedir(`/postulaciones/${id}/estado`, vacantes.PostulacionRecibida, {
    metodo: 'PUT',
    cuerpo: entrada,
  });
}
