import type { ReactNode } from 'react';
import { Button } from 'react-aria-components';
import * as estilos from './acciones.css';

interface PropsBoton {
  children: ReactNode;
  variante?: keyof typeof estilos.variante;
  tamano?: keyof typeof estilos.tamano;
  anchoCompleto?: boolean;
  /** Mientras carga no responde a clics, pero conserva el foco (doble clic = una sola petición). */
  cargando?: boolean;
  deshabilitado?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onPress?: () => void;
}

export function Boton({
  children,
  variante = 'accion',
  tamano = 'normal',
  anchoCompleto = false,
  cargando = false,
  deshabilitado = false,
  type = 'button',
  onPress,
}: PropsBoton) {
  const clase = [
    estilos.boton,
    estilos.variante[variante],
    estilos.tamano[tamano],
    anchoCompleto && estilos.anchoCompleto,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Button
      className={clase}
      type={type}
      isDisabled={deshabilitado}
      isPending={cargando}
      {...(onPress ? { onPress } : {})}
    >
      {cargando && <span className={estilos.giro} aria-hidden="true" />}
      {children}
    </Button>
  );
}

/** Botón de solo ícono: `etiqueta` es obligatoria porque es su nombre accesible. */
export function BotonIcono({
  etiqueta,
  icono,
  onPress,
}: {
  etiqueta: string;
  icono: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Button className={estilos.botonIcono} aria-label={etiqueta} {...(onPress ? { onPress } : {})}>
      {icono}
    </Button>
  );
}
