-- =============================================================================
-- Seed data — one live tenant plus a local-development tenant.
-- Safe to re-run: every statement is idempotent.
-- =============================================================================

insert into public.clients (domain, business_name)
values
  ('multibrawn.co.il', 'Multibrawn'),
  ('localhost',        'Growth OS Demo')
on conflict (domain) do nothing;

-- Version 1 of the Multibrawn config.
insert into public.client_configs (client_id, version, content)
select
  c.id,
  1,
  jsonb_build_object(
    'locale',           'he',
    'direction',        'rtl',
    'hero_headline',    'נוכחות דיגיטלית שמייצרת הזדמנויות',
    'hero_subheadline', 'פרסום אורגני, ניהול קהילות וחיבורים עסקיים — מערכת אחת שבונה חשיפה, אמון ותנועה לאורך זמן.',
    'cta_text',         'בואו נדבר',
    'cta_href',         'https://www.multibrawn.co.il/contact',
    'active_promo',     jsonb_build_object(
      'label', 'חדש',
      'text',  'קהילת Multibrawn נפתחת מחדש — הרשמה מוקדמת לספקים ולשותפים.',
      'href',  'https://www.multibrawn.co.il'
    ),
    'highlights', jsonb_build_array(
      jsonb_build_object('title', 'פרסום אורגני', 'description', 'חשיפה שנבנית מתוכן ומקהילה, לא מתקציב מדיה.'),
      jsonb_build_object('title', 'ניהול קהילות', 'description', 'במות פעילות שמחברות בין עסקים, ספקים ולקוחות.'),
      jsonb_build_object('title', 'חיבורים עסקיים', 'description', 'שיתופי פעולה והזדמנויות שמגיעות מהרשת שבנינו.')
    )
  )
from public.clients c
where lower(c.domain) = 'multibrawn.co.il'
on conflict (client_id, version) do nothing;

-- Version 1 of the local demo tenant (English, LTR) for development.
insert into public.client_configs (client_id, version, content)
select
  c.id,
  1,
  jsonb_build_object(
    'locale',           'en',
    'direction',        'ltr',
    'hero_headline',    'Your business, on autopilot',
    'hero_subheadline', 'Growth OS watches the numbers, drafts the changes, and ships them the moment you approve.',
    'cta_text',         'Start free',
    'cta_href',         '#',
    'active_promo',     jsonb_build_object(
      'label', 'New',
      'text',  'Shadow-CFO reporting is now included on every plan.',
      'href',  '#'
    ),
    'highlights', jsonb_build_array(
      jsonb_build_object('title', 'Always-on analysis', 'description', 'Revenue, runway and retention, reconciled nightly.'),
      jsonb_build_object('title', 'Proposals, not dashboards', 'description', 'Every insight arrives as a concrete change you can approve.'),
      jsonb_build_object('title', 'One-click publish', 'description', 'Approved changes go live in seconds, versioned and revertible.')
    )
  )
from public.clients c
where lower(c.domain) = 'localhost'
on conflict (client_id, version) do nothing;
