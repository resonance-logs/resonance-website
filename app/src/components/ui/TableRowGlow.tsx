import React, { useEffect, useState } from 'react'
import { getClassColor } from '../../utils/classData'

/**
 * TableRowGlow
 * Renders a subtle glowing overlay for a table row based on class color and percentage width.
 * Designed to be used inside a `<tr>` so the two `<td>` elements overlay the row.
 */
interface Props {
  className: string
  percentage: number
}

export default function TableRowGlow({ className, percentage }: Props) {
  const classColor = getClassColor(className)

  const gradient = `linear-gradient(to top, ${classColor}, transparent), linear-gradient(to right, ${classColor} 0%, ${classColor} 70%, transparent 100%)`

  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    // Trigger the animation on mount. Small timeout ensures initial paint
    // without the glow, then it transitions to its target width/opacity.
    const t = setTimeout(() => setAnimated(true), 30)
    return () => clearTimeout(t)
  }, [])

  const borderStyle: React.CSSProperties = {
    backgroundColor: classColor,
    width: animated ? `${percentage}%` : '0%',
    boxShadow: `0 0 4px ${classColor}, 0 0 8px ${classColor}`,
    transition: 'width 2000ms cubic-bezier(.2,.9,.3,1), box-shadow 2000ms cubic-bezier(.2,.9,.3,1)',
  }

  // Render non-table elements — the parent <td> (or <tr>) should be `relative` so
  // these absolute overlays sit on top of the row without creating extra table cells.
  return (
    <>
      <div
        className="absolute left-0 bottom-0 top-0 h-full pointer-events-none"
        style={{
          background: gradient,
          width: animated ? `${percentage}%` : '0%',
          opacity: animated ? 0.15 : 0,
          transition: 'width 2000ms cubic-bezier(.2,.9,.3,1), opacity 2000ms cubic-bezier(.2,.9,.3,1)',
        }}
        aria-hidden
      />

      <div
        className="absolute left-0 bottom-0 h-0.5 pointer-events-none z-20"
        style={borderStyle}
        aria-hidden
      />
    </>
  )
}
