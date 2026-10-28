import { auth } from '@impulsau/contracts';
import {
  AvisoError,
  Boton,
  Campo,
  Contenedor,
  Dato,
  Enlace,
  Pila,
  Texto,
  Titulo,
} from '@impulsau/ui';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ErrorDeApi } from '../../../api/cliente';
import { crearResolver } from '../../../compartido/resolver';
import { almacenSesion } from '../../../sesion/almacen';
import { iniciarSesion } from '../../../sesion/acciones';

interface ValoresLogin {
  correo: string;
  contrasena: string;
}

const resolver = crearResolver<ValoresLogin>(
  auth.IniciarSesionEntrada,
  (valores) => valores,
  (campo): campo is keyof ValoresLogin => campo === 'correo' || campo === 'contrasena',
);

function avisoDeFallo(error: unknown): string {
  if (error instanceof ErrorDeApi) {
    if (error.codigo === 'credenciales_invalidas') return 'Correo o contraseña incorrectos.';
    if (error.codigo === 'correo_no_verificado') {
      return 'Confirma tu correo con el enlace que te enviamos y vuelve a intentarlo.';
    }
    if (error.codigo === 'demasiadas_peticiones') {
      return 'Demasiados intentos. Espera un momento antes de volver a intentarlo.';
    }
    if (error.codigo === 'red') return 'Sin conexión con el servidor. Revisa tu conexión.';
    return error.message;
  }
  return 'No pudimos iniciar tu sesión. Inténtalo de nuevo.';
}

export function PaginaLogin() {
  const navegar = useNavigate();
  const [aviso, setAviso] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ValoresLogin>({
    resolver,
    defaultValues: { correo: '', contrasena: '' },
    mode: 'onTouched',
  });

  const enviar = handleSubmit(async (valores) => {
    setAviso(null);
    try {
      const sesion = await iniciarSesion(auth.IniciarSesionEntrada.parse(valores));
      almacenSesion.guardar(sesion);
      await navegar({ to: '/' });
    } catch (error: unknown) {
      setAviso(avisoDeFallo(error));
    }
  });

  return (
    <Contenedor ancho="angosto">
      <form onSubmit={(evento) => void enviar(evento)} noValidate>
        <Pila espacio={18}>
          <Pila espacio={8}>
            <Dato color="acento">Iniciar sesión</Dato>
            <Titulo nivel={1}>Tu trayectoria, con evidencia.</Titulo>
          </Pila>

          <Controller
            control={control}
            name="correo"
            render={({ field, fieldState }) => (
              <Campo
                etiqueta="Correo electrónico"
                tipo="correo"
                autoComplete="email"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                refInput={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="contrasena"
            render={({ field, fieldState }) => (
              <Campo
                etiqueta="Contraseña"
                tipo="contrasena"
                autoComplete="current-password"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                refInput={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />

          {aviso && <AvisoError titulo="No pudimos iniciar sesión">{aviso}</AvisoError>}

          <Boton type="submit" tamano="grande" anchoCompleto cargando={isSubmitting}>
            Entrar
          </Boton>

          <Pila espacio={6}>
            <Texto color="secundario">
              ¿Eres estudiante o egresado?{' '}
              <Enlace href="/registro">Crea tu cuenta de talento</Enlace>
            </Texto>
            <Texto color="secundario">
              ¿Contratas talento de entrada?{' '}
              <Enlace href="/registro/empresa">Registra tu empresa</Enlace>
            </Texto>
          </Pila>
        </Pila>
      </form>
    </Contenedor>
  );
}
