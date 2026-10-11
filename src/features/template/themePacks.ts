import type { ThemeKey } from '../../types'

export const themePacks: Record<
  ThemeKey,
  {
    label: string
    artDefault: string
    accent: string
    accentSoft: string
    description: string
  }
> = {
  birthday: {
    label: '生日 · 手绘派对',
    artDefault: '生日快乐',
    accent: '#E85D68',
    accentSoft: '#FBE1DF',
    description: '星点、彩带、手绘圈和圆润艺术字',
  },
  anniversary: {
    label: '纪念 · 纸艺花园',
    artDefault: 'ANNIVERSARY',
    accent: '#2F665A',
    accentSoft: '#DCEAE2',
    description: '叶脉、邮票边框、方形日期标记和衬线艺术字',
  },
}
