-- Up to 5 short videos of the work on a builder site ("סרטונים מהעבודה"), besides the one at the top (video).
-- Each: { id, path, ext: "mp4", poster: { path, ext }, title, w, h } in the "builder" bucket, made in the owner's
-- browser (10 seconds, H.264, no sound). The top's pick (a photo or the video) is content.hero_media.
-- Run once in the SQL Editor of the lead system's Supabase project, before the builder offers the videos.
alter table public.ls_drafts add column if not exists videos jsonb not null default '[]';
