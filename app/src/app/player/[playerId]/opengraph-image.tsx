import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Player Profile'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Fetch player data from the backend API
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

// Class name mapping
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

function formatPlaytime(totalOnlineTime: string | undefined): string {
  if (!totalOnlineTime) return 'N/A'
  const hours = parseInt(totalOnlineTime, 10) / 3600
  return `${hours.toFixed(1)} hrs`
}

export default async function Image({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const player = await getPlayerData(playerId)

  // Calculate stats from player data
  const charBase = player?.charBase
  const charName = charBase?.name || 'Unknown Player'
  const charId = charBase?.charId || playerId
  const playtime = formatPlaytime(charBase?.totalOnlineTime)
  const combatPower = player?.fightPoint?.TotalFightPoint?.toLocaleString() || '—'
  const avatarUrl = charBase?.avatarInfo?.HalfBody?.Url || charBase?.avatarInfo?.Profile?.Url

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

  // Get profession info
  const profList = (player?.professionList?.ProfessionList || {}) as Record<string, unknown>
  const profKeys = Object.keys(profList).filter((k) => !isNaN(parseInt(k, 10)))
  const classCount = profKeys.length

  // Get imagine count
  const aoyiEntries = Object.entries(player?.professionList?.AoyiSkillInfoMap || {})
  const imagineCount = aoyiEntries.length

  // Get current class name
  const currentClassId = player?.professionList?.CurProfessionId
  const currentClassName = currentClassId ? (CLASS_MAP[currentClassId] || `Class ${currentClassId}`) : ''

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #1a0a2e 0%, #16082a 25%, #0d0620 50%, #0a0518 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial gradient overlay like the page */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at top, rgba(124, 58, 237, 0.35), transparent 60%)',
            opacity: 0.7,
          }}
        />

        {/* Left side - Character Image */}
        <div
          style={{
            display: 'flex',
            width: '340px',
            background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(30, 58, 138, 0.3) 50%, rgba(15, 23, 42, 0.4) 100%)',
            padding: '24px',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '24px',
            margin: '24px',
            position: 'relative',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={charName}
              width={300}
              height={500}
              style={{
                objectFit: 'cover',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            />
          ) : (
            <div
              style={{
                width: '300px',
                height: '400px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                fontSize: '24px',
              }}
            >
              No Image
            </div>
          )}
          {/* Gradient overlay on image */}
          <div
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              right: '24px',
              height: '120px',
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)',
              borderRadius: '0 0 20px 20px',
            }}
          />
        </div>

        {/* Right side - Stats */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            padding: '40px 40px 40px 16px',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Vitals header */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>
            <span style={{ color: '#e9d5ff', fontSize: '14px', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
              VITALS
            </span>
            <span style={{ color: 'white', fontSize: '28px', fontWeight: 600 }}>
              Account Snapshot
            </span>
          </div>

          {/* Name card - matching the purple border style from page */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px 32px',
              borderRadius: '20px',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              marginBottom: '20px',
            }}
          >
            <span style={{ color: 'white', fontSize: '36px', fontWeight: 'bold' }}>
              {charName}
            </span>
            <span style={{ color: '#e9d5ff', fontSize: '16px', marginTop: '4px' }}>
              {currentClassName ? `${currentClassName} · ` : ''}Character ID · {charId}
            </span>
          </div>

          {/* Stats grid - 2x2 like the page */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {/* Combat Power */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 45%',
                padding: '18px 22px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.4) 0%, rgba(59, 130, 246, 0.2) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span style={{ color: '#d1d5db', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                COMBAT POWER
              </span>
              <span style={{ color: 'white', fontSize: '30px', fontWeight: 600, marginTop: '6px' }}>
                {combatPower}
              </span>
            </div>

            {/* Master Score */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 45%',
                padding: '18px 22px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(168, 85, 247, 0.1) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span style={{ color: '#d1d5db', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                MASTER SCORE
              </span>
              <span style={{ color: 'white', fontSize: '30px', fontWeight: 600, marginTop: '6px' }}>
                {masterModeScore > 0 ? masterModeScore.toLocaleString() : '—'}
              </span>
            </div>

            {/* Classes */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 45%',
                padding: '18px 22px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(6, 182, 212, 0.2) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span style={{ color: '#d1d5db', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                CLASSES
              </span>
              <span style={{ color: 'white', fontSize: '30px', fontWeight: 600, marginTop: '6px' }}>
                {classCount}
              </span>
            </div>

            {/* Imagines */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 45%',
                padding: '18px 22px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(249, 115, 22, 0.1) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span style={{ color: '#d1d5db', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                IMAGINES
              </span>
              <span style={{ color: 'white', fontSize: '30px', fontWeight: 600, marginTop: '6px' }}>
                {imagineCount}
              </span>
            </div>
          </div>

          {/* Playtime badge */}
          <div style={{ display: 'flex', marginTop: '16px', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 18px',
                borderRadius: '18px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              <span style={{ color: '#86efac', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                PLAYTIME
              </span>
              <span style={{ color: 'white', fontSize: '18px', fontWeight: 600, marginLeft: '12px' }}>
                {playtime}
              </span>
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: '#a855f7', fontSize: '20px', fontWeight: 'bold' }}>
            Resonance Logs
          </span>
          <span style={{ color: '#6b7280', fontSize: '16px' }}>
            • bpsr.app
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
