import { Minus, Plus, RotateCcw } from 'lucide-react'
import { type PointerEvent, type ReactNode, useRef, useState } from 'react'

interface CanvasViewportProps {
  children: ReactNode
  onBlankClick?: () => void
}

const MIN_ZOOM = 55
const MAX_ZOOM = 150
const DEFAULT_ZOOM = 100

export function CanvasViewport({ children, onBlankClick }: CanvasViewportProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null)

  const shouldPan = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false
    return !target.closest('button, input, textarea, select, .moveable-control-box, .editor-target, .svg-user-element')
  }

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!shouldPan(event.target)) return
    onBlankClick?.()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
  }

  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    if (!start || start.pointerId !== event.pointerId) return
    setOffset({ x: start.offsetX + event.clientX - start.x, y: start.offsetY + event.clientY - start.y })
  }

  const stopPan = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current?.pointerId === event.pointerId) dragStart.current = null
  }

  const updateZoom = (value: number) => setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)))

  return (
    <div className="canvas-viewport" onPointerCancel={stopPan} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan}>
      <div className="canvas-content" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom / 100})` }}>
        {children}
      </div>
      <div className="canvas-zoom-controls" onPointerDown={(event) => event.stopPropagation()}>
        <button aria-label="缩小画布" disabled={zoom <= MIN_ZOOM} onClick={() => updateZoom(zoom - 10)} type="button"><Minus size={14} /></button>
        <input aria-label="画布缩放" max={MAX_ZOOM} min={MIN_ZOOM} onChange={(event) => updateZoom(Number(event.target.value))} step={5} type="range" value={zoom} />
        <button aria-label="放大画布" disabled={zoom >= MAX_ZOOM} onClick={() => updateZoom(zoom + 10)} type="button"><Plus size={14} /></button>
        <span>{zoom}%</span>
        <button aria-label="还原画布位置与缩放" onClick={() => { setZoom(DEFAULT_ZOOM); setOffset({ x: 0, y: 0 }) }} type="button"><RotateCcw size={13} /></button>
      </div>
    </div>
  )
}
