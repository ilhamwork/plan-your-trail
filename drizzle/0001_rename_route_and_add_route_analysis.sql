ALTER TABLE "route" RENAME TO "saved_route";
--> statement-breakpoint
ALTER TABLE "saved_route" RENAME CONSTRAINT "route_user_id_user_id_fk" TO "saved_route_user_id_user_id_fk";
--> statement-breakpoint
CREATE TABLE "route_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"file_name" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"source" text DEFAULT 'upload' NOT NULL,
	"metrics" jsonb NOT NULL,
	"point_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "route_analysis" ADD CONSTRAINT "route_analysis_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "saved_route" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "route_analysis" ENABLE ROW LEVEL SECURITY;
