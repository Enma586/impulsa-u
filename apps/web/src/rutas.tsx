import {
  BotonIcono,
  IconoCasa,
  IconoCorazon,
  IconoMaletin,
  IconoMensaje,
  IconoPapeles,
  IconoSalir,
  IconoUsuario,
  MarcoApp,
  ProveedorNavegacion,
} from '@impulsau/ui';
import type { EnlaceNavegacion } from '@impulsau/ui';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  redirect,
  useRouter,
  useParams,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import { Galeria } from './galeria';
import { PaginaLogin } from './modulos/auth/login/PaginaLogin';
import { PaginaRegistro } from './modulos/auth/registro/PaginaRegistro';
import { PaginaRegistroEmpresa } from './modulos/auth/registro/PaginaRegistroEmpresa';
import { Bandeja } from './modulos/mensajeria/Bandeja';
import { PaginaIntereses } from './modulos/mensajeria/PaginaIntereses';
import { conectarTiempoReal } from './modulos/mensajeria/tiempoReal';
import { PaginaEditarPerfil } from './modulos/perfiles/PaginasEdicion';
import {
  PaginaMiPerfil,
  PaginaPerfilEmpresa,
  PaginaPerfilTalento,
} from './modulos/perfiles/PaginasPerfil';
import { PaginaInicio } from './modulos/proyectos/PaginaInicio';
import {
  PaginaEditarProyecto,
  PaginaNuevoProyecto,
  PaginaProyecto,
} from './modulos/proyectos/PaginasProyecto';
import {
  PaginaEditarVacante,
  PaginaNuevaVacante,
} from './modulos/vacantes/PaginasFormularioVacante';
import {
  PaginaMisPostulaciones,
  PaginaVacante,
  PaginaVacantes,
} from './modulos/vacantes/PaginasVacante';
import { cerrarSesion } from './sesion/acciones';
import { almacenSesion } from './sesion/almacen';
import { useSesion } from './sesion/useSesion';

const raiz = createRootRoute({ component: Outlet });

function publica<P extends string>(path: P, component: () => React.JSX.Element) {
  return createRoute({
    getParentRoute: () => raiz,
    path,
    component,
    beforeLoad: () => {
      if (almacenSesion.obtener()) throw redirect({ to: '/' });
    },
  });
}

const login = publica('/login', PaginaLogin);
const registro = publica('/registro', PaginaRegistro);
const registroEmpresa = publica('/registro/empresa', PaginaRegistroEmpresa);

const componentes = createRoute({
  getParentRoute: () => raiz,
  path: '/componentes',
  component: Galeria,
});

function enlacesPara(rol: 'talento' | 'empresa', ruta: string): EnlaceNavegacion[] {
  const activo = (prefijo: string) => (prefijo === '/' ? ruta === '/' : ruta.startsWith(prefijo));
  const base: EnlaceNavegacion[] = [
    { href: '/', etiqueta: 'Inicio', icono: <IconoCasa />, activo: activo('/') },
    {
      href: '/vacantes',
      etiqueta: 'Vacantes',
      icono: <IconoMaletin />,
      activo: activo('/vacantes'),
    },
  ];
  if (rol === 'talento') {
    base.push({
      href: '/postulaciones',
      etiqueta: 'Mis postulaciones',
      icono: <IconoPapeles />,
      activo: activo('/postulaciones'),
    });
  }
  base.push(
    {
      href: '/mensajes',
      etiqueta: 'Mensajes',
      icono: <IconoMensaje />,
      activo: activo('/mensajes'),
    },
    {
      href: '/intereses',
      etiqueta: 'Intereses',
      icono: <IconoCorazon />,
      activo: activo('/intereses'),
    },
  );
  base.push({
    href: '/perfil',
    etiqueta: 'Perfil',
    icono: <IconoUsuario />,
    activo: activo('/perfil'),
  });
  return base;
}

function Marco() {
  const sesion = useSesion();
  const enrutador = useRouter();
  const ruta = useRouterState({ select: (estado) => estado.location.pathname });
  const haySesion = sesion !== null;

  // Una sola conexión en vivo mientras haya sesión; se cierra al salir.
  useEffect(() => (haySesion ? conectarTiempoReal() : undefined), [haySesion]);

  // Al cerrar sesión el almacén queda vacío antes de que el router navegue: se redirige aquí.
  if (!sesion) return <Navigate to="/login" />;
  const usuario = sesion.usuario;

  return (
    <ProveedorNavegacion
      navegar={(destino) => {
        void enrutador.navigate({ href: destino });
      }}
    >
      <MarcoApp
        enlaces={enlacesPara(usuario.rol === 'empresa' ? 'empresa' : 'talento', ruta)}
        nombreUsuario={usuario.nombre}
        acciones={
          <BotonIcono
            etiqueta="Cerrar sesión"
            icono={<IconoSalir />}
            onPress={() => {
              void cerrarSesion('local');
            }}
          />
        }
      >
        <Outlet />
      </MarcoApp>
    </ProveedorNavegacion>
  );
}

const protegida = createRoute({
  getParentRoute: () => raiz,
  id: 'protegida',
  component: Marco,
  beforeLoad: () => {
    if (!almacenSesion.obtener()) throw redirect({ to: '/login' });
  },
});

function hija<P extends string>(path: P, component: () => React.JSX.Element) {
  return createRoute({ getParentRoute: () => protegida, path, component });
}

function PaginaConversacion() {
  const { conversacionId } = useParams({ strict: false });
  return <Bandeja {...(conversacionId ? { conversacionId } : {})} />;
}

const arbol = raiz.addChildren([
  login,
  registro,
  registroEmpresa,
  componentes,
  protegida.addChildren([
    hija('/', PaginaInicio),
    hija('/proyectos/nuevo', PaginaNuevoProyecto),
    hija('/proyectos/$id', PaginaProyecto),
    hija('/proyectos/$id/editar', PaginaEditarProyecto),
    hija('/talentos/$id', PaginaPerfilTalento),
    hija('/empresas/$id', PaginaPerfilEmpresa),
    hija('/perfil', PaginaMiPerfil),
    hija('/perfil/editar', PaginaEditarPerfil),
    hija('/vacantes', PaginaVacantes),
    hija('/vacantes/nueva', PaginaNuevaVacante),
    hija('/vacantes/$id', PaginaVacante),
    hija('/vacantes/$id/editar', PaginaEditarVacante),
    hija('/postulaciones', PaginaMisPostulaciones),
    hija('/mensajes', () => <Bandeja />),
    hija('/mensajes/$conversacionId', PaginaConversacion),
    hija('/intereses', PaginaIntereses),
  ]),
]);

export const router = createRouter({ routeTree: arbol });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
