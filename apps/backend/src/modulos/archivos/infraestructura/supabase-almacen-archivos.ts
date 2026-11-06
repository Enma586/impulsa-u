import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  BUCKET_ARCHIVOS,
  urlPublicaArchivo,
} from '../../../compartido/infraestructura/almacenamiento.js';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import type { AlmacenArchivos } from '../puertos/puertos.js';

const RespuestaFirma = z.object({ url: z.string().min(1) });

/** Supabase Storage por su API REST: bucket público, subidas con URL firmada de un solo uso. */
export class SupabaseAlmacenArchivos implements AlmacenArchivos {
  private readonly registro = new Logger(SupabaseAlmacenArchivos.name);
  private bucketListo: Promise<boolean> | null = null;

  constructor(
    private readonly urlProyecto: string,
    private readonly llaveServicio: string,
  ) {}

  async firmarSubida(clave: string): Promise<Resultado<string, 'no_disponible'>> {
    if (!(await this.asegurarBucket())) return fallo('no_disponible');

    const respuesta = await this.llamar(
      `/storage/v1/object/upload/sign/${BUCKET_ARCHIVOS}/${clave}`,
      { method: 'POST' },
    );
    if (!respuesta?.ok) {
      this.registro.warn('Supabase no firmó la subida');
      return fallo('no_disponible');
    }
    const cuerpo = RespuestaFirma.safeParse(await respuesta.json().catch(() => null));
    if (!cuerpo.success) return fallo('no_disponible');

    const relativa = cuerpo.data.url.startsWith('/') ? cuerpo.data.url : `/${cuerpo.data.url}`;
    return ok(`${this.urlProyecto}/storage/v1${relativa}`);
  }

  async tamanoSubido(clave: string): Promise<Resultado<number | null, 'no_disponible'>> {
    const respuesta = await this.llamar(`/storage/v1/object/${BUCKET_ARCHIVOS}/${clave}`, {
      method: 'HEAD',
    });
    if (!respuesta) return fallo('no_disponible');
    if (respuesta.status === 404 || respuesta.status === 400) return ok(null);
    if (!respuesta.ok) return fallo('no_disponible');
    return ok(Number(respuesta.headers.get('content-length') ?? '0'));
  }

  urlPublica(clave: string): string {
    return urlPublicaArchivo(this.urlProyecto, clave);
  }

  /** Crea el bucket público la primera vez; si ya existe, Supabase responde 409 y sigue. */
  private asegurarBucket(): Promise<boolean> {
    this.bucketListo ??= this.llamar('/storage/v1/bucket', {
      method: 'POST',
      body: JSON.stringify({ id: BUCKET_ARCHIVOS, name: BUCKET_ARCHIVOS, public: true }),
    }).then(
      (respuesta) =>
        respuesta !== null &&
        (respuesta.ok || respuesta.status === 409 || respuesta.status === 400),
    );
    return this.bucketListo.then((listo) => {
      if (!listo) this.bucketListo = null;
      return listo;
    });
  }

  private async llamar(ruta: string, opciones: RequestInit): Promise<Response | null> {
    try {
      return await fetch(`${this.urlProyecto}${ruta}`, {
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
