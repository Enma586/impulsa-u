import { pgEnum } from 'drizzle-orm/pg-core';

export const rolUsuario = pgEnum('rol_usuario', ['talento', 'empresa', 'docente', 'admin']);

export const estadoUsuario = pgEnum('estado_usuario', [
  'pendiente_verificacion',
  'activo',
  'suspendido',
  'eliminado',
]);

export const estadoAcademico = pgEnum('estado_academico', ['estudiante', 'egresado']);

export const departamento = pgEnum('departamento', [
  'ahuachapan',
  'santa_ana',
  'sonsonate',
  'chalatenango',
  'la_libertad',
  'san_salvador',
  'cuscatlan',
  'la_paz',
  'cabanas',
  'san_vicente',
  'usulutan',
  'san_miguel',
  'morazan',
  'la_union',
]);
