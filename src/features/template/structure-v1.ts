export const PAPER = {
  width: 420,
  height: 297,
  bleed: 3,
  safeInset: 5,
} as const

export type PanelId = 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom' | 'glue'
export type FlapId = 'top_right_dust' | 'top_left_dust' | 'bottom_right_dust' | 'bottom_left_dust'

export interface PanelRect {
  id: PanelId
  x: number
  y: number
  width: number
  height: number
  editable: boolean
}

export interface FlapSpec {
  id: FlapId
  points: string
  fold: readonly [number, number, number, number]
}

// All values are millimetres. This is the source of truth for both preview
// and A3 PDF export. The layout matches the approved tubular carton dieline:
// top attached to FRONT, bottom attached to BACK, side dust flaps, plus a
// 12 mm locking tongue on both primary closure panels.
export const PANELS: Record<PanelId, PanelRect> = {
  glue: { id: 'glue', x: 47, y: 93.5, width: 26.1, height: 110, editable: false },
  front: { id: 'front', x: 73.1, y: 93.5, width: 75, height: 110, editable: true },
  right: { id: 'right', x: 148.1, y: 93.5, width: 75, height: 110, editable: true },
  back: { id: 'back', x: 223.1, y: 93.5, width: 75, height: 110, editable: true },
  left: { id: 'left', x: 298.1, y: 93.5, width: 75, height: 110, editable: true },
  top: { id: 'top', x: 73.1, y: 18.5, width: 75, height: 75, editable: false },
  bottom: { id: 'bottom', x: 223.1, y: 203.5, width: 75, height: 75, editable: false },
}

export const TONGUES = {
  top: { x: 73.1, y: 6.5, width: 75, height: 12 },
  bottom: { x: 223.1, y: 278.5, width: 75, height: 12 },
} as const

const topY = PANELS.front.y
const bottomY = PANELS.front.y + PANELS.front.height
const dustDepth = 29.8
const dustInset = 9

function topDust(face: 'right' | 'left'): FlapSpec {
  const panel = PANELS[face]
  return {
    id: `top_${face}_dust` as FlapId,
    points: `${panel.x},${topY} ${panel.x + panel.width},${topY} ${panel.x + panel.width - dustInset},${topY - dustDepth} ${panel.x + dustInset},${topY - dustDepth}`,
    fold: [panel.x, topY, panel.x + panel.width, topY],
  }
}

function bottomDust(face: 'right' | 'left'): FlapSpec {
  const panel = PANELS[face]
  return {
    id: `bottom_${face}_dust` as FlapId,
    points: `${panel.x},${bottomY} ${panel.x + panel.width},${bottomY} ${panel.x + panel.width - dustInset},${bottomY + dustDepth} ${panel.x + dustInset},${bottomY + dustDepth}`,
    fold: [panel.x, bottomY, panel.x + panel.width, bottomY],
  }
}

export const FLAPS: Record<FlapId, FlapSpec> = {
  top_right_dust: topDust('right'),
  top_left_dust: topDust('left'),
  bottom_right_dust: bottomDust('right'),
  bottom_left_dust: bottomDust('left'),
}

export const EDITABLE_PANEL_IDS = ['front', 'right', 'back', 'left'] as const
export type EditablePanelId = (typeof EDITABLE_PANEL_IDS)[number]

export function panelSafeRect(panel: PanelRect) {
  return {
    x: panel.x + PAPER.safeInset,
    y: panel.y + PAPER.safeInset,
    width: panel.width - PAPER.safeInset * 2,
    height: panel.height - PAPER.safeInset * 2,
  }
}

export function isEditablePanelId(panelId: PanelId): panelId is EditablePanelId {
  return EDITABLE_PANEL_IDS.includes(panelId as EditablePanelId)
}

export const foldLines = [
  [PANELS.front.x, topY, PANELS.left.x + PANELS.left.width, topY],
  [PANELS.front.x, bottomY, PANELS.left.x + PANELS.left.width, bottomY],
  [PANELS.glue.x + PANELS.glue.width, topY, PANELS.glue.x + PANELS.glue.width, bottomY],
  [PANELS.right.x, topY, PANELS.right.x, bottomY],
  [PANELS.back.x, topY, PANELS.back.x, bottomY],
  [PANELS.left.x, topY, PANELS.left.x, bottomY],
  [PANELS.top.x, PANELS.top.y, PANELS.top.x + PANELS.top.width, PANELS.top.y],
  [PANELS.bottom.x, PANELS.bottom.y + PANELS.bottom.height, PANELS.bottom.x + PANELS.bottom.width, PANELS.bottom.y + PANELS.bottom.height],
] as const
