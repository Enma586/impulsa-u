import { mensajeria } from '@impulsau/contracts';
import {
  AvisoConexion,
  AvisoError,
  BurbujaMensaje,
  Boton,
  CajaMensaje,
  EncabezadoConversacion,
  Escribiendo,
  EnlaceBoton,
  Fila,
  HiloMensajes,
  ItemConversacion,
  PanelDividido,
  Pila,
  SeparadorDia,
  Texto,
  Titulo,
  VacioDelPanel,
} from '@impulsau/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { mensajeDeError } from '../../api/cliente';
import { Carga, EsqueletoLista } from '../../compartido/Estados';
import { useUsuario } from '../../sesion/useSesion';
import { bloquear, desbloquear, useConversaciones } from './consultas';
import { esMismoDia, etiquetaDia, horaCorta, horaOFecha } from './formato';
import { estadoConexion } from './tiempoReal';
import { useHilo } from './useHilo';

function useEstadoConexion() {
  return useSyncExternalStore(estadoConexion.suscribir, estadoConexion.obtener);
}

function vistaPrevia(conversacion: mensajeria.ConversacionResumen, yoId: string): string {
  const ultimo = conversacion.ultimoMensaje;
  if (!ultimo) return 'Escribe el primer mensaje';
  return ultimo.remitenteId === yoId ? `Tú: ${ultimo.cuerpo}` : ultimo.cuerpo;
}

function ListaConversaciones({ activa }: { activa: string | undefined }) {
  const usuario = useUsuario();
  const consulta = useConversaciones();

  return (
    <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={4} />}>
      {(paginas) => {
        const conversaciones = paginas.pages.flatMap((pagina) => pagina.items);
        if (conversaciones.length === 0) {
          return (
            <VacioDelPanel>
              Todavía no tienes conversaciones. Se abren cuando un interés es aceptado.
            </VacioDelPanel>
          );
        }
        return (
          <nav aria-label="Conversaciones">
            {conversaciones.map((conversacion) => (
              <ItemConversacion
                key={conversacion.id}
                href={`/mensajes/${conversacion.id}`}
                nombre={conversacion.interlocutor.nombre}
                vista={vistaPrevia(conversacion, usuario.id)}
                hora={
                  conversacion.ultimoMensaje ? horaOFecha(conversacion.ultimoMensaje.creadoEn) : ''
                }
                noLeidos={conversacion.noLeidos}
                activa={conversacion.id === activa}
              />
            ))}
            {consulta.hasNextPage && (
              <Fila justificar="centro">
                <Boton
                  variante="secundario"
                  cargando={consulta.isFetchingNextPage}
                  onPress={() => {
                    void consulta.fetchNextPage();
                  }}
                >
                  Ver más conversaciones
                </Boton>
              </Fila>
            )}
          </nav>
        );
      }}
    </Carga>
  );
}

type Linea =
  | { tipo: 'dia'; clave: string; texto: string }
  | {
      tipo: 'mensaje';
      clave: string;
      cuerpo: string;
      creadoEn: string;
      propio: boolean;
      estado: 'enviando' | 'enviado' | 'leido' | 'fallido';
      reintentarId: string | null;
    };

function Hilo({ conversacion }: { conversacion: mensajeria.ConversacionResumen }) {
  const usuario = useUsuario();
  const cliente = useQueryClient();
  const hilo = useHilo(conversacion.id, usuario.id, conversacion.leidoPorOtroHasta);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    setTexto('');
  }, [conversacion.id]);

  const cambiarBloqueo = useMutation({
    mutationFn: () =>
      conversacion.bloqueadaPorMi
        ? desbloquear(conversacion.interlocutor.id)
        : bloquear(conversacion.interlocutor.id),
    onSettled: () => cliente.invalidateQueries({ queryKey: ['conversaciones'] }),
  });

  const lineas: Linea[] = [];
  let anterior: string | null = null;
  const agregar = (creadoEn: string) => {
    if (anterior === null || !esMismoDia(anterior, creadoEn)) {
      lineas.push({ tipo: 'dia', clave: `dia-${creadoEn}`, texto: etiquetaDia(creadoEn) });
    }
    anterior = creadoEn;
  };
  for (const mensaje of hilo.mensajes) {
    agregar(mensaje.creadoEn);
    const propio = mensaje.remitenteId === usuario.id;
    lineas.push({
      tipo: 'mensaje',
      clave: `m-${String(mensaje.secuencia)}`,
      cuerpo: mensaje.cuerpo,
      creadoEn: mensaje.creadoEn,
      propio,
      estado: mensaje.secuencia <= hilo.leidoPorOtro ? 'leido' : 'enviado',
      reintentarId: null,
    });
  }
  for (const pendiente of hilo.pendientes) {
    agregar(pendiente.creadoEn);
    lineas.push({
      tipo: 'mensaje',
      clave: `p-${pendiente.clientMessageId}`,
      cuerpo: pendiente.cuerpo,
      creadoEn: pendiente.creadoEn,
      propio: true,
      estado: pendiente.fallido ? 'fallido' : 'enviando',
      reintentarId: pendiente.clientMessageId,
    });
  }
  const ultima = lineas.at(-1);

  const accionBloqueo =
    conversacion.bloqueada && !conversacion.bloqueadaPorMi ? null : (
      <Boton
        variante="secundario"
        cargando={cambiarBloqueo.isPending}
        onPress={() => {
          cambiarBloqueo.mutate();
        }}
      >
        {conversacion.bloqueadaPorMi ? 'Desbloquear' : 'Bloquear'}
      </Boton>
    );

  let cuerpo: ReactNode;
  if (!hilo.cargado) {
    cuerpo = <EsqueletoLista filas={2} />;
  } else if (hilo.error !== null && hilo.mensajes.length === 0) {
    cuerpo = (
      <Pila espacio={12}>
        <AvisoError titulo="No pudimos cargar los mensajes">
          {mensajeDeError(hilo.error)}
        </AvisoError>
        <Fila>
          <Boton variante="secundario" onPress={hilo.recargar}>
            Reintentar
          </Boton>
        </Fila>
      </Pila>
    );
  } else {
    cuerpo = (
      <HiloMensajes
        etiqueta={`Mensajes con ${conversacion.interlocutor.nombre}`}
        claveInicio={String(hilo.mensajes[0]?.secuencia ?? 0)}
        claveFinal={ultima?.clave ?? ''}
        finalEsPropio={ultima?.tipo === 'mensaje' && ultima.propio}
        {...(hilo.hayAnteriores
          ? { anteriores: { cargando: hilo.cargandoAnteriores, onPress: hilo.cargarAnteriores } }
          : {})}
      >
        {lineas.map((linea) =>
          linea.tipo === 'dia' ? (
            <SeparadorDia key={linea.clave}>{linea.texto}</SeparadorDia>
          ) : (
            <BurbujaMensaje
              key={linea.clave}
              texto={linea.cuerpo}
              hora={horaCorta(linea.creadoEn)}
              propio={linea.propio}
              {...(linea.propio ? { estado: linea.estado } : {})}
              {...(linea.reintentarId !== null
                ? {
                    onReintentar: () => {
                      if (linea.reintentarId !== null) hilo.reintentar(linea.reintentarId);
                    },
                  }
                : {})}
            />
          ),
        )}
      </HiloMensajes>
    );
  }

  return (
    <>
      <EncabezadoConversacion
        nombre={conversacion.interlocutor.nombre}
        {...(conversacion.vacanteTitulo ? { detalle: conversacion.vacanteTitulo } : {})}
        volver={
          <EnlaceBoton href="/mensajes" variante="fantasma">
            Volver
          </EnlaceBoton>
        }
        acciones={accionBloqueo}
      />
      {cambiarBloqueo.isError && (
        <AvisoError titulo="No se pudo cambiar el bloqueo">
          {mensajeDeError(cambiarBloqueo.error)}
        </AvisoError>
      )}
      {cuerpo}
      <Escribiendo
        texto={
          hilo.otroEscribiendo ? `${conversacion.interlocutor.nombre} está escribiendo…` : null
        }
      />
      {conversacion.bloqueada ? (
        <AvisoConexion tono="error">
          {conversacion.bloqueadaPorMi
            ? 'Bloqueaste a esta persona. Desbloquéala para volver a escribirle.'
            : 'Esta conversación está bloqueada.'}
        </AvisoConexion>
      ) : (
        <CajaMensaje
          etiqueta="Escribe un mensaje"
          valor={texto}
          maximo={mensajeria.CUERPO_MENSAJE_MAXIMO}
          onCambio={(nuevo) => {
            setTexto(nuevo);
            hilo.textoCambiado(nuevo);
          }}
          onEnviar={() => {
            hilo.enviar(texto);
            setTexto('');
          }}
        />
      )}
    </>
  );
}

/** Busca la conversación en las páginas ya cargadas y pide más si todavía no aparece. */
function DetalleConversacion({ id }: { id: string }) {
  const consulta = useConversaciones();
  const paginas = consulta.data?.pages ?? [];
  const conversacion = paginas.flatMap((pagina) => pagina.items).find((c) => c.id === id);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = consulta;

  useEffect(() => {
    if (!conversacion && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [conversacion, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (conversacion) return <Hilo key={conversacion.id} conversacion={conversacion} />;
  if (consulta.isPending || hasNextPage) return <EsqueletoLista filas={2} />;
  return <VacioDelPanel>No encontramos esta conversación.</VacioDelPanel>;
}

export function Bandeja({ conversacionId }: { conversacionId?: string }) {
  const conexion = useEstadoConexion();

  return (
    <Pila espacio={16}>
      <Titulo nivel={1}>Mensajes</Titulo>
      {conexion !== 'conectado' && (
        <AvisoConexion>
          {conexion === 'conectando'
            ? 'Reconectando… tus mensajes se enviarán por el canal de respaldo.'
            : 'Sin conexión en vivo. Seguimos enviando y recibiendo por el canal de respaldo.'}
        </AvisoConexion>
      )}
      <PanelDividido
        detalleAbierto={conversacionId !== undefined}
        lista={<ListaConversaciones activa={conversacionId} />}
        detalle={
          conversacionId === undefined ? (
            <VacioDelPanel>
              <Texto color="secundario">Elige una conversación para ver los mensajes.</Texto>
            </VacioDelPanel>
          ) : (
            <DetalleConversacion id={conversacionId} />
          )
        }
      />
    </Pila>
  );
}
