import { crearBaseDeDatos } from '@impulsau/db';
import { z } from 'zod';
import { sembrarHistoria } from './demo/sembrar-demo.js';
import { leerEntorno } from './compartido/infraestructura/entorno.js';

const entorno = leerEntorno(process.env);
const contrasena = z
  .string({ error: 'Define DEMO_CONTRASENA (mínimo 10 caracteres) para las cuentas de la demo' })
  .min(10)
  .parse(process.env['DEMO_CONTRASENA']);

const Cuenta = z.object({ id: z.uuid() });

/** Crea la cuenta ya confirmada con la API de administración de Supabase Auth. */
async function crearCuenta(correo: string): Promise<string> {
  const respuesta = await fetch(`${entorno.SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: entorno.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${entorno.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ email: correo, password: contrasena, email_confirm: true }),
  });
  if (!respuesta.ok) {
    throw new Error(`Supabase no creó la cuenta de ${correo} (HTTP ${String(respuesta.status)})`);
  }
  return Cuenta.parse(await respuesta.json()).id;
}

const conexion = crearBaseDeDatos(entorno.DATABASE_URL_MIGRACIONES, 1);
try {
  const resultado = await sembrarHistoria(conexion.db, crearCuenta);
  console.log(
    resultado === 'sembrada'
      ? 'Historia de la demo cargada: empresa@, ana@, luis@ y sofia@ (dominio demo.impulsau.test)'
      : 'La demo ya estaba cargada; no se cambió nada',
  );
} finally {
  await conexion.cerrar();
}
