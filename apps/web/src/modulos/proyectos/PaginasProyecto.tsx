import type { proyectos } from '@impulsau/contracts';
import {
  AvisoError,
  Boton,
  Contenedor,
  Dato,
  EnlaceBoton,
  Enlace,
  Fila,
  Imagen,
  Insignia,
  Modal,
  Pila,
  Texto,
  Titulo,
} from '@impulsau/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { ErrorDeApi, mensajeDeError } from '../../api/cliente';
import { Carga, EsqueletoLista } from '../../compartido/Estados';
import { fechaLegible } from '../../compartido/etiquetas';
import { editarProyecto, eliminarProyecto, publicarProyecto, useProyecto } from './consultas';
import { FormularioProyecto, aCandidato, valoresVacios } from './FormularioProyecto';
import type { ValoresProyecto } from './FormularioProyecto';
import { BotonLike } from './TarjetaProyecto';

function mensajeDeGuardado(error: unknown): string {
  if (error instanceof ErrorDeApi && error.codigo === 'conflicto') {
    return 'El proyecto cambió en otro lugar. Recarga la página para ver la versión más reciente.';
  }
  return mensajeDeError(error);
}

/** CU-17: publicar o guardar como borrador. */
export function PaginaNuevoProyecto() {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const llave = useRef<{ cuerpo: string; id: string } | null>(null);

  async function guardar(valores: ValoresProyecto): Promise<string | null> {
    const entrada: proyectos.PublicarProyectoEntrada = {
      ...aCandidato(valores),
      publicar: valores.estado === 'publicado',
    };
    const cuerpo = JSON.stringify(entrada);
    if (llave.current?.cuerpo !== cuerpo) llave.current = { cuerpo, id: crypto.randomUUID() };
    try {
      const creado = await publicarProyecto(entrada, llave.current.id);
      await clienteConsultas.invalidateQueries({ queryKey: ['proyectos'] });
      await navegar({ to: '/proyectos/$id', params: { id: creado.id } });
      return null;
    } catch (error: unknown) {
      return mensajeDeGuardado(error);
    }
  }

  return (
    <Contenedor ancho="medio">
      <Pila espacio={20}>
        <Pila espacio={8}>
          <Dato color="acento">Nuevo proyecto</Dato>
          <Titulo nivel={1}>Muestra lo que sabes hacer</Titulo>
        </Pila>
        <FormularioProyecto
          inicial={valoresVacios}
          textoBoton="Guardar proyecto"
          elegirEstado
          onGuardar={guardar}
        />
      </Pila>
    </Contenedor>
  );
}

function valoresDe(proyecto: proyectos.ProyectoDetalle): ValoresProyecto {
  return {
    titulo: proyecto.titulo,
    descripcion: proyecto.descripcion,
    materia: proyecto.materia ?? '',
    periodo: proyecto.periodo ?? '',
    urlRepositorio: proyecto.urlRepositorio ?? '',
    urlDemo: proyecto.urlDemo ?? '',
    urlVideo: proyecto.urlVideo ?? '',
    tecnologiaIds: proyecto.tecnologias.map((tecnologia) => tecnologia.id),
    imagenes: proyecto.imagenes,
    estado: proyecto.estado === 'borrador' ? 'borrador' : 'publicado',
  };
}

/** CU-18: editar con bloqueo optimista por versión. */
export function PaginaEditarProyecto() {
  const { id = '' } = useParams({ strict: false });
  const consulta = useProyecto(id);
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();

  return (
    <Contenedor ancho="medio">
      <Pila espacio={20}>
        <Pila espacio={8}>
          <Dato color="acento">Editar proyecto</Dato>
          <Titulo nivel={1}>Actualiza tu proyecto</Titulo>
        </Pila>
        <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={2} />}>
          {(proyecto) => (
            <FormularioProyecto
              inicial={valoresDe(proyecto)}
              textoBoton="Guardar cambios"
              elegirEstado
              onGuardar={async (valores) => {
                try {
                  await editarProyecto(proyecto.id, {
                    ...aCandidato(valores),
                    estado: valores.estado,
                    version: proyecto.version,
                  });
                  await clienteConsultas.invalidateQueries({ queryKey: ['proyectos'] });
                  await navegar({ to: '/proyectos/$id', params: { id: proyecto.id } });
                  return null;
                } catch (error: unknown) {
                  return mensajeDeGuardado(error);
                }
              }}
            />
          )}
        </Carga>
      </Pila>
    </Contenedor>
  );
}

function EnlaceExterno({ href, children }: { href: string | null; children: string }) {
  return href ? <Enlace href={href}>{children}</Enlace> : null;
}

/** CU-19: detalle del proyecto, con acciones de edición para su autor. */
export function PaginaProyecto() {
  const { id = '' } = useParams({ strict: false });
  const consulta = useProyecto(id);
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function eliminar(): Promise<void> {
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarProyecto(id);
      await clienteConsultas.invalidateQueries({ queryKey: ['proyectos'] });
      await navegar({ to: '/' });
    } catch (error: unknown) {
      setErrorEliminar(mensajeDeError(error));
      setEliminando(false);
    }
  }

  return (
    <Contenedor ancho="medio">
      <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={1} />}>
        {(proyecto) => (
          <Pila espacio={20}>
            <Pila espacio={8}>
              <Fila espacio={8} alinear="centro">
                {proyecto.estado === 'borrador' && <Insignia tono="falta">Borrador</Insignia>}
                <Dato>
                  <Enlace href={`/talentos/${proyecto.autor.id}`}>{proyecto.autor.nombre}</Enlace>
                  {proyecto.publicadoEn && ` · ${fechaLegible(proyecto.publicadoEn)}`}
                </Dato>
              </Fila>
              <Titulo nivel={1}>{proyecto.titulo}</Titulo>
            </Pila>

            {proyecto.imagenes.map((imagen, indice) => (
              <Imagen
                key={imagen.id}
                src={imagen.url}
                alt={`Imagen ${String(indice + 1)} de ${proyecto.titulo}`}
              />
            ))}

            <Texto>{proyecto.descripcion}</Texto>

            <Fila espacio={6}>
              {proyecto.tecnologias.map((tecnologia) => (
                <Insignia key={tecnologia.id}>{tecnologia.nombre}</Insignia>
              ))}
            </Fila>

            {(proyecto.materia ?? proyecto.periodo) && (
              <Dato>{[proyecto.materia, proyecto.periodo].filter(Boolean).join(' · ')}</Dato>
            )}

            <Fila espacio={16}>
              <EnlaceExterno href={proyecto.urlRepositorio}>Repositorio</EnlaceExterno>
              <EnlaceExterno href={proyecto.urlDemo}>Demo en vivo</EnlaceExterno>
              <EnlaceExterno href={proyecto.urlVideo}>Video</EnlaceExterno>
            </Fila>

            <Fila espacio={12} alinear="centro">
              {proyecto.estado === 'publicado' && (
                <BotonLike
                  proyectoId={proyecto.id}
                  meGusta={proyecto.meGusta}
                  likes={proyecto.likes}
                />
              )}
              {proyecto.esMio && (
                <>
                  <EnlaceBoton href={`/proyectos/${proyecto.id}/editar`} variante="secundario">
                    Editar
                  </EnlaceBoton>
                  <Boton
                    variante="advertencia"
                    onPress={() => {
                      setConfirmando(true);
                    }}
                  >
                    Eliminar
                  </Boton>
                </>
              )}
            </Fila>

            <Modal
              abierto={confirmando}
              titulo="¿Eliminar este proyecto?"
              onCambioAbierto={setConfirmando}
              acciones={
                <>
                  <Boton
                    variante="advertencia"
                    cargando={eliminando}
                    onPress={() => void eliminar()}
                  >
                    Sí, eliminar
                  </Boton>
                  <Boton
                    variante="fantasma"
                    onPress={() => {
                      setConfirmando(false);
                    }}
                  >
                    Cancelar
                  </Boton>
                </>
              }
            >
              <Pila espacio={12}>
                <Texto color="secundario">
                  Dejará de verse en el feed y en tu perfil. Esta acción no se puede deshacer.
                </Texto>
                {errorEliminar && (
                  <AvisoError titulo="No pudimos eliminar el proyecto">{errorEliminar}</AvisoError>
                )}
              </Pila>
            </Modal>
          </Pila>
        )}
      </Carga>
    </Contenedor>
  );
}
