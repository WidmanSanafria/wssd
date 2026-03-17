-- ─────────────────────────────────────────────────────────────────────────────
-- WSSD v2.0 – Initial Schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Users
CREATE TABLE users (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    display_name      VARCHAR(100),
    plan              VARCHAR(20)  NOT NULL DEFAULT 'free',
    plan_expires_at   TIMESTAMPTZ,
    downloads_today   INT          NOT NULL DEFAULT 0,
    downloads_reset_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);

-- Anonymous sessions (non-registered visitors)
CREATE TABLE anon_sessions (
    session_id     VARCHAR(64)  PRIMARY KEY,
    fingerprint    VARCHAR(128),
    ip_address     INET,
    download_count INT          NOT NULL DEFAULT 0,
    first_seen_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_seen_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_anon_sessions_ip          ON anon_sessions(ip_address);
CREATE INDEX idx_anon_sessions_last_seen   ON anon_sessions(last_seen_at);

-- Download records
CREATE TABLE downloads (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
    session_id      VARCHAR(64)  REFERENCES anon_sessions(session_id) ON DELETE SET NULL,
    platform        VARCHAR(20)  NOT NULL,
    source_url      TEXT         NOT NULL,
    title           VARCHAR(500),
    format          VARCHAR(50),
    filesize_bytes  BIGINT,
    had_ads         BOOLEAN      NOT NULL DEFAULT FALSE,
    ip_address      INET,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_downloads_user_id    ON downloads(user_id);
CREATE INDEX idx_downloads_session_id ON downloads(session_id);
CREATE INDEX idx_downloads_platform   ON downloads(platform);
CREATE INDEX idx_downloads_created_at ON downloads(created_at DESC);

-- Ad slots configuration
CREATE TABLE ad_slots (
    id                      SERIAL       PRIMARY KEY,
    slot_name               VARCHAR(50)  NOT NULL UNIQUE,
    ad_unit_id              VARCHAR(255),
    active                  BOOLEAN      NOT NULL DEFAULT TRUE,
    show_from_download_n    INT          NOT NULL DEFAULT 2
);

-- Subscription plans
CREATE TABLE subscription_plans (
    id                  SERIAL        PRIMARY KEY,
    name                VARCHAR(50)   NOT NULL UNIQUE,
    price_usd_month     NUMERIC(8,2),
    downloads_per_day   INT,
    has_ads             BOOLEAN       NOT NULL DEFAULT TRUE,
    api_access          BOOLEAN       NOT NULL DEFAULT FALSE,
    features            JSONB
);

-- Payments
CREATE TABLE payments (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID          REFERENCES users(id) ON DELETE SET NULL,
    stripe_session_id   VARCHAR(255)  UNIQUE,
    amount_usd          NUMERIC(8,2),
    status              VARCHAR(30)   NOT NULL DEFAULT 'pending',
    plan                VARCHAR(20),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- API keys
CREATE TABLE api_keys (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash    VARCHAR(128) NOT NULL UNIQUE,
    label       VARCHAR(100),
    calls_today INT          NOT NULL DEFAULT 0,
    total_calls INT          NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO subscription_plans (name, price_usd_month, downloads_per_day, has_ads, api_access, features) VALUES
    ('free',       0.00,  5,    TRUE,  FALSE, '{"hd": false, "carousel": true, "history": false}'),
    ('pro',        4.99,  NULL, FALSE, TRUE,  '{"hd": true, "carousel": true, "history": true, "api_keys": 3}'),
    ('enterprise', 29.99, NULL, FALSE, TRUE,  '{"hd": true, "carousel": true, "history": true, "api_keys": 20, "priority_queue": true}');

INSERT INTO ad_slots (slot_name, ad_unit_id, active, show_from_download_n) VALUES
    ('banner_top',    'ca-pub-XXXXXXXX/banner_top',    TRUE, 2),
    ('banner_mid',    'ca-pub-XXXXXXXX/banner_mid',    TRUE, 2),
    ('interstitial',  'ca-pub-XXXXXXXX/interstitial',  TRUE, 2);
