import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChibiFigure } from '../components/ChibiFigure'

const characterLabels = ['盒子 1', '盒子 2', '盒子 3', '盒子 4']

export function CharacterPage() {
  const navigate = useNavigate()
  const { taskId = 'demo-task' } = useParams()
  const [secondsRemaining, setSecondsRemaining] = useState(30)
  const isPreparing = true

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const expectedWait = secondsRemaining > 0
    ? `预计还需 ${String(secondsRemaining).padStart(2, '0')} 秒`
    : '预计仍需片刻'

  return (
    <main className="character-page">
      <header className="app-header">
        <div className="brand-block">
          <span className="brand-mark">M</span>
          <div><strong>礼物制作工作台</strong><small>纸艺礼物 · MVP</small></div>
        </div>
        <div aria-label="制作流程" className="header-progress" role="tablist">
          <button onClick={() => navigate('/upload')} role="tab" type="button">1 上传</button>
          <button aria-selected="true" className="current" onClick={() => navigate(`/characters/${taskId}`)} role="tab" type="button">2 Q版形象</button>
          <button onClick={() => navigate(`/workspace/${taskId}`)} role="tab" type="button">3 排版预览</button>
        </div>
        <button className="ghost-button" onClick={() => navigate('/upload')} type="button"><ArrowLeft size={15} /> 返回上传</button>
      </header>

      <section className="character-workspace">
        <div className="character-heading">
          <div>
            <span className="eyebrow">第二步</span>
            <h1>Q版形象</h1>
          </div>
          <span className="character-status preparing">
            <LoaderCircle className="loading-spinner" size={14} />
            正在生成
          </span>
        </div>

        <section aria-live="polite" className="character-loading">
          <LoaderCircle className="loading-spinner" size={24} />
          <div>
            <strong>正在生成四款 Q版形象</strong>
            <span>{expectedWait}</span>
          </div>
        </section>

        <div className="character-grid preparing">
          {characterLabels.map((label, index) => (
            <article className="character-card" key={label}>
              <span className="character-card-index">0{index + 1}</span>
              <div className="character-figure">
                <ChibiFigure muted variant={index + 1} />
              </div>
              <strong>{label}</strong>
              <small>等待生成</small>
            </article>
          ))}
        </div>

        <footer className="character-footer">
          <button className="secondary-button" onClick={() => navigate('/upload')} type="button">重新上传</button>
          <button className="primary-button" disabled={isPreparing} onClick={() => navigate(`/workspace/${taskId}`)} type="button">
            进入排版预览 <ArrowRight size={16} />
          </button>
        </footer>
      </section>
    </main>
  )
}
