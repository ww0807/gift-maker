import type { EditablePanelId } from '../../types'
import { PANELS } from '../template/structure-v1'

/**
 * 各面的「模板内容占位区」（相对面板左上角，单位 mm）。
 *
 * 数值来自 NetSvg 里各面模板元素的实际绘制坐标：
 *  - front：Figure y=19 起、高约 67（width 54 × 1.25）；底部保留套系名 y≈105
 *  - right：COLLECTION 标题 y=15；人物矩阵 y=25 起两行（行距 34）；索引 y=102
 *  - back ：日历标题 y=18、月份 y=29、星期行 y=43、日期网格 6 行 × 7mm
 *  - left ：套系名 y=28、分隔线 y=35、赠言多行、落款 y=101
 *
 * 素材默认落点会避开这些区域，优先放到上方留白。
 */
const OCCUPIED: Record<EditablePanelId, { top: number; bottom: number }> = {
  front: { top: 19, bottom: 107 },
  right: { top: 15, bottom: 102 },
  back: { top: 18, bottom: 92 },
  left: { top: 28, bottom: 101 },
}

/** 面板内缩，避免素材贴边（印刷安全区之内） */
const EDGE_INSET = 5

/** 留白带内再留一点呼吸空间，素材不要顶满 */
const BAND_PADDING = 1.5

/** 自动缩小的下限：小于这个尺寸就看不清了，不如让它重叠 */
const MIN_AUTO_SIZE = 8

export interface Placement {
  x: number
  y: number
  /** 为放进留白带而自动缩放的比例。1 表示按原尺寸放置 */
  scale: number
}

/**
 * 计算新素材的默认落点与缩放。
 *
 * 策略（依次尝试，取第一个可行的）：
 *  1. 模板内容上方的留白带 —— 视觉上最像「装饰点缀」，且不遮挡主体
 *  2. 模板内容下方的留白带 —— 上方放不下时的次选
 *  3. 自动缩小以塞进较高的那条留白带 —— 宁可小一点也不压住人物
 *  4. 原尺寸居中 —— 缩到 MIN_AUTO_SIZE 仍放不下时的兜底
 *
 * 水平方向始终居中，符合「装饰对称」的直觉。
 *
 * @param existingCount 该面已有素材数，用于错位堆叠，避免多个素材完全重合
 */
export function defaultPlacement(
  panelId: EditablePanelId,
  assetWidth: number,
  assetHeight: number,
  existingCount = 0,
): Placement {
  const panel = PANELS[panelId]
  const occupied = OCCUPIED[panelId]

  // 每多一个素材，向右下错开 3mm，避免叠成一坨看不出有几个
  const stagger = Math.min(existingCount, 4) * 3

  const topBand = { start: EDGE_INSET, height: occupied.top - EDGE_INSET }
  const bottomBand = { start: occupied.bottom, height: panel.height - EDGE_INSET - occupied.bottom }

  // ①② 原尺寸能放进哪条留白带就放进去，上方优先
  for (const band of [topBand, bottomBand]) {
    const usable = band.height - BAND_PADDING * 2
    if (assetHeight <= usable) {
      const y = band.start + BAND_PADDING + (usable - assetHeight) / 2
      return {
        ...clamp(panel, assetWidth, assetHeight, centerX(panel, assetWidth) + stagger, y + stagger),
        scale: 1,
      }
    }
  }

  // ③ 自动缩小塞进较高的那条留白带
  const roomier = topBand.height >= bottomBand.height ? topBand : bottomBand
  const usable = roomier.height - BAND_PADDING * 2
  const scale = usable / assetHeight
  const scaledHeight = assetHeight * scale
  const scaledWidth = assetWidth * scale

  if (Math.max(scaledWidth, scaledHeight) >= MIN_AUTO_SIZE) {
    const y = roomier.start + BAND_PADDING + (usable - scaledHeight) / 2
    return {
      ...clamp(panel, scaledWidth, scaledHeight, centerX(panel, scaledWidth) + stagger, y + stagger),
      scale: Number(scale.toFixed(3)),
    }
  }

  // ④ 兜底：原尺寸整面居中（缩到能放进留白就太小了，不如让用户自己拖）
  return {
    ...clamp(
      panel,
      assetWidth,
      assetHeight,
      centerX(panel, assetWidth) + stagger,
      (panel.height - assetHeight) / 2 + stagger,
    ),
    scale: 1,
  }
}

function centerX(panel: { width: number }, assetWidth: number) {
  return (panel.width - assetWidth) / 2
}

/** 保证落点在面板内且不贴边 */
function clamp(
  panel: { width: number; height: number },
  assetWidth: number,
  assetHeight: number,
  x: number,
  y: number,
) {
  return {
    x: Math.min(panel.width - assetWidth - 2, Math.max(2, x)),
    y: Math.min(panel.height - assetHeight - 2, Math.max(2, y)),
  }
}
