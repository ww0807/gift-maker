import { elementColorOptions } from '../types'
import { Plus } from 'lucide-react'

interface ElementColorPickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

export function ElementColorPicker({ id, label, value, onChange }: ElementColorPickerProps) {
  return (
    <>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div aria-label={label} className="element-color-picker" id={id} role="group">
        {elementColorOptions.map((color) => (
          <button
            aria-label={`选择${color.name}`}
            className={value === color.value ? 'selected' : ''}
            key={color.value}
            onClick={() => onChange(color.value)}
            style={{ backgroundColor: color.value }}
            title={color.name}
            type="button"
          />
        ))}
        <label aria-label="自定义颜色" className="custom-element-color" title="自定义颜色">
          <Plus aria-hidden="true" size={13} />
          <input
            aria-label="打开自定义颜色色板"
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            type="color"
            value={value}
          />
        </label>
      </div>
    </>
  )
}
