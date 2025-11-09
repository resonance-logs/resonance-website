"use client";
import { useEffect, useState } from "react";
import { fetchEncounterById, fetchEncounterSkill } from "@/api/encounter";
import { useParams } from "next/navigation";

interface ActorRow {
  actorId: number;
  name?: string;
  classId?: number;
  classSpec?: number;
  damageDealt: number;
  healDealt: number;
  damageTaken: number;
  abilityScore?: number;
}

export default function EncounterDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [encounter, setEncounter] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<{ actorId: number; skillId: number } | null>(null);
  const [skillData, setSkillData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchEncounterById(id)
      .then(setEncounter)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!expandedSkill || !id) return;
    fetchEncounterSkill(id, expandedSkill.skillId, { attackerId: expandedSkill.actorId })
      .then(setSkillData)
      .catch(() => setSkillData(null));
  }, [expandedSkill, id]);

  if (loading) return <div className="max-w-6xl mx-auto py-8 text-white">Loading…</div>;
  if (!encounter) return <div className="max-w-6xl mx-auto py-8 text-white">Encounter not found.</div>;

  const durationFmt = (() => {
    const ms = encounter.durationMs as number;
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  })();

  return (
    <div className="max-w-7xl mx-auto py-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encounter #{encounter.id}</h1>
        <a href="/leaderboard/encounter" className="text-purple-400 hover:underline text-sm">Back to Leaderboard</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Scene</div><div>{encounter.sceneName || '-'}</div></div>
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Duration</div><div>{durationFmt}</div></div>
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Total Damage</div><div>{encounter.totalDmg.toLocaleString()}</div></div>
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Total Healing</div><div>{encounter.totalHeal.toLocaleString()}</div></div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Players</h2>
      <div className="overflow-x-auto border border-gray-700 rounded-lg mb-8">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-2 py-2 text-left">Name</th>
              <th className="px-2 py-2 text-left">Class</th>
              <th className="px-2 py-2 text-left">Ability</th>
              <th className="px-2 py-2 text-left">Damage</th>
              <th className="px-2 py-2 text-left">DPS</th>
              <th className="px-2 py-2 text-left">Heal</th>
              <th className="px-2 py-2 text-left">HPS</th>
              <th className="px-2 py-2 text-left">Taken</th>
            </tr>
          </thead>
          <tbody>
            {encounter.actors.map((a: ActorRow) => {
              const dps = Math.round(a.damageDealt / Math.max(1, Math.floor(encounter.durationMs / 1000)));
              const hps = Math.round(a.healDealt / Math.max(1, Math.floor(encounter.durationMs / 1000)));
              return (
                <tr key={a.actorId} className="hover:bg-gray-800/40 cursor-pointer" onClick={() => setExpandedSkill({ actorId: a.actorId, skillId: 0 })}>
                  <td className="px-2 py-1">{a.name || 'Unknown'}</td>
                  <td className="px-2 py-1">{a.classId ?? '-'}</td>
                  <td className="px-2 py-1">{a.abilityScore ?? '-'}</td>
                  <td className="px-2 py-1">{a.damageDealt.toLocaleString()}</td>
                  <td className="px-2 py-1">{dps}</td>
                  <td className="px-2 py-1">{a.healDealt.toLocaleString()}</td>
                  <td className="px-2 py-1">{hps}</td>
                  <td className="px-2 py-1">{a.damageTaken.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {expandedSkill && skillData && (
        <div className="bg-gray-800/40 rounded p-4 mb-8">
          <h3 className="font-semibold mb-2 text-sm">Skill Breakdown (Skill ID {skillData.skillId})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div><span className="text-gray-400">Name:</span> {skillData.name}</div>
            <div><span className="text-gray-400">Total:</span> {skillData.totalValue.toLocaleString()}</div>
            <div><span className="text-gray-400">Hits:</span> {skillData.hits}</div>
            <div><span className="text-gray-400">Crit Hits:</span> {skillData.critHits}</div>
          </div>
        </div>
      )}
    </div>
  );
}
