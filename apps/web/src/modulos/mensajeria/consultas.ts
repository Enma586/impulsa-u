import { conexiones, mensajeria } from '@impulsau/contracts';
import { useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { pedir } from '../../api/cliente';

const SinCuerpo = z.undefined();

/** Bandeja de conversaciones, más reciente primero (CU-32). */
export function useConversaciones() {
  return useInfiniteQuery({
    queryKey: ['conversaciones'],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const consulta = new URLSearchParams({ limite: '50' });
      if (pageParam !== '') consulta.set('cursor', pageParam);
      return pedir(`/conversaciones?${consulta.toString()}`, mensajeria.PaginaConversaciones);
    },
    getNextPageParam: (pagina) => pagina.siguienteCursor ?? undefined,
  });
}

/** Intereses recibidos o enviados (CU-31). */
export function useIntereses(tipo: 'recibidos' | 'enviados') {
  return useInfiniteQuery({
    queryKey: ['intereses', tipo],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const consulta = new URLSearchParams({ tipo, limite: '50' });
      if (pageParam !== '') consulta.set('cursor', pageParam);
      return pedir(`/intereses?${consulta.toString()}`, conexiones.PaginaIntereses);
    },
    getNextPageParam: (pagina) => pagina.siguienteCursor ?? undefined,
  });
}

export function pedirHistorial(conversacionId: string, antesDeSecuencia?: number) {
  const consulta = new URLSearchParams({ limite: '30' });
  if (antesDeSecuencia !== undefined) consulta.set('antesDeSecuencia', String(antesDeSecuencia));
  return pedir(
    `/conversaciones/${conversacionId}/mensajes?${consulta.toString()}`,
    mensajeria.PaginaMensajes,
  );
}

/** Alternativa REST al socket: mismo `clientMessageId`, así reintentar nunca duplica. */
export function enviarPorRest(conversacionId: string, entrada: mensajeria.EnviarMensajeEntrada) {
  return pedir(`/conversaciones/${conversacionId}/mensajes`, mensajeria.Mensaje, {
    metodo: 'POST',
    cuerpo: entrada,
  });
}

export function marcarLeidoPorRest(conversacionId: string, secuencia: number) {
  return pedir(`/conversaciones/${conversacionId}/lectura`, mensajeria.EventoLecturaActualizada, {
    metodo: 'PUT',
    cuerpo: { secuencia },
  });
}

export function bloquear(usuarioId: string) {
  return pedir(`/usuarios/${usuarioId}/bloqueo`, SinCuerpo, { metodo: 'PUT' });
}

export function desbloquear(usuarioId: string) {
  return pedir(`/usuarios/${usuarioId}/bloqueo`, SinCuerpo, { metodo: 'DELETE' });
}

export function aceptarInteres(id: string) {
  return pedir(`/intereses/${id}/aceptar`, conexiones.Interes, { metodo: 'POST' });
}

export function declinarInteres(id: string) {
  return pedir(`/intereses/${id}/declinar`, conexiones.Interes, { metodo: 'POST' });
}

/** Empresa → talento o talento → empresa; el servidor decide si la otra parte ya había mostrado interés. */
export function mostrarInteres(rolPropio: 'empresa' | 'talento', destinoId: string) {
  const ruta = rolPropio === 'empresa' ? 'talentos' : 'empresas';
  return pedir(`/${ruta}/${destinoId}/interes`, conexiones.Interes, {
    metodo: 'PUT',
    cuerpo: {},
  });
}

export function retirarInteres(rolPropio: 'empresa' | 'talento', destinoId: string) {
  const ruta = rolPropio === 'empresa' ? 'talentos' : 'empresas';
  return pedir(`/${ruta}/${destinoId}/interes`, SinCuerpo, { metodo: 'DELETE' });
}
