import { Check, RefreshCw } from 'lucide-react'
import type { BoxProgressState } from '../task/taskApi'

interface RevealCardProps {
  boxNo: 1 | 2 | 3 | 4
  state: BoxProgressState
  imageUrl?: string
  error?: string
  onRetry?: () => void
}

export function RevealCard({ boxNo, state, imageUrl, error, onRetry }: RevealCardProps) {
  const message = state === 'done' ? '完成' : state === 'failed' ? error ?? '生成失败' : state === 'generating' ? '正在生成形象...' : '排队中...'
  return (
    <article className={`reveal-card ${state}`}>
      <span className="reveal-index">0{boxNo}</span>
      <div className="reveal-stage">
        {state === 'done' && imageUrl ? (
          <>
            <img alt={`盒子 ${boxNo} Q版形象`} src={imageUrl} />
            <span className="reveal-complete"><Check size={14} /></span>
          </>
        ) : state === 'failed' ? (
          <button aria-label={`重做盒子 ${boxNo}`} className="reveal-retry" onClick={onRetry} type="button"><RefreshCw size={20} /></button>
        ) : (
          <svg aria-hidden="true" className="reveal-box" viewBox="0 0 120 140">
            <path d="M24 55h72v58H24zM24 55l15-17h42l15 17M43 55v58M77 55v58" fill="none" pathLength="100" />
            <path className="reveal-lid" d="M24 55l15-17h42l15 17" fill="none" />
            <path className="reveal-spark one" d="M20 34v12M14 40h12" />
            <path className="reveal-spark two" d="M101 76v12M95 82h12" />
          </svg>
        )}
      </div>
      <span aria-live="polite" className="reveal-message">{message}</span>
    </article>
  )
}
