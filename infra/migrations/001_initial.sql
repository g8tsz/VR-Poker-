-- VR Poker initial schema (append-only ledger + audit)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL CHECK (amount <> 0),
  reason TEXT NOT NULL CHECK (
    reason IN (
      'seed',
      'buy_in',
      'add_on',
      'cash_out',
      'rake',
      'cosmetic_purchase',
      'tournament_buy_in',
      'tournament_prize'
    )
  ),
  ref TEXT
);

CREATE INDEX ledger_entries_user_id_idx ON ledger_entries (user_id);
CREATE INDEX ledger_entries_at_idx ON ledger_entries (at);

CREATE TABLE ownership_entries (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES users(id),
  sku_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('purchase', 'grant', 'tournament_reward')),
  ref TEXT
);

CREATE INDEX ownership_entries_user_id_idx ON ownership_entries (user_id);

CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  rake_percent NUMERIC(5, 4) NOT NULL DEFAULT 0.05,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE club_members (
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

CREATE TABLE hand_history (
  id BIGSERIAL PRIMARY KEY,
  table_id TEXT NOT NULL,
  hand_number INTEGER NOT NULL,
  hand_key TEXT NOT NULL,
  commitment TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  audit_ref TEXT,
  UNIQUE (table_id, hand_number)
);

CREATE INDEX hand_history_commitment_idx ON hand_history (commitment);

CREATE TABLE deal_audit_events (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hand_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX deal_audit_events_hand_key_idx ON deal_audit_events (hand_key);
CREATE INDEX deal_audit_events_at_idx ON deal_audit_events (at);
