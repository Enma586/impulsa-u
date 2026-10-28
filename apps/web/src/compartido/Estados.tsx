import {
  AvisoError,
  Boton,
  Cargando,
  Esqueleto,
  Fila,
  Pila,
  Tarjeta,
  Texto,
  Titulo,
} from '@impulsau/ui';
import type { ReactNode } from 'react';
import { mensajeDeError } from '../api/cliente';

/** Esqueleto de una lista de tarjetas mientras llegan los datos. */
export function EsqueletoLista({ filas = 3 }: { filas?: number }) {
  return (
    <Cargando>
      <Pila espacio={16}>
        {Array.from({ length: filas }, (_, i) => (
          <Tarjeta key={i}>
            <Pila espacio={12}>
              <Fila espacio={12} alinear="centro">
                <Esqueleto forma="circulo" />
                <Esqueleto ancho="mitad" />
              </Fila>
              <Esqueleto />
              <Esqueleto ancho="mitad" />
            </Pila>
          </Tarjeta>
        ))}
      </Pila>
    </Cargando>
  );
}

export function EstadoVacio({
  titulo,
  children,
  accion,
}: {
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <Tarjeta>
      <Pila espacio={12}>
        <Titulo nivel={3}>{titulo}</Titulo>
        {children && <Texto color="secundario">{children}</Texto>}
        {accion}
      </Pila>
    </Tarjeta>
  );
}

export function ErrorConsulta({
  error,
  onReintentar,
}: {
  error: unknown;
  onReintentar?: () => void;
}) {
  return (
    <Pila espacio={12}>
      <AvisoError titulo="No pudimos cargar esto">{mensajeDeError(error)}</AvisoError>
      {onReintentar && (
        <Fila>
          <Boton variante="secundario" onPress={onReintentar}>
            Reintentar
          </Boton>
        </Fila>
      )}
    </Pila>
  );
}

interface ConsultaBasica<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => unknown;
}

/** Pinta el esqueleto, el error con reintento o el contenido según el estado de la consulta. */
export function Carga<T>({
  consulta,
  esqueleto = <EsqueletoLista />,
  children,
}: {
  consulta: ConsultaBasica<T>;
  esqueleto?: ReactNode;
  children: (datos: T) => ReactNode;
}) {
  if (consulta.isPending) return <>{esqueleto}</>;
  if (consulta.isError || consulta.data === undefined) {
    return (
      <ErrorConsulta
        error={consulta.error}
        onReintentar={() => {
          void consulta.refetch();
        }}
      />
    );
  }
  return <>{children(consulta.data)}</>;
}
