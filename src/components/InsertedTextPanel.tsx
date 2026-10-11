import { Trash2, Type } from 'lucide-react'
import { titleFontOptions, type ElementPlacement, type TitleFontKey } from '../types'
import { ElementColorPicker } from './ElementColorPicker'

interface InsertedTextPanelProps {
  element: ElementPlacement | null
  onUpdate: (patch: Partial<ElementPlacement>) => void
  onRemove: () => void
}

export function InsertedTextPanel({ element, onUpdate, onRemove }: InsertedTextPanelProps) {
  if (!element || element.kind !== 'text') return null

  const text = element.text ?? '请输入'
  const language = element.language ?? 'zh-CN'
  const hasChinese = /[\u3400-\u9fff]/.test(text)

  return (
    <section className="control-section typography-panel inserted-text-panel">
      <div className="inserted-text-panel-heading">
        <div className="section-kicker"><Type size={14} /> 添加文字</div>
        <button aria-label="删除添加文字" className="delete-inserted-text" onClick={onRemove} title="删除文字" type="button">
          <Trash2 aria-hidden="true" size={13} />
        </button>
      </div>
      <label className="field-label" htmlFor={`inserted-text-${element.id}`}>文本内容</label>
      <input id={`inserted-text-${element.id}`} maxLength={30} onChange={(event) => onUpdate({ text: event.target.value })} value={text} />
      <label className="field-label" htmlFor={`inserted-language-${element.id}`}>文字语言</label>
      <select
        id={`inserted-language-${element.id}`}
        onChange={(event) => {
          const nextLanguage = event.target.value as 'zh-CN' | 'en'
          onUpdate({
            language: nextLanguage,
            ...(text === '请输入' || text === 'Enter text'
              ? { text: nextLanguage === 'en' ? 'Enter text' : '请输入' }
              : {}),
          })
        }}
        value={language}
      >
        <option value="zh-CN">中文</option>
        <option value="en">English</option>
      </select>
      <label className="field-label" htmlFor={`inserted-font-${element.id}`}>字体</label>
      <select id={`inserted-font-${element.id}`} onChange={(event) => onUpdate({ font: event.target.value as TitleFontKey })} value={element.font ?? 'noto-sans'}>
        {titleFontOptions.map((font) => (
          <option disabled={(language === 'zh-CN' || hasChinese) && !font.supportsChinese} key={font.key} value={font.key}>
            {font.label}{font.supportsChinese ? '' : '（仅英文）'}
          </option>
        ))}
      </select>
      <ElementColorPicker
        id={`inserted-color-${element.id}`}
        label="文字颜色"
        onChange={(color) => onUpdate({ color })}
        value={element.color ?? '#263330'}
      />
    </section>
  )
}
