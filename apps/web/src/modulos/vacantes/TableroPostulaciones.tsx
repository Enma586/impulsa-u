import { vacantes } from '@impulsau/contracts';
import {
  AreaTexto,
  AvisoError,
  Boton,
  Dato,
  Enlace,
  Fila,
  Insignia,
  Modal,
  Pila,
  Selector,
  Tarjeta,
} from '@impulsau/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorDeApi, mensajeDeError } from '../../api/cliente';
import { Carga, EsqueletoLista, EstadoVacio } from '../../compartido/Estados';
import {
  aOpciones,
  fechaLegible,
  nombresEstadoPostulacion,
  nombresMotivoDescarte,
} from '../../compartido/etiquetas';
import { cambiarEstadoPostulacion, usePostulacionesRecibidas } from './consultas';

const SIGUIENTES: Record<vacantes.EstadoPostulacion, vacantes.EstadoPostulacion[]> = {
  recibida: ['en_revision', 'descartada'],
  en_revision: ['entrevista', 'descartada'],
  entrevista: ['seleccionada', 'descartada'],
  seleccionada: [],
  descartada: [],
};

const opcionesMotivo = aOpciones(nombresMotivoDescarte);

function esMotivo(valor: string): valor is vacantes.MotivoDescarte {
  return valor in nombresMotivoDescarte;
}

function mensajeDeCambio(error: unknown): string {
  if (error instanceof ErrorDeApi && error.codigo === 'conflicto') {
    return 'Esta postulación cambió en otro lugar. Recarga para ver su estado actual.';
  }
  return mensajeDeError(error);
}

/** CU-44 y CU-46: postulaciones recibidas, con cambio de estado y motivo obligatorio al descartar. */
export function TableroPostulaciones({ vacanteId }: { vacanteId: string }) {
  const consulta = usePostulacionesRecibidas(vacanteId);
  const clienteConsultas = useQueryClient();
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [descartando, setDescartando] = useState<vacantes.PostulacionRecibida | null>(null);
  const [motivo, setMotivo] = useState<vacantes.MotivoDescarte | null>(null);
  const [detalle, setDetalle] = useState('');
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);

  async function aplicar(
    postulacion: vacantes.PostulacionRecibida,
    entrada: Omit<vacantes.CambiarEstadoPostulacionEntrada, 'version'>,
  ): Promise<boolean> {
    setAviso(null);
    setTrabajando(postulacion.id);
    try {
      await cambiarEstadoPostulacion(postulacion.id, { ...entrada, version: postulacion.version });
      await clienteConsultas.invalidateQueries({ queryKey: ['postulaciones'] });
      return true;
    } catch (error: unknown) {
      setAviso(mensajeDeCambio(error));
      return false;
    } finally {
      setTrabajando(null);
    }
  }

  async function confirmarDescarte(): Promise<void> {
    if (!descartando) return;
    if (motivo === null) {
      setErrorMotivo('Indica el motivo del descarte');
      return;
    }
    const texto = detalle.trim();
    const hecho = await aplicar(descartando, {
      estado: 'descartada',
      motivoDescarte: motivo,
      ...(texto === '' ? {} : { detalleDescarte: texto }),
    });
    if (hecho) cerrarDescarte();
  }

  function cerrarDescarte(): void {
    setDescartando(null);
    setMotivo(null);
    setDetalle('');
    setErrorMotivo(null);
  }

  return (
    <Pila espacio={12}>
      {aviso && <AvisoError titulo="No pudimos cambiar el estado">{aviso}</AvisoError>}
      <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={2} />}>
        {(postulaciones) =>
          postulaciones.length === 0 ? (
            <EstadoVacio titulo="Aún no hay postulaciones">
              Cuando alguien se postule, verás aquí sus proyectos y podrás avanzar el proceso.
            </EstadoVacio>
          ) : (
            postulaciones.map((postulacion) => (
              <Tarjeta key={postulacion.id}>
                <Pila espacio={10}>
                  <Fila justificar="entre" alinear="centro">
                    <Enlace href={`/talentos/${postulacion.talento.id}`}>
                      {postulacion.talento.nombre}
                    </Enlace>
                    <Insignia tono={postulacion.estado === 'seleccionada' ? 'logro' : 'neutro'}>
                      {nombresEstadoPostulacion[postulacion.estado]}
                    </Insignia>
                  </Fila>
                  <Dato>
                    {[postulacion.talento.carrera, fechaLegible(postulacion.creadaEn)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Dato>
                  <Fila espacio={12}>
                    {postulacion.proyectos.map((proyecto) => (
                      <Enlace key={proyecto.id} href={`/proyectos/${proyecto.id}`}>
                        {proyecto.titulo}
                      </Enlace>
                    ))}
                  </Fila>
                  {postulacion.estado === 'descartada' && postulacion.motivoDescarte && (
                    <Dato>
                      Descartada: {nombresMotivoDescarte[postulacion.motivoDescarte]}
                      {postulacion.detalleDescarte && ` — ${postulacion.detalleDescarte}`}
                    </Dato>
                  )}
                  <Fila espacio={8}>
                    {SIGUIENTES[postulacion.estado].map((estado) =>
                      estado === 'descartada' ? (
                        <Boton
                          key={estado}
                          variante="advertencia"
                          onPress={() => {
                            setDescartando(postulacion);
                          }}
                        >
                          Descartar
                        </Boton>
                      ) : (
                        <Boton
                          key={estado}
                          variante="secundario"
                          cargando={trabajando === postulacion.id}
                          onPress={() => void aplicar(postulacion, { estado })}
                        >
                          {nombresEstadoPostulacion[estado]}
                        </Boton>
                      ),
                    )}
                  </Fila>
                </Pila>
              </Tarjeta>
            ))
          )
        }
      </Carga>

      <Modal
        abierto={descartando !== null}
        titulo="Descartar postulación"
        onCambioAbierto={(abierto) => {
          if (!abierto) cerrarDescarte();
        }}
        acciones={
          <>
            <Boton
              variante="advertencia"
              cargando={trabajando !== null}
              onPress={() => void confirmarDescarte()}
            >
              Descartar
            </Boton>
            <Boton variante="fantasma" onPress={cerrarDescarte}>
              Cancelar
            </Boton>
          </>
        }
      >
        <Pila espacio={12}>
          <Selector
            etiqueta="Motivo"
            value={motivo}
            opciones={opcionesMotivo}
            error={errorMotivo ?? undefined}
            onChange={(valor) => {
              setErrorMotivo(null);
              setMotivo(esMotivo(valor) ? valor : null);
            }}
          />
          <AreaTexto
            etiqueta="Detalle (opcional)"
            ayuda="La persona verá el motivo; el detalle es opcional."
            filas={3}
            value={detalle}
            onChange={setDetalle}
          />
        </Pila>
      </Modal>
    </Pila>
  );
}
