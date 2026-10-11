import type { CSSProperties } from 'react'
import { ChibiFigure } from '../../components/ChibiFigure'
import type { WorkspaceDraft } from '../../types'
import { themePacks } from './themePacks'

export function ParallelPreview({ draft }: { draft: WorkspaceDraft }) {
  const theme = themePacks[draft.theme]

  return (
    <div className="parallel-preview">
      <div className="parallel-header">
        <div>
          <span className="eyebrow">导出前确认</span>
          <h2>四张专属小卡，一套礼物</h2>
        </div>
        <span className="theme-chip" style={{ color: theme.accent, borderColor: theme.accent }}>
          {theme.label}
        </span>
      </div>
      <div className="box-row">
        {draft.boxes.map((box) => (
          <article className="standing-box" style={{ '--box-bg': draft.primaryColor, '--theme-accent': theme.accent } as CSSProperties} key={box.boxNo}>
            <div className="standing-decoration" />
            {box.generatedImageUrl ? <img alt={`盒子 ${box.boxNo} Q版形象`} className="standing-figure-image" src={box.generatedImageUrl} /> : <ChibiFigure variant={box.boxNo} />}
            <div className="standing-card">
              <strong>{box.cardName || `小卡 0${box.boxNo}`}</strong>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
