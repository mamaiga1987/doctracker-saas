-- ============================================================
-- DocTracker SaaS — Schéma PostgreSQL Multi-Tenant
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ORGANIZATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  plan            VARCHAR(30)  NOT NULL DEFAULT 'free',  -- free | pro | business
  stripe_customer_id VARCHAR(200),
  stripe_sub_id   VARCHAR(200),
  plan_expires_at TIMESTAMPTZ,
  docs_used       INTEGER      NOT NULL DEFAULT 0,
  logo_url        TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           VARCHAR(200) NOT NULL,
  password_hash   VARCHAR(200) NOT NULL,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  role            VARCHAR(30)  NOT NULL DEFAULT 'member', -- owner | admin | member
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(email, organization_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

-- ── INVITATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email           VARCHAR(200) NOT NULL,
  role            VARCHAR(30)  NOT NULL DEFAULT 'member',
  token           VARCHAR(200) UNIQUE NOT NULL,
  expires_at      TIMESTAMPTZ  NOT NULL,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── RECIPIENTS (destinataires de documents) ──────────────────
CREATE TABLE IF NOT EXISTS recipients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           VARCHAR(200) NOT NULL,
  name            VARCHAR(200),
  group_name      VARCHAR(100),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(email, organization_id)
);

-- ── DOCUMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  title           VARCHAR(300) NOT NULL,
  original_name   VARCHAR(300) NOT NULL,
  storage_path    VARCHAR(500) NOT NULL,  -- chemin S3 ou local
  file_size       INTEGER,
  page_count      INTEGER,
  watermark_text  TEXT,
  pin_enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
  otp_enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
  download_allowed BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  status          VARCHAR(30)  NOT NULL DEFAULT 'active', -- active | expired | revoked
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── DOCUMENT SHARES (lien unique par destinataire) ───────────
CREATE TABLE IF NOT EXISTS document_shares (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_id    UUID REFERENCES recipients(id) ON DELETE SET NULL,
  recipient_email VARCHAR(200) NOT NULL,
  recipient_name  VARCHAR(200),
  token           VARCHAR(200) UNIQUE NOT NULL,
  pin             VARCHAR(10),
  otp_secret      VARCHAR(100),
  access_count    INTEGER      NOT NULL DEFAULT 0,
  last_access_at  TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── TRACKING EVENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id        UUID NOT NULL REFERENCES document_shares(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type      VARCHAR(50)  NOT NULL, -- otp_requested | pin_entered | opened | downloaded | page_view | unauthorized
  ip_address      VARCHAR(50),
  user_agent      TEXT,
  country         VARCHAR(100),
  city            VARCHAR(100),
  latitude        DECIMAL(10,7),
  longitude       DECIMAL(10,7),
  page_number     INTEGER,
  duration_seconds INTEGER,
  metadata        JSONB        DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── ALERTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  share_id        UUID REFERENCES document_shares(id) ON DELETE SET NULL,
  event_id        UUID REFERENCES tracking_events(id) ON DELETE SET NULL,
  severity        VARCHAR(20)  NOT NULL DEFAULT 'info', -- info | warning | critical
  type            VARCHAR(50)  NOT NULL,
  message         TEXT         NOT NULL,
  is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── PLAN LIMITS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_limits (
  plan            VARCHAR(30)  PRIMARY KEY,
  max_docs_per_month INTEGER  NOT NULL,
  max_users       INTEGER      NOT NULL,
  max_recipients  INTEGER      NOT NULL,
  watermark       BOOLEAN      NOT NULL DEFAULT TRUE,
  otp             BOOLEAN      NOT NULL DEFAULT TRUE,
  custom_branding BOOLEAN      NOT NULL DEFAULT FALSE,
  api_access      BOOLEAN      NOT NULL DEFAULT FALSE,
  price_monthly   DECIMAL(10,2) NOT NULL DEFAULT 0
);

INSERT INTO plan_limits VALUES
  ('free',     0,    1,   10,  TRUE,  TRUE,  FALSE, FALSE, 0),
  ('starter',  999999, 5, 500, TRUE, TRUE, FALSE, FALSE, 29.00),
  ('pro', 999999, 20, 2000, TRUE, TRUE, TRUE, FALSE, 59.00),
  ('business', 999999, 999, 9999, TRUE, TRUE, TRUE, TRUE, 99.00)
ON CONFLICT (plan) DO NOTHING;

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_org         ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_org     ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_shares_token      ON document_shares(token);
CREATE INDEX IF NOT EXISTS idx_shares_doc        ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_events_share      ON tracking_events(share_id);
CREATE INDEX IF NOT EXISTS idx_events_org        ON tracking_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_created    ON tracking_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_org        ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read       ON alerts(organization_id, is_read);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orgs_updated   ON organizations;
DROP TRIGGER IF EXISTS trg_users_updated  ON users;
DROP TRIGGER IF EXISTS trg_docs_updated   ON documents;

CREATE TRIGGER trg_orgs_updated   BEFORE UPDATE ON organizations   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated  BEFORE UPDATE ON users            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_docs_updated   BEFORE UPDATE ON documents        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
