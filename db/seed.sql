-- Page de demonstration, utile pour valider le rendu avant que le formulaire existe.
-- Lien public : /pour-toi-demo      Lien admin : /admin/demo-token-a-remplacer-32-octets-min
INSERT INTO gift_pages (slug, admin_token, name, welcome_message, thank_you_message, theme, items, expires_at)
VALUES (
  'pour-toi-demo',
  'demo-token-a-remplacer-32-octets-min',
  'Demonstration',
  'Joyeux anniversaire. Choisis celui que tu preferes.',
  'Parfait, c''est note. Je m''occupe du reste.',
  '{"layout":"grid","palette":{"id":"terracotta"}}'::jsonb,
  '[
    {"id":"itm_demo1","label":"Collier Fluorite","image_url":null,"source_url":null,"note":"Pierre verte, chaine fine"},
    {"id":"itm_demo2","label":"Diner au restaurant Sebastian","image_url":null,"source_url":null,"note":"Un soir de semaine, sans se presser"}
  ]'::jsonb,
  now() + interval '30 days'
)
ON CONFLICT (slug) DO NOTHING;
