import type { mensajeria } from '@impulsau/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  alCambiarLectura,
  alEscribir,
  alReconectar,
  alRecibirMensaje,
  avisarEscribiendo,
  avisarLectura,
  enviarPorSocket,
  sincronizarPorSocket,
} from './tiempoReal';
import { enviarPorRest, marcarLeidoPorRest, pedirHistorial } from './consultas';

export interface MensajePendiente {
  clientMessageId: string;
  cuerpo: string;
  creadoEn: string;
  fallido: boolean;
}

const PAUSA_ESCRIBIENDO_MS = 2_500;
const REPETIR_ESCRIBIENDO_MS = 3_000;
const OLVIDAR_ESCRIBIENDO_MS = 6_000;

/** Une por secuencia y deja el resultado del más antiguo al más nuevo. */
function fusionar(
  actuales: readonly mensajeria.Mensaje[],
  nuevos: readonly mensajeria.Mensaje[],
): mensajeria.Mensaje[] {
  const porSecuencia = new Map<number, mensajeria.Mensaje>();
  for (const mensaje of [...actuales, ...nuevos]) porSecuencia.set(mensaje.secuencia, mensaje);
  return [...porSecuencia.values()].sort((a, b) => a.secuencia - b.secuencia);
}

/**
 * Estado de una conversación abierta: historial paginado, envío optimista con reintento seguro
 * (mismo `clientMessageId`), recuperación tras reconectar, marca de lectura y "escribiendo".
 */
export function useHilo(conversacionId: string, yoId: string, leidoPorOtroInicial: number) {
  const [mensajes, setMensajes] = useState<mensajeria.Mensaje[]>([]);
  const [pendientes, setPendientes] = useState<MensajePendiente[]>([]);
  const [anteriores, setAnteriores] = useState<number | null>(null);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [leidoPorOtro, setLeidoPorOtro] = useState(leidoPorOtroInicial);
  const [otroEscribiendo, setOtroEscribiendo] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const ultimaSecuencia = useRef(0);
  const ultimaMarcada = useRef(0);
  const escribiendoDesde = useRef(0);
  const temporizadorPausa = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  ultimaSecuencia.current = mensajes.at(-1)?.secuencia ?? 0;

  const recibir = useCallback((nuevos: readonly mensajeria.Mensaje[]) => {
    setMensajes((actuales) => fusionar(actuales, nuevos));
    setPendientes((actuales) =>
      actuales.filter((p) => !nuevos.some((m) => m.clientMessageId === p.clientMessageId)),
    );
  }, []);

  // Carga inicial (y al cambiar de conversación).
  useEffect(() => {
    let vigente = true;
    setMensajes([]);
    setPendientes([]);
    setCargado(false);
    setError(null);
    setAnteriores(null);
    ultimaMarcada.current = 0;
    pedirHistorial(conversacionId).then(
      (pagina) => {
        if (!vigente) return;
        setMensajes((actuales) => fusionar(actuales, pagina.items));
        setAnteriores(pagina.siguienteAntesDeSecuencia);
        setCargado(true);
      },
      (causa: unknown) => {
        if (!vigente) return;
        setError(causa);
        setCargado(true);
      },
    );
    return () => {
      vigente = false;
    };
  }, [conversacionId, recarga]);

  useEffect(() => {
    setLeidoPorOtro((actual) => Math.max(actual, leidoPorOtroInicial));
  }, [leidoPorOtroInicial]);

  // En vivo.
  useEffect(() => {
    const quitarMensaje = alRecibirMensaje((mensaje) => {
      if (mensaje.conversacionId !== conversacionId) return;
      recibir([mensaje]);
      if (mensaje.remitenteId !== yoId) setOtroEscribiendo(false);
    });
    const quitarLectura = alCambiarLectura((datos) => {
      if (datos.conversacionId !== conversacionId || datos.usuarioId === yoId) return;
      setLeidoPorOtro((actual) => Math.max(actual, datos.secuencia));
    });
    let olvidar: ReturnType<typeof setTimeout> | undefined;
    const quitarEscribiendo = alEscribir((datos) => {
      if (datos.conversacionId !== conversacionId || datos.usuarioId === yoId) return;
      clearTimeout(olvidar);
      setOtroEscribiendo(datos.activo);
      // Si el "dejó de escribir" se pierde, el aviso no se queda pegado.
      if (datos.activo) {
        olvidar = setTimeout(() => {
          setOtroEscribiendo(false);
        }, OLVIDAR_ESCRIBIENDO_MS);
      }
    });
    const quitarReconexion = alReconectar(() => {
      void (async () => {
        let desde = ultimaSecuencia.current;
        for (;;) {
          const resultado = await sincronizarPorSocket(conversacionId, desde);
          if (!resultado?.ok) return;
          recibir(resultado.mensajes);
          const ultimo = resultado.mensajes.at(-1);
          if (!resultado.hayMas || !ultimo) return;
          desde = ultimo.secuencia;
        }
      })();
    });
    return () => {
      quitarMensaje();
      quitarLectura();
      quitarEscribiendo();
      quitarReconexion();
      clearTimeout(olvidar);
    };
  }, [conversacionId, yoId, recibir]);

  // Marca como leído lo último que el otro escribió, solo con la pestaña a la vista.
  const ultimoAjeno = [...mensajes].reverse().find((m) => m.remitenteId !== yoId)?.secuencia ?? 0;
  useEffect(() => {
    const marcar = () => {
      if (document.visibilityState !== 'visible') return;
      if (ultimoAjeno <= ultimaMarcada.current) return;
      const secuencia = ultimoAjeno;
      ultimaMarcada.current = secuencia;
      if (avisarLectura(conversacionId, secuencia)) return;
      marcarLeidoPorRest(conversacionId, secuencia).catch(() => {
        ultimaMarcada.current = Math.min(ultimaMarcada.current, secuencia - 1);
      });
    };
    marcar();
    document.addEventListener('visibilitychange', marcar);
    return () => {
      document.removeEventListener('visibilitychange', marcar);
    };
  }, [conversacionId, ultimoAjeno]);

  const marcarFallido = useCallback((clientMessageId: string) => {
    setPendientes((actuales) =>
      actuales.map((p) => (p.clientMessageId === clientMessageId ? { ...p, fallido: true } : p)),
    );
  }, []);

  const despachar = useCallback(
    async (pendiente: MensajePendiente) => {
      const entrada = { clientMessageId: pendiente.clientMessageId, cuerpo: pendiente.cuerpo };
      const porSocket = await enviarPorSocket({ conversacionId, ...entrada });
      if (porSocket?.ok) {
        recibir([porSocket.mensaje]);
        return;
      }
      // Un rechazo del servidor (bloqueo, validación) no se arregla reintentando por otra vía.
      if (porSocket) {
        marcarFallido(pendiente.clientMessageId);
        return;
      }
      try {
        recibir([await enviarPorRest(conversacionId, entrada)]);
      } catch {
        marcarFallido(pendiente.clientMessageId);
      }
    },
    [conversacionId, recibir, marcarFallido],
  );

  const enviar = useCallback(
    (cuerpo: string) => {
      const texto = cuerpo.trim();
      if (texto === '') return;
      clearTimeout(temporizadorPausa.current);
      avisarEscribiendo(conversacionId, false);
      escribiendoDesde.current = 0;
      const pendiente: MensajePendiente = {
        clientMessageId: crypto.randomUUID(),
        cuerpo: texto,
        creadoEn: new Date().toISOString(),
        fallido: false,
      };
      setPendientes((actuales) => [...actuales, pendiente]);
      void despachar(pendiente);
    },
    [conversacionId, despachar],
  );

  const reintentar = useCallback(
    (clientMessageId: string) => {
      const pendiente = pendientes.find((p) => p.clientMessageId === clientMessageId);
      if (!pendiente) return;
      setPendientes((actuales) =>
        actuales.map((p) => (p.clientMessageId === clientMessageId ? { ...p, fallido: false } : p)),
      );
      void despachar(pendiente);
    },
    [pendientes, despachar],
  );

  const cargarAnteriores = useCallback(() => {
    if (anteriores === null || cargandoAnteriores) return;
    setCargandoAnteriores(true);
    pedirHistorial(conversacionId, anteriores).then(
      (pagina) => {
        setMensajes((actuales) => fusionar(actuales, pagina.items));
        setAnteriores(pagina.siguienteAntesDeSecuencia);
        setCargandoAnteriores(false);
      },
      (causa: unknown) => {
        setError(causa);
        setCargandoAnteriores(false);
      },
    );
  }, [conversacionId, anteriores, cargandoAnteriores]);

  /** Avisa "escribiendo" sin saturar: al empezar, cada pocos segundos y un "paró" tras una pausa. */
  const textoCambiado = useCallback(
    (texto: string) => {
      clearTimeout(temporizadorPausa.current);
      if (texto.trim() === '') {
        if (escribiendoDesde.current !== 0) avisarEscribiendo(conversacionId, false);
        escribiendoDesde.current = 0;
        return;
      }
      const ahora = Date.now();
      if (ahora - escribiendoDesde.current > REPETIR_ESCRIBIENDO_MS) {
        escribiendoDesde.current = ahora;
        avisarEscribiendo(conversacionId, true);
      }
      temporizadorPausa.current = setTimeout(() => {
        escribiendoDesde.current = 0;
        avisarEscribiendo(conversacionId, false);
      }, PAUSA_ESCRIBIENDO_MS);
    },
    [conversacionId],
  );

  useEffect(
    () => () => {
      clearTimeout(temporizadorPausa.current);
    },
    [],
  );

  return {
    mensajes,
    pendientes,
    cargado,
    error,
    hayAnteriores: anteriores !== null,
    cargandoAnteriores,
    leidoPorOtro,
    otroEscribiendo,
    enviar,
    reintentar,
    cargarAnteriores,
    textoCambiado,
    recargar: () => {
      setRecarga((n) => n + 1);
    },
  };
}
