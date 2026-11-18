CREATE TABLE "almanac" (
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"first_at" timestamp with time zone DEFAULT now() NOT NULL,
	"best_points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "almanac_user_id_exercise_id_pk" PRIMARY KEY("user_id","exercise_id")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"user_id" uuid NOT NULL,
	"badge" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_user_id_badge_pk" PRIMARY KEY("user_id","badge")
);
--> statement-breakpoint
CREATE TABLE "course_tas" (
	"course_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "course_tas_course_id_user_id_pk" PRIMARY KEY("course_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"language" text NOT NULL,
	"join_code" text NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "enrolments" (
	"course_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrolments_course_id_user_id_pk" PRIMARY KEY("course_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "exercise_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"pseudocode" text DEFAULT '' NOT NULL,
	"code" text NOT NULL,
	"indent" integer DEFAULT 0 NOT NULL,
	"given" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"language" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hands" (
	"card_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"row_id" uuid NOT NULL,
	"placed_slot_id" uuid
);
--> statement-breakpoint
CREATE TABLE "login_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "login_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"team" integer,
	"seat" integer NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"rank_at_round_start" integer,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_session_id_user_id_pk" PRIMARY KEY("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"row_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"correct" boolean NOT NULL,
	"attempt" integer NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"spotlighted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"exercise_id" uuid NOT NULL,
	"time_limit_s" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	"paused_remaining_ms" integer,
	"ended_at" timestamp with time zone,
	"deal_seed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"opened_by" uuid NOT NULL,
	"mode" text NOT NULL,
	"hand_size" integer NOT NULL,
	"team_count" integer DEFAULT 4 NOT NULL,
	"status" text DEFAULT 'lobby' NOT NULL,
	"current_round" integer DEFAULT -1 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"login_id" text NOT NULL,
	"name" text NOT NULL,
	"nickname" text NOT NULL,
	"role" text NOT NULL,
	"password_hash" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"avatar" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_simulated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_login_id_unique" UNIQUE("login_id")
);
--> statement-breakpoint
ALTER TABLE "almanac" ADD CONSTRAINT "almanac_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almanac" ADD CONSTRAINT "almanac_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_tas" ADD CONSTRAINT "course_tas_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_tas" ADD CONSTRAINT "course_tas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_lecturer_id_users_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_rows" ADD CONSTRAINT "exercise_rows_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hands" ADD CONSTRAINT "hands_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hands" ADD CONSTRAINT "hands_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hands" ADD CONSTRAINT "hands_row_id_exercise_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."exercise_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hands" ADD CONSTRAINT "hands_placed_slot_id_exercise_rows_id_fk" FOREIGN KEY ("placed_slot_id") REFERENCES "public"."exercise_rows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_row_id_exercise_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."exercise_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_slot_id_exercise_rows_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."exercise_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_rows_position" ON "exercise_rows" USING btree ("exercise_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "hands_round_user_row" ON "hands" USING btree ("round_id","user_id","row_id");--> statement-breakpoint
CREATE INDEX "hands_round" ON "hands" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "placements_round" ON "placements" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "placements_user" ON "placements" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_position" ON "rounds" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "sessions_course" ON "sessions" USING btree ("course_id");