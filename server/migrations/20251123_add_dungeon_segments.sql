-- Migration: add dungeon_segments table
-- Run manually via golang-migrate or equivalent

BEGIN;

CREATE TABLE IF NOT EXISTS dungeon_segments (
    id BIGSERIAL PRIMARY KEY,
    encounter_id BIGINT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    segment_type VARCHAR(32) NOT NULL,
    boss_entity_id BIGINT,
    boss_monster_type_id BIGINT,
    boss_name VARCHAR(255),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    total_damage BIGINT NOT NULL DEFAULT 0,
    hit_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dungeon_segments_encounter_id ON dungeon_segments (encounter_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_segments_type ON dungeon_segments (segment_type);

COMMIT;
