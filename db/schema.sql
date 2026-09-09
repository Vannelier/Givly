-- Schema MyPresentsForYou. Idempotent : rejouable sans risque.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS gift_pages (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text        NOT NULL UNIQUE,
  admin_token        text        NOT NULL UNIQUE,
  name               text        NOT NULL DEFAULT '',
  intro_message      text        NOT NULL DEFAULT '',
  signature          text        NOT NULL DEFAULT '',
  recipient_name     text        NOT NULL DEFAULT '',
  header_image_url   text,
  reveal_at          timestamptz,
  reply_message      text        NOT NULL DEFAULT '',
  link_title         text        NOT NULL DEFAULT '',
  welcome_message    text        NOT NULL DEFAULT '',
  open_label         text        NOT NULL DEFAULT '',
  wait_message       text        NOT NULL DEFAULT '',
  items_title        text        NOT NULL DEFAULT '',
  items_message      text        NOT NULL DEFAULT '',
  thank_you_message  text        NOT NULL DEFAULT '',
  cover_image_url    text,
  theme              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  items              jsonb       NOT NULL DEFAULT '[]'::jsonb,
  plan               text        NOT NULL DEFAULT 'free',
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  chosen_item_id     text,
  chosen_at          timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  view_count         integer     NOT NULL DEFAULT 0,
  CONSTRAINT gift_pages_plan_check CHECK (plan IN ('free', 'paid')),
  CONSTRAINT gift_pages_slug_check CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,58})[a-z0-9]$')
);

-- Rejouable sur une base creee avant l'ajout de la colonne `name`.
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS intro_message text NOT NULL DEFAULT '';
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS signature text NOT NULL DEFAULT '';
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS recipient_name text NOT NULL DEFAULT '';
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS header_image_url text;
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS reveal_at timestamptz;
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS reply_message text NOT NULL DEFAULT '';
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS link_title text NOT NULL DEFAULT '';
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS open_label text NOT NULL DEFAULT '';
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS wait_message text NOT NULL DEFAULT '';
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS items_title text NOT NULL DEFAULT '';
ALTER TABLE gift_pages ADD COLUMN IF NOT EXISTS items_message text NOT NULL DEFAULT '';

-- Les UNIQUE ci-dessus creent deja les index sur slug et admin_token.
CREATE INDEX IF NOT EXISTS gift_pages_expires_at_idx ON gift_pages (expires_at);
