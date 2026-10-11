import { Type } from 'lucide-react'
import { editableTextMeta, titleFontOptions, type BoxDraft, type EditableTextKey, type TitleFontKey } from '../types'
import { ElementColorPicker } from './ElementColorPicker'

interface TypographyPanelProps {
  box: BoxDraft
  selectedTextKey: EditableTextKey | null
  titleColor: string
  onUpdateFont: (textKey: EditableTextKey, font: TitleFontKey) => void
  onUpdateColor: (textKey: EditableTextKey, color: string) => void
  onResetLayout: (textKey: EditableTextKey) => void
}

export function TypographyPanel({ box, selectedTextKey, titleColor, onUpdateFont, onUpdateColor, onResetLayout }: TypographyPanelProps) {
  if (!selectedTextKey) return null

  const meta = editableTextMeta[selectedTextKey]
  const layout = box.textLayouts?.[selectedTextKey] ?? (selectedTextKey === 'titleArt' ? { ...meta.default, font: box.titleFont } : meta.default)
  const content = box[selectedTextKey] || ''
  const hasChinese = /[\u3400-\u9fff]/.test(content)

  return (
    <section className="control-section typography-panel">
      <div className="section-kicker"><Type size={14} /> 文字样式</div>
      <p>当前文字：<strong>{meta.label}</strong></p>
      <label className="field-label" htmlFor="selected-text-font">字体</label>
      <select id="selected-text-font" onChange={(event) => onUpdateFont(selectedTextKey, event.target.value as TitleFontKey)} value={layout.font}>
        {titleFontOptions.map((font) => (
          <option disabled={hasChinese && !font.supportsChinese} key={font.key} value={font.key}>
            {font.label}{font.supportsChinese ? '' : '（仅英文）'}
          </option>
        ))}
      </select>
      {selectedTextKey === 'titleArt' && (
        <ElementColorPicker
          id="calendar-title-color"
          label="日历标题颜色"
          onChange={(color) => onUpdateColor(selectedTextKey, color)}
          value={layout.color ?? titleColor}
        />
      )}
      <button className="reset-text-layout" onClick={() => onResetLayout(selectedTextKey)} type="button">还原文字位置</button>
    </section>
  )
}
