import { describe, expect, it } from 'vitest'
import { EDITABLE_PANEL_IDS, FLAPS, PANELS, PAPER, TONGUES, panelSafeRect } from './structure-v1'

describe('structure-v1', () => {
  it('defines an A3 landscape drawing coordinate system in millimetres', () => {
    expect(PAPER).toMatchObject({ width: 420, height: 297, bleed: 3 })
    expect(PANELS.front).toMatchObject({ x: 73.1, y: 93.5, width: 75, height: 110 })
  })

  it('limits editable content to the four vertical box faces', () => {
    expect(EDITABLE_PANEL_IDS).toEqual(['front', 'right', 'back', 'left'])
    expect(PANELS.glue.editable).toBe(false)
    expect(PANELS.top).toMatchObject({ x: 73.1, y: 18.5, width: 75, height: 75, editable: false })
    expect(PANELS.bottom).toMatchObject({ x: 223.1, y: 203.5, width: 75, height: 75, editable: false })
    expect(Object.keys(FLAPS)).toHaveLength(4)
    expect(FLAPS.top_right_dust.points).toContain('148.1,93.5')
  })

  it('keeps the printable safe area inside every face', () => {
    const safe = panelSafeRect(PANELS.front)
    expect(safe).toEqual({ x: 78.1, y: 98.5, width: 65, height: 100 })
  })

  it('fits top and bottom primary closure panels with their locking tongues inside A3', () => {
    expect(TONGUES.top.y).toBeGreaterThanOrEqual(0)
    expect(TONGUES.bottom.y + TONGUES.bottom.height).toBeLessThanOrEqual(PAPER.height)
  })
})
