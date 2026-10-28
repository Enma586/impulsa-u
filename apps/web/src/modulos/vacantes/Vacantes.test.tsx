import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { almacenSesion } from '../../sesion/almacen';
import { PaginaMisPostulaciones, PaginaVacantes } from './PaginasVacante';
import { TableroPostulaciones } from './TableroPostulaciones';

const ID_EMPRESA = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c01';
const ID_VACANTE = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c02';
const ID_HABILIDAD = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c03';
const ID_POSTULACION = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c04';
const ID_TALENTO = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c05';

function iniciarSesionComo(rol: 'talento' | 'empresa') {
  almacenSesion.guardar({
    accessToken: 'token',
    refreshToken: 'renovacion',
    expiraEn: Math.floor(Date.now() / 1000) + 3600,
    usuario: {
      id: ID_TALENTO,
      correo: 'persona@correo.com',
      rol,
      estado: 'activo',
      nombre: 'Persona de prueba',
    },
  });
}

const vacante = {
  id: ID_VACANTE,
  titulo: 'Pasantía de desarrollo web',
  empresa: { id: ID_EMPRESA, nombre: '[Empresa]' },
  tipo: 'pasantia',
  modalidad: 'remota',
  departamento: null,
  estado: 'abierta',
  habilidades: [{ id: ID_HABILIDAD, nombre: 'React', requerida: true }],
  coincidencia: 100,
  publicadaEn: '2026-10-01T10:00:00.000Z',
};

const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

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

describe('lista de vacantes (CU-42)', () => {
  it('muestra el esqueleto y luego las vacantes con su coincidencia', async () => {
    iniciarSesionComo('talento');
    fetchSimulado.mockResolvedValue(json({ items: [vacante], siguienteCursor: null }));
    mostrar(<PaginaVacantes />);

    expect(screen.getByRole('status')).toBeTruthy();
    expect(await screen.findByText('Pasantía de desarrollo web')).toBeTruthy();
    expect(screen.getByText('100% de coincidencia')).toBeTruthy();
  });

  it('muestra el estado vacío cuando no hay vacantes', async () => {
    iniciarSesionComo('talento');
    fetchSimulado.mockResolvedValue(json({ items: [], siguienteCursor: null }));
    mostrar(<PaginaVacantes />);

    expect(await screen.findByText('No hay vacantes con esos filtros')).toBeTruthy();
  });

  it('muestra el error con la opción de reintentar', async () => {
    iniciarSesionComo('talento');
    fetchSimulado.mockResolvedValueOnce(json({ code: 'error_interno', message: 'falló' }, 500));
    mostrar(<PaginaVacantes />);

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('la empresa pide solo sus vacantes y ve el acceso a publicar', async () => {
    iniciarSesionComo('empresa');
    fetchSimulado.mockResolvedValue(json({ items: [], siguienteCursor: null }));
    mostrar(<PaginaVacantes />);

    expect(await screen.findByText('Aún no publicas vacantes')).toBeTruthy();
    expect(fetchSimulado.mock.calls[0]?.[0]).toEqual(expect.stringContaining('mias=true'));
  });
});

describe('mis postulaciones', () => {
  it('muestra el estado vacío con el acceso a las vacantes', async () => {
    iniciarSesionComo('talento');
    fetchSimulado.mockResolvedValue(json([]));
    mostrar(<PaginaMisPostulaciones />);

    expect(await screen.findByText('Todavía no te has postulado')).toBeTruthy();
  });
});

describe('tablero de postulaciones (CU-44, CU-46)', () => {
  const recibida = {
    id: ID_POSTULACION,
    talento: { id: ID_TALENTO, nombre: 'María López', carrera: 'Ingeniería de Sistemas' },
    estado: 'recibida',
    motivoDescarte: null,
    detalleDescarte: null,
    proyectos: [],
    creadaEn: '2026-10-02T10:00:00.000Z',
    version: 1,
  };

  it('exige el motivo para descartar y lo envía junto con la versión', async () => {
    iniciarSesionComo('empresa');
    fetchSimulado.mockImplementation((entrada, init) => {
      if (init?.method === 'PUT')
        return Promise.resolve(json({ ...recibida, estado: 'descartada' }));
      return Promise.resolve(json([recibida]));
    });
    mostrar(<TableroPostulaciones vacanteId={ID_VACANTE} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Descartar' }).at(-1) ?? document.body,
    );
    expect(await screen.findByText('Indica el motivo del descarte')).toBeTruthy();
    expect(fetchSimulado.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: /Motivo/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Perfil incompleto' }));
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Descartar' }).at(-1) ?? document.body,
    );

    await waitFor(() => {
      const llamada = fetchSimulado.mock.calls.find(([, init]) => init?.method === 'PUT');
      expect(llamada).toBeTruthy();
      expect(JSON.parse(z.string().parse(llamada?.[1]?.body))).toEqual({
        estado: 'descartada',
        motivoDescarte: 'perfil_incompleto',
        version: 1,
      });
    });
  });

  it('muestra el estado vacío cuando nadie se ha postulado', async () => {
    iniciarSesionComo('empresa');
    fetchSimulado.mockResolvedValue(json([]));
    mostrar(<TableroPostulaciones vacanteId={ID_VACANTE} />);

    expect(await screen.findByText('Aún no hay postulaciones')).toBeTruthy();
  });
});
