-- ═══════════════════════════════════════════
-- Discovery Bank — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════

-- Create discoveries table
CREATE TABLE discoveries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  discovery_id TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('restaurant', 'retail')),
  business_name TEXT NOT NULL,
  sf_url TEXT DEFAULT '',
  record_type TEXT,
  notes JSONB DEFAULT '{}'::jsonb,
  checked JSONB DEFAULT '{}'::jsonb,
  section_extras JSONB DEFAULT '{}'::jsonb,
  completion INTEGER DEFAULT 0,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by user
CREATE INDEX idx_discoveries_user_id ON discoveries(user_id);
CREATE INDEX idx_discoveries_saved_at ON discoveries(saved_at DESC);
CREATE UNIQUE INDEX idx_discoveries_unique ON discoveries(user_id, discovery_id);

-- Enable Row Level Security (RLS)
-- This ensures each user can ONLY see their own discoveries
ALTER TABLE discoveries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own discoveries
CREATE POLICY "Users can read own discoveries"
  ON discoveries FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own discoveries
CREATE POLICY "Users can insert own discoveries"
  ON discoveries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own discoveries
CREATE POLICY "Users can delete own discoveries"
  ON discoveries FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can update their own discoveries
CREATE POLICY "Users can update own discoveries"
  ON discoveries FOR UPDATE
  USING (auth.uid() = user_id);
