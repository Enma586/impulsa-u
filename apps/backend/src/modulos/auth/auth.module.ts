import { Module } from '@nestjs/common';
import type { BaseDeDatos, ConexionBaseDeDatos } from '@impulsau/db';
import { BUSCADOR_USUARIO } from '../../compartido/dominio/autenticacion.js';
import { BASE_DATOS } from '../../compartido/infraestructura/conexion-base-datos.module.js';
import { ENTORNO } from '../../compartido/infraestructura/configuracion.module.js';
import type { Entorno } from '../../compartido/infraestructura/entorno.js';
import { RegistrarTalento } from './aplicacion/registrar-talento.js';
import { DrizzleRepositorioUsuarios } from './infraestructura/drizzle-repositorio-usuarios.js';
import { SupabaseProveedorIdentidad } from './infraestructura/supabase-proveedor-identidad.js';
import { PROVEEDOR_IDENTIDAD } from './puertos/proveedor-identidad.js';
import { RELOJ } from './puertos/reloj.js';
import { REPOSITORIO_USUARIOS } from './puertos/repositorio-usuarios.js';

@Module({
  providers: [
    RegistrarTalento,
    { provide: RELOJ, useValue: { ahora: () => new Date() } },
    {
      provide: PROVEEDOR_IDENTIDAD,
      inject: [ENTORNO],
      useFactory: (entorno: Entorno) =>
        new SupabaseProveedorIdentidad(entorno.SUPABASE_URL, entorno.SUPABASE_SERVICE_ROLE_KEY),
    },
    {
      provide: REPOSITORIO_USUARIOS,
      inject: [BASE_DATOS],
      useFactory: (conexion: ConexionBaseDeDatos) =>
        new DrizzleRepositorioUsuarios(conexion.db satisfies BaseDeDatos),
    },
    { provide: BUSCADOR_USUARIO, useExisting: REPOSITORIO_USUARIOS },
  ],
  exports: [RegistrarTalento, BUSCADOR_USUARIO],
})
export class AuthModule {}
