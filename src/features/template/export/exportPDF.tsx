import { jsPDF } from 'jspdf'
import 'svg2pdf.js'
import { renderToStaticMarkup } from 'react-dom/server'
import type { WorkspaceDraft } from '../../../types'
import { NetSvg } from '../NetSvg'
import { PAPER } from '../structure-v1'
import { convertTextToPaths, loadExportFonts } from './textToPath'

function mountPrintSvg(markup: string) {
  const documentNode = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const parseError = documentNode.querySelector('parsererror')
  if (parseError) throw new Error('印刷稿 SVG 解析失败。')

  const svg = documentNode.documentElement as unknown as SVGSVGElement
  svg.setAttribute('width', `${PAPER.width}mm`)
  svg.setAttribute('height', `${PAPER.height}mm`)
  svg.setAttribute('viewBox', `0 0 ${PAPER.width} ${PAPER.height}`)
  svg.style.cssText = `background:#fff; position:fixed; left:-10000px; top:0; width:${PAPER.width}mm; height:${PAPER.height}mm;`
  document.body.append(svg)
  return svg
}

export async function exportA3Pdf(draft: WorkspaceDraft) {
  const fonts = await loadExportFonts()
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
    compress: true,
  })

  for (const [index, box] of draft.boxes.entries()) {
    if (index > 0) pdf.addPage('a3', 'landscape')

    const markup = renderToStaticMarkup(<NetSvg box={box} draft={draft} mode="print" />)
    const svg = mountPrintSvg(markup)
    try {
      convertTextToPaths(svg, fonts)
      if (svg.querySelector('text')) {
        throw new Error('文字转曲未完成，已取消导出。')
      }
      await pdf.svg(svg, { x: 0, y: 0, width: PAPER.width, height: PAPER.height })
    } finally {
      svg.remove()
    }
  }

  pdf.save('拆喜盒-4盒-A3.pdf')
}
