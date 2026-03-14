CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  "email" varchar UNIQUE NOT NULL,
  "username" varchar,
  "password_hash" varchar,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "oauth_providers" (
  "id" uuid PRIMARY KEY,
  "name" varchar UNIQUE,
  "client_id" varchar,
  "client_secret" varchar,
  "auth_url" varchar,
  "token_url" varchar,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_oauth_accounts" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "provider_id" uuid NOT NULL,
  "provider_user_id" varchar,
  "access_token" text,
  "refresh_token" text,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "session_token" text,
  "ip_address" varchar,
  "user_agent" text,
  "created_at" timestamp DEFAULT (now()),
  "expires_at" timestamp
);

CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "amount" decimal(10,2),
  "currency" varchar,
  "status" varchar,
  "payment_provider" varchar,
  "external_payment_id" varchar,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "payment_history" (
  "id" uuid PRIMARY KEY,
  "payment_id" uuid NOT NULL,
  "status" varchar,
  "changed_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_profile_changes" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "field_name" varchar,
  "old_value" text,
  "new_value" text,
  "changed_at" timestamp DEFAULT (now())
);

CREATE TABLE "functions" (
  "id" uuid PRIMARY KEY,
  "name" varchar UNIQUE,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "function_parameters" (
  "id" uuid PRIMARY KEY,
  "function_id" uuid NOT NULL,
  "name" varchar,
  "type" varchar,
  "required" boolean,
  "default_value" text
);

CREATE TABLE "user_permissions" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "function_id" uuid NOT NULL,
  "allowed" boolean DEFAULT true
);

CREATE UNIQUE INDEX ON "user_oauth_accounts" ("provider_id", "provider_user_id");

CREATE INDEX ON "sessions" ("user_id");

CREATE INDEX ON "payments" ("user_id");

CREATE INDEX ON "payment_history" ("payment_id");

CREATE INDEX ON "user_profile_changes" ("user_id");

CREATE UNIQUE INDEX ON "user_permissions" ("user_id", "function_id");

ALTER TABLE "user_oauth_accounts" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_oauth_accounts" ADD FOREIGN KEY ("provider_id") REFERENCES "oauth_providers" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sessions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payment_history" ADD FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_profile_changes" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "function_parameters" ADD FOREIGN KEY ("function_id") REFERENCES "functions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_permissions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_permissions" ADD FOREIGN KEY ("function_id") REFERENCES "functions" ("id") DEFERRABLE INITIALLY IMMEDIATE;
