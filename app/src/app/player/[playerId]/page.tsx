import type { Metadata } from 'next'
import PlayerProfileClient from './client'

// Class name mapping for metadata
const CLASS_MAP: Record<number, string> = {
  1: 'Fist',
  2: 'Blade',
  3: 'Pistol',
  4: 'Conductor',
  5: 'Spear',
  6: 'Shield',
  11: 'Fist Healer',
  21: 'Blade Tank',
  22: 'Blade DPS',
  31: 'Pistol Healer',
  32: 'Pistol DPS',
  41: 'Conductor Healer',
  42: 'Conductor DPS',
  51: 'Spear Healer',
  52: 'Spear DPS',
  61: 'Shield Tank',
  62: 'Shield DPS',
}

// Fetch player data server-side for metadata
async function getPlayerData(playerId: string) {
  const baseUrl = process.env.WEBSITE_URL || process.env.NEXT_PUBLIC_REVERSE_PROXY_URL?.replace('/api', '') || 'https://bpsr.app'
  try {
    const res = await fetch(`${baseUrl}/api/player/by-player-id/${playerId}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ playerId: string }>
}): Promise<Metadata> {
  const { playerId } = await params
  const player = await getPlayerData(playerId)

  const charBase = player?.charBase
  const charName = charBase?.name || 'Unknown Player'
  const currentClassId = player?.professionList?.CurProfessionId
  const currentClassName = currentClassId ? (CLASS_MAP[currentClassId] || `Class ${currentClassId}`) : null

  // Calculate stats for description
  const combatPower = player?.fightPoint?.TotalFightPoint?.toLocaleString() || 'N/A'
  const playtime = charBase?.totalOnlineTime
    ? `${(parseInt(charBase.totalOnlineTime, 10) / 3600).toFixed(1)} hrs`
    : 'N/A'

  // Calculate master mode score
  const masterModeScore = (() => {
    const mm = player?.masterModeDungeonInfo?.MasterModeDungeonInfo?.[1]?.MasterModeDiffInfo || {}
    let total = 0
    Object.values(mm).forEach((val: unknown) => {
      const v = val as { DungeonInfo?: Record<string, { Score?: number }> }
      if (!v.DungeonInfo) return
      const entries = Object.entries(v.DungeonInfo)
      if (entries.length > 0) {
        const maxEntry = entries.reduce((max, curr) =>
          Number(curr[0]) > Number(max[0]) ? curr : max
        )
        total += maxEntry[1].Score || 0
      }
    })
    return total
  })()

  const title = currentClassName
    ? `${charName} - ${currentClassName} | Resonance Logs`
    : `${charName} | Resonance Logs`

  const description = masterModeScore > 0
    ? `⚔️ Combat Power: ${combatPower} | 🏆 Master Score: ${masterModeScore.toLocaleString()} | ⏱️ Playtime: ${playtime}`
    : `⚔️ Combat Power: ${combatPower} | ⏱️ Playtime: ${playtime}`

  return {
    title,
    description,
    openGraph: {
      title: charName,
      description,
      type: 'profile',
      siteName: 'Resonance Logs',
    },
    twitter: {
      card: 'summary_large_image',
      title: charName,
      description,
    },
  }
}

export default function PlayerProfilePage() {
  return <PlayerProfileClient />
}
