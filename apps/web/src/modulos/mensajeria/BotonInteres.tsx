import { AvisoError, Boton, EnlaceBoton, Fila, Insignia, Pila, Texto } from '@impulsau/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mensajeDeError } from '../../api/cliente';
import { useUsuario } from '../../sesion/useSesion';
import { mostrarInteres, retirarInteres, useIntereses } from './consultas';

/**
 * Acción de CU-29 y CU-30 en el perfil ajeno: la empresa lo muestra al talento y el talento a la
 * empresa. Si la otra parte ya había mostrado interés, el servidor abre la conversación al instante.
 */
export function BotonInteres({ destinoId }: { destinoId: string }) {
  const usuario = useUsuario();
  const cliente = useQueryClient();
  const rolPropio = usuario.rol === 'empresa' ? 'empresa' : 'talento';
  const enviados = useIntereses('enviados');

  const refrescar = () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: ['intereses'] }),
      cliente.invalidateQueries({ queryKey: ['conversaciones'] }),
    ]);
  const mostrar = useMutation({
    mutationFn: () => mostrarInteres(rolPropio, destinoId),
    onSettled: refrescar,
  });
  const retirar = useMutation({
    mutationFn: () => retirarInteres(rolPropio, destinoId),
    onSettled: refrescar,
  });

  if (usuario.rol !== 'empresa' && usuario.rol !== 'talento') return null;
  if (usuario.id === destinoId) return null;

  const existente = enviados.data?.pages
    .flatMap((pagina) => pagina.items)
    .find((interes) =>
      rolPropio === 'empresa' ? interes.talento.id === destinoId : interes.empresa.id === destinoId,
    );
  const resultado = mostrar.data ?? existente;
  const error = mostrar.error ?? retirar.error;

  return (
    <Pila espacio={8}>
      {resultado?.estado === 'aceptado' && resultado.conversacionId ? (
        <Fila espacio={12} alinear="centro">
          <Insignia tono="logro">Conectados</Insignia>
          <EnlaceBoton href={`/mensajes/${resultado.conversacionId}`}>Enviar mensaje</EnlaceBoton>
        </Fila>
      ) : resultado?.estado === 'pendiente' && !retirar.isSuccess ? (
        <Fila espacio={12} alinear="centro">
          <Insignia>Interés enviado</Insignia>
          <Boton
            variante="secundario"
            cargando={retirar.isPending}
            onPress={() => {
              mostrar.reset();
              retirar.mutate();
            }}
          >
            Retirar interés
          </Boton>
        </Fila>
      ) : resultado?.estado === 'declinado' ? (
        <Texto color="secundario">Esta persona declinó el interés.</Texto>
      ) : (
        <Fila>
          <Boton
            cargando={mostrar.isPending}
            deshabilitado={enviados.isPending}
            onPress={() => {
              retirar.reset();
              mostrar.mutate();
            }}
          >
            Mostrar interés
          </Boton>
        </Fila>
      )}
      {error !== null && (
        <AvisoError titulo="No se pudo completar">{mensajeDeError(error)}</AvisoError>
      )}
    </Pila>
  );
}
