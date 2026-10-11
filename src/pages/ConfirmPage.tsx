import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { regenerateTask } from '../features/task/taskApi'
import { useTaskProgress } from '../features/task/useTaskProgress'
import { RevealCard } from '../features/generating/RevealCard'

export function ConfirmPage() {
  const navigate = useNavigate()
  const { taskId = '' } = useParams()
  const { task, error } = useTaskProgress(taskId)
  const canEnter = task?.boxes.every((box) => box.state === 'done') ?? false

  const regenerate = async () => {
    if (!taskId) return
    try {
      await regenerateTask(taskId)
      navigate(`/generating/${taskId}`)
    } catch {
      navigate(`/generating/${taskId}`)
    }
  }

  return (
    <main className="confirm-page">
      <header className="landing-header">
        <div className="landing-brand"><span className="brand-mark">M</span><strong>拆喜盒</strong></div>
        <button className="sample-link" onClick={() => navigate('/upload')} type="button"><ArrowLeft size={15} /> 重新上传</button>
      </header>
      <section className="confirm-shell">
        <span className="eyebrow">第三步</span>
        <h1>四款形象准备好啦</h1>
        <p>先看看像不像，确认后就能自由排版</p>
        <div className="confirm-grid">
          {(task?.boxes ?? []).map((box) => (
            <div className="confirm-item" key={box.boxNo}>
              {box.state === 'done' && box.imageUrl
                ? <img alt={`盒子 ${box.boxNo} Q版形象`} src={box.imageUrl} />
                : <RevealCard boxNo={box.boxNo} error={box.error} imageUrl={box.imageUrl} state={box.state} />}
              <button className="confirm-regenerate" disabled={!canEnter} onClick={regenerate} type="button"><RefreshCw size={14} /> 整组重做</button>
            </div>
          ))}
        </div>
        {error && <p className="upload-error">{error}</p>}
        <footer className="confirm-footer">
          <button className="secondary-button" onClick={() => navigate('/upload')} type="button"><ArrowLeft size={16} /> 返回重新上传</button>
          <button className="primary-button" disabled={!canEnter} onClick={() => navigate(`/workspace/${taskId}`)} type="button">满意，开始设计 <ArrowRight size={16} /></button>
        </footer>
      </section>
    </main>
  )
}
