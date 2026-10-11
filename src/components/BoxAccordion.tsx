import { ChevronDown, Trash2 } from 'lucide-react'
import { editableTextMeta, titleFontOptions, type BoxDraft, type TitleFontKey } from '../types'
import { ElementColorPicker } from './ElementColorPicker'

interface BoxAccordionProps {
  box: BoxDraft
  open: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<BoxDraft>) => void
  onRegenerate: () => void
  titleColor: string
}

export function BoxAccordion({ box, open, onToggle, onUpdate, onRegenerate, titleColor }: BoxAccordionProps) {
  const effectiveDate = box.dateOverride
  const cardName = box.cardName ?? `小卡 0${box.boxNo}`
  const status = box.generationState === 'generating' ? '生成中' : box.generationState === 'warning' ? '需确认' : '已就绪'
  const titleHasChinese = /[\u3400-\u9fff]/.test(box.titleArt)
  const selectedTitleFont = box.textLayouts?.titleArt?.font ?? box.titleFont

  const updateTitleFont = (titleFont: TitleFontKey) => {
    onUpdate({
      titleFont,
      textLayouts: {
        ...box.textLayouts,
        titleArt: {
          ...(box.textLayouts?.titleArt ?? editableTextMeta.titleArt.default),
          font: titleFont,
        },
      },
    })
  }

  return (
    <article className={`box-editor ${open ? 'open' : ''}`}>
      <button className="box-editor-head" onClick={onToggle} type="button">
        <span className="box-number">{box.isSecret ? 'SECRET' : `0${box.boxNo}`}</span>
        <span className="box-photo-name">{box.boxNo === 1 || box.boxNo === 4 ? cardName : `盒子 ${box.boxNo}`}</span>
        <span className={`generation-pill ${box.generationState}`}>{status}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="box-editor-body">
          <div className="image-stub">
            <span>{box.photoName}</span>
            <button onClick={onRegenerate} type="button">
              重做此款
            </button>
          </div>
          {(box.boxNo === 1 || box.boxNo === 4) && (
            <label className="field-label" htmlFor={`card-name-${box.boxNo}`}>
              小卡名称
              <input id={`card-name-${box.boxNo}`} maxLength={12} onChange={(event) => onUpdate({ cardName: event.target.value })} value={cardName} />
            </label>
          )}
          <label className="field-label" htmlFor={`message-${box.boxNo}`}>
            赠言
            <span className="message-field-actions">
              <span>{box.message.length}/30</span>
              <button aria-label="清空赠言" disabled={!box.message} onClick={() => onUpdate({ message: '' })} title="清空赠言" type="button"><Trash2 size={12} /></button>
            </span>
          </label>
          <textarea id={`message-${box.boxNo}`} maxLength={30} onChange={(event) => onUpdate({ message: event.target.value.replaceAll('\n', '') })} rows={3} value={box.message} />
          <label className="field-label" htmlFor={`date-${box.boxNo}`}>纪念日期</label>
          <input id={`date-${box.boxNo}`} onChange={(event) => event.target.value && onUpdate({ dateOverride: event.target.value })} required type="date" value={effectiveDate} />
          <div className="inline-pair">
            <label>
              <span className="field-label">日历标题</span>
              <input maxLength={16} onChange={(event) => onUpdate({ titleArt: event.target.value })} value={box.titleArt} />
            </label>
            <label>
              <span className="field-label">日历脚注</span>
              <input maxLength={14} onChange={(event) => onUpdate({ caption: event.target.value })} value={box.caption} />
            </label>
          </div>
          <label className="field-label" htmlFor={`title-font-${box.boxNo}`}>日历标题字体</label>
          <select id={`title-font-${box.boxNo}`} onChange={(event) => updateTitleFont(event.target.value as TitleFontKey)} value={selectedTitleFont}>
            {titleFontOptions.map((font) => (
              <option disabled={titleHasChinese && !font.supportsChinese} key={font.key} value={font.key}>
                {font.label}{font.supportsChinese ? '' : '（仅英文）'}
              </option>
            ))}
          </select>
          <ElementColorPicker
            id={`title-color-${box.boxNo}`}
            label="日历标题颜色"
            onChange={(color) => onUpdate({
              textLayouts: {
                ...box.textLayouts,
                titleArt: {
                  ...(box.textLayouts?.titleArt ?? editableTextMeta.titleArt.default),
                  color,
                },
              },
            })}
            value={box.textLayouts?.titleArt?.color ?? titleColor}
          />
        </div>
      )}
    </article>
  )
}
