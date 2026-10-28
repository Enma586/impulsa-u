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

export const tipoEnlace = pgEnum('tipo_enlace', ['github', 'linkedin', 'portafolio', 'otro']);

export const estadoVerificacionEmpresa = pgEnum('estado_verificacion_empresa', [
  'sin_solicitar',
  'pendiente',
  'verificada',
  'rechazada',
]);

export const propositoArchivo = pgEnum('proposito_archivo', [
  'imagen_proyecto',
  'adjunto_proyecto',
  'cv',
  'documento_verificacion',
  'avatar',
]);

export const visibilidadArchivo = pgEnum('visibilidad_archivo', ['publico', 'privado']);

export const estadoArchivo = pgEnum('estado_archivo', [
  'pendiente',
  'listo',
  'procesado',
  'rechazado',
]);

export const estadoProyecto = pgEnum('estado_proyecto', ['borrador', 'publicado', 'oculto']);

export const tipoVacante = pgEnum('tipo_vacante', ['pasantia', 'primer_empleo', 'trainee']);

export const modalidadVacante = pgEnum('modalidad_vacante', ['presencial', 'hibrida', 'remota']);

export const estadoVacante = pgEnum('estado_vacante', [
  'borrador',
  'abierta',
  'pausada',
  'cerrada',
]);

export const estadoPostulacion = pgEnum('estado_postulacion', [
  'recibida',
  'en_revision',
  'entrevista',
  'seleccionada',
  'descartada',
]);

export const motivoDescarte = pgEnum('motivo_descarte', [
  'falta_habilidad_tecnica',
  'perfil_incompleto',
  'otro_candidato',
  'vacante_cerrada',
  'otro',
]);
