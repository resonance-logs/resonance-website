// "use client";

// import { useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import Image from "next/image";
// import { EncounterRowDTO, fetchEncounters } from "@/api/encounter/encounter";
// import { getClassIconName } from "@/lib/classIcon";

// interface DashboardEncounterPreview {
//   encounter: EncounterRowDTO;
//   dps: number;
//   duration: string;
// }

// export default function LeaderboardIndex() {
//   const [encounters, setEncounters] = useState<EncounterRowDTO[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     fetchEncounters({ limit: 50, orderBy: "dps", sort: "desc" })
//       .then((data) => {
//         setEncounters(data.rows ?? []);
//         setError(null);
//       })
//       .catch((err: unknown) => {
//         console.error("Failed to load leaderboard dashboard", err);
//         setError("Unable to load leaderboard data. Please try again later.");
//       })
//       .finally(() => setLoading(false));
//   }, []);

//   const encounterHighlights = useMemo<DashboardEncounterPreview[]>(() => {
//     return (encounters ?? []).slice(0, 3).map((encounter) => {
//       const durationSec = Math.max(1, Math.floor((encounter.durationMs ?? 0) / 1000));
//       const minutes = Math.floor(durationSec / 60);
//       const seconds = (durationSec % 60).toString().padStart(2, "0");
//       return {
//         encounter,
//         dps: Math.round((encounter.totalDmg ?? 0) / durationSec),
//         duration: `${minutes}:${seconds}`,
//       };
//     });
//   }, [encounters]);

//   const topPlayers = useMemo(() => {
//     if (!encounters.length) return [];
//     return aggregatePlayersFromEncounters(encounters).slice(0, 3);
//   }, [encounters]);

//   return (
//     <div className="max-w-6xl mx-auto py-10 text-white">
//       <div className="mb-8">
//         <h1 className="text-4xl font-semibold tracking-tight">Raid Analytics Hub</h1>
//         <p className="mt-2 text-gray-400 max-w-2xl">
//           Dive into the most recent Resonance encounters and player standouts. Compare teams, celebrate top parses,
//           and jump straight into detailed reports with a single click.
//         </p>
//       </div>

//       {error && (
//         <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
//           {error}
//         </div>
//       )}

//       <div className="grid gap-6 lg:grid-cols-2">
//         <section className="relative overflow-hidden rounded-2xl border border-gray-800/70 bg-linear-to-br from-gray-900/90 via-gray-900 to-gray-900/60 p-6 shadow-lg">
//           <div className="flex items-center justify-between gap-4">
//             <div>
//               <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Encounters</p>
//               <h2 className="mt-2 text-2xl font-semibold">Signature Clears</h2>
//               <p className="mt-1 text-sm text-gray-400">
//                 Live feed of the highest-performing teams in the last {encounters.length ? "few" : ""} uploads.
//               </p>
//             </div>
//             <Link
//               href="/leaderboard/encounter"
//               className="shrink-0 rounded-full border border-purple-500/40 px-4 py-2 text-sm font-medium text-purple-300 transition hover:border-purple-500 hover:text-purple-200"
//             >
//               View all
//             </Link>
//           </div>

//           <div className="mt-6 space-y-4">
//             {loading ? (
//               <div className="h-32 animate-pulse rounded-xl bg-gray-800/60" />
//             ) : encounterHighlights.length === 0 ? (
//               <p className="text-sm text-gray-500">No encounters available yet.</p>
//             ) : (
//               encounterHighlights.map(({ encounter, dps, duration }, idx) => (
//                 <Link
//                   key={encounter.id ?? idx}
//                   href={`/leaderboard/encounter/${encounter.id}`}
//                   className="group flex items-center justify-between gap-4 rounded-xl border border-gray-800/80 bg-gray-900/60 px-4 py-3 transition hover:border-purple-500/40 hover:bg-gray-900"
//                 >
//                   <div className="flex items-center gap-4">
//                     <div
//                       className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-gray-900 ${
//                         idx === 0
//                           ? "bg-linear-to-br from-yellow-300 to-amber-400"
//                           : idx === 1
//                           ? "bg-linear-to-br from-gray-200 to-gray-400"
//                           : "bg-linear-to-br from-amber-600 to-amber-700"
//                       }`}
//                     >
//                       {idx + 1}
//                     </div>
//                     <div>
//                       <p className="text-base font-medium text-white group-hover:text-purple-200">
//                         {encounter.sceneName ?? "Unknown Scene"}
//                       </p>
//                       <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
//                         <span className="rounded-full border border-gray-700/80 px-2 py-0.5 uppercase tracking-wide text-gray-300">
//                           {encounter.team ?? "Team"}
//                         </span>
//                         <span>{new Date(encounter.startedAtMs).toLocaleDateString()}</span>
//                         <span>{duration}</span>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-lg font-semibold text-purple-300">{dps.toLocaleString()} DPS</p>
//                     <p className="text-xs text-gray-500">Total damage {(encounter.totalDmg ?? 0).toLocaleString()}</p>
//                   </div>
//                 </Link>
//               ))
//             )}
//           </div>
//         </section>

//         <section className="relative overflow-hidden rounded-2xl border border-gray-800/70 bg-linear-to-br from-purple-900/20 via-gray-900 to-gray-900/70 p-6 shadow-lg">
//           <div className="flex items-center justify-between gap-4">
//             <div>
//               <p className="text-sm uppercase tracking-[0.3em] text-purple-400">Players</p>
//               <h2 className="mt-2 text-2xl font-semibold">MVP Highlights</h2>
//               <p className="mt-1 text-sm text-gray-400">
//                 Standout performers ranked by average DPS across their most recent encounters.
//               </p>
//             </div>
//             <Link
//               href="/leaderboard/players"
//               className="shrink-0 rounded-full border border-purple-500/40 px-4 py-2 text-sm font-medium text-purple-300 transition hover:border-purple-500 hover:text-purple-200"
//             >
//               Explore players
//             </Link>
//           </div>

//           <div className="mt-6 space-y-4">
//             {loading ? (
//               <div className="h-32 animate-pulse rounded-xl bg-gray-800/60" />
//             ) : topPlayers.length === 0 ? (
//               <p className="text-sm text-gray-500">No player records aggregated yet.</p>
//             ) : (
//               topPlayers.map((player) => (
//                 <Link
//                   key={player.actorId}
//                   href="/leaderboard/players"
//                   className="group flex items-center justify-between gap-4 rounded-xl border border-purple-400/10 bg-gray-900/60 px-4 py-3 transition hover:border-purple-500/40 hover:bg-gray-900"
//                 >
//                   <div className="flex items-center gap-4">
//                     <div className="relative h-11 w-11 overflow-hidden rounded-full border border-purple-400/40 bg-gray-800">
//                       <Image
//                         src={`/images/classes/${getClassIconName(player.classId)}`}
//                         alt={player.name ?? "Player"}
//                         fill
//                         sizes="44px"
//                         className="object-cover"
//                       />
//                     </div>
//                     <div>
//                       <p className="text-base font-medium text-white group-hover:text-purple-200">
//                         {player.name ?? `Player #${player.actorId}`}
//                       </p>
//                       <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
//                         <span>{player.encounterCount} encounters</span>
//                         <span>Best {player.bestDps.toLocaleString()} DPS</span>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-lg font-semibold text-purple-300">{player.averageDps.toLocaleString()} DPS</p>
//                     <p className="text-xs text-gray-500">Total dmg {player.totalDamage.toLocaleString()}</p>
//                   </div>
//                 </Link>
//               ))
//             )}
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// }
