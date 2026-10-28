import { perfiles } from '@impulsau/contracts';
import { useQuery } from '@tanstack/react-query';
import { pedir } from '../../api/cliente';

export function usePerfilTalento(id: string) {
  return useQuery({
    queryKey: ['perfiles', 'talento', id],
    queryFn: () => pedir(`/perfiles/talentos/${id}`, perfiles.PerfilTalento),
  });
}

export function usePerfilEmpresa(id: string) {
  return useQuery({
    queryKey: ['perfiles', 'empresa', id],
    queryFn: () => pedir(`/perfiles/empresas/${id}`, perfiles.PerfilEmpresa),
  });
}

export function guardarPerfilTalento(entrada: perfiles.ActualizarPerfilTalentoEntrada) {
  return pedir('/perfiles/talentos/me', perfiles.PerfilTalento, {
    metodo: 'PUT',
    cuerpo: entrada,
  });
}

export function guardarPerfilEmpresa(entrada: perfiles.ActualizarPerfilEmpresaEntrada) {
  return pedir('/perfiles/empresas/me', perfiles.PerfilEmpresa, {
    metodo: 'PUT',
    cuerpo: entrada,
  });
}
