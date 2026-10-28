import {
  Avatar,
  Boton,
  Contenedor,
  Dato,
  Enlace,
  EnlaceBoton,
  Fila,
  Insignia,
  Pila,
  Separador,
  Tarjeta,
  Texto,
  Titulo,
} from '@impulsau/ui';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { Carga, EsqueletoLista, EstadoVacio } from '../../compartido/Estados';
import { fechaLegible, nombresDepartamento } from '../../compartido/etiquetas';
import { cerrarSesion } from '../../sesion/acciones';
import { useUsuario } from '../../sesion/useSesion';
import { usePerfilEmpresa, usePerfilTalento } from './consultas';

const nombresEnlace = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portafolio: 'Portafolio',
  otro: 'Enlace',
};

function VistaTalento({ id }: { id: string }) {
  const usuario = useUsuario();
  const consulta = usePerfilTalento(id);

  return (
    <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={2} />}>
      {(perfil) => (
        <Pila espacio={24}>
          <Fila espacio={16} alinear="centro">
            <Avatar nombre={perfil.nombreCompleto} tamano="grande" />
            <Pila espacio={6}>
              <Titulo nivel={1}>{perfil.nombreCompleto}</Titulo>
              <Dato>
                {perfil.estadoAcademico === 'estudiante'
                  ? `Estudiante${perfil.ciclo ? ` · ciclo ${String(perfil.ciclo)}` : ''}`
                  : `Egresado${perfil.anioEgreso ? ` · ${String(perfil.anioEgreso)}` : ''}`}
              </Dato>
              <Texto color="secundario">
                {[
                  perfil.carrera?.nombre,
                  perfil.institucion?.nombre,
                  perfil.departamento ? nombresDepartamento[perfil.departamento] : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Texto>
            </Pila>
          </Fila>

          {perfil.id === usuario.id && (
            <Fila>
              <EnlaceBoton href="/perfil/editar" variante="secundario">
                Editar perfil
              </EnlaceBoton>
            </Fila>
          )}

          {perfil.bio && <Texto>{perfil.bio}</Texto>}

          <Pila espacio={12}>
            <Titulo nivel={2} tamano="pequeno">
              Habilidades y evidencia
            </Titulo>
            {perfil.habilidades.length === 0 ? (
              <Texto color="secundario">Todavía no ha agregado habilidades.</Texto>
            ) : (
              <Fila espacio={8}>
                {perfil.habilidades.map((habilidad) => (
                  <Insignia key={habilidad.id} tono={habilidad.proyectos > 0 ? 'logro' : 'neutro'}>
                    {habilidad.nombre}
                    {habilidad.proyectos > 0 &&
                      ` · ${String(habilidad.proyectos)} ${habilidad.proyectos === 1 ? 'proyecto' : 'proyectos'}`}
                  </Insignia>
                ))}
              </Fila>
            )}
            <Texto tamano="pequeno" color="secundario">
              Las habilidades en verde están respaldadas por proyectos publicados.
            </Texto>
          </Pila>

          {perfil.enlaces.length > 0 && (
            <Fila espacio={16}>
              {perfil.enlaces.map((enlace) => (
                <Enlace key={enlace.url} href={enlace.url}>
                  {nombresEnlace[enlace.tipo]}
                </Enlace>
              ))}
            </Fila>
          )}

          <Separador />

          <Pila espacio={12}>
            <Titulo nivel={2} tamano="pequeno">
              Proyectos
            </Titulo>
            {perfil.proyectos.length === 0 ? (
              <EstadoVacio titulo="Sin proyectos publicados">
                Los proyectos publicados aparecerán aquí como evidencia.
              </EstadoVacio>
            ) : (
              perfil.proyectos.map((proyecto) => (
                <Tarjeta key={proyecto.id}>
                  <Fila justificar="entre" alinear="centro">
                    <Enlace href={`/proyectos/${proyecto.id}`}>{proyecto.titulo}</Enlace>
                    <Dato>
                      {String(proyecto.likes)} me gusta · {fechaLegible(proyecto.publicadoEn)}
                    </Dato>
                  </Fila>
                </Tarjeta>
              ))
            )}
          </Pila>
        </Pila>
      )}
    </Carga>
  );
}

function VistaEmpresa({ id }: { id: string }) {
  const usuario = useUsuario();
  const consulta = usePerfilEmpresa(id);

  return (
    <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={1} />}>
      {(perfil) => (
        <Pila espacio={20}>
          <Fila espacio={16} alinear="centro">
            <Avatar nombre={perfil.nombreComercial} tamano="grande" />
            <Pila espacio={6}>
              <Titulo nivel={1}>{perfil.nombreComercial}</Titulo>
              <Fila espacio={8}>
                {perfil.sector && <Dato>{perfil.sector}</Dato>}
                {perfil.estadoVerificacion === 'verificada' && (
                  <Insignia tono="logro">Verificada</Insignia>
                )}
                {perfil.esAgencia && <Insignia>Agencia</Insignia>}
              </Fila>
            </Pila>
          </Fila>

          {perfil.id === usuario.id && (
            <Fila>
              <EnlaceBoton href="/perfil/editar" variante="secundario">
                Editar perfil
              </EnlaceBoton>
            </Fila>
          )}

          {perfil.descripcion && <Texto>{perfil.descripcion}</Texto>}
          {perfil.esAgencia && perfil.clienteDeclarado && (
            <Texto color="secundario">Recluta para: {perfil.clienteDeclarado}</Texto>
          )}
          {perfil.sitioWeb && <Enlace href={perfil.sitioWeb}>Sitio web</Enlace>}
        </Pila>
      )}
    </Carga>
  );
}

export function PaginaPerfilTalento() {
  const { id = '' } = useParams({ strict: false });
  return (
    <Contenedor ancho="medio">
      <VistaTalento id={id} />
    </Contenedor>
  );
}

export function PaginaPerfilEmpresa() {
  const { id = '' } = useParams({ strict: false });
  return (
    <Contenedor ancho="medio">
      <VistaEmpresa id={id} />
    </Contenedor>
  );
}

/** Mi perfil: se ve según el rol, con la opción de cerrar sesión en todos los dispositivos. */
export function PaginaMiPerfil() {
  const usuario = useUsuario();
  const [cerrando, setCerrando] = useState(false);

  return (
    <Contenedor ancho="medio">
      <Pila espacio={32}>
        {usuario.rol === 'empresa' ? (
          <VistaEmpresa id={usuario.id} />
        ) : (
          <VistaTalento id={usuario.id} />
        )}
        <Separador />
        <Pila espacio={8}>
          <Titulo nivel={2} tamano="pequeno">
            Sesión
          </Titulo>
          <Texto color="secundario">
            Cuenta: {usuario.correo}. Si usaste un equipo ajeno, cierra la sesión en todos tus
            dispositivos.
          </Texto>
          <Fila>
            <Boton
              variante="secundario"
              cargando={cerrando}
              onPress={() => {
                setCerrando(true);
                void cerrarSesion('global');
              }}
            >
              Cerrar sesión en todos los dispositivos
            </Boton>
          </Fila>
        </Pila>
      </Pila>
    </Contenedor>
  );
}
