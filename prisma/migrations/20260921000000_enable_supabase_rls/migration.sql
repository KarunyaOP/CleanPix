-- ==============================================================================
-- CLEANPIX PRODUCTION RLS MIGRATION
-- Migration: 20260921000000_enable_supabase_rls
-- Description: Enables Row Level Security on all public tables and enforces strict
--              user ownership and server-only access policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: users
-- Authenticated users can SELECT only their own profile.
-- No direct client INSERT, UPDATE, or DELETE (managed server-side via Prisma / API).
-- ------------------------------------------------------------------------------
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON "users";
CREATE POLICY "users_select_own" ON "users"
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()::text
    OR email = (auth.jwt() ->> 'email')
  );

-- ------------------------------------------------------------------------------
-- 2. TABLE: projects
-- Authenticated users can SELECT, INSERT, UPDATE, and DELETE only their own records.
-- ------------------------------------------------------------------------------
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_own" ON "projects";
CREATE POLICY "projects_select_own" ON "projects"
  FOR SELECT
  TO authenticated
  USING (
    "userId" = auth.uid()::text
    OR "userId" IN (
      SELECT id FROM "users" WHERE email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "projects_insert_own" ON "projects";
CREATE POLICY "projects_insert_own" ON "projects"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "userId" = auth.uid()::text
    OR "userId" IN (
      SELECT id FROM "users" WHERE email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "projects_update_own" ON "projects";
CREATE POLICY "projects_update_own" ON "projects"
  FOR UPDATE
  TO authenticated
  USING (
    "userId" = auth.uid()::text
    OR "userId" IN (
      SELECT id FROM "users" WHERE email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    "userId" = auth.uid()::text
    OR "userId" IN (
      SELECT id FROM "users" WHERE email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "projects_delete_own" ON "projects";
CREATE POLICY "projects_delete_own" ON "projects"
  FOR DELETE
  TO authenticated
  USING (
    "userId" = auth.uid()::text
    OR "userId" IN (
      SELECT id FROM "users" WHERE email = (auth.jwt() ->> 'email')
    )
  );

-- ------------------------------------------------------------------------------
-- 3. TABLE: exports
-- Authenticated users can access exports only for projects they own.
-- ------------------------------------------------------------------------------
ALTER TABLE "exports" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exports_select_own" ON "exports";
CREATE POLICY "exports_select_own" ON "exports"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "projects" p
      JOIN "users" u ON p."userId" = u.id
      WHERE p.id = "exports"."projectId"
      AND (
        p."userId" = auth.uid()::text
        OR u.email = (auth.jwt() ->> 'email')
      )
    )
  );

DROP POLICY IF EXISTS "exports_insert_own" ON "exports";
CREATE POLICY "exports_insert_own" ON "exports"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "projects" p
      JOIN "users" u ON p."userId" = u.id
      WHERE p.id = "exports"."projectId"
      AND (
        p."userId" = auth.uid()::text
        OR u.email = (auth.jwt() ->> 'email')
      )
    )
  );

DROP POLICY IF EXISTS "exports_delete_own" ON "exports";
CREATE POLICY "exports_delete_own" ON "exports"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "projects" p
      JOIN "users" u ON p."userId" = u.id
      WHERE p.id = "exports"."projectId"
      AND (
        p."userId" = auth.uid()::text
        OR u.email = (auth.jwt() ->> 'email')
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 4. TABLE: accounts (OAuth credentials, tokens, secrets)
-- SERVER-ONLY: Direct client / PostgREST access is completely blocked.
-- ------------------------------------------------------------------------------
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounts_select_own" ON "accounts";
DROP POLICY IF EXISTS "accounts_insert_own" ON "accounts";
DROP POLICY IF EXISTS "accounts_update_own" ON "accounts";
DROP POLICY IF EXISTS "accounts_delete_own" ON "accounts";

-- ------------------------------------------------------------------------------
-- 5. TABLE: sessions (Session tokens)
-- SERVER-ONLY: Direct client / PostgREST access is completely blocked.
-- ------------------------------------------------------------------------------
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_select_own" ON "sessions";
DROP POLICY IF EXISTS "sessions_insert_own" ON "sessions";
DROP POLICY IF EXISTS "sessions_update_own" ON "sessions";
DROP POLICY IF EXISTS "sessions_delete_own" ON "sessions";

-- ------------------------------------------------------------------------------
-- 6. TABLE: verification_tokens (Magic Link & OTP tokens)
-- SERVER-ONLY: Direct client / PostgREST access is completely blocked.
-- ------------------------------------------------------------------------------
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "verification_tokens_select_own" ON "verification_tokens";
DROP POLICY IF EXISTS "verification_tokens_insert_own" ON "verification_tokens";
DROP POLICY IF EXISTS "verification_tokens_update_own" ON "verification_tokens";
DROP POLICY IF EXISTS "verification_tokens_delete_own" ON "verification_tokens";
