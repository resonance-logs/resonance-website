-- Add performance indexes for frequently queried fields
-- This migration optimizes queries for the Combat Data API

-- Encounters table indexes
CREATE INDEX IF NOT EXISTS idx_encounters_started_at ON encounters(started_at);
CREATE INDEX IF NOT EXISTS idx_encounters_scene_id ON encounters(scene_id);
CREATE INDEX IF NOT EXISTS idx_encounters_local_player_id ON encounters(local_player_id);

-- Attempts table indexes
CREATE INDEX IF NOT EXISTS idx_attempts_encounter_id ON attempts(encounter_id);
CREATE INDEX IF NOT EXISTS idx_attempts_attempt_index ON attempts(encounter_id, attempt_index);

-- Entity indexes
CREATE INDEX IF NOT EXISTS idx_entities_entity_id ON entities(entity_id);
CREATE INDEX IF NOT EXISTS idx_entities_class_id ON entities(class_id);
CREATE INDEX IF NOT EXISTS idx_entities_is_player ON entities(is_player);
CREATE INDEX IF NOT EXISTS idx_entities_last_seen ON entities(last_seen);

-- Actor encounter stats indexes
CREATE INDEX IF NOT EXISTS idx_actor_encounter_stats_encounter_id ON actor_encounter_stats(encounter_id);
CREATE INDEX IF NOT EXISTS idx_actor_encounter_stats_actor_id ON actor_encounter_stats(actor_id);
CREATE INDEX IF NOT EXISTS idx_actor_encounter_stats_actor_encounter ON actor_encounter_stats(actor_id, encounter_id);

-- Damage events indexes
CREATE INDEX IF NOT EXISTS idx_damage_events_encounter_id ON damage_events(encounter_id);
CREATE INDEX IF NOT EXISTS idx_damage_events_attacker_id ON damage_events(attacker_id);
CREATE INDEX IF NOT EXISTS idx_damage_events_timestamp ON damage_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_damage_events_encounter_attempt ON damage_events(encounter_id, attempt_index);
CREATE INDEX IF NOT EXISTS idx_damage_events_skill_id ON damage_events(skill_id);

-- Heal events indexes
CREATE INDEX IF NOT EXISTS idx_heal_events_encounter_id ON heal_events(encounter_id);
CREATE INDEX IF NOT EXISTS idx_heal_events_healer_id ON heal_events(healer_id);
CREATE INDEX IF NOT EXISTS idx_heal_events_timestamp ON heal_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_heal_events_encounter_attempt ON heal_events(encounter_id, attempt_index);
CREATE INDEX IF NOT EXISTS idx_heal_events_skill_id ON heal_events(skill_id);

-- Death events indexes
CREATE INDEX IF NOT EXISTS idx_death_events_encounter_id ON death_events(encounter_id);
CREATE INDEX IF NOT EXISTS idx_death_events_actor_id ON death_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_death_events_timestamp ON death_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_death_events_encounter_attempt ON death_events(encounter_id, attempt_index);

-- Damage skill stats indexes
CREATE INDEX IF NOT EXISTS idx_damage_skill_stats_encounter_id ON damage_skill_stats(encounter_id);
CREATE INDEX IF NOT EXISTS idx_damage_skill_stats_attacker_id ON damage_skill_stats(attacker_id);
CREATE INDEX IF NOT EXISTS idx_damage_skill_stats_skill_id ON damage_skill_stats(skill_id);
CREATE INDEX IF NOT EXISTS idx_damage_skill_stats_encounter_attacker ON damage_skill_stats(encounter_id, attacker_id);
CREATE INDEX IF NOT EXISTS idx_damage_skill_stats_encounter_skill ON damage_skill_stats(encounter_id, skill_id);

-- Heal skill stats indexes
CREATE INDEX IF NOT EXISTS idx_heal_skill_stats_encounter_id ON heal_skill_stats(encounter_id);
CREATE INDEX IF NOT EXISTS idx_heal_skill_stats_healer_id ON heal_skill_stats(healer_id);
CREATE INDEX IF NOT EXISTS idx_heal_skill_stats_skill_id ON heal_skill_stats(skill_id);
CREATE INDEX IF NOT EXISTS idx_heal_skill_stats_encounter_healer ON heal_skill_stats(encounter_id, healer_id);
CREATE INDEX IF NOT EXISTS idx_heal_skill_stats_encounter_skill ON heal_skill_stats(encounter_id, skill_id);

-- Encounter bosses indexes
CREATE INDEX IF NOT EXISTS idx_encounter_bosses_encounter_id ON encounter_bosses(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounter_bosses_monster_name ON encounter_bosses(monster_name);
