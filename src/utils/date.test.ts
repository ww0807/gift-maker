import { describe, expect, it } from 'vitest'
import { contrastColor, getBoxDate, getCalendarCells } from './date'

describe('日历渲染工具', () => {
  it('按单盒日期解析日历时间', () => {
    expect(getBoxDate('2022-06-30').toISOString().slice(0, 10)).toBe('2022-06-30')
  })

  it('固定输出 6 行日历格', () => {
    expect(getCalendarCells(new Date('2026-06-17T12:00:00')).length).toBe(42)
  })

  it('根据底色亮度选择相反文字色', () => {
    expect(contrastColor('#F7F0CF')).toBe('#17211f')
    expect(contrastColor('#28433D')).toBe('#ffffff')
  })
})
