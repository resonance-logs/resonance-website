-- Drop performance indexes
-- Encounter bosses indexes
DROP INDEX IF EXISTS idx_encounter_bosses_encounter_id;
DROP INDEX IF EXISTS idx_encounter_bosses_monster_name;

-- Heal skill stats indexes
DROP INDEX IF EXISTS idx_heal_skill_stats_encounter_skill;
DROP INDEX IF EXISTS idx_heal_skill_stats_encounter_healer;
DROP INDEX IF EXISTS idx_heal_skill_stats_skill_id;
DROP INDEX IF EXISTS idx_heal_skill_stats_healer_id;
DROP INDEX IF EXISTS idx_heal_skill_stats_encounter_id;

-- Damage skill stats indexes
DROP INDEX IF EXISTS idx_damage_skill_stats_encounter_skill;
DROP INDEX IF EXISTS idx_damage_skill_stats_encounter_attacker;
DROP INDEX IF EXISTS idx_damage_skill_stats_skill_id;
DROP INDEX IF EXISTS idx_damage_skill_stats_attacker_id;
DROP INDEX IF EXISTS idx_damage_skill_stats_encounter_id;

-- Death events indexes
DROP INDEX IF EXISTS idx_death_events_encounter_attempt;
DROP INDEX IF EXISTS idx_death_events_timestamp;
DROP INDEX IF EXISTS idx_death_events_actor_id;
DROP INDEX IF EXISTS idx_death_events_encounter_id;

-- Heal events indexes
DROP INDEX IF EXISTS idx_heal_events_skill_id;
DROP INDEX IF EXISTS idx_heal_events_encounter_attempt;
DROP INDEX IF EXISTS idx_heal_events_timestamp;
DROP INDEX IF EXISTS idx_heal_events_healer_id;
DROP INDEX IF EXISTS idx_heal_events_encounter_id;

-- Damage events indexes
DROP INDEX IF EXISTS idx_damage_events_skill_id;
DROP INDEX IF EXISTS idx_damage_events_encounter_attempt;
DROP INDEX IF EXISTS idx_damage_events_timestamp;
DROP INDEX IF EXISTS idx_damage_events_attacker_id;
DROP INDEX IF EXISTS idx_damage_events_encounter_id;

-- Actor encounter stats indexes
DROP INDEX IF EXISTS idx_actor_encounter_stats_actor_encounter;
DROP INDEX IF EXISTS idx_actor_encounter_stats_actor_id;
DROP INDEX IF EXISTS idx_actor_encounter_stats_encounter_id;

-- Entity indexes
DROP INDEX IF EXISTS idx_entities_last_seen;
DROP INDEX IF EXISTS idx_entities_is_player;
DROP INDEX IF EXISTS idx_entities_class_id;
DROP INDEX IF EXISTS idx_entities_entity_id;

-- Attempts table indexes
DROP INDEX IF EXISTS idx_attempts_attempt_index;
DROP INDEX IF EXISTS idx_attempts_encounter_id;

-- Encounters table indexes
DROP INDEX IF EXISTS idx_encounters_local_player_id;
DROP INDEX IF EXISTS idx_encounters_scene_id;
DROP INDEX IF EXISTS idx_encounters_started_at;
