import type { CSSProperties } from 'react'
import { getBoxDate, getCalendarCells, formatMonth } from '../../utils/date'
import { themePacks } from './themePacks'
import type { BoxDraft, WorkspaceDraft } from '../../types'

interface CalendarFaceProps {
  draft: WorkspaceDraft
  box: BoxDraft
}

export function CalendarFace({ draft, box }: CalendarFaceProps) {
  const date = getBoxDate(box.dateOverride)
  const cells = getCalendarCells(date)
  const theme = themePacks[draft.theme]
  const weekDays = draft.locale === 'zh-CN' ? ['日', '一', '二', '三', '四', '五', '六'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className={`calendar-face theme-${draft.theme}`} style={{ '--theme-accent': theme.accent } as CSSProperties}>
      <span className="calendar-decoration calendar-decoration-one" />
      <span className="calendar-decoration calendar-decoration-two" />
      <div className="calendar-title">{box.titleArt || theme.artDefault}</div>
      <div className="calendar-month">{formatMonth(date, draft.locale)}</div>
      <div className="calendar-grid">
        {weekDays.map((day) => (
          <span className="week-day" key={day}>
            {day}
          </span>
        ))}
        {cells.map((day, index) => (
          <span className={`calendar-day ${day === date.getDate() ? 'marked-date' : ''}`} key={`${day}-${index}`}>
            {day}
          </span>
        ))}
      </div>
      <div className="calendar-caption">
        {date.toISOString().slice(0, 10).replaceAll('-', '.')} · {box.caption || '我们的纪念'}
      </div>
    </div>
  )
}
