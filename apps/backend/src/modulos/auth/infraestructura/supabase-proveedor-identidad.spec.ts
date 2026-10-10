import { describe, expect, it } from 'vitest';
import { SupabaseProveedorIdentidad } from './supabase-proveedor-identidad.js';

const ID = '0b6c1f0e-8f3b-4a52-9d57-0d7f6a3d9c11';
const DATOS = { correo: 'ana@correo.com', contrasena: 'una-contrasena-larga' };

interface Llamada {
  url: string;
  metodo: string | undefined;
  cuerpo: unknown;
  encabezados: Record<string, string>;
}

function crearProveedor(responder: () => Response | Error) {
  const llamadas: Llamada[] = [];
  const proveedor = new SupabaseProveedorIdentidad(
    'https://proyecto.supabase.co',
    'llave-de-servicio',
    (url, opciones) => {
      const cuerpo: unknown = typeof opciones.body === 'string' ? JSON.parse(opciones.body) : null;
      llamadas.push({
        url,
        metodo: opciones.method,
        cuerpo,
        encabezados: Object.fromEntries(new Headers(opciones.headers).entries()),
      });
      const respuesta = responder();
      return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta);
    },
  );
  return { proveedor, llamadas };
}

function json(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

describe('SupabaseProveedorIdentidad.crearCuenta', () => {
  it('registra con correo y contraseña usando la llave de servicio', async () => {
    const { proveedor, llamadas } = crearProveedor(() => json({ id: ID, identities: [{}] }));
    const resultado = await proveedor.crearCuenta(DATOS);
    expect(resultado).toEqual({ ok: true, valor: { tipo: 'nueva', id: ID } });
    expect(llamadas[0]).toMatchObject({
      url: 'https://proyecto.supabase.co/auth/v1/signup',
      metodo: 'POST',
      cuerpo: { email: 'ana@correo.com', password: 'una-contrasena-larga' },
      encabezados: { apikey: 'llave-de-servicio' },
    });
  });

  it('CA-01.6 una respuesta sin identidades indica un correo ya registrado', async () => {
    const { proveedor } = crearProveedor(() => json({ id: ID, identities: [] }));
    expect(await proveedor.crearCuenta(DATOS)).toEqual({
      ok: true,
      valor: { tipo: 'ya_registrada' },
    });
  });

  it('CA-01.6 el código user_already_exists también se trata como ya registrada', async () => {
    const { proveedor } = crearProveedor(() => json({ error_code: 'user_already_exists' }, 422));
    expect(await proveedor.crearCuenta(DATOS)).toEqual({
      ok: true,
      valor: { tipo: 'ya_registrada' },
    });
  });

  it('un error de Supabase (límite de correos, contraseña débil...) no se confunde con éxito', async () => {
    const { proveedor } = crearProveedor(() =>
      json({ error_code: 'over_email_send_rate_limit' }, 429),
    );
    expect(await proveedor.crearCuenta(DATOS)).toEqual({ ok: false, error: 'no_disponible' });
  });

  it('una respuesta con otra forma se rechaza en lugar de confiar en ella', async () => {
    const { proveedor } = crearProveedor(() => json({ id: 'no-es-uuid' }));
    expect(await proveedor.crearCuenta(DATOS)).toEqual({ ok: false, error: 'no_disponible' });
  });

  it('si la red falla devuelve no_disponible', async () => {
    const { proveedor } = crearProveedor(() => new Error('sin red'));
    expect(await proveedor.crearCuenta(DATOS)).toEqual({ ok: false, error: 'no_disponible' });
  });
});

describe('SupabaseProveedorIdentidad.eliminarCuenta', () => {
  it('borra al usuario con la API de administración', async () => {
    const { proveedor, llamadas } = crearProveedor(() => json({}));
    await proveedor.eliminarCuenta(ID);
    expect(llamadas[0]).toMatchObject({
      url: `https://proyecto.supabase.co/auth/v1/admin/users/${ID}`,
      metodo: 'DELETE',
    });
  });

  it('no lanza si Supabase falla: la limpieza diaria recogerá la cuenta', async () => {
    const { proveedor } = crearProveedor(() => json({}, 500));
    await expect(proveedor.eliminarCuenta(ID)).resolves.toBeUndefined();
  });

  it('no lanza si la red falla', async () => {
    const { proveedor } = crearProveedor(() => new Error('sin red'));
    await expect(proveedor.eliminarCuenta(ID)).resolves.toBeUndefined();
  });
});
