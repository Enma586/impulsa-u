CREATE TYPE "public"."departamento" AS ENUM('ahuachapan', 'santa_ana', 'sonsonate', 'chalatenango', 'la_libertad', 'san_salvador', 'cuscatlan', 'la_paz', 'cabanas', 'san_vicente', 'usulutan', 'san_miguel', 'morazan', 'la_union');--> statement-breakpoint
CREATE TYPE "public"."estado_academico" AS ENUM('estudiante', 'egresado');--> statement-breakpoint
CREATE TYPE "public"."estado_usuario" AS ENUM('pendiente_verificacion', 'activo', 'suspendido', 'eliminado');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('talento', 'empresa', 'docente', 'admin');--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"correo" "citext" NOT NULL,
	"rol" "rol_usuario" NOT NULL,
	"estado" "estado_usuario" DEFAULT 'pendiente_verificacion' NOT NULL,
	"fecha_nacimiento" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone,
	CONSTRAINT "usuarios_correo_unique" UNIQUE("correo"),
	CONSTRAINT "usuarios_talento_con_fecha_nacimiento" CHECK ("usuarios"."rol" <> 'talento' OR "usuarios"."fecha_nacimiento" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "carreras" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "carreras_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "instituciones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"departamento" "departamento",
	CONSTRAINT "instituciones_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "talentos" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"nombre_completo" text NOT NULL,
	"carrera_id" uuid,
	"institucion_id" uuid,
	"estado_academico" "estado_academico" NOT NULL,
	"ciclo" smallint,
	"anio_egreso" smallint,
	"departamento" "departamento",
	"bio" text,
	"declaracion_sin_experiencia_en" timestamp with time zone NOT NULL,
	"primer_empleo_en" timestamp with time zone,
	"privacidad" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"almacenamiento_usado_bytes" bigint DEFAULT 0 NOT NULL,
	"almacenamiento_limite_bytes" bigint DEFAULT 20971520 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "talentos_ciclo_o_anio_segun_estado" CHECK (("talentos"."estado_academico" = 'estudiante' AND "talentos"."ciclo" IS NOT NULL) OR ("talentos"."estado_academico" = 'egresado' AND "talentos"."anio_egreso" IS NOT NULL)),
	CONSTRAINT "talentos_almacenamiento_dentro_del_limite" CHECK ("talentos"."almacenamiento_usado_bytes" <= "talentos"."almacenamiento_limite_bytes"),
	CONSTRAINT "talentos_bio_maximo_600" CHECK (char_length("talentos"."bio") <= 600)
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talentos" ADD CONSTRAINT "talentos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talentos" ADD CONSTRAINT "talentos_carrera_id_carreras_id_fk" FOREIGN KEY ("carrera_id") REFERENCES "public"."carreras"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talentos" ADD CONSTRAINT "talentos_institucion_id_instituciones_id_fk" FOREIGN KEY ("institucion_id") REFERENCES "public"."instituciones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "talentos_busqueda_idx" ON "talentos" USING btree ("carrera_id","estado_academico","departamento") WHERE "talentos"."primer_empleo_en" IS NULL;