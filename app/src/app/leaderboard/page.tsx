export default function LeaderboardIndex() {
  return (
    <div className="max-w-6xl mx-auto py-8 text-white">
      <h1 className="text-3xl font-bold mb-4">Leaderboard</h1>
      <p className="text-sm text-gray-300 mb-6">Select a category below.</p>
      <ul className="space-y-3">
        <li><a className="text-purple-400 hover:underline" href="/leaderboard/encounter">Encounter Leaderboard</a></li>
        <li><a className="text-purple-400 hover:underline" href="/leaderboard/players">Players (WIP)</a></li>
      </ul>
    </div>
  );
}
