import { ArrowLeft, CheckCircle2, Download, Home, Printer, RotateCcw } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTaskStore } from '../features/task/taskStore'

export function ResultPage() {
  const navigate = useNavigate()
  const { taskId = 'demo-task' } = useParams()
  const draft = useTaskStore((state) => state.draft)

  return (
    <main className="result-page">
      <header className="result-header">
        <button onClick={() => navigate(`/workspace/${taskId}`)} type="button"><ArrowLeft size={16} /> 返回工作台</button>
        <span>礼物制作工作台</span>
        <button onClick={() => navigate('/')} type="button"><Home size={15} /> 返回首页</button>
      </header>
      <section className="result-card">
        <CheckCircle2 size={42} />
        <span className="eyebrow">导出已完成</span>
        <h1>你的四份礼物，已经准备好了。</h1>
        <p>4 页 A3 矢量 PDF 已在浏览器本地生成并开始下载，可直接交给打印店印刷。</p>
        <div className="result-files">
          {draft.boxes.map((box) => <span key={box.boxNo}>盒子{box.boxNo}.pdf 第 {box.boxNo} 页</span>)}
        </div>
        <div className="result-actions">
          <button className="secondary-button" onClick={() => navigate('/upload')} type="button"><RotateCcw size={16} /> 再做一套</button>
          <button className="primary-button" onClick={() => navigate(`/workspace/${taskId}`)} type="button"><Download size={16} /> 再次导出 PDF</button>
        </div>
      </section>
      <section className="print-note"><Printer size={18} /><div><strong>打印与折叠</strong><p>A3 横向 · 实际大小 100% · 硬铜版纸 250-300g。先用直尺与无墨笔沿青色虚线预压，再折四侧面、顶底面、插舌并涂胶粘合。</p></div></section>
    </main>
  )
}
