import type { BoxDraft, WorkspaceDraft } from '../../types'
import { NetSvg } from './NetSvg'

interface NetPreviewProps {
  draft: WorkspaceDraft
  box: BoxDraft
}

export function NetPreview({ draft, box }: NetPreviewProps) {
  return (
    <div className="net-frame" aria-label={`盒子 ${box.boxNo} 的 A3 展开图`}>
      <div className="paper-label">A3 · 420 × 297 mm · 300 DPI</div>
      <NetSvg box={box} draft={draft} />
      <div className="canvas-note">预览与 PDF 导出共用毫米制 SVG 刀版。青色虚线为折线，洋红实线为裁切线。</div>
    </div>
  )
}
