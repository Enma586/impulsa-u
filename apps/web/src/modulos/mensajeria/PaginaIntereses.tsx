import type { conexiones } from '@impulsau/contracts';
import {
  AvisoError,
  Boton,
  Dato,
  EnlaceBoton,
  Fila,
  Insignia,
  Pestanas,
  Pila,
  Tarjeta,
  Texto,
  Titulo,
} from '@impulsau/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { mensajeDeError } from '../../api/cliente';
import { Carga, EsqueletoLista, EstadoVacio } from '../../compartido/Estados';
import { fechaLegible } from '../../compartido/etiquetas';
import { useUsuario } from '../../sesion/useSesion';
import { aceptarInteres, declinarInteres, useIntereses } from './consultas';

const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  declinado: 'Declinado',
} as const;

function TarjetaInteres({
  interes,
  puedeResponder,
}: {
  interes: conexiones.Interes;
  puedeResponder: boolean;
}) {
  const usuario = useUsuario();
  const cliente = useQueryClient();
  const otro = interes.empresa.id === usuario.id ? interes.talento : interes.empresa;

  const responder = useMutation({
    mutationFn: (accion: 'aceptar' | 'declinar') =>
      accion === 'aceptar' ? aceptarInteres(interes.id) : declinarInteres(interes.id),
    onSettled: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: ['intereses'] }),
        cliente.invalidateQueries({ queryKey: ['conversaciones'] }),
      ]),
  });

  return (
    <Tarjeta>
      <Pila espacio={12}>
        <Fila justificar="entre" alinear="centro">
          <Titulo nivel={2} tamano="pequeno">
            {otro.nombre}
          </Titulo>
          <Insignia tono={interes.estado === 'aceptado' ? 'logro' : 'neutro'}>
            {ETIQUETA_ESTADO[interes.estado]}
          </Insignia>
        </Fila>
        {interes.mensaje && <Texto>{interes.mensaje}</Texto>}
        <Dato>{fechaLegible(interes.creadoEn)}</Dato>
        {responder.isError && (
          <AvisoError titulo="No se pudo responder">{mensajeDeError(responder.error)}</AvisoError>
        )}
        {puedeResponder && interes.estado === 'pendiente' && (
          <Fila espacio={12}>
            <Boton
              cargando={responder.isPending}
              onPress={() => {
                responder.mutate('aceptar');
              }}
            >
              Aceptar y abrir chat
            </Boton>
            <Boton
              variante="secundario"
              deshabilitado={responder.isPending}
              onPress={() => {
                responder.mutate('declinar');
              }}
            >
              Declinar
            </Boton>
          </Fila>
        )}
        {interes.estado === 'aceptado' && interes.conversacionId && (
          <Fila>
            <EnlaceBoton href={`/mensajes/${interes.conversacionId}`}>
              Abrir conversación
            </EnlaceBoton>
          </Fila>
        )}
      </Pila>
    </Tarjeta>
  );
}

function ListaIntereses({ tipo }: { tipo: 'recibidos' | 'enviados' }) {
  const consulta = useIntereses(tipo);

  return (
    <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={2} />}>
      {(paginas) => {
        const intereses = paginas.pages.flatMap((pagina) => pagina.items);
        if (intereses.length === 0) {
          return (
            <EstadoVacio
              titulo={tipo === 'recibidos' ? 'Sin intereses recibidos' : 'Sin intereses enviados'}
            >
              {tipo === 'recibidos'
                ? 'Cuando alguien muestre interés en ti, aparecerá aquí.'
                : 'Muestra interés desde el perfil de una empresa o de un talento.'}
            </EstadoVacio>
          );
        }
        return (
          <Pila espacio={16}>
            {intereses.map((interes) => (
              <TarjetaInteres
                key={interes.id}
                interes={interes}
                puedeResponder={tipo === 'recibidos'}
              />
            ))}
            {consulta.hasNextPage && (
              <Fila>
                <Boton
                  variante="secundario"
                  cargando={consulta.isFetchingNextPage}
                  onPress={() => {
                    void consulta.fetchNextPage();
                  }}
                >
                  Ver más
                </Boton>
              </Fila>
            )}
          </Pila>
        );
      }}
    </Carga>
  );
}

export function PaginaIntereses() {
  const [pestana, setPestana] = useState('recibidos');

  return (
    <Pila espacio={16}>
      <Titulo nivel={1}>Intereses</Titulo>
      <Pestanas
        etiquetaAria="Tipo de intereses"
        seleccionada={pestana}
        onCambio={setPestana}
        pestanas={[
          {
            id: 'recibidos',
            etiqueta: 'Recibidos',
            contenido: <ListaIntereses tipo="recibidos" />,
          },
          { id: 'enviados', etiqueta: 'Enviados', contenido: <ListaIntereses tipo="enviados" /> },
        ]}
      />
    </Pila>
  );
}
