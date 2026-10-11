/**
 * SVG 素材导入管线（零配置版）
 *
 * 用法：
 *   1. 把下载的 SVG 全部丢进 sucai/（不用分类）
 *   2. 运行 npm run import-assets
 *
 * 输出：
 *   public/assets/symbols/sprite.svg   —— symbol 雪碧图
 *   public/assets/assets.index.json    —— 素材索引（供前端读取）
 *
 * 管线步骤：
 *   ① 去重       内容完全相同的文件只保留一个
 *   ② 安全校验   拒绝含 <script> / on* 事件 / 外部资源引用的文件
 *   ③ SVGO 清洗  去 metadata / 注释 / 编辑器命名空间 / 固定宽高
 *   ④ 尺寸归一化 提取 viewBox，记录 aspectRatio
 *   ⑤ 颜色判定   纯黑白灰 → currentColor（可改色）；含彩色 → 保留原色
 *   ⑥ symbol 化  包装为 <symbol id viewBox>，保留根元素绘图属性
 *   ⑦ 写索引     生成 assets.index.json
 *
 * 可选：sucai/names.json 可给素材配中文名，格式 { "gift-svgrepo-com.svg": "礼物盒" }
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, basename, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { optimize } from 'svgo'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

/** 素材源目录：项目同级的 sucai/ */
const RAW_DIR = join(ROOT, '..', 'sucai')
const NAMES_FILE = join(RAW_DIR, 'names.json')
const OUT_SYMBOLS = join(ROOT, 'public/assets/symbols/sprite.svg')
const OUT_INDEX = join(ROOT, 'public/assets/assets.index.json')
/** 供代码 import 的索引副本。public/ 是静态资源目录，不应被源码直接 import */
const OUT_INDEX_SRC = join(ROOT, 'src/features/editor/assets.index.json')

type Category = 'decoration' | 'frame' | 'pattern' | 'background'
type ColorMode = 'monochrome' | 'multicolor'

interface Asset {
  id: string
  name: string
  /** 搜索用关键词，来自文件名分词 */
  keywords: string[]
  category: Category
  symbolId: string
  viewBox: string
  aspectRatio: number
  colorMode: ColorMode
  /** 是否可在界面上改色。缩放所有素材都支持。 */
  recolorable: boolean
}

// ─────────────────────────────────────────────────────────
// ② 安全校验
// ─────────────────────────────────────────────────────────

const DANGEROUS: Array<{ re: RegExp; reason: string }> = [
  { re: /<script[\s>]/i, reason: '包含 <script> 标签' },
  { re: /\son\w+\s*=/i, reason: '包含 on* 事件属性' },
  { re: /<foreignObject[\s>]/i, reason: '包含 <foreignObject>' },
  { re: /<image[^>]+(xlink:)?href\s*=\s*["']https?:/i, reason: '引用外部图片' },
  { re: /javascript:/i, reason: '包含 javascript: 协议' },
  { re: /<!ENTITY/i, reason: '包含 DTD 实体（XXE 风险）' },
]

function securityCheck(svg: string): void {
  for (const { re, reason } of DANGEROUS) {
    if (re.test(svg)) throw new Error(`安全校验失败：${reason}`)
  }
}

// ─────────────────────────────────────────────────────────
// ③ SVGO 清洗
// ─────────────────────────────────────────────────────────

function cleanSvg(svg: string, file: string): string {
  return optimize(svg, {
    path: file,
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false, // 归一化要用
            cleanupIds: false, // 保留内部 clipPath / gradient 引用
          },
        },
      },
      'removeDimensions',
      'removeXMLNS',
      'removeScriptElement',
      'removeTitle',
      'removeDesc',
      'removeMetadata',
      'removeComments',
      'sortAttrs',
    ],
  }).data
}

// ─────────────────────────────────────────────────────────
// ④ 尺寸归一化
// ─────────────────────────────────────────────────────────

function extractViewBox(svg: string, raw: string): { viewBox: string; aspectRatio: number } {
  const vb = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i)
  if (vb) {
    const n = vb[1].trim().split(/[\s,]+/).map(Number)
    if (n.length === 4 && n.every(Number.isFinite) && n[2] > 0 && n[3] > 0) {
      return { viewBox: n.join(' '), aspectRatio: n[2] / n[3] }
    }
  }
  const w = Number(raw.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1])
  const h = Number(raw.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1])
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { viewBox: `0 0 ${w} ${h}`, aspectRatio: w / h }
  }
  throw new Error('无有效 viewBox 也无 width/height')
}

// ─────────────────────────────────────────────────────────
// ⑤ 颜色判定
// ─────────────────────────────────────────────────────────

function isGrayscale(color: string): boolean {
  const c = color.trim().toLowerCase()
  if (['none', 'transparent', 'currentcolor', 'black', 'white', 'gray', 'grey'].includes(c)) return true

  const h3 = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (h3) return h3[1] === h3[2] && h3[2] === h3[3]

  const h6 = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (h6) return h6[1] === h6[2] && h6[2] === h6[3]

  const rgb = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/)
  if (rgb) return rgb[1] === rgb[2] && rgb[2] === rgb[3]

  return false
}

/** 收集 SVG 内所有色值：属性、内联 style、<style> 块 */
function collectColors(svg: string): string[] {
  const colors: string[] = []

  const attrRe = /\b(?:fill|stroke|stop-color)\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(svg)) !== null) {
    const v = m[1].trim()
    if (v && !v.startsWith('url(')) colors.push(v)
  }

  // 内联 style 与 <style> 块内的声明
  const cssRe = /(?:fill|stroke|stop-color)\s*:\s*([^;"'}]+)/gi
  while ((m = cssRe.exec(svg)) !== null) {
    const v = m[1].trim()
    if (v && !v.startsWith('url(')) colors.push(v)
  }

  return colors
}

function detectColorMode(svg: string): ColorMode {
  // 含 <style> CSS 类定义的素材一律按固定色处理。
  // 这类素材靠多个类名区分不同色块（如 .a{fill:#fff} .b{fill:#211715}），
  // 若把其中的黑白值改成 currentColor，各色块会塌成同一颜色导致图形糊掉或看不见。
  if (/<style[\s>]/i.test(svg)) return 'multicolor'

  const colors = collectColors(svg)
  if (colors.length === 0) return 'monochrome'
  return colors.every(isGrayscale) ? 'monochrome' : 'multicolor'
}

/** 把黑白灰的 fill / stroke 换成 currentColor，实现界面改色 */
function applyCurrentColor(svg: string): string {
  let out = svg.replace(/\b(fill|stroke)\s*=\s*["']([^"']+)["']/gi, (full, attr: string, val: string) => {
    const v = val.trim().toLowerCase()
    if (v === 'none' || v === 'transparent' || v.startsWith('url(')) return full
    return isGrayscale(val) ? `${attr}="currentColor"` : full
  })

  // 内联 style 与 <style> 块
  out = out.replace(/(fill|stroke)\s*:\s*([^;"'}]+)/gi, (seg, prop: string, val: string) => {
    const v = val.trim().toLowerCase()
    if (v === 'none' || v === 'transparent' || v.startsWith('url(')) return seg
    return isGrayscale(val) ? `${prop}:currentColor` : seg
  })

  return out
}

// ─────────────────────────────────────────────────────────
// ⑥ symbol 化
// ─────────────────────────────────────────────────────────

/**
 * 根 <svg> 上的绘图属性必须搬到 <symbol>。
 * Lucide / Tabler / Feather 等库把 stroke / stroke-width 写在根元素让子元素继承，
 * 丢掉这些属性会导致线稿图标渲染成空白或实心黑块。
 */
const INHERITABLE_ATTRS = [
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'stroke-dasharray', 'stroke-opacity',
  'fill-opacity', 'fill-rule', 'clip-rule', 'opacity', 'color',
] as const

function extractRootAttrs(svg: string): Record<string, string> {
  const open = svg.match(/<svg([^>]*)>/i)
  if (!open) return {}
  const attrs: Record<string, string> = {}
  const re = /([\w-]+)\s*=\s*["']([^"']*)["']/g
  let m: RegExpExecArray | null
  while ((m = re.exec(open[1])) !== null) {
    const key = m[1].toLowerCase()
    if ((INHERITABLE_ATTRS as readonly string[]).includes(key)) attrs[key] = m[2]
  }
  return attrs
}

/**
 * 隔离 <style> 块内的 CSS 类名。
 *
 * SVG Repo 这类素材普遍用 .a / .b / .cls-1 等短类名定义色块。多个素材合并进同一个
 * 雪碧图后，这些类名会在同一文档作用域内互相覆盖，导致图形串色。
 * 这里给每个素材的类名加上唯一前缀，彻底隔离。
 */
function scopeClassNames(svg: string, symbolId: string): string {
  if (!/<style[\s>]/i.test(svg)) return svg

  // 收集 <style> 内声明的所有类名
  const classNames = new Set<string>()
  const styleBlocks = svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  for (const block of styleBlocks) {
    const selectors = block[1].matchAll(/\.([\w-]+)/g)
    for (const s of selectors) classNames.add(s[1])
  }
  if (classNames.size === 0) return svg

  let out = svg
  for (const cn of classNames) {
    const scoped = symbolId + "__" + cn
    // 替换 <style> 内的选择器
    out = out.replace(new RegExp(`\\.${cn}(?![\\w-])`, 'g'), `.${scoped}`)
    // 替换元素上的 class 引用
    out = out.replace(/class\s*=\s*["']([^"']*)["']/gi, (full, list: string) => {
      const replaced = list
        .split(/\s+/)
        .map((c) => (c === cn ? scoped : c))
        .join(' ')
      return `class="${replaced}"`
    })
  }
  return out
}

/**
 * 隔离内部 id（clipPath / mask / linearGradient / pattern / filter 等）。
 *
 * 与类名同理：多个素材各自带 id="a" id="clip0" 之类的定义，合并进同一雪碧图后
 * url(#a) 会解析到最先出现的那一个，造成裁剪/渐变错乱。
 */
function scopeIds(svg: string, symbolId: string): string {
  const ids = new Set<string>()
  const idRe = /\sid\s*=\s*["']([^"']+)["']/g
  let m: RegExpExecArray | null
  while ((m = idRe.exec(svg)) !== null) ids.add(m[1])
  if (ids.size === 0) return svg

  let out = svg
  for (const id of ids) {
    const scoped = symbolId + "__" + id
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // id 定义
    out = out.replace(new RegExp(`(\\sid\\s*=\\s*["'])${esc}(["'])`, 'g'), `$1${scoped}$2`)
    // url(#id) 引用
    out = out.replace(new RegExp(`url\\(\\s*#${esc}\\s*\\)`, 'g'), `url(#${scoped})`)
    // xlink:href="#id" / href="#id"
    out = out.replace(new RegExp(`((?:xlink:)?href\\s*=\\s*["'])#${esc}(["'])`, 'g'), `$1#${scoped}$2`)
  }
  return out
}

function extractInner(svg: string): string {
  const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  if (!m) throw new Error('未找到 <svg> 根标签')
  return m[1].trim()
}

// ─────────────────────────────────────────────────────────
// 命名与分类
// ─────────────────────────────────────────────────────────

/** 去掉下载站后缀和重复编号：'gift-svgrepo-com (1).svg' → 'gift' */
function cleanBaseName(file: string): string {
  return basename(file, extname(file))
    .replace(/-svgrepo-com/gi, '')
    .replace(/-?\s*\(\d+\)\s*$/, '')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

const CATEGORY_HINTS: Array<{ re: RegExp; category: Category }> = [
  { re: /(background|backdrop|cityscape|landscape|scene|trees)/i, category: 'background' },
  // 云朵框、放射线这类是承载文字/图片的容器或强调装饰，归边框更合用户直觉
  { re: /(frame|border|stamp|corner|divider|partition|coupon|cloud|concentration-line)/i, category: 'frame' },
  { re: /(pattern|seamless|tile|texture|dots|stripe|grid)/i, category: 'pattern' },
]

function guessCategory(slug: string): Category {
  for (const { re, category } of CATEGORY_HINTS) {
    if (re.test(slug)) return category
  }
  return 'decoration'
}

/** 文件名分词做搜索关键词，过滤无意义词 */
const STOPWORDS = new Set(['and', 'the', 'a', 'an', 'of', 'with', 'for', 'at', 'in', 'on', 'up', 'svgrepo', 'com'])

function makeKeywords(slug: string): string[] {
  return [...new Set(slug.split('-').filter((w) => w.length > 1 && !STOPWORDS.has(w)))]
}

function makeSymbolId(slug: string, used: Set<string>): string {
  const base = slug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'asset'
  let id = `sc-${base}`
  let n = 2
  while (used.has(id)) id = `sc-${base}-${n++}`
  used.add(id)
  return id
}

// ─────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────

/**
 * names.json 支持两种写法：
 *   "file.svg": "中文名"                              —— 只改名
 *   "file.svg": { "name": "中文名", "category": "frame" } —— 同时指定分类
 */
type NameEntry = string | { name?: string; category?: Category }

function loadNames(): Record<string, NameEntry> {
  if (!existsSync(NAMES_FILE)) return {}
  try {
    const raw = JSON.parse(readFileSync(NAMES_FILE, 'utf-8')) as Record<string, NameEntry>
    return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith('_')))
  } catch {
    console.warn('⚠ sucai/names.json 解析失败，已忽略\n')
    return {}
  }
}

function resolveName(file: string, slug: string, names: Record<string, NameEntry>): string {
  const entry = names[file]
  if (typeof entry === 'string') return entry
  if (entry?.name) return entry.name
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function resolveCategory(file: string, slug: string, names: Record<string, NameEntry>): Category {
  const entry = names[file]
  if (typeof entry === 'object' && entry.category) return entry.category
  return guessCategory(slug)
}

function main() {
  console.log('\n═══ SVG 素材导入 ═══\n')

  if (!existsSync(RAW_DIR)) {
    console.error(`未找到素材目录：${RAW_DIR}\n请把 SVG 放进项目同级的 sucai/ 文件夹。\n`)
    process.exit(1)
  }

  const names = loadNames()
  const files = readdirSync(RAW_DIR).filter((f) => f.toLowerCase().endsWith('.svg')).sort()

  if (files.length === 0) {
    console.error(`sucai/ 里没有 SVG 文件。\n`)
    process.exit(1)
  }

  console.log(`发现 ${files.length} 个 SVG 文件\n`)

  const symbols: string[] = []
  const assets: Asset[] = []
  const usedIds = new Set<string>()
  const seenHashes = new Map<string, string>() // 内容 hash → 首次出现的文件名
  const skippedDup: Array<[string, string]> = []
  const failed: Array<[string, string]> = []

  for (const file of files) {
    try {
      const raw = readFileSync(join(RAW_DIR, file), 'utf-8')

      // ① 去重：内容完全相同只留一个
      const hash = createHash('md5').update(raw).digest('hex')
      const prev = seenHashes.get(hash)
      if (prev) {
        skippedDup.push([file, prev])
        continue
      }
      seenHashes.set(hash, file)

      securityCheck(raw)
      const cleaned = cleanSvg(raw, file)
      const { viewBox, aspectRatio } = extractViewBox(cleaned, raw)

      const rootAttrs = extractRootAttrs(raw)
      const rootAttrStr = Object.entries(rootAttrs).map(([k, v]) => `${k}="${v}"`).join(' ')

      const colorMode = detectColorMode(`${cleaned} ${rootAttrStr}`)
      const finalSvg = colorMode === 'monochrome' ? applyCurrentColor(cleaned) : cleaned

      const finalRootAttrs = Object.entries(rootAttrs).map(([k, v]) => {
        if (colorMode === 'monochrome' && (k === 'fill' || k === 'stroke')) {
          const lower = v.trim().toLowerCase()
          if (lower !== 'none' && lower !== 'transparent' && !lower.startsWith('url(') && isGrayscale(v)) {
            return `${k}="currentColor"`
          }
        }
        return `${k}="${v}"`
      })

      const slug = cleanBaseName(file)
      const category = resolveCategory(file, slug, names)
      const symbolId = makeSymbolId(slug, usedIds)
      const name = resolveName(file, slug, names)

      const par = category === 'background' ? ' preserveAspectRatio="none"' : ''
      const attrStr = finalRootAttrs.length > 0 ? ' ' + finalRootAttrs.join(' ') : ''

      // 合并进同一雪碧图前，隔离类名与内部 id，避免素材间互相污染
      const isolated = scopeIds(scopeClassNames(finalSvg, symbolId), symbolId)

      symbols.push(
        `  <!-- ${name} -->\n` +
          `  <symbol id="${symbolId}" viewBox="${viewBox}"${par}${attrStr}>\n` +
          `    ${extractInner(isolated).replace(/\n/g, '\n    ')}\n` +
          `  </symbol>`,
      )

      assets.push({
        id: symbolId,
        name,
        keywords: makeKeywords(slug),
        category,
        symbolId,
        viewBox,
        aspectRatio: Number(aspectRatio.toFixed(4)),
        colorMode,
        recolorable: colorMode === 'monochrome',
      })

      const tag = colorMode === 'monochrome' ? '可改色' : '固定色'
      console.log(`  ✓ ${name.slice(0, 30).padEnd(32)} ${category.padEnd(11)} ${tag}`)
    } catch (err) {
      failed.push([file, (err as Error).message])
      console.error(`  ✗ ${file.slice(0, 40)}  ${(err as Error).message}`)
    }
  }

  mkdirSync(dirname(OUT_SYMBOLS), { recursive: true })
  writeFileSync(
    OUT_SYMBOLS,
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<!-- 自动生成，请勿手动编辑。改素材请动 sucai/ 后重跑 npm run import-assets -->\n` +
      `<!-- 共 ${symbols.length} 个素材 -->\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n\n` +
      symbols.join('\n\n') +
      `\n\n</svg>\n`,
    'utf-8',
  )

  const indexJson = JSON.stringify(
    { version: 1, generatedAt: new Date().toISOString(), total: assets.length, assets },
    null,
    2,
  )
  writeFileSync(OUT_INDEX, indexJson, 'utf-8')
  mkdirSync(dirname(OUT_INDEX_SRC), { recursive: true })
  writeFileSync(OUT_INDEX_SRC, indexJson, 'utf-8')

  // 汇总
  console.log('\n═══ 汇总 ═══')
  console.log(`成功 ${assets.length} 个`)

  if (skippedDup.length > 0) {
    console.log(`\n跳过重复 ${skippedDup.length} 个（内容与已导入文件完全相同）：`)
    for (const [dup, orig] of skippedDup) {
      console.log(`  ${dup}\n    ↳ 同 ${orig}`)
    }
  }

  if (failed.length > 0) {
    console.log(`\n失败 ${failed.length} 个：`)
    for (const [f, msg] of failed) console.log(`  ${f}：${msg}`)
  }

  const byCat = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1
    return acc
  }, {})
  const recolorable = assets.filter((a) => a.recolorable).length

  console.log(`\n分类：${Object.entries(byCat).map(([k, v]) => `${k} ${v}`).join(' / ')}`)
  console.log(`改色：可改色 ${recolorable} 个 / 固定色 ${assets.length - recolorable} 个`)
  console.log(`\n→ public/assets/symbols/sprite.svg`)
  console.log(`→ public/assets/assets.index.json\n`)
}

main()
