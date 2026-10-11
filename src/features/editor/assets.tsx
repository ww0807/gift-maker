import type { ReactNode } from 'react'
import assetsIndex from './assets.index.json'

/** 素材索引条目（由 npm run import-assets 生成） */
interface IndexedAsset {
  id: string
  name: string
  keywords: string[]
  category: 'decoration' | 'frame' | 'pattern' | 'background'
  symbolId: string
  viewBox: string
  aspectRatio: number
  colorMode: 'monochrome' | 'multicolor'
  recolorable: boolean
}

export interface EditorAsset {
  id: string
  name: string
  keywords: string[]
  category: 'decoration' | 'frame' | 'pattern' | 'background'
  /** 默认落盘尺寸（mm），由 aspectRatio 推导，长边固定 BASE_SIZE */
  defaultWidth: number
  defaultHeight: number
  colorMode: 'monochrome' | 'multicolor'
  /** 是否支持改色。multicolor 素材改色会破坏原有配色，UI 应禁用调色板 */
  recolorable: boolean
  viewBox: string
  symbolId: string
  /**
   * 渲染素材内容。
   *
   * 返回的节点被放进 100×100 的局部坐标系（NetSvg 用 scale(width/100) 缩放），
   * 因此这里用嵌套 <svg viewBox> 把素材自身的坐标系映射到 0 0 100 100，
   * 避免每个素材 viewBox 不同导致尺寸错乱。
   */
  render: (color: string) => ReactNode
}

/** 素材默认长边尺寸（mm）。盒面是 75×110mm，20mm 约占宽度 1/4，是个不突兀的起点 */
const BASE_SIZE = 20

function toEditorAsset(item: IndexedAsset): EditorAsset {
  // 按宽高比分配默认尺寸，长边固定 BASE_SIZE
  const ratio = item.aspectRatio > 0 ? item.aspectRatio : 1
  const [defaultWidth, defaultHeight] =
    ratio >= 1 ? [BASE_SIZE, BASE_SIZE / ratio] : [BASE_SIZE * ratio, BASE_SIZE]

  return {
    id: item.id,
    name: item.name,
    keywords: item.keywords,
    category: item.category,
    defaultWidth: Number(defaultWidth.toFixed(2)),
    defaultHeight: Number(defaultHeight.toFixed(2)),
    colorMode: item.colorMode,
    recolorable: item.recolorable,
    viewBox: item.viewBox,
    symbolId: item.symbolId,
    render: (color: string) => (
      // 外层 svg 把素材原始 viewBox 映射进 100×100 局部坐标系；
      // color 通过 CSS color 传递，单色素材内部的 currentColor 会跟随它。
      <svg
        height="100"
        preserveAspectRatio="xMidYMid meet"
        style={item.recolorable ? { color } : undefined}
        viewBox={item.viewBox}
        width="100"
        x="0"
        y="0"
      >
        <use href={`#${item.symbolId}`} />
      </svg>
    ),
  }
}

export const editorAssets: EditorAsset[] = (assetsIndex.assets as IndexedAsset[]).map(toEditorAsset)

const assetMap = new Map(editorAssets.map((asset) => [asset.id, asset]))

export function findEditorAsset(assetId: string) {
  return assetMap.get(assetId)
}

/** 分类元数据，供 UI 渲染筛选 Tab */
export const assetCategories = [
  { key: 'all', label: '全部' },
  { key: 'decoration', label: '装饰' },
  { key: 'frame', label: '边框' },
  { key: 'pattern', label: '图案' },
  { key: 'background', label: '底图' },
] as const

export type AssetCategoryKey = (typeof assetCategories)[number]['key']

/** 按分类与关键词过滤素材 */
export function filterAssets(category: AssetCategoryKey, query: string): EditorAsset[] {
  const q = query.trim().toLowerCase()
  return editorAssets.filter((asset) => {
    if (category !== 'all' && asset.category !== category) return false
    if (!q) return true
    return (
      asset.name.toLowerCase().includes(q) ||
      asset.keywords.some((k) => k.includes(q))
    )
  })
}

/** 各分类素材数量，供 Tab 上显示计数 */
export function countByCategory(): Record<AssetCategoryKey, number> {
  const counts = { all: editorAssets.length, decoration: 0, frame: 0, pattern: 0, background: 0 }
  for (const asset of editorAssets) counts[asset.category]++
  return counts
}
