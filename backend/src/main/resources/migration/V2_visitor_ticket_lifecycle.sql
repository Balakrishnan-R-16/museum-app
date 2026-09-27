-- ============================================================
-- V2: Visitor Account & Ticket Lifecycle Migration
-- Run against PostgreSQL. Non-destructive ALTER statements.
-- ============================================================

-- ── 1. Evolve users → visitors ──────────────────────────────
-- Add new columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_subject VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Make password nullable (Google-only users won't have one)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Make phone nullable
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Add unique index on google_subject for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_subject ON users(google_subject) WHERE google_subject IS NOT NULL;

-- ── 2. Evolve tickets table ─────────────────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS visitor_id BIGINT REFERENCES users(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS booked_date DATE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS slot_start TIME;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS slot_end TIME;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS total_visitors INTEGER DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS admitted_visitors INTEGER DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS public_token VARCHAR(64);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS refund_status VARCHAR(30);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Make phone nullable on tickets
ALTER TABLE tickets ALTER COLUMN phone DROP NOT NULL;

-- Add index on public_token for sharing
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_public_token ON tickets(public_token) WHERE public_token IS NOT NULL;

-- Add index on visitor_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_tickets_visitor_id ON tickets(visitor_id);

-- Drop the old status CHECK constraint if it exists and add expanded one
-- (PostgreSQL syntax — safe to run multiple times)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE constraint_name = 'chk_ticket_status' AND table_name = 'tickets') THEN
        ALTER TABLE tickets DROP CONSTRAINT chk_ticket_status;
    END IF;
END $$;

ALTER TABLE tickets ADD CONSTRAINT chk_ticket_status
    CHECK (status IN ('PENDING','ACTIVE','PARTIALLY_USED','USED','CANCELLED','EXPIRED','REFUNDED','RESCHEDULED'));

-- Backfill total_visitors for existing tickets
UPDATE tickets SET total_visitors = COALESCE(adults, 0) + COALESCE(children, 0) WHERE total_visitors = 0 OR total_visitors IS NULL;

-- Backfill booked_date from created_at for existing tickets
UPDATE tickets SET booked_date = CAST(created_at AS DATE) WHERE booked_date IS NULL;

-- ── 3. Ticket Entry Audit table ─────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_entry_audit (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    staff_user VARCHAR(255),
    entry_count INTEGER NOT NULL CHECK (entry_count > 0),
    prior_admitted INTEGER NOT NULL DEFAULT 0,
    resulting_admitted INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entry_audit_ticket ON ticket_entry_audit(ticket_id);

-- ── 4. Refund Records table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS refund_records (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    payment_reference VARCHAR(255),
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_percentage INTEGER,
    refund_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    provider_response TEXT,
    idempotency_key VARCHAR(64) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refund_ticket ON refund_records(ticket_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_idempotency ON refund_records(idempotency_key) WHERE idempotency_key IS NOT NULL;
