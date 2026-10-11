import opentype, { type Font } from 'opentype.js'
import type { TitleFontKey } from '../../../types'

interface ExportFonts {
  sans: Font
  serif: Font
  title: Record<TitleFontKey, Font>
}

const serifClasses = new Set(['svg-calendar-title'])
const titleFontPaths: Record<TitleFontKey, string> = {
  'noto-serif': '/fonts/NotoSerifSC-VF.ttf',
  'noto-sans': '/fonts/NotoSansSC-VF.ttf',
  'florida-vibes': '/fonts/Florida%20Vibes%20by%20Turbologo.ttf',
  georgia: '/fonts/Georgia.ttf',
  lato: '/fonts/Lato-Regular.ttf',
  roboto: '/fonts/Roboto-Regular.ttf',
  trebuchet: '/fonts/TrebuchetMS.ttf',
  verdana: '/fonts/Verdana.ttf',
}

async function loadFont(path: string) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`字体加载失败：${path}`)
  return opentype.parse(await response.arrayBuffer()) as Font
}

export async function loadExportFonts(): Promise<ExportFonts> {
  const [sans, serif, ...titleFonts] = await Promise.all([
    loadFont('/fonts/NotoSansSC-VF.ttf'),
    loadFont('/fonts/NotoSerifSC-VF.ttf'),
    ...Object.values(titleFontPaths).map(loadFont),
  ])
  return {
    sans,
    serif,
    title: Object.fromEntries(Object.keys(titleFontPaths).map((key, index) => [key, titleFonts[index]])) as Record<TitleFontKey, Font>,
  }
}

function classNames(element: Element) {
  return (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
}

function fontSize(element: SVGTextElement) {
  const name = classNames(element)
  if (name.includes('svg-calendar-title')) return name.includes('anniversary') ? 4.2 : 5.2
  if (name.includes('svg-letter-message')) return 3.2
  if (name.includes('svg-calendar-week') || name.includes('svg-calendar-day')) return 2.25
  if (name.includes('svg-calendar-month')) return 2.2
  if (name.includes('svg-calendar-caption')) return 1.85
  if (name.includes('svg-user-text')) return 6
  return 2.3
}

function inheritedAttribute(element: Element, attribute: string) {
  let current: Element | null = element
  while (current) {
    const value = current.getAttribute(attribute)
    if (value) return value
    current = current.parentElement
  }
  return undefined
}

function getTextAnchor(element: SVGTextElement) {
  return element.getAttribute('text-anchor') ?? 'start'
}

function pathForText(font: Font, content: string, x: number, y: number, size: number, anchor: string) {
  const advance = font.getAdvanceWidth(content, size)
  const anchoredX = anchor === 'middle' ? x - advance / 2 : anchor === 'end' ? x - advance : x
  return font.getPath(content, anchoredX, y, size).toPathData(3)
}

function replaceTextElement(textElement: SVGTextElement, fonts: ExportFonts) {
  const classList = classNames(textElement)
  const titleFont = (textElement.getAttribute('data-title-font') ?? textElement.closest('[data-title-font]')?.getAttribute('data-title-font')) as TitleFontKey | null
  const font = titleFont && fonts.title[titleFont] ? fonts.title[titleFont] : classList.some((name) => serifClasses.has(name)) ? fonts.serif : fonts.sans
  const size = fontSize(textElement)
  const anchor = getTextAnchor(textElement)
  const fill = inheritedAttribute(textElement, 'fill') ?? '#17211f'
  const opacity = inheritedAttribute(textElement, 'opacity')
  const baseX = Number.parseFloat(textElement.getAttribute('x') ?? '0')
  const baseY = Number.parseFloat(textElement.getAttribute('y') ?? '0')
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const lines = Array.from(textElement.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE || node.nodeName.toLowerCase() === 'tspan')
  let currentY = baseY

  if (lines.length === 0) lines.push(textElement)

  lines.forEach((line, index) => {
    const tspan = line.nodeType === Node.ELEMENT_NODE ? line as SVGTSpanElement : undefined
    const content = line.textContent?.trim() ?? ''
    if (!content) return
    const x = tspan?.hasAttribute('x') ? Number.parseFloat(tspan.getAttribute('x') ?? String(baseX)) : baseX
    if (tspan?.hasAttribute('dy')) currentY += Number.parseFloat(tspan.getAttribute('dy') ?? '0')
    if (index === 0 && !tspan) currentY = baseY
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathForText(font, content, x, currentY, size, anchor))
    path.setAttribute('fill', fill)
    if (opacity) path.setAttribute('opacity', opacity)
    group.append(path)
  })

  textElement.replaceWith(group)
}

// Runs only on the offscreen SVG used for PDF generation.
export function convertTextToPaths(svg: SVGSVGElement, fonts: ExportFonts) {
  Array.from(svg.querySelectorAll('text')).forEach((element) => replaceTextElement(element, fonts))
}
