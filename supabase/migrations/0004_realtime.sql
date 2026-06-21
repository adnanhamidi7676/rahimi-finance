-- ============================================================================
-- Migration 0004: Realtime
-- ----------------------------------------------------------------------------
-- Add the live finance tables to the supabase_realtime publication so edits by
-- one admin propagate to all connected clients. RLS still applies to realtime
-- payloads, so only active users receive changes.
-- ============================================================================

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.cash_entries;

-- REPLICA IDENTITY FULL lets realtime deliver the previous row on UPDATE/DELETE,
-- which the client uses to reconcile optimistic edits.
alter table public.projects     replica identity full;
alter table public.cash_entries replica identity full;
