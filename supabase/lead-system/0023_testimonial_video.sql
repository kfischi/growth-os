-- =============================================================================
-- A testimonial with a video, and "would you recommend": on the private testimonial page the customer rates the
-- service, says whether they would recommend the business, and may record a short video (up to 30 seconds, with
-- sound). It goes up on the site's testimonials section at once, like a written one, and the owner can hide it.
-- The video and its first frame sit in the public "builder" bucket under testimonials/<business>/.
-- Runs after 0022. SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================

alter table public.ls_testimonials add column if not exists recommend boolean;
alter table public.ls_testimonials add column if not exists video jsonb; -- { path, poster, w, h }

-- A testimonial with a video may have a short line or none at all.
alter table public.ls_testimonials drop constraint if exists ls_testimonials_body_check;
alter table public.ls_testimonials add constraint ls_testimonials_body_check
  check (char_length(body) <= 400 and (char_length(body) >= 15 or video is not null));
