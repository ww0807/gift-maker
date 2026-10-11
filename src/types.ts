export type ThemeKey = 'birthday' | 'anniversary'
export type PreviewMode = 'net' | 'collection'
export type HighlightStyle = 'hand_drawn' | 'solid' | 'square' | 'star'
export type GenerationState = 'ready' | 'generating' | 'warning'
export type EditablePanelId = 'front' | 'right' | 'back' | 'left'
export type TitleFontKey = 'noto-serif' | 'noto-sans' | 'florida-vibes' | 'georgia' | 'lato' | 'roboto' | 'trebuchet' | 'verdana'
export type EditableTextKey = 'titleArt' | 'caption' | 'message'

export const titleFontOptions: Array<{ key: TitleFontKey; label: string; family: string; supportsChinese: boolean }> = [
  { key: 'noto-serif', label: '思源宋体', family: '"Noto Serif SC"', supportsChinese: true },
  { key: 'noto-sans', label: '思源黑体', family: '"Noto Sans SC"', supportsChinese: true },
  { key: 'florida-vibes', label: 'Florida Vibes', family: '"Florida Vibes"', supportsChinese: false },
  { key: 'georgia', label: 'Georgia', family: 'Georgia', supportsChinese: false },
  { key: 'lato', label: 'Lato', family: 'Lato', supportsChinese: false },
  { key: 'roboto', label: 'Roboto', family: 'Roboto', supportsChinese: false },
  { key: 'trebuchet', label: 'Trebuchet MS', family: '"Trebuchet MS"', supportsChinese: false },
  { key: 'verdana', label: 'Verdana', family: 'Verdana', supportsChinese: false },
]

export interface ElementPlacement {
  id: string
  assetId: string
  kind?: 'asset' | 'text'
  text?: string
  language?: 'zh-CN' | 'en'
  font?: TitleFontKey
  width?: number
  height?: number
  x: number
  y: number
  scale: number
  rotation: number
  color?: string
}

export interface PanelContent {
  elements: ElementPlacement[]
}

export interface TextLayout {
  x: number
  y: number
  scale: number
  rotation: number
  font: TitleFontKey
  color?: string
}

export interface CharacterLayout {
  x: number
  y: number
  scale: number
  rotation: number
}

export const defaultCharacterLayout: CharacterLayout = { x: 10.5, y: 19, scale: 1, rotation: 0 }

export const editableTextMeta: Record<EditableTextKey, { label: string; panelId: EditablePanelId; width: number; height: number; default: TextLayout }> = {
  titleArt: { label: '日历标题', panelId: 'back', width: 60, height: 12, default: { x: 37.5, y: 18, scale: 1, rotation: 0, font: 'noto-sans' } },
  caption: { label: '日历脚注', panelId: 'back', width: 62, height: 7, default: { x: 37.5, y: 101, scale: 1, rotation: 0, font: 'noto-sans' } },
  message: { label: '赠言', panelId: 'left', width: 62, height: 36, default: { x: 37.5, y: 49, scale: 1, rotation: 0, font: 'noto-sans' } },
}

export interface BoxDraft {
  boxNo: 1 | 2 | 3 | 4
  photoName: string
  cardName?: string
  generatedImageUrl?: string
  characterLayout?: CharacterLayout
  message: string
  dateOverride: string
  titleArt: string
  titleFont: TitleFontKey
  caption: string
  textLayouts?: Partial<Record<EditableTextKey, TextLayout>>
  isSecret: boolean
  generationState: GenerationState
  panels: Partial<Record<EditablePanelId, PanelContent>>
}

export interface WorkspaceDraft {
  theme: ThemeKey
  primaryColor: string
  seriesName: string
  locale: 'zh-CN' | 'en'
  highlightStyle: HighlightStyle
  boxes: BoxDraft[]
}

export const colorOptions = [
  { name: '燕麦奶', value: '#F7F0CF' },
  { name: '薄荷雾', value: '#D8F1E8' },
  { name: '雾蓝', value: '#DCECF8' },
  { name: '薰衣草', value: '#E9DCF1' },
  { name: '玫瑰灰', value: '#F0D9D9' },
  { name: '樱花粉', value: '#F3E0EA' },
  { name: '石墨灰', value: '#E5E7E6' },
  { name: '海盐蓝', value: '#D7F0F1' },
]

export const elementColorOptions = [
  { name: '墨绿', value: '#286052' },
  { name: '珊瑚红', value: '#E85D68' },
  { name: '玫红', value: '#C34D7A' },
  { name: '橙黄', value: '#D18428' },
  { name: '湖蓝', value: '#287A9C' },
  { name: '靛蓝', value: '#465A9C' },
  { name: '紫罗兰', value: '#8056A0' },
  { name: '石墨灰', value: '#39443F' },
]

export const initialDraft: WorkspaceDraft = {
  theme: 'birthday',
  primaryColor: '#DCECF8',
  seriesName: '我们的二十岁',
  locale: 'zh-CN',
  highlightStyle: 'hand_drawn',
  boxes: [
    {
      boxNo: 1,
      photoName: 'IMG_8821.JPG',
      cardName: '小卡 01',
      message: '那天的阳光正好，你穿着白衬衫走过来，成了我青春里最亮的风景。',
      dateOverride: '2026-06-17',
      titleArt: '生日快乐',
      titleFont: 'noto-serif',
      caption: '我们的纪念',
      isSecret: false,
      generationState: 'ready',
      panels: {},
    },
    {
      boxNo: 2,
      photoName: 'IMG_9012.JPG',
      message: '翻过这座山，我们会看见更大的世界。',
      dateOverride: '2022-06-30',
      titleArt: '一路向前',
      titleFont: 'noto-serif',
      caption: '毕业那天',
      isSecret: false,
      generationState: 'ready',
      panels: {},
    },
    {
      boxNo: 3,
      photoName: 'WechatIMG2.JPG',
      message: '零点的烟花升起时，愿望里一直都有你。',
      dateOverride: '2025-12-31',
      titleArt: '新年快乐',
      titleFont: 'noto-sans',
      caption: '烟花之夜',
      isSecret: false,
      generationState: 'ready',
      panels: {},
    },
    {
      boxNo: 4,
      photoName: 'Selfie.JPG',
      cardName: '小卡 04',
      message: '把未知的明天，慢慢走成我们的故事。',
      dateOverride: '2026-08-15',
      titleArt: '未来可期',
      titleFont: 'noto-serif',
      caption: '隐藏惊喜',
      isSecret: true,
      generationState: 'ready',
      panels: {},
    },
  ],
}
