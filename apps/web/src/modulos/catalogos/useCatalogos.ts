import { catalogos } from '@impulsau/contracts';
import { useQuery } from '@tanstack/react-query';
import { pedir } from '../../api/cliente';

/** Habilidades, carreras e instituciones: cambian poco, se guardan cinco minutos. */
export function useCatalogos() {
  return useQuery({
    queryKey: ['catalogos'],
    queryFn: () => pedir('/catalogos', catalogos.Catalogos),
    staleTime: 5 * 60_000,
  });
}
