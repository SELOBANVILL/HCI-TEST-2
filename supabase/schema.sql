-- ============================================================
-- GLITCHWAYVE DATABASE SCHEMA
-- Run this entire file in Supabase > SQL Editor > New query.
-- IMPORTANT: This file creates empty tables. It contains NO INSERT
-- statements and therefore adds NO sample students or sample records.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- A. SHARED SCHOOL INFORMATION
-- Students can read these records after signing in.
-- Add verified school information through the Supabase Table Editor.
-- ------------------------------------------------------------

create table if not exists public.buildings (
  building_key text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint buildings_key_check check (building_key in ('interweave', 'glitch'))
);

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  building_key text not null references public.buildings(building_key) on delete cascade,
  floor_number integer not null,
  floor_label text not null,
  is_off_limits boolean not null default false,
  created_at timestamptz not null default now(),
  unique (building_key, floor_label)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  building_key text not null references public.buildings(building_key) on delete cascade,
  floor_id uuid not null references public.floors(id) on delete cascade,
  room_number text not null,
  name text not null,
  room_type text,
  purpose text,
  hours text,
  capacity integer,
  requirements text,
  created_at timestamptz not null default now(),
  unique (building_key, room_number)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  building_key text not null references public.buildings(building_key) on delete cascade,
  name text not null,
  category text not null,
  description text,
  floor_label text,
  room_number text,
  hours text,
  requirements text,
  contact_office text,
  icon_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  building_key text not null references public.buildings(building_key) on delete cascade,
  name text not null,
  description text,
  floor_label text,
  room_number text,
  hours text,
  what_to_bring text,
  email text,
  created_at timestamptz not null default now()
);

-- A NULL building_key means the announcement applies to both buildings.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  building_key text references public.buildings(building_key) on delete cascade,
  title text not null,
  body text,
  tag text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Store official handbook and memorandum links. Files can be hosted in Supabase Storage.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  building_key text references public.buildings(building_key) on delete cascade,
  category text not null default 'Handbook',
  title text not null,
  description text,
  document_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  building_key text not null references public.buildings(building_key) on delete cascade,
  name text not null,
  description text,
  location text,
  total_quantity integer not null default 0 check (total_quantity >= 0),
  requirements text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- B. PERSONAL STUDENT RECORDS
-- Every row is linked to the authenticated Supabase user.
-- Row Level Security below prevents students from viewing another
-- student's private records.
-- ------------------------------------------------------------

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  building_key text references public.buildings(building_key) on delete set null,
  details text not null,
  status text not null default 'Submitted',
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  date date not null,
  start_time time not null,
  end_time time not null,
  purpose text not null,
  people_count integer not null check (people_count > 0),
  status text not null default 'Submitted',
  created_at timestamptz not null default now(),
  constraint booking_time_check check (end_time > start_time)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  appointment_type text not null,
  appointment_date date not null,
  time_slot time not null,
  reason text,
  building_key text references public.buildings(building_key) on delete set null,
  status text not null default 'Submitted',
  created_at timestamptz not null default now()
);

create table if not exists public.borrow_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  equipment_name text not null,
  pickup_date date not null,
  purpose text,
  status text not null default 'Submitted',
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.dismissed_announcements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, announcement_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  lab_or_tool text,
  link text,
  status text not null default 'Submitted',
  created_at timestamptz not null default now()
);

-- These personal tables are ready for future Carehub and student-life features.
create table if not exists public.wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  mood text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_declarations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  declared_on date not null,
  symptoms jsonb not null default '[]'::jsonb,
  temperature numeric(4,1),
  consent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, declared_on)
);

create table if not exists public.handbook_conformes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists public.practicum_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  hours numeric(5,1) not null check (hours > 0),
  task text not null,
  validation text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- C. ROW LEVEL SECURITY (RLS)
-- Shared information: signed-in students can SELECT only.
-- Personal information: a student can manage only rows with their own ID.
-- ------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'buildings', 'floors', 'rooms', 'services', 'offices',
    'announcements', 'documents', 'equipment'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', 'read_' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      'read_' || table_name, table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'requests', 'bookings', 'appointments', 'borrow_records', 'notifications',
    'dismissed_announcements', 'projects', 'wellness_checkins',
    'safety_declarations', 'handbook_conformes', 'practicum_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', 'manage_own_' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id)',
      'manage_own_' || table_name, table_name
    );
  end loop;
end $$;

-- Table grants are required in addition to RLS policies for Data API access.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'buildings', 'floors', 'rooms', 'services', 'offices',
    'announcements', 'documents', 'equipment'
  ] loop
    execute format('grant select on table public.%I to authenticated', table_name);
  end loop;

  foreach table_name in array array[
    'requests', 'bookings', 'appointments', 'borrow_records', 'notifications',
    'dismissed_announcements', 'projects', 'wellness_checkins',
    'safety_declarations', 'handbook_conformes', 'practicum_logs'
  ] loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
  end loop;
end $$;

-- ------------------------------------------------------------
-- D. INDEXES
-- These indexes help the most common dashboard lookups.
-- ------------------------------------------------------------

create index if not exists idx_floors_building on public.floors(building_key, floor_number desc);
create index if not exists idx_rooms_building_floor on public.rooms(building_key, floor_id);
create index if not exists idx_services_building_category on public.services(building_key, category);
create index if not exists idx_offices_building on public.offices(building_key);
create index if not exists idx_announcements_building_date on public.announcements(building_key, published_at desc);
create index if not exists idx_requests_student_date on public.requests(student_id, created_at desc);
create index if not exists idx_bookings_student_date on public.bookings(student_id, created_at desc);
create index if not exists idx_appointments_student_date on public.appointments(student_id, created_at desc);
create index if not exists idx_notifications_student_read on public.notifications(student_id, is_read);

-- Finished. No rows were inserted by this script.
