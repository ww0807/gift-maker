import { Palette, Sparkles } from 'lucide-react'
import { colorOptions, type EditablePanelId, type WorkspaceDraft } from '../types'
import { themePacks } from '../features/template/themePacks'

interface GlobalControlsProps {
  draft: WorkspaceDraft
  updateDraft: (patch: Partial<WorkspaceDraft>) => void
  activePanel: EditablePanelId
  panelCounts: Record<EditablePanelId, number>
  onPanelSelect: (panelId: EditablePanelId) => void
}

const panelLabels: Record<EditablePanelId, string> = {
  front: '正面',
  right: '右侧',
  back: '背面',
  left: '左侧',
}

const panelOrder: EditablePanelId[] = ['front', 'right', 'back', 'left']

export function GlobalControls({ draft, updateDraft, activePanel, panelCounts, onPanelSelect }: GlobalControlsProps) {
  const selectTheme = (theme: WorkspaceDraft['theme']) => {
    updateDraft({
      theme,
      boxes: draft.boxes.map((box) => ({
        ...box,
        titleArt: box.titleArt === themePacks[draft.theme].artDefault ? themePacks[theme].artDefault : box.titleArt,
      })),
    })
  }

  return (
    <>
      <section className="control-section">
        <div className="section-kicker"><Sparkles size={14} /> L2 · 主题包</div>
        <div className="theme-switcher">
          {(Object.keys(themePacks) as WorkspaceDraft['theme'][]).map((theme) => (
            <button className={draft.theme === theme ? 'theme-option active' : 'theme-option'} key={theme} onClick={() => selectTheme(theme)} type="button">
              <span className={`theme-swatch ${theme}`} />
              <span>
                <strong>{themePacks[theme].label}</strong>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="control-section">
        <div className="section-kicker"><Palette size={14} /> L3 · 全局变量</div>
        <label className="field-label">编辑页面 <span>点击切换</span></label>
        <div aria-label="选择当前编辑页面" className="global-panel-picker" role="group">
          {panelOrder.map((panelId) => (
            <button
              aria-pressed={activePanel === panelId}
              className={activePanel === panelId ? 'active' : ''}
              key={panelId}
              onClick={() => onPanelSelect(panelId)}
              type="button"
            >
              <span>{panelLabels[panelId]}</span>
              <small>{panelCounts[panelId]}/8</small>
            </button>
          ))}
        </div>
        <label className="field-label">套系底色 <span>六面同步</span></label>
        <div className="color-picker">
          {colorOptions.map((color) => (
            <button
              aria-label={`选择${color.name}`}
              className={draft.primaryColor === color.value ? 'color-dot selected' : 'color-dot'}
              key={color.value}
              onClick={() => updateDraft({ primaryColor: color.value })}
              style={{ backgroundColor: color.value }}
              type="button"
            />
          ))}
        </div>
        <label className="field-label" htmlFor="language">星期语言</label>
        <select id="language" onChange={(event) => updateDraft({ locale: event.target.value as WorkspaceDraft['locale'] })} value={draft.locale}>
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
        </select>
      </section>
    </>
  )
}
