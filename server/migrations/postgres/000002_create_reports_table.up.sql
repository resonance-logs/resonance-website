-- Migration: create reports table to persist report metadata and fight summaries
CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    report_id TEXT NOT NULL UNIQUE,
    title TEXT,
    owner TEXT,
    start_time TIMESTAMPTZ NULL,
    end_time TIMESTAMPTZ NULL,
    fight_summaries JSONB NOT NULL DEFAULT '[]'::jsonb,
    fights JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_report_id ON reports(report_id);
