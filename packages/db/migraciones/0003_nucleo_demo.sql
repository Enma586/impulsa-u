CREATE TYPE "public"."estado_archivo" AS ENUM('pendiente', 'listo', 'procesado', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."estado_postulacion" AS ENUM('recibida', 'en_revision', 'entrevista', 'seleccionada', 'descartada');--> statement-breakpoint
CREATE TYPE "public"."estado_proyecto" AS ENUM('borrador', 'publicado', 'oculto');--> statement-breakpoint
CREATE TYPE "public"."estado_vacante" AS ENUM('borrador', 'abierta', 'pausada', 'cerrada');--> statement-breakpoint
CREATE TYPE "public"."estado_verificacion_empresa" AS ENUM('sin_solicitar', 'pendiente', 'verificada', 'rechazada');--> statement-breakpoint
CREATE TYPE "public"."modalidad_vacante" AS ENUM('presencial', 'hibrida', 'remota');--> statement-breakpoint
CREATE TYPE "public"."motivo_descarte" AS ENUM('falta_habilidad_tecnica', 'perfil_incompleto', 'otro_candidato', 'vacante_cerrada', 'otro');--> statement-breakpoint
CREATE TYPE "public"."proposito_archivo" AS ENUM('imagen_proyecto', 'adjunto_proyecto', 'cv', 'documento_verificacion', 'avatar');--> statement-breakpoint
CREATE TYPE "public"."tipo_enlace" AS ENUM('github', 'linkedin', 'portafolio', 'otro');--> statement-breakpoint
CREATE TYPE "public"."tipo_vacante" AS ENUM('pasantia', 'primer_empleo', 'trainee');--> statement-breakpoint
CREATE TYPE "public"."visibilidad_archivo" AS ENUM('publico', 'privado');--> statement-breakpoint
CREATE TABLE "archivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"propietario_id" uuid NOT NULL,
	"clave" text NOT NULL,
	"proposito" "proposito_archivo" NOT NULL,
	"visibilidad" "visibilidad_archivo" NOT NULL,
	"tipo_mime" text NOT NULL,
	"tamano_bytes" bigint NOT NULL,
	"estado" "estado_archivo" DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmado_en" timestamp with time zone,
	CONSTRAINT "archivos_clave_unique" UNIQUE("clave"),
	CONSTRAINT "archivos_tamano_positivo" CHECK ("archivos"."tamano_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "archivos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "habilidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"categoria" text NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "habilidades_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "habilidades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "empresas" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"nombre_comercial" text NOT NULL,
	"nombre_legal" text,
	"sector" text,
	"sitio_web" text,
	"descripcion" text,
	"estado_verificacion" "estado_verificacion_empresa" DEFAULT 'sin_solicitar' NOT NULL,
	"verificada_en" timestamp with time zone,
	"es_agencia" boolean DEFAULT false NOT NULL,
	"cliente_declarado" text,
	"version" integer DEFAULT 1 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresas_agencia_con_cliente" CHECK (NOT "empresas"."es_agencia" OR "empresas"."cliente_declarado" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "empresas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "enlaces_talento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talento_id" uuid NOT NULL,
	"tipo" "tipo_enlace" NOT NULL,
	"url" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enlaces_talento" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "evidencia_habilidades" (
	"talento_id" uuid NOT NULL,
	"habilidad_id" uuid NOT NULL,
	"proyectos" smallint NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidencia_habilidades_talento_id_habilidad_id_pk" PRIMARY KEY("talento_id","habilidad_id")
);
--> statement-breakpoint
ALTER TABLE "evidencia_habilidades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "talento_habilidades" (
	"talento_id" uuid NOT NULL,
	"habilidad_id" uuid NOT NULL,
	CONSTRAINT "talento_habilidades_talento_id_habilidad_id_pk" PRIMARY KEY("talento_id","habilidad_id")
);
--> statement-breakpoint
ALTER TABLE "talento_habilidades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "likes" (
	"usuario_id" uuid NOT NULL,
	"proyecto_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "likes_usuario_id_proyecto_id_pk" PRIMARY KEY("usuario_id","proyecto_id")
);
--> statement-breakpoint
ALTER TABLE "likes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "proyecto_archivos" (
	"proyecto_id" uuid NOT NULL,
	"archivo_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	CONSTRAINT "proyecto_archivos_proyecto_id_archivo_id_pk" PRIMARY KEY("proyecto_id","archivo_id"),
	CONSTRAINT "proyecto_archivos_orden_unico" UNIQUE("proyecto_id","orden")
);
--> statement-breakpoint
ALTER TABLE "proyecto_archivos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "proyecto_tecnologias" (
	"proyecto_id" uuid NOT NULL,
	"habilidad_id" uuid NOT NULL,
	CONSTRAINT "proyecto_tecnologias_proyecto_id_habilidad_id_pk" PRIMARY KEY("proyecto_id","habilidad_id")
);
--> statement-breakpoint
ALTER TABLE "proyecto_tecnologias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "proyectos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autor_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"materia" text,
	"periodo" text,
	"url_repositorio" text,
	"url_demo" text,
	"url_video" text,
	"estado" "estado_proyecto" DEFAULT 'borrador' NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"reposts" integer DEFAULT 0 NOT NULL,
	"comentarios" integer DEFAULT 0 NOT NULL,
	"compartidos" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"version_contenido" integer DEFAULT 1 NOT NULL,
	"publicado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone,
	CONSTRAINT "proyectos_titulo_5_120" CHECK (char_length("proyectos"."titulo") BETWEEN 5 AND 120),
	CONSTRAINT "proyectos_descripcion_maximo_5000" CHECK (char_length("proyectos"."descripcion") <= 5000)
);
--> statement-breakpoint
ALTER TABLE "proyectos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "historial_postulaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postulacion_id" uuid NOT NULL,
	"de_estado" "estado_postulacion",
	"a_estado" "estado_postulacion" NOT NULL,
	"actor_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historial_postulaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "postulacion_proyectos" (
	"postulacion_id" uuid NOT NULL,
	"proyecto_id" uuid NOT NULL,
	CONSTRAINT "postulacion_proyectos_postulacion_id_proyecto_id_pk" PRIMARY KEY("postulacion_id","proyecto_id")
);
--> statement-breakpoint
ALTER TABLE "postulacion_proyectos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "postulaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vacante_id" uuid NOT NULL,
	"talento_id" uuid NOT NULL,
	"estado" "estado_postulacion" DEFAULT 'recibida' NOT NULL,
	"motivo_descarte" "motivo_descarte",
	"detalle_descarte" text,
	"version" integer DEFAULT 1 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "postulaciones_talento_vacante_unico" UNIQUE("talento_id","vacante_id"),
	CONSTRAINT "postulaciones_descarte_con_motivo" CHECK ("postulaciones"."estado" <> 'descartada' OR "postulaciones"."motivo_descarte" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "postulaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vacante_habilidades" (
	"vacante_id" uuid NOT NULL,
	"habilidad_id" uuid NOT NULL,
	"requerida" boolean NOT NULL,
	CONSTRAINT "vacante_habilidades_vacante_id_habilidad_id_pk" PRIMARY KEY("vacante_id","habilidad_id")
);
--> statement-breakpoint
ALTER TABLE "vacante_habilidades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vacantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"tipo" "tipo_vacante" NOT NULL,
	"modalidad" "modalidad_vacante" NOT NULL,
	"departamento" "departamento",
	"estado" "estado_vacante" DEFAULT 'borrador' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"publicada_en" timestamp with time zone,
	"cerrada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "vacantes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "carreras" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "instituciones" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_propietario_id_usuarios_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enlaces_talento" ADD CONSTRAINT "enlaces_talento_talento_id_talentos_usuario_id_fk" FOREIGN KEY ("talento_id") REFERENCES "public"."talentos"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidencia_habilidades" ADD CONSTRAINT "evidencia_habilidades_talento_id_talentos_usuario_id_fk" FOREIGN KEY ("talento_id") REFERENCES "public"."talentos"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidencia_habilidades" ADD CONSTRAINT "evidencia_habilidades_habilidad_id_habilidades_id_fk" FOREIGN KEY ("habilidad_id") REFERENCES "public"."habilidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talento_habilidades" ADD CONSTRAINT "talento_habilidades_talento_id_talentos_usuario_id_fk" FOREIGN KEY ("talento_id") REFERENCES "public"."talentos"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talento_habilidades" ADD CONSTRAINT "talento_habilidades_habilidad_id_habilidades_id_fk" FOREIGN KEY ("habilidad_id") REFERENCES "public"."habilidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyecto_archivos" ADD CONSTRAINT "proyecto_archivos_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyecto_archivos" ADD CONSTRAINT "proyecto_archivos_archivo_id_archivos_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "public"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyecto_tecnologias" ADD CONSTRAINT "proyecto_tecnologias_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyecto_tecnologias" ADD CONSTRAINT "proyecto_tecnologias_habilidad_id_habilidades_id_fk" FOREIGN KEY ("habilidad_id") REFERENCES "public"."habilidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_autor_id_talentos_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."talentos"("usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_postulaciones" ADD CONSTRAINT "historial_postulaciones_postulacion_id_postulaciones_id_fk" FOREIGN KEY ("postulacion_id") REFERENCES "public"."postulaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_postulaciones" ADD CONSTRAINT "historial_postulaciones_actor_id_usuarios_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postulacion_proyectos" ADD CONSTRAINT "postulacion_proyectos_postulacion_id_postulaciones_id_fk" FOREIGN KEY ("postulacion_id") REFERENCES "public"."postulaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postulacion_proyectos" ADD CONSTRAINT "postulacion_proyectos_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_vacante_id_vacantes_id_fk" FOREIGN KEY ("vacante_id") REFERENCES "public"."vacantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_talento_id_talentos_usuario_id_fk" FOREIGN KEY ("talento_id") REFERENCES "public"."talentos"("usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacante_habilidades" ADD CONSTRAINT "vacante_habilidades_vacante_id_vacantes_id_fk" FOREIGN KEY ("vacante_id") REFERENCES "public"."vacantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacante_habilidades" ADD CONSTRAINT "vacante_habilidades_habilidad_id_habilidades_id_fk" FOREIGN KEY ("habilidad_id") REFERENCES "public"."habilidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacantes" ADD CONSTRAINT "vacantes_empresa_id_empresas_usuario_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "archivos_pendientes_idx" ON "archivos" USING btree ("creado_en") WHERE "archivos"."estado" = 'pendiente';--> statement-breakpoint
CREATE INDEX "habilidades_nombre_trgm_idx" ON "habilidades" USING gin ("nombre" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "evidencia_habilidades_busqueda_idx" ON "evidencia_habilidades" USING btree ("habilidad_id","proyectos");--> statement-breakpoint
CREATE INDEX "likes_proyecto_idx" ON "likes" USING btree ("proyecto_id");--> statement-breakpoint
CREATE INDEX "proyecto_tecnologias_habilidad_idx" ON "proyecto_tecnologias" USING btree ("habilidad_id");--> statement-breakpoint
CREATE INDEX "proyectos_feed_idx" ON "proyectos" USING btree ("publicado_en" DESC,"id" DESC) WHERE "proyectos"."estado" = 'publicado' AND "proyectos"."eliminado_en" IS NULL;--> statement-breakpoint
CREATE INDEX "proyectos_autor_idx" ON "proyectos" USING btree ("autor_id","publicado_en" DESC);--> statement-breakpoint
CREATE INDEX "postulaciones_vacante_estado_idx" ON "postulaciones" USING btree ("vacante_id","estado");--> statement-breakpoint
CREATE INDEX "vacantes_estado_idx" ON "vacantes" USING btree ("estado","publicada_en" DESC) WHERE "vacantes"."eliminado_en" IS NULL;