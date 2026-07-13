-- ====================================================================
-- ATTENDANCE PRO — COMPLETE SUPABASE SCHEMA
-- Updated: Phase 6 — Storage + Missing Columns Fixed
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ====================================================================


-- ====================================================================
-- SECTION 1: TABLES
-- ====================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name         TEXT NOT NULL,
    email             TEXT NOT NULL,
    institution_name  TEXT,                          -- ← ADDED (was missing, used by profileService + signup)
    semester          TEXT,
    course            TEXT,
    branch            TEXT,
    year              TEXT,
    attendance_goal   INTEGER DEFAULT 75,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add institution_name column if table already exists (safe migration)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS institution_name TEXT;


-- 2. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_name  TEXT NOT NULL,
    present       INTEGER DEFAULT 0 NOT NULL,
    total         INTEGER DEFAULT 0 NOT NULL,
    percentage    NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    last_updated  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. SYLLABUS TABLE
CREATE TABLE IF NOT EXISTS public.syllabus (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_name        TEXT NOT NULL,
    subject_code        TEXT,                        -- ← ADDED (was missing, used by syllabusService)
    faculty_name        TEXT,
    credits             TEXT,
    semester            TEXT,                        -- ← ADDED (was missing, used by syllabusService)
    uploaded_file_url   TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add missing columns if table already exists (safe migration)
ALTER TABLE public.syllabus ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.syllabus ADD COLUMN IF NOT EXISTS semester     TEXT;


-- 4. ONBOARDING TABLE
CREATE TABLE IF NOT EXISTS public.onboarding (
    user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    completed     BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at  TIMESTAMP WITH TIME ZONE
);


-- 5. TIMETABLE TABLE
CREATE TABLE IF NOT EXISTS public.timetable (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    day         TEXT NOT NULL,
    period      INTEGER NOT NULL,
    subject     TEXT NOT NULL,
    faculty     TEXT,
    room        TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 6. EXTRA CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.extra_classes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    day         TEXT NOT NULL,
    date        TEXT NOT NULL,
    subject     TEXT NOT NULL,
    periods     INTEGER NOT NULL,
    start_time  TEXT,
    end_time    TEXT,
    faculty     TEXT,
    room        TEXT,
    notes       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ====================================================================
-- SECTION 2: ROW LEVEL SECURITY (RLS)
-- ====================================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_classes ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────────
-- Profiles Policies
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE USING (auth.uid() = id);


-- ────────────────────────────────────────────────────────────────────
-- Attendance Policies
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own attendance"   ON public.attendance;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can delete their own attendance" ON public.attendance;

CREATE POLICY "Users can view their own attendance"
    ON public.attendance FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attendance"
    ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
    ON public.attendance FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attendance"
    ON public.attendance FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────
-- Syllabus Policies
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own syllabus"   ON public.syllabus;
DROP POLICY IF EXISTS "Users can insert their own syllabus" ON public.syllabus;
DROP POLICY IF EXISTS "Users can update their own syllabus" ON public.syllabus;
DROP POLICY IF EXISTS "Users can delete their own syllabus" ON public.syllabus;

CREATE POLICY "Users can view their own syllabus"
    ON public.syllabus FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own syllabus"
    ON public.syllabus FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own syllabus"
    ON public.syllabus FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own syllabus"
    ON public.syllabus FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────
-- Onboarding Policies
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own onboarding status"   ON public.onboarding;
DROP POLICY IF EXISTS "Users can insert their own onboarding status" ON public.onboarding;
DROP POLICY IF EXISTS "Users can update their own onboarding status" ON public.onboarding;
DROP POLICY IF EXISTS "Users can delete their own onboarding status" ON public.onboarding;

CREATE POLICY "Users can view their own onboarding status"
    ON public.onboarding FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding status"
    ON public.onboarding FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding status"
    ON public.onboarding FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own onboarding status"
    ON public.onboarding FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────
-- Timetable Policies
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own timetable"   ON public.timetable;
DROP POLICY IF EXISTS "Users can insert their own timetable" ON public.timetable;
DROP POLICY IF EXISTS "Users can update their own timetable" ON public.timetable;
DROP POLICY IF EXISTS "Users can delete their own timetable" ON public.timetable;

CREATE POLICY "Users can view their own timetable"
    ON public.timetable FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timetable"
    ON public.timetable FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timetable"
    ON public.timetable FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timetable"
    ON public.timetable FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────
-- Extra Classes Policies
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own extra classes"   ON public.extra_classes;
DROP POLICY IF EXISTS "Users can insert their own extra classes" ON public.extra_classes;
DROP POLICY IF EXISTS "Users can update their own extra classes" ON public.extra_classes;
DROP POLICY IF EXISTS "Users can delete their own extra classes" ON public.extra_classes;

CREATE POLICY "Users can view their own extra classes"
    ON public.extra_classes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own extra classes"
    ON public.extra_classes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extra classes"
    ON public.extra_classes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extra classes"
    ON public.extra_classes FOR DELETE USING (auth.uid() = user_id);


-- ====================================================================
-- SECTION 3: STORAGE BUCKET + STORAGE RLS POLICIES
-- ====================================================================

-- Create the storage bucket (safe — does nothing if already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'syllabus',
    'syllabus',
    false,                                         -- Private bucket — access controlled by RLS
    10485760,                                      -- 10 MB per file limit
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit     = EXCLUDED.file_size_limit,
    allowed_mime_types  = EXCLUDED.allowed_mime_types;


-- ────────────────────────────────────────────────────────────────────
-- Storage RLS Policies
-- Each user can only access files inside their own folder: {user_id}/...
-- ────────────────────────────────────────────────────────────────────

-- Drop existing storage policies first (safe re-run)
DROP POLICY IF EXISTS "Users can upload their own syllabus files"  ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own syllabus files"    ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own syllabus files"  ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own syllabus files"  ON storage.objects;


-- UPLOAD: user can only upload to their own folder
CREATE POLICY "Users can upload their own syllabus files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'syllabus'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

-- READ: user can only read their own files
CREATE POLICY "Users can view their own syllabus files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'syllabus'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

-- UPDATE: user can only update their own files
CREATE POLICY "Users can update their own syllabus files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'syllabus'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

-- DELETE: user can only delete their own files
CREATE POLICY "Users can delete their own syllabus files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'syllabus'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );


-- ====================================================================
-- SECTION 4: AUTO PROFILE CREATION TRIGGER ON SIGNUP
-- Fixed: now inserts institution_name from user metadata
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        institution_name,
        semester,
        course,
        branch,
        year,
        attendance_goal
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Student'),
        new.email,
        COALESCE(new.raw_user_meta_data->>'institution_name', 'University Institute'),  -- ← FIXED
        COALESCE(new.raw_user_meta_data->>'semester', 'Semester 1'),
        COALESCE(new.raw_user_meta_data->>'course', 'B.Tech'),
        COALESCE(new.raw_user_meta_data->>'branch', 'Computer Science'),
        COALESCE(new.raw_user_meta_data->>'academic_year', '2025-2026'),
        75
    )
    ON CONFLICT (id) DO NOTHING;  -- ← ADDED: safe if profile already exists

    INSERT INTO public.onboarding (user_id, completed)
    VALUES (new.id, false)
    ON CONFLICT (user_id) DO NOTHING;  -- ← ADDED: safe if onboarding already exists

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ====================================================================
-- SECTION 5: USEFUL INDEXES FOR PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_attendance_user_id    ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_user_id      ON public.syllabus(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_user_id     ON public.timetable(user_id);
CREATE INDEX IF NOT EXISTS idx_extra_classes_user_id ON public.extra_classes(user_id);


-- ====================================================================
-- DONE — Run this entire file in Supabase SQL Editor
-- ====================================================================
