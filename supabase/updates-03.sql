-- =====================================================================
--  Shanti Hospital — update 03
--  Patient-submitted testimonials with admin moderation.
--
--  Run AFTER updates-02.sql. Safe to re-run.
-- =====================================================================

create table if not exists public.testimonials (
  id            uuid        primary key default gen_random_uuid(),
  author_name   text        not null check (length(trim(author_name)) between 2 and 80),
  -- Optional: "Bagalkot", "Patient's mother", etc.
  author_role   text        not null default '' check (length(author_role) <= 80),
  quote         text        not null check (length(trim(quote)) between 20 and 600),
  -- Small, client-downscaled JPEG data URL, or an https URL.
  photo         text        not null default '',
  -- Contact kept for verification only; never published.
  contact_phone text        not null default '',
  rating        integer     check (rating is null or rating between 1 and 5),
  status        text        not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  -- Filled by staff when rejecting, so the decision is not a mystery later.
  review_note   text        not null default '',
  reviewed_by   uuid        references auth.users (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists testimonials_status_idx
  on public.testimonials (status, created_at desc);

-- Guard against a double-tap submitting twice.
create unique index if not exists testimonials_no_immediate_duplicate
  on public.testimonials (author_name, md5(quote));

alter table public.testimonials enable row level security;

-- ---------------------------------------------------------------------
-- RLS
--
-- The moderation guarantee lives here, not in the UI: anonymous readers can
-- only ever see rows where status = 'approved'. Even a crafted API call
-- cannot surface a pending or rejected submission.
-- ---------------------------------------------------------------------
drop policy if exists testimonials_public_read_approved on public.testimonials;
create policy testimonials_public_read_approved
  on public.testimonials for select
  using (status = 'approved');

drop policy if exists testimonials_staff_read_all on public.testimonials;
create policy testimonials_staff_read_all
  on public.testimonials for select
  using (public.is_staff());

-- Anyone may submit, but only as 'pending' — nobody can self-approve.
drop policy if exists testimonials_public_submit on public.testimonials;
create policy testimonials_public_submit
  on public.testimonials for insert
  with check (
    status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and length(trim(author_name)) >= 2
    and length(trim(quote)) >= 20
    -- Cap the inline photo so the table cannot be used as free file storage.
    and length(photo) <= 200000
  );

drop policy if exists testimonials_staff_moderate on public.testimonials;
create policy testimonials_staff_moderate
  on public.testimonials for update
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists testimonials_admin_delete on public.testimonials;
create policy testimonials_admin_delete
  on public.testimonials for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
grant select, insert on public.testimonials to anon, authenticated;
grant update, delete on public.testimonials to authenticated;

-- ---------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------
drop trigger if exists testimonials_audit on public.testimonials;
create trigger testimonials_audit
  after insert or update or delete on public.testimonials
  for each row execute function public.write_audit();

-- ---------------------------------------------------------------------
-- Public view: approved testimonials without the private contact number.
--
-- Selecting columns explicitly means a future `contact_phone` change cannot
-- accidentally leak through the public surface.
-- ---------------------------------------------------------------------
create or replace view public.public_testimonials
with (security_invoker = on) as
select id, author_name, author_role, quote, photo, rating, created_at
from public.testimonials
where status = 'approved'
order by created_at desc;

grant select on public.public_testimonials to anon, authenticated;
