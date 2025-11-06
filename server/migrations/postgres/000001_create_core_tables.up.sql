-- Create core tables for resonance website
CREATE TABLE IF NOT EXISTS encounters (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  local_player_id BIGINT,
  total_dmg BIGINT NOT NULL DEFAULT 0,
  total_heal BIGINT NOT NULL DEFAULT 0,
  scene_id TEXT,
  scene_name TEXT
);

CREATE TABLE IF NOT EXISTS attempts (
  id BIGSERIAL PRIMARY KEY,
  encounter_id BIGINT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  attempt_index INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  reason TEXT,
  boss_hp_start BIGINT,
  boss_hp_end BIGINT,
  total_deaths INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS encounter_bosses (
  id BIGSERIAL PRIMARY KEY,
  encounter_id BIGINT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  monster_name TEXT NOT NULL,
  hits BIGINT NOT NULL DEFAULT 0,
  total_damage BIGINT NOT NULL DEFAULT 0,
  max_hp BIGINT,
  is_defeated BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS entities (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT,
  name TEXT,
  class_id BIGINT,
  class_spec BIGINT,
  ability_score BIGINT,
  level INT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  attributes JSONB
);

CREATE TABLE IF NOT EXISTS actor_encounter_stats (
  id BIGSERIAL PRIMARY KEY,
  encounter_id BIGINT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  actor_id BIGINT NOT NULL,
  class_spec BIGINT,
  damage_dealt BIGINT NOT NULL DEFAULT 0,
  heal_dealt BIGINT NOT NULL DEFAULT 0,
  damage_taken BIGINT NOT NULL DEFAULT 0,
  hits_dealt BIGINT NOT NULL DEFAULT 0,
  hits_heal BIGINT NOT NULL DEFAULT 0,
  hits_taken BIGINT NOT NULL DEFAULT 0,
  name TEXT,
  class_id BIGINT,
  ability_score BIGINT,
  level INT,
  is_player BOOLEAN NOT NULL DEFAULT true,
  is_local_player BOOLEAN NOT NULL DEFAULT false,
  attributes JSONB,
  revives BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS damage_events (
  id BIGSERIAL PRIMARY KEY,
  encounter_id BIGINT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  attacker_id BIGINT NOT NULL,
  defender_id BIGINT,
  skill_id BIGINT,
  value BIGINT NOT NULL,
  is_crit BOOLEAN NOT NULL DEFAULT false,
  is_lucky BOOLEAN NOT NULL DEFAULT false,
  hp_loss BIGINT NOT NULL DEFAULT 0,
  shield_loss BIGINT NOT NULL DEFAULT 0,
  is_boss BOOLEAN NOT NULL DEFAULT false,
  monster_name TEXT,
  defender_max_hp BIGINT,
  attempt_index INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS heal_events (
  id BIGSERIAL PRIMARY KEY,
  encounter_id BIGINT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  healer_id BIGINT NOT NULL,
  target_id BIGINT,
  skill_id BIGINT,
  value BIGINT NOT NULL,
  is_crit BOOLEAN NOT NULL DEFAULT false,
  is_lucky BOOLEAN NOT NULL DEFAULT false,
  attempt_index INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS death_events (
  id BIGSERIAL PRIMARY KEY,
  encounter_id BIGINT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  actor_id BIGINT NOT NULL,
  killer_id BIGINT,
  skill_id BIGINT,
  is_local_player BOOLEAN NOT NULL DEFAULT false,
  attempt_index INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS damage_skill_stats (
  id BIGSERIAL PRIMARY KEY,
  encounter_id BIGINT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  attacker_id BIGINT NOT NULL,
  defender_id BIGINT,
  skill_id BIGINT NOT NULL,
  hits BIGINT NOT NULL DEFAULT 0,
  total_value BIGINT NOT NULL DEFAULT 0,
  crit_hits BIGINT NOT NULL DEFAULT 0,
  lucky_hits BIGINT NOT NULL DEFAULT 0,
  crit_total BIGINT NOT NULL DEFAULT 0,
  lucky_total BIGINT NOT NULL DEFAULT 0,
  hp_loss_total BIGINT NOT NULL DEFAULT 0,
  shield_loss_total BIGINT NOT NULL DEFAULT 0,
  hit_details JSONB,
  monster_name TEXT
);

CREATE TABLE IF NOT EXISTS heal_skill_stats (
  id BIGSERIAL PRIMARY KEY,
  encounter_id BIGINT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  healer_id BIGINT NOT NULL,
  target_id BIGINT,
  skill_id BIGINT NOT NULL,
  hits BIGINT NOT NULL DEFAULT 0,
  total_value BIGINT NOT NULL DEFAULT 0,
  crit_hits BIGINT NOT NULL DEFAULT 0,
  lucky_hits BIGINT NOT NULL DEFAULT 0,
  crit_total BIGINT NOT NULL DEFAULT 0,
  lucky_total BIGINT NOT NULL DEFAULT 0,
  heal_details JSONB,
  monster_name TEXT
);
