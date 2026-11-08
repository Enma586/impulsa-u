import { mensajeria } from '@impulsau/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { almacenSesion } from '../../sesion/almacen';
import { Bandeja } from './Bandeja';
import { BotonInteres } from './BotonInteres';
import { PaginaIntereses } from './PaginaIntereses';

const YO = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c01';
const OTRO = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c02';
const CONVERSACION = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c03';
const INTERES = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c04';
const MENSAJE_1 = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c05';

function iniciarSesionComo(rol: 'talento' | 'empresa') {
  almacenSesion.guardar({
    accessToken: 'token',
    refreshToken: 'renovacion',
    expiraEn: Math.floor(Date.now() / 1000) + 3600,
    usuario: { id: YO, correo: 'yo@correo.com', rol, estado: 'activo', nombre: 'Yo' },
  });
}

const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

const mensajeAjeno = {
  conversacionId: CONVERSACION,
  secuencia: 1,
  clientMessageId: MENSAJE_1,
  remitenteId: OTRO,
  cuerpo: 'Hola, vimos tu portafolio',
  creadoEn: '2026-10-01T10:00:00.000Z',
};

const conversacion = {
  id: CONVERSACION,
  interlocutor: { id: OTRO, nombre: '[Empresa]' },
  vacanteTitulo: null,
  ultimoMensaje: mensajeAjeno,
  noLeidos: 1,
  leidoPorOtroHasta: 0,
  bloqueada: false,
  bloqueadaPorMi: false,
};

const interes = {
  id: INTERES,
  empresa: { id: OTRO, nombre: '[Empresa]' },
  talento: { id: YO, nombre: 'Yo' },
  direccion: 'empresa_a_talento',
  mensaje: 'Nos gustó tu proyecto',
  estado: 'pendiente',
  conversacionId: null,
  creadoEn: '2026-10-01T09:00:00.000Z',
  respondidoEn: null,
};

function urlDe(ruta: Parameters<typeof fetch>[0]): string {
  return ruta instanceof Request ? ruta.url : ruta.toString();
}

let fetchSimulado: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  fetchSimulado = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchSimulado);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  almacenSesion.limpiar();
});

function mostrar(pagina: React.JSX.Element) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={cliente}>{pagina}</QueryClientProvider>);
}

function llamadas(metodo: string, fragmento: string) {
  return fetchSimulado.mock.calls.filter(
    ([ruta, opciones]) => urlDe(ruta).includes(fragmento) && (opciones?.method ?? 'GET') === metodo,
  );
}

describe('intereses (CU-31)', () => {
  it('lista los recibidos y aceptar llama al servidor', async () => {
    iniciarSesionComo('talento');
    fetchSimulado.mockImplementation((ruta, opciones) => {
      if (urlDe(ruta).includes('/aceptar')) {
        return Promise.resolve(
          json({ ...interes, estado: 'aceptado', conversacionId: CONVERSACION }),
        );
      }
      expect(opciones?.method ?? 'GET').toBe('GET');
      return Promise.resolve(json({ items: [interes], siguienteCursor: null }));
    });
    mostrar(<PaginaIntereses />);

    expect(await screen.findByText('Nos gustó tu proyecto')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar y abrir chat' }));
    await waitFor(() => {
      expect(llamadas('POST', `/intereses/${INTERES}/aceptar`)).toHaveLength(1);
    });
  });

  it('sin intereses muestra el estado vacío', async () => {
    iniciarSesionComo('talento');
    fetchSimulado.mockResolvedValue(json({ items: [], siguienteCursor: null }));
    mostrar(<PaginaIntereses />);
    expect(await screen.findByText('Sin intereses recibidos')).toBeTruthy();
  });
});

describe('mostrar interés (CU-29)', () => {
  it('una empresa lo muestra con PUT y el botón pasa a "Interés enviado"', async () => {
    iniciarSesionComo('empresa');
    fetchSimulado.mockImplementation((ruta, opciones) => {
      if (opciones?.method === 'PUT') {
        return Promise.resolve(json({ ...interes, direccion: 'empresa_a_talento' }));
      }
      return Promise.resolve(json({ items: [], siguienteCursor: null }));
    });
    mostrar(<BotonInteres destinoId={OTRO} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Mostrar interés' }));
    expect(await screen.findByText('Interés enviado')).toBeTruthy();
    expect(llamadas('PUT', `/talentos/${OTRO}/interes`)).toHaveLength(1);
  });

  it('si el servidor lo rechaza, muestra el motivo', async () => {
    iniciarSesionComo('empresa');
    fetchSimulado.mockImplementation((_ruta, opciones) =>
      Promise.resolve(
        opciones?.method === 'PUT'
          ? json(
              { code: 'empresa_no_verificada', message: 'Tu empresa aún no está verificada' },
              403,
            )
          : json({ items: [], siguienteCursor: null }),
      ),
    );
    mostrar(<BotonInteres destinoId={OTRO} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Mostrar interés' }));
    expect(await screen.findByText('Tu empresa aún no está verificada')).toBeTruthy();
  });
});

describe('bandeja y conversación (CU-32, CU-33)', () => {
  function simularConversacion(alEnviar: (entrada: mensajeria.EnviarMensajeEntrada) => Response) {
    fetchSimulado.mockImplementation((ruta, opciones) => {
      const url = urlDe(ruta);
      if (opciones?.method === 'POST' && url.includes('/mensajes')) {
        return Promise.resolve(
          alEnviar(
            mensajeria.EnviarMensajeEntrada.parse(
              JSON.parse(typeof opciones.body === 'string' ? opciones.body : ''),
            ),
          ),
        );
      }
      if (url.includes('/lectura')) {
        return Promise.resolve(json({ conversacionId: CONVERSACION, usuarioId: YO, secuencia: 1 }));
      }
      if (url.includes('/mensajes')) {
        return Promise.resolve(json({ items: [mensajeAjeno], siguienteAntesDeSecuencia: null }));
      }
      return Promise.resolve(json({ items: [conversacion], siguienteCursor: null }));
    });
  }

  it('muestra la lista, el historial y marca como leído lo recibido', async () => {
    iniciarSesionComo('talento');
    simularConversacion(() => json({}, 500));
    mostrar(<Bandeja conversacionId={CONVERSACION} />);

    expect(await screen.findByText('Hola, vimos tu portafolio', { selector: 'div' })).toBeTruthy();
    expect(screen.getByRole('log', { name: 'Mensajes con [Empresa]' })).toBeTruthy();
    await waitFor(() => {
      expect(llamadas('PUT', `/conversaciones/${CONVERSACION}/lectura`)).toHaveLength(1);
    });
  });

  it('envía con un clientMessageId, sin duplicar si se confirma, y lo muestra enviado', async () => {
    iniciarSesionComo('talento');
    simularConversacion((entrada) => {
      return json({
        ...mensajeAjeno,
        secuencia: 2,
        remitenteId: YO,
        clientMessageId: entrada.clientMessageId,
        cuerpo: entrada.cuerpo,
      });
    });
    mostrar(<Bandeja conversacionId={CONVERSACION} />);

    await screen.findByText('Hola, vimos tu portafolio', { selector: 'div' });
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Escribe un mensaje' }),
      'Gracias{Enter}',
    );

    expect(await screen.findByText('Gracias', { selector: 'div' })).toBeTruthy();
    expect(await screen.findByText('Enviado')).toBeTruthy();
    expect(screen.getAllByText('Gracias', { selector: 'div' })).toHaveLength(1);
    expect(llamadas('POST', '/mensajes')).toHaveLength(1);
  });

  it('si el envío falla, queda marcado y reintentar reutiliza el mismo clientMessageId', async () => {
    iniciarSesionComo('talento');
    let intento = 0;
    const enviados: string[] = [];
    simularConversacion((entrada) => {
      enviados.push(entrada.clientMessageId);
      intento += 1;
      return intento === 1
        ? json({ code: 'error_interno', message: 'falló' }, 500)
        : json({
            ...mensajeAjeno,
            secuencia: 2,
            remitenteId: YO,
            clientMessageId: entrada.clientMessageId,
            cuerpo: entrada.cuerpo,
          });
    });
    mostrar(<Bandeja conversacionId={CONVERSACION} />);

    await screen.findByText('Hola, vimos tu portafolio', { selector: 'div' });
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Escribe un mensaje' }),
      'Gracias{Enter}',
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Enviado')).toBeTruthy();
    expect(enviados).toHaveLength(2);
    expect(enviados[0]).toBe(enviados[1]);
  });

  it('una conversación bloqueada por la otra parte no deja escribir', async () => {
    iniciarSesionComo('talento');
    fetchSimulado.mockImplementation((ruta) =>
      Promise.resolve(
        urlDe(ruta).includes('/mensajes')
          ? json({ items: [], siguienteAntesDeSecuencia: null })
          : json({
              items: [{ ...conversacion, bloqueada: true, bloqueadaPorMi: false }],
              siguienteCursor: null,
            }),
      ),
    );
    mostrar(<Bandeja conversacionId={CONVERSACION} />);

    expect(await screen.findByText('Esta conversación está bloqueada.')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Escribe un mensaje' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bloquear' })).toBeNull();
  });
});
