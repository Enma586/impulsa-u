CREATE TYPE "public"."direccion_interes" AS ENUM('empresa_a_talento', 'talento_a_empresa');--> statement-breakpoint
CREATE TYPE "public"."estado_interes" AS ENUM('pendiente', 'aceptado', 'declinado');--> statement-breakpoint
CREATE TABLE "intereses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"talento_id" uuid NOT NULL,
	"direccion" "direccion_interes" NOT NULL,
	"mensaje" text,
	"estado" "estado_interes" DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"respondido_en" timestamp with time zone,
	CONSTRAINT "intereses_par_direccion_unico" UNIQUE("empresa_id","talento_id","direccion"),
	CONSTRAINT "intereses_mensaje_max_300" CHECK (char_length("intereses"."mensaje") <= 300)
);
--> statement-breakpoint
ALTER TABLE "intereses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bloqueos" (
	"bloqueador_id" uuid NOT NULL,
	"bloqueado_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bloqueos_bloqueador_id_bloqueado_id_pk" PRIMARY KEY("bloqueador_id","bloqueado_id"),
	CONSTRAINT "bloqueos_no_a_si_mismo" CHECK ("bloqueos"."bloqueador_id" <> "bloqueos"."bloqueado_id")
);
--> statement-breakpoint
ALTER TABLE "bloqueos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"talento_id" uuid NOT NULL,
	"interes_id" uuid NOT NULL,
	"vacante_id" uuid,
	"ultima_secuencia" bigint DEFAULT 0 NOT NULL,
	"ultimo_mensaje_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversaciones_par_unico" UNIQUE("empresa_id","talento_id")
);
--> statement-breakpoint
ALTER TABLE "conversaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lecturas" (
	"conversacion_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"ultima_secuencia_leida" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "lecturas_conversacion_id_usuario_id_pk" PRIMARY KEY("conversacion_id","usuario_id")
);
--> statement-breakpoint
ALTER TABLE "lecturas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mensajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"secuencia" bigint NOT NULL,
	"remitente_id" uuid NOT NULL,
	"cuerpo" text NOT NULL,
	"client_message_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mensajes_secuencia_unica" UNIQUE("conversacion_id","secuencia"),
	CONSTRAINT "mensajes_client_message_id_unico" UNIQUE("client_message_id"),
	CONSTRAINT "mensajes_cuerpo_longitud" CHECK (char_length("mensajes"."cuerpo") BETWEEN 1 AND 4000)
);
--> statement-breakpoint
ALTER TABLE "mensajes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "intereses" ADD CONSTRAINT "intereses_empresa_id_empresas_usuario_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intereses" ADD CONSTRAINT "intereses_talento_id_talentos_usuario_id_fk" FOREIGN KEY ("talento_id") REFERENCES "public"."talentos"("usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueos" ADD CONSTRAINT "bloqueos_bloqueador_id_usuarios_id_fk" FOREIGN KEY ("bloqueador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueos" ADD CONSTRAINT "bloqueos_bloqueado_id_usuarios_id_fk" FOREIGN KEY ("bloqueado_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_empresa_id_empresas_usuario_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_talento_id_talentos_usuario_id_fk" FOREIGN KEY ("talento_id") REFERENCES "public"."talentos"("usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_interes_id_intereses_id_fk" FOREIGN KEY ("interes_id") REFERENCES "public"."intereses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_vacante_id_vacantes_id_fk" FOREIGN KEY ("vacante_id") REFERENCES "public"."vacantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturas" ADD CONSTRAINT "lecturas_conversacion_id_conversaciones_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturas" ADD CONSTRAINT "lecturas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacion_id_conversaciones_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_remitente_id_usuarios_id_fk" FOREIGN KEY ("remitente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intereses_talento_estado_idx" ON "intereses" USING btree ("talento_id","estado");--> statement-breakpoint
CREATE INDEX "intereses_empresa_estado_idx" ON "intereses" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "conversaciones_talento_idx" ON "conversaciones" USING btree ("talento_id","ultimo_mensaje_en" DESC);--> statement-breakpoint
CREATE INDEX "conversaciones_empresa_idx" ON "conversaciones" USING btree ("empresa_id","ultimo_mensaje_en" DESC);