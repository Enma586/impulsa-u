import type { auth, interacciones, proyectos, vacantes } from '@impulsau/contracts';
import type { Page, Route } from '@playwright/test';

const ID_TALENTO = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c01';
const ID_AUTOR = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c02';
const ID_PROYECTO = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c03';
const ID_HABILIDAD = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c04';
const ID_EMPRESA = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c05';
const ID_VACANTE = '4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c06';

export const sesion: auth.Sesion = {
  accessToken: 'token-simulado',
  refreshToken: 'renovacion-simulada',
  expiraEn: Math.floor(Date.now() / 1000) + 3600,
  usuario: {
    id: ID_TALENTO,
    correo: 'ana@correo.com',
    rol: 'talento',
    estado: 'activo',
    nombre: 'Ana Demo',
  },
};

const proyecto: proyectos.ProyectoResumen = {
  id: ID_PROYECTO,
  titulo: 'Gestor de tareas para estudiantes',
  extracto: 'Aplicación web para organizar entregas y exámenes por materia.',
  autor: { id: ID_AUTOR, nombre: 'Luis Demo' },
  tecnologias: [{ id: ID_HABILIDAD, nombre: 'React' }],
  imagenUrl: null,
  likes: 2,
  meGusta: false,
  estado: 'publicado',
  publicadoEn: '2026-10-01T10:00:00.000Z',
};

const vacante: vacantes.VacanteResumen = {
  id: ID_VACANTE,
  titulo: 'Pasantía de desarrollo web',
  empresa: { id: ID_EMPRESA, nombre: '[Empresa Demo]' },
  tipo: 'pasantia',
  modalidad: 'hibrida',
  departamento: 'san_salvador',
  estado: 'abierta',
  habilidades: [{ id: ID_HABILIDAD, nombre: 'React', requerida: true }],
  coincidencia: 100,
  publicadaEn: '2026-10-02T10:00:00.000Z',
};

export interface ApiNucleo {
  /** Métodos con los que llegó cada petición de like, en orden. */
  likes: ('PUT' | 'DELETE')[];
  /** Cuerpos de las peticiones de inicio de sesión. */
  inicios: unknown[];
}

const cabeceras = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization, idempotency-key',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function responder(ruta: Route, status: number, cuerpo: unknown): Promise<void> {
  return ruta.fulfill({
    status,
    headers: cabeceras,
    contentType: 'application/json',
    body: JSON.stringify(cuerpo),
  });
}

/**
 * Doble del backend para el flujo principal: inicio de sesión, feed, likes y vacantes.
 * No hay backend, Supabase ni correo reales.
 */
export async function simularNucleo(
  page: Page,
  { credencialesValidas = true }: { credencialesValidas?: boolean } = {},
): Promise<ApiNucleo> {
  const api: ApiNucleo = { likes: [], inicios: [] };

  await page.route('http://localhost:3000/**', async (ruta) => {
    const peticion = ruta.request();
    const { pathname } = new URL(peticion.url());
    const metodo = peticion.method();

    if (metodo === 'OPTIONS') return ruta.fulfill({ status: 204, headers: cabeceras });
    if (pathname === '/auth/login') {
      api.inicios.push(peticion.postDataJSON());
      return credencialesValidas
        ? responder(ruta, 200, sesion)
        : responder(ruta, 401, {
            code: 'credenciales_invalidas',
            message: 'Credenciales inválidas',
          });
    }
    if (pathname === '/proyectos') {
      const pagina: ReturnType<typeof paginaDe<proyectos.ProyectoResumen>> = paginaDe([proyecto]);
      return responder(ruta, 200, pagina);
    }
    if (pathname === `/proyectos/${ID_PROYECTO}/like`) {
      const quiere = metodo === 'PUT';
      api.likes.push(quiere ? 'PUT' : 'DELETE');
      const estado: interacciones.EstadoLike = {
        likes: quiere ? proyecto.likes + 1 : proyecto.likes,
        meGusta: quiere,
      };
      return responder(ruta, 200, estado);
    }
    if (pathname === '/vacantes') return responder(ruta, 200, paginaDe([vacante]));
    return responder(ruta, 404, { code: 'no_encontrado', message: 'No existe' });
  });

  return api;
}

function paginaDe<T>(items: T[]): { items: T[]; siguienteCursor: null } {
  return { items, siguienteCursor: null };
}

/** Deja la sesión guardada como si la persona ya hubiera iniciado sesión. */
export async function conSesionIniciada(page: Page): Promise<void> {
  await page.addInitScript((contenido: string) => {
    localStorage.setItem('impulsau.sesion', contenido);
  }, JSON.stringify(sesion));
}
