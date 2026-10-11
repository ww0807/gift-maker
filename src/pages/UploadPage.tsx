import { ArrowRight, Check, ChevronRight, Images, Sparkles, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { uploadAndGenerate } from '../features/task/imageGenerationApi'

type UploadSlot = {
  name: string
  source: string
  isPlaceholder: boolean
  file?: File
}

const placeholderSlots: UploadSlot[] = [
  { name: '示例人物 01', source: '/images/placeholders/box-01.png', isPlaceholder: true },
  { name: '示例人物 02', source: '/images/placeholders/box-02.png', isPlaceholder: true },
  { name: '示例人物 03', source: '/images/placeholders/box-03.png', isPlaceholder: true },
  { name: '示例人物 04', source: '/images/placeholders/box-04.png', isPlaceholder: true },
]

function HeroSection({ onStart }: { onStart: () => void }) {
  return (
    <section className="landing-hero">
      <div className="hero-copy">
        <h1>给 TA 悄悄做<br />一盒专属盲盒</h1>
        <p>上传图片后，自动生成 Q 版人物盲盒</p>
        <div className="hero-actions">
          <button className="hero-primary" onClick={onStart} type="button">开始制作 <ArrowRight size={18} /></button>
          <button className="hero-secondary" onClick={onStart} type="button">查看示例 <ChevronRight size={17} /></button>
        </div>
      </div>
      <div className="hero-visual" aria-label="打开的纸艺盲盒示意图">
        <img alt="打开的纸艺盲盒与 Q 版人物" className="hero-gift-image" src="/images/hero-gift-box.png" />
      </div>
    </section>
  )
}

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <main className="landing-page">
      <header className="landing-header">
        <div className="landing-brand"><span className="brand-mark">M</span><strong>拆喜盒</strong></div>
        <button className="sample-link" onClick={() => navigate('/upload')} type="button">看看怎么做 <ChevronRight size={15} /></button>
      </header>
      <HeroSection onStart={() => navigate('/upload')} />
    </main>
  )
}

export function UploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<(UploadSlot | null)[]>(placeholderSlots)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const setFile = (index: number, file?: File) => {
    if (!file) return
    const source = URL.createObjectURL(file)
    setUploadError('')
    setFiles((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { name: file.name, source, isPlaceholder: false, file } : item
    )))
  }

  const setBatchFiles = (fileList: FileList | null) => {
    if (!fileList) return
    const selected = Array.from(fileList)
    if (selected.length === 0) {
      return
    }
    setFiles((current) => current.map((slot, index) => {
      const file = selected[index]
      return file ? { name: file.name, source: URL.createObjectURL(file), isPlaceholder: false, file } : slot
    }))
    setUploadError('')
  }

  const begin = async () => {
    const images = files.map((slot, index) => ({ boxNo: (index + 1) as 1 | 2 | 3 | 4, file: slot?.file }))
    if (images.some((image) => !image.file)) {
      setUploadError('请先上传四张图片。')
      return
    }

    setIsGenerating(true)
    setUploadError('')
    try {
      const task = await uploadAndGenerate(images as Array<{ boxNo: 1 | 2 | 3 | 4; file: File }>)
      navigate(`/generating/${task.taskId}`)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '图片上传失败，请重试。')
      setIsGenerating(false)
    }
  }

  return (
    <main className="upload-page">
      <header className="landing-header">
        <div className="landing-brand"><span className="brand-mark">M</span><strong>拆喜盒</strong></div>
        <button className="sample-link" onClick={() => navigate('/')} type="button">返回首页 <ChevronRight size={15} /></button>
      </header>
      <section className="upload-section">
        <div className="upload-section-title">
          <span>第一步</span>
          <strong>上传图片</strong>
        </div>
        <section className="upload-grid">
          {files.map((slot, index) => (
            <label className="upload-card" key={index}>
              <input accept="image/*" onChange={(event) => setFile(index, event.target.files?.[0])} type="file" />
              <span className="upload-index">0{index + 1}</span>
              {slot ? <img alt={slot.name} className="upload-preview-image" src={slot.source} /> : <div className="upload-art"><Upload size={28} /></div>}
              <span className="upload-card-overlay"><Upload size={17} /> 单张替换</span>
              <strong>{slot?.name ?? '选择照片'}</strong>
              <small>{slot?.isPlaceholder ? '当前为示例图 · 点击替换' : slot ? '已选择 · 点击替换' : '单人正面照效果更好'}</small>
              {slot && <Check className="upload-check" size={17} />}
            </label>
          ))}
        </section>
        <section className="upload-footer">
          <input accept="image/*" className="batch-upload-input" id="batch-upload" multiple onChange={(event) => setBatchFiles(event.target.files)} type="file" />
          <div className="upload-footer-actions">
            <label className="batch-upload-button" htmlFor="batch-upload"><Images size={16} /> 批量上传</label>
            <button className="start-button" disabled={files.some((file) => !file || file.isPlaceholder) || isGenerating} onClick={begin} type="button">
              {isGenerating ? <><Sparkles size={17} /> 正在建立四款形象…</> : <>开始生成 4 款形象 <ArrowRight size={17} /></>}
            </button>
          </div>
        </section>
        {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
      </section>
    </main>
  )
}
