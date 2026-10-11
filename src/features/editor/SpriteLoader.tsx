import { useEffect, useState } from 'react'

/**
 * 把 sprite.svg 内联注入页面，让各处的 <use href="#sc-xxx"> 能解析到 symbol 定义。
 *
 * 为什么必须内联而不能直接 <use href="/assets/symbols/sprite.svg#sc-xxx">：
 *  1. 跨文档 <use> 引用在部分浏览器（含 Safari）不生效；
 *  2. 内联的 symbol 才能被 currentColor 继承页面的 color 值，实现改色；
 *  3. 导出 PDF 时 svg2pdf 需要同文档内解析引用，跨文档引用会丢图形。
 */
export function SpriteLoader() {
  const [markup, setMarkup] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}assets/symbols/sprite.svg`)
      .then((res) => {
        if (!res.ok) throw new Error(`雪碧图加载失败：${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (cancelled) return
        // 去掉 XML 声明和注释，只保留 <svg>...</svg> 主体
        const body = text.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim()
        setMarkup(body)
      })
      .catch((error: unknown) => {
        console.error('[SpriteLoader]', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!markup) return null

  return (
    <div
      aria-hidden="true"
      // 雪碧图本身带 style="display:none"，不占布局
      dangerouslySetInnerHTML={{ __html: markup }}
      data-sprite-container=""
    />
  )
}
