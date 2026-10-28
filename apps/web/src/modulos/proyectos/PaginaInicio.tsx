import { Contenedor, Dato, EnlaceBoton, Fila, Pila, Titulo } from '@impulsau/ui';
import { useUsuario } from '../../sesion/useSesion';
import { ListaProyectos } from './ListaProyectos';

/** Inicio: el feed de proyectos publicados (CU-20). */
export function PaginaInicio() {
  const usuario = useUsuario();
  const esTalento = usuario.rol === 'talento';

  return (
    <Contenedor ancho="ancho">
      <Pila espacio={24}>
        <Fila justificar="entre" alinear="centro">
          <Pila espacio={6}>
            <Dato color="acento">Hola, {usuario.nombre}</Dato>
            <Titulo nivel={1}>Proyectos reales de talento que está empezando</Titulo>
          </Pila>
          {esTalento && <EnlaceBoton href="/proyectos/nuevo">Nuevo proyecto</EnlaceBoton>}
        </Fila>
        <ListaProyectos
          filtros={{}}
          vacio={{
            titulo: 'Todavía no hay proyectos publicados',
            texto: esTalento
              ? 'Sé la primera persona en mostrar lo que sabes hacer.'
              : 'Cuando el talento publique proyectos, los verás aquí.',
            ...(esTalento
              ? {
                  accion: (
                    <EnlaceBoton href="/proyectos/nuevo">Publicar mi primer proyecto</EnlaceBoton>
                  ),
                }
              : {}),
          }}
        />
      </Pila>
    </Contenedor>
  );
}
