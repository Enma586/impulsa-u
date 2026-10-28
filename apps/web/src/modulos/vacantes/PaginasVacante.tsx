import type { vacantes } from '@impulsau/contracts';
import {
  AvisoError,
  Boton,
  Campo,
  Contenedor,
  Dato,
  Enlace,
  EnlaceBoton,
  Fila,
  GrupoFichas,
  Insignia,
  Modal,
  Pila,
  Selector,
  Tarjeta,
  Texto,
  Titulo,
} from '@impulsau/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { ErrorDeApi, mensajeDeError } from '../../api/cliente';
import { Carga, EsqueletoLista, EstadoVacio } from '../../compartido/Estados';
import {
  aOpciones,
  fechaLegible,
  nombresDepartamento,
  nombresEstadoPostulacion,
  nombresEstadoVacante,
  nombresModalidad,
  nombresTipoVacante,
} from '../../compartido/etiquetas';
import { useUsuario } from '../../sesion/useSesion';
import { useFeed } from '../proyectos/consultas';
import {
  cambiarEstadoVacante,
  postularse,
  useMisPostulaciones,
  useVacante,
  useVacantes,
} from './consultas';
import type { FiltrosVacantes } from './consultas';
import { TableroPostulaciones } from './TableroPostulaciones';

const TODOS = '';
const opcionesTipo = [
  { valor: TODOS, etiqueta: 'Todos los tipos' },
  ...aOpciones(nombresTipoVacante),
];
const opcionesModalidad = [
  { valor: TODOS, etiqueta: 'Todas las modalidades' },
  ...aOpciones(nombresModalidad),
];

function esTipo(valor: string): valor is vacantes.TipoVacante {
  return valor in nombresTipoVacante;
}
function esModalidad(valor: string): valor is vacantes.ModalidadVacante {
  return valor in nombresModalidad;
}

function TarjetaVacante({ vacante }: { vacante: vacantes.VacanteResumen }) {
  return (
    <Tarjeta>
      <Pila espacio={10}>
        <Fila justificar="entre" alinear="centro">
          <Enlace href={`/vacantes/${vacante.id}`}>{vacante.titulo}</Enlace>
          {vacante.coincidencia !== null && (
            <Insignia tono={vacante.coincidencia >= 60 ? 'logro' : 'neutro'}>
              {String(vacante.coincidencia)}% de coincidencia
            </Insignia>
          )}
        </Fila>
        <Dato>
          <Enlace href={`/empresas/${vacante.empresa.id}`}>{vacante.empresa.nombre}</Enlace>
          {` · ${nombresTipoVacante[vacante.tipo]} · ${nombresModalidad[vacante.modalidad]}`}
          {vacante.departamento && ` · ${nombresDepartamento[vacante.departamento]}`}
        </Dato>
        <Fila espacio={6}>
          {vacante.estado !== 'abierta' && (
            <Insignia>{nombresEstadoVacante[vacante.estado]}</Insignia>
          )}
          {vacante.habilidades.map((habilidad) => (
            <Insignia key={habilidad.id} tono={habilidad.requerida ? 'aval' : 'neutro'}>
              {habilidad.nombre}
            </Insignia>
          ))}
        </Fila>
      </Pila>
    </Tarjeta>
  );
}

/** CU-42: vacantes abiertas con filtros; la empresa ve las suyas aparte. */
export function PaginaVacantes() {
  const usuario = useUsuario();
  const esEmpresa = usuario.rol === 'empresa';
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<vacantes.TipoVacante | undefined>(undefined);
  const [modalidad, setModalidad] = useState<vacantes.ModalidadVacante | undefined>(undefined);

  const filtros: FiltrosVacantes = {
    ...(busqueda === '' ? {} : { q: busqueda }),
    ...(tipo ? { tipo } : {}),
    ...(modalidad ? { modalidad } : {}),
    ...(esEmpresa ? { mias: true } : {}),
  };
  const lista = useVacantes(filtros);

  return (
    <Contenedor ancho="medio">
      <Pila espacio={20}>
        <Fila justificar="entre" alinear="centro">
          <Titulo nivel={1}>{esEmpresa ? 'Mis vacantes' : 'Vacantes para empezar'}</Titulo>
          {esEmpresa && <EnlaceBoton href="/vacantes/nueva">Nueva vacante</EnlaceBoton>}
        </Fila>

        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            setBusqueda(texto.trim());
          }}
        >
          <Pila espacio={12}>
            <Campo
              etiqueta="Buscar"
              placeholder="Título de la vacante"
              value={texto}
              onChange={setTexto}
            />
            <Fila espacio={12}>
              <Selector
                etiqueta="Tipo"
                value={tipo ?? TODOS}
                opciones={opcionesTipo}
                onChange={(valor) => {
                  setTipo(esTipo(valor) ? valor : undefined);
                }}
              />
              <Selector
                etiqueta="Modalidad"
                value={modalidad ?? TODOS}
                opciones={opcionesModalidad}
                onChange={(valor) => {
                  setModalidad(esModalidad(valor) ? valor : undefined);
                }}
              />
            </Fila>
            <Fila>
              <Boton type="submit" variante="secundario">
                Buscar
              </Boton>
            </Fila>
          </Pila>
        </form>

        <Carga consulta={lista} esqueleto={<EsqueletoLista filas={3} />}>
          {(datos) => {
            const items = datos.pages.flatMap((pagina) => pagina.items);
            if (items.length === 0) {
              return (
                <EstadoVacio
                  titulo={
                    esEmpresa ? 'Aún no publicas vacantes' : 'No hay vacantes con esos filtros'
                  }
                  accion={
                    esEmpresa ? (
                      <EnlaceBoton href="/vacantes/nueva">Publicar vacante</EnlaceBoton>
                    ) : undefined
                  }
                >
                  {esEmpresa
                    ? 'Publica una vacante para empezar a recibir postulaciones.'
                    : 'Prueba con otra búsqueda o vuelve más tarde.'}
                </EstadoVacio>
              );
            }
            return (
              <Pila espacio={16}>
                {items.map((vacante) => (
                  <TarjetaVacante key={vacante.id} vacante={vacante} />
                ))}
                {lista.hasNextPage && (
                  <Fila justificar="centro">
                    <Boton
                      variante="secundario"
                      cargando={lista.isFetchingNextPage}
                      onPress={() => {
                        void lista.fetchNextPage();
                      }}
                    >
                      Cargar más vacantes
                    </Boton>
                  </Fila>
                )}
              </Pila>
            );
          }}
        </Carga>
      </Pila>
    </Contenedor>
  );
}

function mensajeDePostulacion(error: unknown): string {
  if (error instanceof ErrorDeApi && error.codigo === 'conflicto') {
    return 'Ya te postulaste o la vacante ya no está abierta.';
  }
  return mensajeDeError(error);
}

/** CU-43: elegir entre los proyectos publicados propios los que respaldan la postulación. */
function ModalPostular({
  vacante,
  abierto,
  onCambioAbierto,
}: {
  vacante: vacantes.VacanteDetalle;
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
}) {
  const clienteConsultas = useQueryClient();
  const usuario = useUsuario();
  const propios = useFeed({ autorId: usuario.id });
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const llave = useRef<{ cuerpo: string; id: string } | null>(null);

  async function enviar(): Promise<void> {
    setAviso(null);
    setEnviando(true);
    const cuerpo = JSON.stringify(elegidos);
    if (llave.current?.cuerpo !== cuerpo) llave.current = { cuerpo, id: crypto.randomUUID() };
    try {
      await postularse(vacante.id, { proyectoIds: elegidos }, llave.current.id);
      await clienteConsultas.invalidateQueries({ queryKey: ['vacantes'] });
      await clienteConsultas.invalidateQueries({ queryKey: ['postulaciones'] });
      onCambioAbierto(false);
    } catch (error: unknown) {
      setAviso(mensajeDePostulacion(error));
    } finally {
      setEnviando(false);
    }
  }

  const proyectos = propios.data?.pages.flatMap((pagina) => pagina.items) ?? [];

  return (
    <Modal
      abierto={abierto}
      titulo={`Postularme a ${vacante.titulo}`}
      onCambioAbierto={onCambioAbierto}
      acciones={
        <>
          <Boton
            cargando={enviando}
            deshabilitado={elegidos.length === 0}
            onPress={() => void enviar()}
          >
            Enviar postulación
          </Boton>
          <Boton
            variante="fantasma"
            onPress={() => {
              onCambioAbierto(false);
            }}
          >
            Cancelar
          </Boton>
        </>
      }
    >
      <Pila espacio={12}>
        <Carga consulta={propios} esqueleto={<EsqueletoLista filas={1} />}>
          {() =>
            proyectos.length === 0 ? (
              <EstadoVacio
                titulo="Aún no tienes proyectos publicados"
                accion={<EnlaceBoton href="/proyectos/nuevo">Publicar un proyecto</EnlaceBoton>}
              >
                Las empresas deciden por tus proyectos: publica al menos uno para postularte.
              </EstadoVacio>
            ) : (
              <GrupoFichas
                etiqueta="Proyectos que respaldan tu postulación"
                ayuda="Elige hasta 5."
                opciones={proyectos.map((proyecto) => ({
                  valor: proyecto.id,
                  etiqueta: proyecto.titulo,
                }))}
                value={elegidos}
                onChange={setElegidos}
              />
            )
          }
        </Carga>
        {aviso && <AvisoError titulo="No pudimos enviar tu postulación">{aviso}</AvisoError>}
      </Pila>
    </Modal>
  );
}

function AccionesEmpresa({ vacante }: { vacante: vacantes.VacanteDetalle }) {
  const clienteConsultas = useQueryClient();
  const [cambiando, setCambiando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function cambiar(estado: vacantes.CambiarEstadoVacanteEntrada['estado']): Promise<void> {
    setAviso(null);
    setCambiando(true);
    try {
      await cambiarEstadoVacante(vacante.id, estado);
      await clienteConsultas.invalidateQueries({ queryKey: ['vacantes'] });
    } catch (error: unknown) {
      setAviso(mensajeDeError(error));
    } finally {
      setCambiando(false);
    }
  }

  return (
    <Pila espacio={10}>
      <Fila espacio={12}>
        <EnlaceBoton href={`/vacantes/${vacante.id}/editar`} variante="secundario">
          Editar
        </EnlaceBoton>
        {vacante.estado === 'abierta' && (
          <Boton variante="secundario" cargando={cambiando} onPress={() => void cambiar('pausada')}>
            Pausar
          </Boton>
        )}
        {(vacante.estado === 'pausada' ||
          vacante.estado === 'borrador' ||
          vacante.estado === 'cerrada') && (
          <Boton variante="secundario" cargando={cambiando} onPress={() => void cambiar('abierta')}>
            {vacante.estado === 'borrador' ? 'Publicar' : 'Reabrir'}
          </Boton>
        )}
        {vacante.estado !== 'cerrada' && (
          <Boton
            variante="advertencia"
            cargando={cambiando}
            onPress={() => void cambiar('cerrada')}
          >
            Cerrar
          </Boton>
        )}
      </Fila>
      {aviso && <AvisoError titulo="No pudimos cambiar el estado">{aviso}</AvisoError>}
    </Pila>
  );
}

/** Detalle de la vacante: postularse para talento, gestionar y ver postulaciones para su empresa. */
export function PaginaVacante() {
  const { id = '' } = useParams({ strict: false });
  const usuario = useUsuario();
  const consulta = useVacante(id);
  const [postulando, setPostulando] = useState(false);

  return (
    <Contenedor ancho="medio">
      <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={1} />}>
        {(vacante) => (
          <Pila espacio={20}>
            <Pila espacio={8}>
              <Fila espacio={8} alinear="centro">
                <Insignia>{nombresEstadoVacante[vacante.estado]}</Insignia>
                <Dato>
                  <Enlace href={`/empresas/${vacante.empresa.id}`}>{vacante.empresa.nombre}</Enlace>
                  {vacante.publicadaEn && ` · ${fechaLegible(vacante.publicadaEn)}`}
                </Dato>
              </Fila>
              <Titulo nivel={1}>{vacante.titulo}</Titulo>
              <Dato>
                {`${nombresTipoVacante[vacante.tipo]} · ${nombresModalidad[vacante.modalidad]}`}
                {vacante.departamento && ` · ${nombresDepartamento[vacante.departamento]}`}
              </Dato>
            </Pila>

            <Texto>{vacante.descripcion}</Texto>

            <Fila espacio={6}>
              {vacante.habilidades.map((habilidad) => (
                <Insignia key={habilidad.id} tono={habilidad.requerida ? 'aval' : 'neutro'}>
                  {habilidad.nombre}
                  {habilidad.requerida ? ' · requerida' : ''}
                </Insignia>
              ))}
            </Fila>

            {vacante.coincidencia !== null && (
              <Texto color="secundario">
                Coincides en {String(vacante.coincidencia)}% con lo que piden, según tus habilidades
                y proyectos.
              </Texto>
            )}

            {usuario.rol === 'talento' &&
              (vacante.yaPostulado ? (
                <Insignia tono="logro">Ya te postulaste</Insignia>
              ) : vacante.estado === 'abierta' ? (
                <Fila>
                  <Boton
                    tamano="grande"
                    onPress={() => {
                      setPostulando(true);
                    }}
                  >
                    Postularme
                  </Boton>
                </Fila>
              ) : (
                <Texto color="secundario">Esta vacante no recibe postulaciones por ahora.</Texto>
              ))}

            {vacante.esMia && (
              <>
                <AccionesEmpresa vacante={vacante} />
                <Titulo nivel={2} tamano="pequeno">
                  Postulaciones
                </Titulo>
                <TableroPostulaciones vacanteId={vacante.id} />
              </>
            )}

            {usuario.rol === 'talento' && (
              <ModalPostular
                vacante={vacante}
                abierto={postulando}
                onCambioAbierto={setPostulando}
              />
            )}
          </Pila>
        )}
      </Carga>
    </Contenedor>
  );
}

/** Seguimiento de mis postulaciones (talento). */
export function PaginaMisPostulaciones() {
  const consulta = useMisPostulaciones();

  return (
    <Contenedor ancho="medio">
      <Pila espacio={20}>
        <Titulo nivel={1}>Mis postulaciones</Titulo>
        <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={3} />}>
          {(postulaciones) =>
            postulaciones.length === 0 ? (
              <EstadoVacio
                titulo="Todavía no te has postulado"
                accion={<EnlaceBoton href="/vacantes">Ver vacantes</EnlaceBoton>}
              >
                Cuando te postules a una vacante, seguirás su avance aquí.
              </EstadoVacio>
            ) : (
              <Pila espacio={12}>
                {postulaciones.map((postulacion) => (
                  <Tarjeta key={postulacion.id}>
                    <Pila espacio={8}>
                      <Fila justificar="entre" alinear="centro">
                        <Enlace href={`/vacantes/${postulacion.vacante.id}`}>
                          {postulacion.vacante.titulo}
                        </Enlace>
                        <Insignia tono={postulacion.estado === 'seleccionada' ? 'logro' : 'neutro'}>
                          {nombresEstadoPostulacion[postulacion.estado]}
                        </Insignia>
                      </Fila>
                      <Dato>
                        {postulacion.vacante.empresa} · {fechaLegible(postulacion.creadaEn)}
                      </Dato>
                      <Fila espacio={6}>
                        {postulacion.proyectos.map((proyecto) => (
                          <Enlace key={proyecto.id} href={`/proyectos/${proyecto.id}`}>
                            {proyecto.titulo}
                          </Enlace>
                        ))}
                      </Fila>
                    </Pila>
                  </Tarjeta>
                ))}
              </Pila>
            )
          }
        </Carga>
      </Pila>
    </Contenedor>
  );
}
