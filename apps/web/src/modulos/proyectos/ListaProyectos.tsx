import { Boton, Fila, Grilla, Pila } from '@impulsau/ui';
import type { ReactNode } from 'react';
import { Carga, EsqueletoLista, EstadoVacio } from '../../compartido/Estados';
import { useFeed } from './consultas';
import { TarjetaProyecto } from './TarjetaProyecto';

/** Lista de proyectos con paginación por cursor, esqueleto, estado vacío y error con reintento. */
export function ListaProyectos({
  filtros,
  vacio,
}: {
  filtros: { autorId?: string; mios?: boolean };
  vacio: { titulo: string; texto: string; accion?: ReactNode };
}) {
  const feed = useFeed(filtros);

  return (
    <Carga consulta={feed} esqueleto={<EsqueletoLista filas={3} />}>
      {(datos) => {
        const proyectos = datos.pages.flatMap((pagina) => pagina.items);
        if (proyectos.length === 0) {
          return (
            <EstadoVacio titulo={vacio.titulo} accion={vacio.accion}>
              {vacio.texto}
            </EstadoVacio>
          );
        }
        return (
          <Pila espacio={20}>
            <Grilla columnas={2}>
              {proyectos.map((proyecto) => (
                <TarjetaProyecto key={proyecto.id} proyecto={proyecto} />
              ))}
            </Grilla>
            {feed.hasNextPage && (
              <Fila justificar="centro">
                <Boton
                  variante="secundario"
                  cargando={feed.isFetchingNextPage}
                  onPress={() => {
                    void feed.fetchNextPage();
                  }}
                >
                  Cargar más proyectos
                </Boton>
              </Fila>
            )}
          </Pila>
        );
      }}
    </Carga>
  );
}
