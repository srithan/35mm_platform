CREATE TABLE "chat_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_participants" (
	"thread_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"role" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "chat_participants_thread_user_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_member_state" (
	"thread_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_message_id" text,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"muted_until" timestamp with time zone,
	CONSTRAINT "chat_member_state_thread_user_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_thread_meta" (
	"thread_id" text PRIMARY KEY NOT NULL,
	"last_message_at" timestamp with time zone,
	"last_message_preview" text,
	"last_sender_id" uuid,
	"message_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_member_state" ADD CONSTRAINT "chat_member_state_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_member_state" ADD CONSTRAINT "chat_member_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_thread_meta" ADD CONSTRAINT "chat_thread_meta_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_thread_meta" ADD CONSTRAINT "chat_thread_meta_last_sender_id_users_id_fk" FOREIGN KEY ("last_sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "chat_participants_user_idx" ON "chat_participants" USING btree ("user_id","joined_at");
--> statement-breakpoint
CREATE INDEX "chat_member_state_user_idx" ON "chat_member_state" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "chat_thread_meta_last_message_idx" ON "chat_thread_meta" USING btree ("last_message_at");
