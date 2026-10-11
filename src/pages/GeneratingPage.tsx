import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RevealCard } from '../features/generating/RevealCard'
import type { BoxProgressState } from '../features/task/taskApi'
import { useTaskProgress } from '../features/task/useTaskProgress'

export function GeneratingPage() {
  const navigate = useNavigate()
  const { taskId = '' } = useParams()
  const { task, error } = useTaskProgress(taskId)
  const complete = task?.boxes.filter((box) => box.state === 'done').length ?? 0
  const progress = task?.state === 'READY_FOR_REVIEW' ? 100 : 10 + complete * 20
  const boxes: Array<{ boxNo: 1 | 2 | 3 | 4; state: BoxProgressState; imageUrl?: string; error?: string }> = task?.boxes
    ?? [1, 2, 3, 4].map((boxNo) => ({ boxNo: boxNo as 1 | 2 | 3 | 4, state: 'pending' as BoxProgressState }))

  useEffect(() => {
    if (task?.state !== 'READY_FOR_REVIEW') return
    const timer = window.setTimeout(() => navigate(`/confirm/${taskId}`, { replace: true }), 700)
    return () => window.clearTimeout(timer)
  }, [navigate, task?.state, taskId])

  return (
    <main className="generating-page">
      <header className="landing-header">
        <div className="landing-brand"><span className="brand-mark">M</span><strong>拆喜盒</strong></div>
        <button className="sample-link" onClick={() => navigate('/upload')} type="button"><ArrowLeft size={15} /> 返回上传</button>
      </header>
      <section className="generation-shell">
        <span className="eyebrow">第二步</span>
        <h1>正在为你变出四款形象</h1>
        <p>照片正在变成 Q版小人，请稍等</p>
        <div className="reveal-grid">
          {boxes.map((box) => (
            <RevealCard boxNo={box.boxNo} error={box.error} imageUrl={box.imageUrl} key={box.boxNo} state={box.state} />
          ))}
        </div>
        <div aria-label="生成进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="generation-progress" role="progressbar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="generation-status"><LoaderCircle className="loading-spinner" size={14} /> {task?.message ?? '正在建立任务...'}</div>
        {error && <p className="upload-error">{error}</p>}
      </section>
    </main>
  )
}
