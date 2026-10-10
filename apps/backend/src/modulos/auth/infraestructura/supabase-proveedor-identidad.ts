import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import type { CuentaCreada, ProveedorIdentidad } from '../puertos/proveedor-identidad.js';

type Peticion = (url: string, opciones: RequestInit) => Promise<Response>;

const CuentaNueva = z.object({
  id: z.uuid(),
  /** Supabase responde `identities: []` cuando el correo ya estaba registrado (anti-enumeración). */
  identities: z.array(z.unknown()).nullish(),
});

const ErrorSupabase = z.object({ error_code: z.string().optional() });

export class SupabaseProveedorIdentidad implements ProveedorIdentidad {
  private readonly registro = new Logger(SupabaseProveedorIdentidad.name);

  constructor(
    private readonly urlProyecto: string,
    private readonly llaveServicio: string,
    private readonly peticion: Peticion = fetch,
  ) {}

  async crearCuenta(datos: {
    correo: string;
    contrasena: string;
  }): Promise<Resultado<CuentaCreada, 'no_disponible'>> {
    const respuesta = await this.llamar('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email: datos.correo, password: datos.contrasena }),
    });
    if (!respuesta) return fallo('no_disponible');

    const cuerpo: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      const error = ErrorSupabase.safeParse(cuerpo);
      if (error.success && error.data.error_code === 'user_already_exists') {
        return ok({ tipo: 'ya_registrada' });
      }
      this.registro.warn(`Supabase rechazó el registro: ${String(respuesta.status)}`);
      return fallo('no_disponible');
    }

    const cuenta = CuentaNueva.safeParse(cuerpo);
    if (!cuenta.success) {
      this.registro.error('Respuesta inesperada de Supabase al registrar');
      return fallo('no_disponible');
    }
    return cuenta.data.identities?.length === 0
      ? ok({ tipo: 'ya_registrada' })
      : ok({ tipo: 'nueva', id: cuenta.data.id });
  }

  async eliminarCuenta(id: string): Promise<void> {
    const respuesta = await this.llamar(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
    if (!respuesta || (!respuesta.ok && respuesta.status !== 404)) {
      this.registro.error(`No se pudo compensar la cuenta ${id}; la limpieza diaria la recogerá`);
    }
  }

  private async llamar(ruta: string, opciones: RequestInit): Promise<Response | null> {
    try {
      return await this.peticion(`${this.urlProyecto}${ruta}`, {
        ...opciones,
        headers: {
          'content-type': 'application/json',
          apikey: this.llaveServicio,
          authorization: `Bearer ${this.llaveServicio}`,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return null;
    }
  }
}
