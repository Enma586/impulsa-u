import { useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Link, TextArea, TextField, Label } from 'react-aria-components';
import { Boton } from '../acciones/Boton';
import { Avatar } from '../datos/Avatar';
import { IconoAlerta } from '../iconos';
import { soloLectores } from '../estados/estados.css';
import * as estilos from './mensajeria.css';

/**
 * Lista y detalle de una bandeja de mensajes. En pantallas anchas se ven los dos; en celular, solo
 * el detalle cuando hay una conversación abierta y la lista en caso contrario.
 */
export function PanelDividido({
  lista,
  detalle,
  detalleAbierto,
}: {
  lista: ReactNode;
  detalle: ReactNode;
  detalleAbierto: boolean;
}) {
  return (
    <div className={estilos.panel} data-detalle={detalleAbierto}>
      <div className={estilos.panelLista}>{lista}</div>
      <section className={estilos.panelDetalle}>{detalle}</section>
    </div>
  );
}

/** Una conversación de la lista: enlace real, con el contador de no leídos dentro de su nombre accesible. */
export function ItemConversacion({
  href,
  nombre,
  vista,
  hora,
  noLeidos,
  activa,
}: {
  href: string;
  nombre: string;
  vista: string;
  hora: string;
  noLeidos: number;
  activa: boolean;
}) {
  return (
    <Link
      className={estilos.itemConversacion}
      href={href}
      data-current={activa}
      aria-current={activa ? 'page' : false}
    >
      <Avatar nombre={nombre} />
      <span className={estilos.itemCuerpo}>
        <span className={estilos.itemFila}>
          <span className={estilos.itemNombre}>{nombre}</span>
          {hora && <span className={estilos.itemHora}>{hora}</span>}
        </span>
        <span className={estilos.itemFila}>
          <span
            className={[estilos.itemVista, noLeidos > 0 && estilos.itemSinLeer]
              .filter(Boolean)
              .join(' ')}
          >
            {vista}
          </span>
          {noLeidos > 0 && (
            <span className={estilos.contadorSinLeer}>
              <span aria-hidden="true">{noLeidos > 99 ? '99+' : noLeidos}</span>
              <span className={soloLectores}>{`${String(noLeidos)} sin leer`}</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

/** Cabecera de la conversación abierta: quién es y las acciones que se le ofrecen. */
export function EncabezadoConversacion({
  nombre,
  detalle,
  volver,
  acciones,
}: {
  nombre: string;
  detalle?: string;
  volver?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className={estilos.encabezado}>
      {volver}
      <Avatar nombre={nombre} />
      <div className={estilos.encabezadoTexto}>
        <p className={estilos.itemNombre}>{nombre}</p>
        {detalle && <p className={estilos.itemVista}>{detalle}</p>}
      </div>
      {acciones}
    </header>
  );
}

export type EstadoMensajeVista = 'enviando' | 'enviado' | 'leido' | 'fallido';

const TEXTO_ESTADO: Record<Exclude<EstadoMensajeVista, 'fallido'>, string> = {
  enviando: 'Enviando…',
  enviado: 'Enviado',
  leido: 'Leído',
};

/** Un mensaje del hilo. Para los propios muestra el estado con texto, nunca solo con color. */
export function BurbujaMensaje({
  texto,
  hora,
  propio,
  estado,
  onReintentar,
}: {
  texto: string;
  hora: string;
  propio: boolean;
  /** Solo aplica a los mensajes propios. */
  estado?: EstadoMensajeVista;
  onReintentar?: () => void;
}) {
  return (
    <li className={estilos.mensaje} data-propio={propio}>
      <div
        className={[estilos.burbuja, estilos.burbujaTono[propio ? 'propio' : 'ajeno']].join(' ')}
      >
        {texto}
      </div>
      <div className={estilos.pieMensaje}>
        <span>{hora}</span>
        {propio && estado === 'fallido' && (
          <>
            <span className={estilos.pieError}>No se envió</span>
            {onReintentar && (
              <Boton variante="secundario" tamano="pequeno" onPress={onReintentar}>
                Reintentar
              </Boton>
            )}
          </>
        )}
        {propio && estado && estado !== 'fallido' && <span>{TEXTO_ESTADO[estado]}</span>}
      </div>
    </li>
  );
}

export function SeparadorDia({ children }: { children: ReactNode }) {
  return <li className={estilos.separadorDia}>{children}</li>;
}

const CERCA_DEL_FINAL_PX = 120;

/**
 * Región con el historial: se anuncia a lectores de pantalla, sigue los mensajes nuevos si quien lee
 * está al final (o si el último es propio) y conserva su posición al cargar mensajes anteriores.
 */
export function HiloMensajes({
  etiqueta,
  claveInicio,
  claveFinal,
  finalEsPropio,
  anteriores,
  children,
}: {
  etiqueta: string;
  /** Cambia cuando se agregan mensajes más antiguos arriba. */
  claveInicio: string;
  /** Cambia cuando llega o se envía un mensaje al final. */
  claveFinal: string;
  finalEsPropio: boolean;
  anteriores?: { cargando: boolean; onPress: () => void };
  children: ReactNode;
}) {
  const region = useRef<HTMLDivElement>(null);
  const previo = useRef({ alto: 0, inicio: claveInicio, final: claveFinal });

  useLayoutEffect(() => {
    const el = region.current;
    if (!el) return;
    const antes = previo.current;
    if (antes.inicio !== claveInicio && antes.final === claveFinal) {
      el.scrollTop += el.scrollHeight - antes.alto;
    } else if (antes.final !== claveFinal || antes.alto === 0) {
      const cerca = antes.alto - el.scrollTop - el.clientHeight < CERCA_DEL_FINAL_PX;
      if (cerca || finalEsPropio || antes.alto === 0) el.scrollTop = el.scrollHeight;
    }
    previo.current = { alto: el.scrollHeight, inicio: claveInicio, final: claveFinal };
  }, [claveInicio, claveFinal, finalEsPropio]);

  return (
    <div
      ref={region}
      className={estilos.hilo}
      role="log"
      aria-label={etiqueta}
      aria-live="polite"
      aria-relevant="additions"
      tabIndex={0}
    >
      {anteriores && (
        <div className={estilos.cargarAnteriores}>
          <Boton
            variante="secundario"
            tamano="pequeno"
            cargando={anteriores.cargando}
            onPress={anteriores.onPress}
          >
            Cargar mensajes anteriores
          </Boton>
        </div>
      )}
      <ol className={estilos.listaMensajes}>{children}</ol>
    </div>
  );
}

/** Línea de "está escribiendo": el contenedor siempre existe para que el anuncio funcione. */
export function Escribiendo({ texto }: { texto: string | null }) {
  return (
    <p className={estilos.escribiendo} role="status" aria-live="polite">
      {texto ?? ''}
    </p>
  );
}

/** Estado de la conexión en vivo: solo se pinta cuando algo no está bien. */
export function AvisoConexion({
  tono = 'advertencia',
  children,
}: {
  tono?: 'advertencia' | 'error';
  children: ReactNode;
}) {
  return (
    <div
      className={[estilos.avisoConexion, estilos.avisoConexionTono[tono]].join(' ')}
      role="status"
    >
      <IconoAlerta />
      <span>{children}</span>
    </div>
  );
}

/**
 * Caja para escribir. Enter envía y Shift+Enter agrega un salto de línea; no envía mientras se
 * compone con un teclado de entrada (IME) ni cuando el texto está vacío o pasa del máximo.
 */
export function CajaMensaje({
  etiqueta,
  valor,
  maximo,
  deshabilitado = false,
  onCambio,
  onEnviar,
}: {
  etiqueta: string;
  valor: string;
  maximo: number;
  deshabilitado?: boolean;
  onCambio: (texto: string) => void;
  onEnviar: () => void;
}) {
  const vacio = valor.trim().length === 0;
  const excedido = valor.length > maximo;
  const puedeEnviar = !deshabilitado && !vacio && !excedido;

  const alTeclear = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key !== 'Enter' || evento.shiftKey || evento.nativeEvent.isComposing) return;
    evento.preventDefault();
    if (puedeEnviar) onEnviar();
  };

  return (
    <div className={estilos.composer}>
      <TextField
        className={estilos.composerCampo}
        value={valor}
        onChange={onCambio}
        isDisabled={deshabilitado}
      >
        <Label className={soloLectores}>{etiqueta}</Label>
        <TextArea className={estilos.composerTexto} rows={1} onKeyDown={alTeclear} />
        {valor.length > maximo * 0.85 && (
          <span className={estilos.contadorCaracteres} data-excedido={excedido}>
            {`${String(valor.length)}/${String(maximo)}`}
          </span>
        )}
      </TextField>
      <Boton deshabilitado={!puedeEnviar} onPress={onEnviar}>
        Enviar
      </Boton>
    </div>
  );
}

/** Mensaje centrado dentro del panel de detalle (por ejemplo, "Elige una conversación"). */
export function VacioDelPanel({ children }: { children: ReactNode }) {
  return <div className={estilos.vacio}>{children}</div>;
}
