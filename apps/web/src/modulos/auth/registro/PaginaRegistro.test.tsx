import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaginaRegistro } from './PaginaRegistro';

const respuestaExito = () =>
  new Response(JSON.stringify({ estado: 'revisa_tu_correo' }), { status: 202 });

const respuestaError = (status: number, code: string) =>
  new Response(JSON.stringify({ code, message: 'mensaje del servidor' }), { status });

let fetchSimulado: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  fetchSimulado = vi.fn<typeof fetch>(() => Promise.resolve(respuestaExito()));
  vi.stubGlobal('fetch', fetchSimulado);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mostrar() {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <PaginaRegistro />
    </QueryClientProvider>,
  );
}

async function elegirOpcion(selector: RegExp, opcion: string) {
  await userEvent.click(screen.getByRole('button', { name: selector }));
  await userEvent.click(await screen.findByRole('option', { name: opcion }));
}

interface Opciones {
  contrasena?: string;
  ciclo?: boolean;
  declaracion?: boolean;
}

async function llenarFormulario({
  contrasena = 'una-clave-larga',
  ciclo = true,
  declaracion = true,
}: Opciones = {}) {
  await userEvent.type(screen.getByLabelText('Nombre completo'), 'María López');
  await userEvent.type(screen.getByLabelText('Correo electrónico'), 'maria.lopez@correo.com');
  await userEvent.type(screen.getByLabelText('Crea una contraseña'), contrasena);
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), {
    target: { value: '2002-03-14' },
  });
  if (ciclo) await elegirOpcion(/Ciclo actual/, 'Ciclo 3');
  if (declaracion) {
    await userEvent.click(screen.getByRole('checkbox', { name: /Declaro que no tengo/ }));
  }
  await userEvent.click(screen.getByRole('checkbox', { name: /Acepto los términos/ }));
}

const enviar = () => userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

function llamada(n: number): { url: string; init: RequestInit } {
  const [url, init] = fetchSimulado.mock.calls[n] ?? [];
  return { url: typeof url === 'string' ? url : '', init: init ?? {} };
}

function cuerpoDe(n: number): unknown {
  const { body } = llamada(n).init;
  if (typeof body !== 'string') throw new Error('La petición no tiene cuerpo de texto');
  return JSON.parse(body);
}

describe('PaginaRegistro', () => {
  it('CA-01.1 y CA-01.6: envía el registro y muestra "Revisa tu correo"', async () => {
    mostrar();
    await llenarFormulario();
    await enviar();

    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeTruthy();
    expect(fetchSimulado).toHaveBeenCalledOnce();
    const { url, init } = llamada(0);
    expect(url).toMatch(/\/auth\/register$/);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    const cuerpo = cuerpoDe(0);
    expect(cuerpo).toMatchObject({
      rol: 'talento',
      correo: 'maria.lopez@correo.com',
      estadoAcademico: 'estudiante',
      ciclo: 3,
      fechaNacimiento: '2002-03-14',
      declaracionSinExperiencia: true,
      aceptaTerminos: true,
    });
  });

  it('CA-01.3: sin la declaración no envía y muestra el error del campo', async () => {
    mostrar();
    await llenarFormulario({ declaracion: false });
    await enviar();

    expect(
      await screen.findByText('Debes aceptar la declaración de cero experiencia'),
    ).toBeTruthy();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('CA-01.4: estudiante sin ciclo muestra error en el campo ciclo', async () => {
    mostrar();
    await llenarFormulario({ ciclo: false });
    await enviar();

    expect(await screen.findByText('Este campo es obligatorio')).toBeTruthy();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('CA-01.5: egresado sin año de egreso muestra error en el campo año', async () => {
    mostrar();
    await llenarFormulario({ ciclo: false });
    await userEvent.click(screen.getByRole('radio', { name: 'Egresado' }));
    await enviar();

    expect(screen.getByRole('button', { name: /Año de egreso/ })).toBeTruthy();
    expect(await screen.findByText('Este campo es obligatorio')).toBeTruthy();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('egresado con año de egreso envía anioEgreso', async () => {
    mostrar();
    await llenarFormulario({ ciclo: false });
    await userEvent.click(screen.getByRole('radio', { name: 'Egresado' }));
    await elegirOpcion(/Año de egreso/, '2024');
    await enviar();

    await screen.findByRole('heading', { name: 'Revisa tu correo' });
    const cuerpo = cuerpoDe(0);
    expect(cuerpo).toMatchObject({ estadoAcademico: 'egresado', anioEgreso: 2024 });
  });

  it('CA-01.9: contraseña de menos de 10 caracteres muestra el requisito', async () => {
    mostrar();
    await llenarFormulario({ contrasena: 'corta' });
    await enviar();

    expect(await screen.findByText('La contraseña debe tener al menos 10 caracteres')).toBeTruthy();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('CA-01.2: si el servidor responde menor_de_edad, lo muestra en la fecha', async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaError(422, 'menor_de_edad'));
    mostrar();
    await llenarFormulario();
    await enviar();

    expect(await screen.findByText('Debes tener 18 años o más')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Revisa tu correo' })).toBeNull();
  });

  it('CA-01.8: el doble clic envía una sola petición', async () => {
    let resolver: (r: Response) => void = () => undefined;
    fetchSimulado.mockReturnValueOnce(new Promise<Response>((r) => (resolver = r)));
    mostrar();
    await llenarFormulario();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Crear cuenta' }));
    resolver(respuestaExito());

    await screen.findByRole('heading', { name: 'Revisa tu correo' });
    expect(fetchSimulado).toHaveBeenCalledOnce();
  });

  it('CA-00.3: con 429 muestra un aviso amable y conserva los datos', async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaError(429, 'demasiadas_peticiones'));
    mostrar();
    await llenarFormulario();
    await enviar();

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Demasiados intentos');
    expect(screen.getByLabelText<HTMLInputElement>('Correo electrónico').value).toBe(
      'maria.lopez@correo.com',
    );
  });

  it('sin conexión muestra el aviso de red', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('fallo de red'));
    mostrar();
    await llenarFormulario();
    await enviar();

    expect((await screen.findByRole('alert')).textContent).toContain('Sin conexión');
  });

  it('un reintento con los mismos datos reutiliza la llave de idempotencia', async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaError(500, 'error_interno'));
    mostrar();
    await llenarFormulario();
    await enviar();
    await screen.findByRole('alert');

    await enviar();
    await waitFor(() => {
      expect(fetchSimulado).toHaveBeenCalledTimes(2);
    });
    const llave = (n: number) => new Headers(llamada(n).init.headers).get('Idempotency-Key');
    expect(llave(1)).toBe(llave(0));
  });

  it('el enlace de experiencia abre el modal con la definición', async () => {
    mostrar();
    await userEvent.click(screen.getByRole('button', { name: '¿Qué cuenta como experiencia?' }));
    expect(
      await screen.findByRole('dialog', { name: '¿Qué cuenta como experiencia?' }),
    ).toBeTruthy();
  });
});
