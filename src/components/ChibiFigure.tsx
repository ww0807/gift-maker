import type { CSSProperties } from 'react'

interface ChibiFigureProps {
  variant: number
  muted?: boolean
}

const palettes = [
  { hair: '#28313B', outfit: '#778C9D', skin: '#FFD1B4' },
  { hair: '#7B5747', outfit: '#536C7A', skin: '#F2C29F' },
  { hair: '#453A45', outfit: '#B97C78', skin: '#FFD0B3' },
  { hair: '#B98936', outfit: '#2D485C', skin: '#E9B88F' },
]

export function ChibiFigure({ variant, muted = false }: ChibiFigureProps) {
  const palette = palettes[(variant - 1) % palettes.length]
  const style = muted ? ({ filter: 'grayscale(1)', opacity: 0.5 } as CSSProperties) : undefined

  return (
    <svg className="chibi-figure" viewBox="0 0 120 150" aria-label="Q 版人物预览" style={style}>
      <ellipse cx="60" cy="137" rx="35" ry="7" fill="rgba(27, 38, 37, .14)" />
      <rect x="35" y="86" width="50" height="49" rx="14" fill={palette.outfit} />
      <circle cx="60" cy="58" r="34" fill={palette.skin} />
      <path d="M28 57c2-29 23-42 32-42 19 0 34 16 35 42-9-11-18-16-31-16-14 0-24 5-36 16Z" fill={palette.hair} />
      <circle cx="48" cy="61" r="3.2" fill="#263330" />
      <circle cx="72" cy="61" r="3.2" fill="#263330" />
      <path d="M53 74c4 4 10 4 14 0" fill="none" stroke="#263330" strokeLinecap="round" strokeWidth="2" />
      <circle cx="39" cy="70" r="4" fill="#F2A7A0" opacity=".45" />
      <circle cx="81" cy="70" r="4" fill="#F2A7A0" opacity=".45" />
    </svg>
  )
}
