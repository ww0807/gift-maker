import { ArrowDown, ArrowUp, Layers2, Search, Trash2, Type, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { EditablePanelId, ElementPlacement } from '../../types'
import { ElementColorPicker } from '../../components/ElementColorPicker'
import { assetCategories, countByCategory, filterAssets, findEditorAsset, type AssetCategoryKey } from './assets'

interface AssetPanelProps {
  activePanel: EditablePanelId
  selectedElementId: string | null
  selectedElement: ElementPlacement | null
  panelCounts: Record<EditablePanelId, number>
  onAdd: (assetId: string, panelIds: EditablePanelId[]) => void
  onAddText: (panelIds: EditablePanelId[]) => void
  onUpdate: (patch: Partial<ElementPlacement>) => void
  onRemove: () => void
  onMoveLayer: (direction: 'forward' | 'backward') => void
  afterAddText?: ReactNode
}

export function AssetPanel({
  activePanel,
  selectedElementId,
  selectedElement,
  panelCounts,
  onAdd,
  onAddText,
  onUpdate,
  onRemove,
  onMoveLayer,
  afterAddText,
}: AssetPanelProps) {
  const [category, setCategory] = useState<AssetCategoryKey>('all')
  const [query, setQuery] = useState('')

  const targets = [activePanel]

  const counts = useMemo(() => countByCategory(), [])
  const visible = useMemo(() => filterAssets(category, query), [category, query])
  const currentCount = panelCounts[activePanel]
  const selectedAsset = selectedElement?.kind !== 'text' ? findEditorAsset(selectedElement?.assetId ?? '') : undefined
  return (
    <section className="control-section asset-panel">
      <div className="section-kicker">
        <Layers2 size={14} /> L2 · 素材库
      </div>
      <button className="add-text-button" onClick={() => onAddText(targets)} type="button">
        <Type size={15} /> 添加文字
      </button>
      {afterAddText}
      {selectedAsset && (
        <div className="asset-color-editor">
          {selectedAsset.recolorable
            ? (
              <ElementColorPicker
                id={`asset-color-${selectedElement?.id}`}
                label="素材颜色"
                onChange={(color) => onUpdate({ color })}
                value={selectedElement?.color ?? '#286052'}
              />
            )
            : <p>该素材保留原始配色</p>}
        </div>
      )}

      {/* 搜索 */}
      <div className="asset-search">
        <Search aria-hidden="true" size={13} />
        <input
          aria-label="搜索素材"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索素材，如 蛋糕 / gift"
          type="search"
          value={query}
        />
        {query && (
          <button aria-label="清空搜索" onClick={() => setQuery('')} type="button">
            <X size={12} />
          </button>
        )}
      </div>

      {/* 分类筛选 */}
      <div aria-label="素材分类" className="asset-tabs" role="tablist">
        {assetCategories.map((item) => (
          <button
            aria-selected={category === item.key}
            className={category === item.key ? 'active' : undefined}
            disabled={counts[item.key] === 0}
            key={item.key}
            onClick={() => setCategory(item.key)}
            role="tab"
            type="button"
          >
            {item.label}
            <small>{counts[item.key]}</small>
          </button>
        ))}
      </div>

      {/* 素材网格 */}
      {visible.length === 0 ? (
        <p className="asset-empty">没有匹配的素材，换个关键词试试</p>
      ) : (
        <div className="asset-grid">
          {visible.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onAdd(asset.id, targets)}
              title={`${asset.name}${asset.recolorable ? '（可改色）' : '（固定配色）'}`}
              type="button"
            >
              <svg aria-hidden="true" style={{ color: '#286052' }} viewBox={asset.viewBox}>
                <use href={`#${asset.symbolId}`} />
              </svg>
              <span>{asset.name}</span>
              {asset.recolorable && <i className="asset-recolor-dot" title="可改色" />}
            </button>
          ))}
        </div>
      )}

      {currentCount > 12 && <p className="asset-limit-hint">素材较多，注意留白与印刷效果</p>}

      {/* 选中素材后的图层操作 */}
      {selectedElementId && (
        <div className="layer-actions">
          <button aria-label="下移图层" onClick={() => onMoveLayer('backward')} type="button">
            <ArrowDown size={14} />
          </button>
          <button aria-label="上移图层" onClick={() => onMoveLayer('forward')} type="button">
            <ArrowUp size={14} />
          </button>
          <button aria-label="删除素材" className="delete-layer" onClick={onRemove} type="button">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </section>
  )
}
