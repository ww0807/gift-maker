import type { CSSProperties, ReactNode, Ref } from 'react'
import { defaultCharacterLayout, editableTextMeta, titleFontOptions, type BoxDraft, type EditablePanelId, type EditableTextKey, type WorkspaceDraft } from '../../types'
import { findEditorAsset } from '../editor/assets'
import { contrastColor, getBoxDate, getCalendarCells, formatMonth } from '../../utils/date'
import { themePacks } from './themePacks'
import { FLAPS, foldLines, PANELS, PAPER, panelSafeRect, TONGUES, type FlapSpec, type PanelRect } from './structure-v1'

interface NetSvgProps {
  draft: WorkspaceDraft
  box: BoxDraft
  mode?: 'preview' | 'print'
  activePanel?: EditablePanelId
  selectedElementId?: string | null
  showElementOutline?: boolean
  selectedTextKey?: EditableTextKey | null
  selectedCharacter?: boolean
  onPanelSelect?: (panelId: EditablePanelId) => void
  onElementSelect?: (panelId: EditablePanelId, elementId: string) => void
  onTextSelect?: (panelId: EditablePanelId, textKey: EditableTextKey) => void
  onCharacterSelect?: () => void
  svgRef?: Ref<SVGSVGElement>
}

export const svgPrintStyles = `
  .svg-fold-line { fill: none; stroke: #00AEEF; stroke-dasharray: 3 2; stroke-width: .25; }
  .svg-cut-line { stroke: #FF00FF; stroke-width: .25; }
  .svg-tab-outline { fill: none; stroke: #111; stroke-width: .35; }
  .svg-crop-mark { fill: none; stroke: #FF00FF; stroke-width: .35; }
  .svg-calendar-title { font-size: 5.2px; font-weight: 800; letter-spacing: .35px; }
  .svg-calendar-title.anniversary { font-family: Georgia, serif; font-size: 4.2px; font-weight: 400; }
  .svg-calendar-month { font-family: monospace; font-size: 2.2px; opacity: .7; }
  .svg-calendar-week, .svg-calendar-day { font-family: monospace; font-size: 2.25px; }
  .svg-calendar-week { opacity: .58; }
  .svg-calendar-date-star { font-family: sans-serif; font-size: 3.1px; font-weight: 700; }
  .svg-calendar-caption { font-family: monospace; font-size: 1.85px; opacity: .7; }
  .svg-letter-message { font-family: "Noto Sans SC", "PingFang SC", sans-serif; font-size: 3.2px; }
`

const figurePalette = [
  { hair: '#28313B', outfit: '#778C9D', skin: '#FFD1B4' },
  { hair: '#7B5747', outfit: '#536C7A', skin: '#F2C29F' },
  { hair: '#453A45', outfit: '#B97C78', skin: '#FFD0B3' },
  { hair: '#B98936', outfit: '#2D485C', skin: '#E9B88F' },
]

function Figure({ variant, x, y, width, muted = false }: { variant: number; x: number; y: number; width: number; muted?: boolean }) {
  const palette = figurePalette[(variant - 1) % figurePalette.length]
  const height = width * 1.25
  return (
    <g transform={`translate(${x} ${y}) scale(${width / 120})`} opacity={muted ? 0.45 : 1}>
      <ellipse cx="60" cy="137" fill="rgba(27, 38, 37, .14)" rx="35" ry="7" />
      <rect fill={palette.outfit} height="49" rx="14" width="50" x="35" y="86" />
      <circle cx="60" cy="58" fill={palette.skin} r="34" />
      <path d="M28 57c2-29 23-42 32-42 19 0 34 16 35 42-9-11-18-16-31-16-14 0-24 5-36 16Z" fill={palette.hair} />
      <circle cx="48" cy="61" fill="#263330" r="3.2" />
      <circle cx="72" cy="61" fill="#263330" r="3.2" />
      <path d="M53 74c4 4 10 4 14 0" fill="none" stroke="#263330" strokeLinecap="round" strokeWidth="2" />
      <circle cx="39" cy="70" fill="#F2A7A0" opacity=".45" r="4" />
      <circle cx="81" cy="70" fill="#F2A7A0" opacity=".45" r="4" />
      <rect fill="transparent" height={height} width="120" />
    </g>
  )
}

function GeneratedFigure({ box, selected, onSelect }: { box: BoxDraft; selected?: boolean; onSelect?: () => void }) {
  const layout = box.characterLayout ?? defaultCharacterLayout
  const width = 54
  return (
    <g
      className={selected ? 'svg-character selected' : 'svg-character'}
      data-editor-character="front"
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.()
      }}
      transform={`translate(${PANELS.front.x + layout.x} ${PANELS.front.y + layout.y}) rotate(${layout.rotation} ${width / 2} ${width * .675}) scale(${layout.scale})`}
    >
      <rect fill="transparent" height={width * 1.35} width={width} />
      {box.generatedImageUrl
        ? <image height={width * 1.35} href={box.generatedImageUrl} preserveAspectRatio="xMidYMid meet" width={width} />
        : <Figure variant={box.boxNo} width={width} x={0} y={0} />}
    </g>
  )
}

function GeneratedFigureGridItem({ box, x, y, muted }: { box: BoxDraft; x: number; y: number; muted: boolean }) {
  const width = 20
  if (!box.generatedImageUrl) return <Figure muted={muted} variant={box.boxNo} width={width} x={x} y={y} />
  return (
    <image
      height={width * 1.35}
      href={box.generatedImageUrl}
      opacity={muted ? .45 : 1}
      preserveAspectRatio="xMidYMid meet"
      width={width}
      x={x}
      y={y}
    />
  )
}

function PanelBackground({ panel, color, mode }: { panel: PanelRect; color: string; mode: 'preview' | 'print' }) {
  const safe = panelSafeRect(panel)
  const fill = panel.id === 'glue' ? '#fffef9' : color
  return (
    <>
      <rect fill={fill} height={panel.height} width={panel.width} x={panel.x} y={panel.y} />
      {mode === 'preview' && <rect className="svg-safe-area" height={safe.height} width={safe.width} x={safe.x} y={safe.y} />}
    </>
  )
}

function Flap({ flap }: { flap: FlapSpec }) {
  return <polygon className="svg-dust-flap" fill="#fffef9" points={flap.points} />
}

function MainTongue({ side, primaryColor }: { side: 'top' | 'bottom'; primaryColor: string }) {
  const tongue = TONGUES[side]
  return <rect className="svg-main-tongue" fill={primaryColor} height={tongue.height} rx={side === 'top' ? 4 : 0} width={tongue.width} x={tongue.x} y={tongue.y} />
}

const gluePoints = '73.1,93.5 47,93.5 36,104 36,193 47,203.5 73.1,203.5'

function EditableText({
  box,
  textKey,
  children,
  className,
  fill,
  mode,
  selectedTextKey,
  onTextSelect,
}: {
  box: BoxDraft
  textKey: EditableTextKey
  children: ReactNode
  className: string
  fill: string
  mode: 'preview' | 'print'
  selectedTextKey?: EditableTextKey | null
  onTextSelect?: (panelId: EditablePanelId, textKey: EditableTextKey) => void
}) {
  const meta = editableTextMeta[textKey]
  const layout = box.textLayouts?.[textKey] ?? (textKey === 'titleArt' ? { ...meta.default, font: box.titleFont } : meta.default)
  const font = titleFontOptions.find((item) => item.key === layout.font) ?? titleFontOptions[0]
  const textFill = textKey === 'titleArt' ? layout.color ?? fill : fill
  const selected = mode === 'preview' && selectedTextKey === textKey
  return (
    <g
      className={`svg-editable-text ${className}`}
      data-editable-text={textKey}
      onClick={(event) => {
        event.stopPropagation()
        onTextSelect?.(meta.panelId, textKey)
      }}
      transform={`translate(${PANELS[meta.panelId].x + layout.x} ${PANELS[meta.panelId].y + layout.y}) rotate(${layout.rotation}) scale(${layout.scale})`}
    >
      <rect fill="transparent" height={meta.height} width={meta.width} x={-meta.width / 2} y={-meta.height + 2} />
      <g data-title-font={layout.font} fill={textFill} style={{ fontFamily: font.family }}>
        {children}
      </g>
      {selected && <rect className="svg-text-outline" fill="none" height={meta.height} width={meta.width} x={-meta.width / 2} y={-meta.height + 2} />}
    </g>
  )
}

function Calendar({
  draft,
  box,
  panel,
  ink,
  mode,
  selectedTextKey,
  onTextSelect,
}: {
  draft: WorkspaceDraft
  box: BoxDraft
  panel: PanelRect
  ink: string
  mode: 'preview' | 'print'
  selectedTextKey?: EditableTextKey | null
  onTextSelect?: (panelId: EditablePanelId, textKey: EditableTextKey) => void
}) {
  const theme = themePacks[draft.theme]
  const date = getBoxDate(box.dateOverride)
  const cells = getCalendarCells(date)
  const weekDays = draft.locale === 'zh-CN' ? ['日', '一', '二', '三', '四', '五', '六'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const gridX = panel.x + 9
  const gridY = panel.y + 43
  const cellWidth = 8.1
  const cellHeight = 7
  const label = `${date.toISOString().slice(0, 10).replaceAll('-', '.')} · ${box.caption || '我们的纪念'}`

  return (
    <g fill={ink}>
      <EditableText box={box} className={`svg-calendar-title ${draft.theme}`} fill={theme.accent} mode={mode} onTextSelect={onTextSelect} selectedTextKey={selectedTextKey} textKey="titleArt">
        <text className={`svg-calendar-title ${draft.theme}`} textAnchor="middle" x="0" y="0">{box.titleArt || theme.artDefault}</text>
      </EditableText>
      <text className="svg-calendar-month" textAnchor="middle" x={panel.x + panel.width / 2} y={panel.y + 29}>{formatMonth(date, draft.locale)}</text>
      {weekDays.map((day, index) => <text className="svg-calendar-week" key={day + index} textAnchor="middle" x={gridX + cellWidth * index + cellWidth / 2} y={gridY}>{day}</text>)}
      {cells.map((day, index) => {
        if (!day) return null
        const col = index % 7
        const row = Math.floor(index / 7)
        const cellX = gridX + cellWidth * col
        const cellY = gridY + cellHeight * row
        const x = cellX + cellWidth / 2
        const y = cellY + cellHeight
        const active = day === date.getDate()
        return (
          <g key={`${day}-${index}`}>
            <g transform={`translate(${x} ${y})`}>
              <text className="svg-calendar-day" fill={active ? theme.accent : ink} fontWeight={active ? 700 : undefined} textAnchor="middle" x="0" y="0">{day}</text>
              {active && <text className="svg-calendar-date-star" fill={theme.accent} textAnchor="middle" x="3" y="-3.4">★</text>}
            </g>
          </g>
        )
      })}
      <EditableText box={box} className="svg-calendar-caption" fill={ink} mode={mode} onTextSelect={onTextSelect} selectedTextKey={selectedTextKey} textKey="caption">
        <text className="svg-calendar-caption" textAnchor="middle" x="0" y="0">{label}</text>
      </EditableText>
    </g>
  )
}

function UserElements({
  box,
  panelId,
  mode,
  selectedElementId,
  showElementOutline,
  onElementSelect,
}: {
  box: BoxDraft
  panelId: EditablePanelId
  mode: 'preview' | 'print'
  selectedElementId?: string | null
  showElementOutline?: boolean
  onElementSelect?: (panelId: EditablePanelId, elementId: string) => void
}) {
  const panel = PANELS[panelId]
  return (
    <>
      {(box.panels[panelId]?.elements ?? []).map((element) => {
        const isSelected = selectedElementId === element.id
        if (element.kind === 'text') {
          const width = element.width ?? 42
          const height = element.height ?? 12
          const font = titleFontOptions.find((item) => item.key === element.font) ?? titleFontOptions[1]
          return (
            <g
              className={isSelected ? 'svg-user-element svg-user-text selected' : 'svg-user-element svg-user-text'}
              data-editor-element={element.id}
              data-title-font={font.key}
              key={element.id}
              onClick={(event) => {
                event.stopPropagation()
                onElementSelect?.(panelId, element.id)
              }}
              transform={`translate(${panel.x + element.x} ${panel.y + element.y}) rotate(${element.rotation} ${width / 2} ${height / 2}) scale(${element.scale})`}
            >
              <rect fill="transparent" height={height} width={width} />
              <text
                fill={element.color ?? '#263330'}
                fontFamily={font.family}
                fontSize="6"
                textAnchor="middle"
                x={width / 2}
                y={height * .7}
              >
                {element.text || (element.language === 'en' ? 'Enter text' : '请输入')}
              </text>
              {mode === 'preview' && isSelected && showElementOutline && (
                <rect className="svg-element-outline" fill="none" height={height} width={width} />
              )}
            </g>
          )
        }
        const asset = findEditorAsset(element.assetId)
        if (!asset) return null
        const width = asset.defaultWidth * element.scale
        const height = asset.defaultHeight * element.scale
        return (
          <g
            className={isSelected ? 'svg-user-element selected' : 'svg-user-element'}
            data-editor-element={element.id}
            key={element.id}
            onClick={(event) => {
              event.stopPropagation()
              onElementSelect?.(panelId, element.id)
            }}
            transform={`translate(${panel.x + element.x} ${panel.y + element.y}) rotate(${element.rotation} ${width / 2} ${height / 2}) scale(${width / 100} ${height / 100})`}
          >
            {/* 透明命中区：素材本身可能是细线条，没有这层很难点中 */}
            <rect fill="transparent" height="100" width="100" />
            {asset.render(element.color ?? '#E85D68')}
            {/* 选中框与中心参考点仅用于编辑辅助，绝不能进印刷稿 */}
            {mode === 'preview' && isSelected && showElementOutline && (
              <rect className="svg-element-outline" fill="none" height="100" width="100" />
            )}
          </g>
        )
      })}
    </>
  )
}

export function NetSvg({ draft, box, mode = 'preview', activePanel, selectedElementId, showElementOutline = true, selectedTextKey, selectedCharacter, onPanelSelect, onElementSelect, onTextSelect, onCharacterSelect, svgRef }: NetSvgProps) {
  const ink = contrastColor(draft.primaryColor)
  const svgStyle = { '--svg-ink': ink } as CSSProperties

  return (
    <svg aria-label={`盒子 ${box.boxNo} 的 A3 展开图`} className="a3-net-svg" height="297mm" ref={svgRef} role="img" style={svgStyle} viewBox={`0 0 ${PAPER.width} ${PAPER.height}`} width="420mm" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>{svgPrintStyles}</style>
        {Object.values(PANELS).map((panel) => (
          <clipPath id={`clip-${panel.id}`} key={panel.id}><rect height={panel.height} width={panel.width} x={panel.x} y={panel.y} /></clipPath>
        ))}
      </defs>
      <g id="layer-artwork">
        {Object.values(PANELS).map((panel) => <PanelBackground color={draft.primaryColor} key={panel.id} mode={mode} panel={panel} />)}
        <polygon fill="#fffef9" points={gluePoints} />
        {Object.values(FLAPS).map((flap) => <Flap flap={flap} key={flap.id} />)}
        <MainTongue primaryColor={draft.primaryColor} side="top" />
        <MainTongue primaryColor={draft.primaryColor} side="bottom" />
        <g clipPath="url(#clip-front)" onClick={() => onPanelSelect?.('front')}>
          <GeneratedFigure box={box} onSelect={onCharacterSelect} selected={selectedCharacter} />
          {/* 用户素材放在模板内容之上：素材是可拖拽的主动对象，被人物/文字压住会让用户以为添加失败 */}
          <UserElements box={box} mode={mode} onElementSelect={onElementSelect} panelId="front" selectedElementId={selectedElementId} showElementOutline={showElementOutline} />
        </g>
        <g clipPath="url(#clip-right)" onClick={() => onPanelSelect?.('right')}>
          {draft.boxes.map((item, index) => {
            const col = index % 2
            const row = Math.floor(index / 2)
            return <GeneratedFigureGridItem box={item} key={item.boxNo} muted={item.boxNo !== box.boxNo} x={PANELS.right.x + 16 + col * 25} y={PANELS.right.y + 25 + row * 34} />
          })}
          <UserElements box={box} mode={mode} onElementSelect={onElementSelect} panelId="right" selectedElementId={selectedElementId} showElementOutline={showElementOutline} />
        </g>
        <g clipPath="url(#clip-back)" onClick={() => onPanelSelect?.('back')}>
          <Calendar box={box} draft={draft} ink={ink} mode={mode} onTextSelect={onTextSelect} panel={PANELS.back} selectedTextKey={selectedTextKey} />
          <UserElements box={box} mode={mode} onElementSelect={onElementSelect} panelId="back" selectedElementId={selectedElementId} showElementOutline={showElementOutline} />
        </g>
        <g clipPath="url(#clip-left)" fill={ink} onClick={() => onPanelSelect?.('left')}>
          <EditableText box={box} className="svg-letter-message" fill={ink} mode={mode} onTextSelect={onTextSelect} selectedTextKey={selectedTextKey} textKey="message">
            <text className="svg-letter-message" textAnchor="middle" x="0" y="0">
              {(box.message || '写下一段值得被收藏的文字。').match(/.{1,12}/g)?.map((line, index) => <tspan dy={index === 0 ? 0 : 6} key={line + index} x="0">{line}</tspan>)}
            </text>
          </EditableText>
          <UserElements box={box} mode={mode} onElementSelect={onElementSelect} panelId="left" selectedElementId={selectedElementId} showElementOutline={showElementOutline} />
        </g>
        <g fill={ink}>
          <g transform={`translate(${PANELS.bottom.x + 17} ${PANELS.bottom.y + 28})`}>
            {Array.from({ length: 18 }, (_, index) => <rect fill={ink} height="15" key={index} opacity=".58" width={index % 3 === 0 ? 1 : .5} x={index * 2.1} />)}
          </g>
        </g>
      </g>
      {mode === 'preview' && (
        <g id="layer-guides">
          {Object.values(PANELS).filter((panel) => panel.editable).map((panel) => {
            const safe = panelSafeRect(panel)
            return <rect className="svg-panel-label" fill="none" height={safe.height} key={panel.id} width={safe.width} x={safe.x} y={safe.y} />
          })}
          {activePanel && <rect className="svg-active-panel" fill="none" height={PANELS[activePanel].height} width={PANELS[activePanel].width} x={PANELS[activePanel].x} y={PANELS[activePanel].y} />}
        </g>
      )}
      <g id="layer-cut">
        {Object.values(FLAPS).map((flap) => <polygon className="svg-tab-outline" key={flap.id} points={flap.points} />)}
        <polygon className="svg-tab-outline" points={gluePoints} />
        <path className="svg-tab-outline" d={`M ${PANELS.top.x} ${PANELS.top.y + PANELS.top.height} V ${TONGUES.top.y} H ${TONGUES.top.x + TONGUES.top.width} V ${PANELS.top.y + PANELS.top.height}`} />
        <path className="svg-tab-outline" d={`M ${PANELS.bottom.x} ${PANELS.bottom.y} V ${TONGUES.bottom.y + TONGUES.bottom.height} H ${TONGUES.bottom.x + TONGUES.bottom.width} V ${PANELS.bottom.y}`} />
        <line className="svg-cut-line" x1={PANELS.left.x + PANELS.left.width} x2={PANELS.left.x + PANELS.left.width} y1={PANELS.left.y} y2={PANELS.left.y + PANELS.left.height} />
      </g>
      <g id="layer-fold">{foldLines.map(([x1, y1, x2, y2], index) => <line className="svg-fold-line" key={index} x1={x1} x2={x2} y1={y1} y2={y2} />)}</g>
      {mode === 'print' && <g id="layer-crop-marks">{[[44, 42.5], [376.1, 42.5], [44, 254.5], [376.1, 254.5]].map(([x, y], index) => <path className="svg-crop-mark" d={`M ${x} ${y + 4} V ${y} H ${x + 4}`} key={index} transform={index === 1 ? `rotate(90 ${x} ${y})` : index === 2 ? `rotate(-90 ${x} ${y})` : index === 3 ? `rotate(180 ${x} ${y})` : undefined} />)}</g>}
    </svg>
  )
}
