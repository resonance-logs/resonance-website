import React from 'react'
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

  const borderStyle: React.CSSProperties = {
    backgroundColor: classColor,
    width: `${percentage}%`,
    boxShadow: `0 0 4px ${classColor}, 0 0 8px ${classColor}`,
  }

  // Render non-table elements — the parent <td> (or <tr>) should be `relative` so
  // these absolute overlays sit on top of the row without creating extra table cells.
  return (
    <>
      <div
        className="absolute left-0 bottom-0 top-0 h-full pointer-events-none"
        style={{ background: gradient, width: `${percentage}%`, opacity: 0.15 }}
        aria-hidden
      />

      <div
        className="absolute left-0 bottom-0 h-[2px] pointer-events-none z-20"
        style={borderStyle}
        aria-hidden
      />
    </>
  )
}
