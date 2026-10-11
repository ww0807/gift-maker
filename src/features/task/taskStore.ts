import { produce } from 'immer'
import { create } from 'zustand'
import { findEditorAsset } from '../editor/assets'
import { defaultPlacement } from '../editor/placement'
import { PANELS, isEditablePanelId } from '../template/structure-v1'
import { defaultCharacterLayout, editableTextMeta, initialDraft, type BoxDraft, type CharacterLayout, type EditablePanelId, type EditableTextKey, type ElementPlacement, type PreviewMode, type TextLayout, type WorkspaceDraft } from '../../types'

type Snapshot = Pick<WorkspaceDraft, 'theme' | 'primaryColor' | 'seriesName' | 'locale' | 'highlightStyle' | 'boxes'>

interface TaskStore {
  draft: WorkspaceDraft
  activeBox: BoxDraft['boxNo']
  activePanel: EditablePanelId
  selectedElementId: string | null
  selectedTextKey: EditableTextKey | null
  selectedCharacter: boolean
  previewMode: PreviewMode
  collectionConfirmed: boolean
  past: Snapshot[]
  future: Snapshot[]
  pendingTransform: Snapshot | null
  updateDraft: (patch: Partial<WorkspaceDraft>) => void
  updateBox: (boxNo: BoxDraft['boxNo'], patch: Partial<BoxDraft>) => void
  addAsset: (assetId: string, panelIds: EditablePanelId[]) => void
  addText: (panelIds: EditablePanelId[]) => void
  updateElement: (boxNo: BoxDraft['boxNo'], panelId: EditablePanelId, elementId: string, patch: Partial<ElementPlacement>, commit?: boolean) => void
  updateTextLayout: (boxNo: BoxDraft['boxNo'], textKey: EditableTextKey, patch: Partial<TextLayout>, commit?: boolean) => void
  updateCharacterLayout: (boxNo: BoxDraft['boxNo'], patch: Partial<CharacterLayout>, commit?: boolean) => void
  resetTextLayout: (boxNo: BoxDraft['boxNo'], textKey: EditableTextKey) => void
  beginElementTransform: () => void
  commitElementTransform: () => void
  removeSelectedElement: () => void
  moveSelectedElementLayer: (direction: 'forward' | 'backward') => void
  setActiveBox: (boxNo: BoxDraft['boxNo']) => void
  setActivePanel: (panelId: EditablePanelId) => void
  setSelectedElementId: (elementId: string | null) => void
  setSelectedTextKey: (textKey: EditableTextKey | null) => void
  setSelectedCharacter: (selected: boolean) => void
  setPreviewMode: (mode: PreviewMode) => void
  setCollectionConfirmed: (confirmed: boolean) => void
  hydrate: (draft: WorkspaceDraft) => void
  undo: () => void
  redo: () => void
}

const snapshot = (draft: WorkspaceDraft): Snapshot => structuredClone(draft)

function withHistory(state: TaskStore, nextDraft: WorkspaceDraft) {
  return { draft: nextDraft, past: [...state.past, snapshot(state.draft)].slice(-40), future: [] }
}

function clampElement(element: ElementPlacement, panelId: EditablePanelId) {
  const asset = findEditorAsset(element.assetId)
  const panel = PANELS[panelId]
  const width = (element.width ?? asset?.defaultWidth ?? 16) * element.scale
  const height = (element.height ?? asset?.defaultHeight ?? 16) * element.scale
  const minX = 2
  const minY = 2
  return {
    ...element,
    scale: Math.min(3, Math.max(.35, element.scale)),
    x: Math.min(panel.width - width - minX, Math.max(minX, element.x)),
    y: Math.min(panel.height - height - minY, Math.max(minY, element.y)),
  }
}

function clampTextLayout(textKey: EditableTextKey, layout: TextLayout) {
  const panel = PANELS[editableTextMeta[textKey].panelId]
  return {
    ...layout,
    scale: Math.min(3, Math.max(.35, layout.scale)),
    x: Math.min(panel.width - 2, Math.max(2, layout.x)),
    y: Math.min(panel.height - 2, Math.max(2, layout.y)),
    rotation: Math.min(360, Math.max(-360, layout.rotation)),
  }
}

function clampCharacterLayout(layout: CharacterLayout) {
  const panel = PANELS.front
  const width = 54 * layout.scale
  const height = 72.9 * layout.scale
  return {
    ...layout,
    scale: Math.min(1.45, Math.max(.45, layout.scale)),
    x: Math.min(panel.width - width - 2, Math.max(2, layout.x)),
    y: Math.min(panel.height - height - 2, Math.max(2, layout.y)),
    rotation: Math.min(360, Math.max(-360, layout.rotation)),
  }
}

export const useTaskStore = create<TaskStore>((set) => ({
  draft: initialDraft,
  activeBox: 1,
  activePanel: 'front',
  selectedElementId: null,
  selectedTextKey: null,
  selectedCharacter: false,
  previewMode: 'net',
  collectionConfirmed: false,
  past: [],
  future: [],
  pendingTransform: null,
  updateDraft: (patch) => set((state) => withHistory(state, { ...state.draft, ...patch })),
  updateBox: (boxNo, patch) => set((state) => {
    const draft = produce(state.draft, (next) => {
      const box = next.boxes.find((item) => item.boxNo === boxNo)
      if (box) Object.assign(box, patch)
    })
    return withHistory(state, draft)
  }),
  addAsset: (assetId, panelIds) => set((state) => {
    const asset = findEditorAsset(assetId)
    if (!asset) return {}
    const targetPanels = [...new Set(panelIds)].filter((panelId) => isEditablePanelId(PANELS[panelId].id))
    if (!targetPanels.length) return {}
    const box = state.draft.boxes.find((item) => item.boxNo === state.activeBox)
    const created: Array<{ panelId: EditablePanelId; element: ElementPlacement }> = targetPanels.map((panelId) => {
      // 落点避开模板内容（人物 / 日历 / 赠言），优先放到上方留白
      const existingCount = box?.panels[panelId]?.elements.length ?? 0
      const spot = defaultPlacement(panelId, asset.defaultWidth, asset.defaultHeight, existingCount)
      return {
        panelId,
        element: clampElement({
          id: crypto.randomUUID(),
          assetId,
          x: spot.x,
          y: spot.y,
          scale: spot.scale,
          rotation: 0,
          color: '#286052',
        }, panelId),
      }
    })
    const draft = produce(state.draft, (next) => {
      const box = next.boxes.find((item) => item.boxNo === state.activeBox)
      if (!box) return
      created.forEach(({ panelId, element }) => {
        const content = box.panels[panelId] ?? { elements: [] }
        content.elements.push(element)
        box.panels[panelId] = content
      })
    })
    const activeElement = created.find((item) => item.panelId === state.activePanel) ?? created[0]
    return { ...withHistory(state, draft), activePanel: activeElement.panelId, selectedElementId: activeElement.element.id }
  }),
  addText: (panelIds) => set((state) => {
    const targets = [...new Set(panelIds)].filter((panelId) => isEditablePanelId(PANELS[panelId].id))
    const created = targets.map((panelId) => {
      const panel = PANELS[panelId]
      const element = clampElement({
        id: crypto.randomUUID(),
        assetId: '',
        kind: 'text',
        text: '请输入',
        language: 'zh-CN',
        font: 'noto-sans',
        width: 42,
        height: 12,
        x: (panel.width - 42) / 2,
        y: 12,
        scale: 1,
        rotation: 0,
      }, panelId)
      return { panelId, element }
    })
    const draft = produce(state.draft, (next) => {
      const currentBox = next.boxes.find((item) => item.boxNo === state.activeBox)
      if (!currentBox) return
      created.forEach(({ panelId, element }) => {
        const content = currentBox.panels[panelId] ?? { elements: [] }
        content.elements.push(element)
        currentBox.panels[panelId] = content
      })
    })
    const activeElement = created.find((item) => item.panelId === state.activePanel) ?? created[0]
    return { ...withHistory(state, draft), activePanel: activeElement.panelId, selectedElementId: activeElement.element.id, selectedTextKey: null }
  }),
  updateElement: (boxNo, panelId, elementId, patch, commit = true) => set((state) => {
    const draft = produce(state.draft, (next) => {
      const box = next.boxes.find((item) => item.boxNo === boxNo)
      const element = box?.panels[panelId]?.elements.find((item) => item.id === elementId)
      if (element) Object.assign(element, clampElement({ ...element, ...patch }, panelId))
    })
    return commit ? withHistory(state, draft) : { draft }
  }),
  updateTextLayout: (boxNo, textKey, patch, commit = true) => set((state) => {
    const draft = produce(state.draft, (next) => {
      const box = next.boxes.find((item) => item.boxNo === boxNo)
      if (!box) return
      const current = box.textLayouts?.[textKey] ?? editableTextMeta[textKey].default
      box.textLayouts = { ...box.textLayouts, [textKey]: clampTextLayout(textKey, { ...current, ...patch }) }
      if (textKey === 'titleArt' && patch.font) box.titleFont = patch.font
    })
    return commit ? withHistory(state, draft) : { draft }
  }),
  updateCharacterLayout: (boxNo, patch, commit = true) => set((state) => {
    const draft = produce(state.draft, (next) => {
      const box = next.boxes.find((item) => item.boxNo === boxNo)
      if (!box) return
      box.characterLayout = clampCharacterLayout({ ...(box.characterLayout ?? defaultCharacterLayout), ...patch })
    })
    return commit ? withHistory(state, draft) : { draft }
  }),
  resetTextLayout: (boxNo, textKey) => set((state) => {
    const draft = produce(state.draft, (next) => {
      const box = next.boxes.find((item) => item.boxNo === boxNo)
      if (!box) return
      box.textLayouts = {
        ...box.textLayouts,
        [textKey]: {
          ...editableTextMeta[textKey].default,
          font: textKey === 'titleArt' ? box.titleFont : editableTextMeta[textKey].default.font,
          color: box.textLayouts?.[textKey]?.color,
        },
      }
    })
    return withHistory(state, draft)
  }),
  beginElementTransform: () => set((state) => ({ pendingTransform: snapshot(state.draft) })),
  commitElementTransform: () => set((state) => {
    if (!state.pendingTransform) return {}
    return { past: [...state.past, state.pendingTransform].slice(-40), future: [], pendingTransform: null }
  }),
  removeSelectedElement: () => set((state) => {
    if (!state.selectedElementId) return {}
    const draft = produce(state.draft, (next) => {
      const box = next.boxes.find((item) => item.boxNo === state.activeBox)
      const content = box?.panels[state.activePanel]
      if (content) content.elements = content.elements.filter((element) => element.id !== state.selectedElementId)
    })
    return { ...withHistory(state, draft), selectedElementId: null }
  }),
  moveSelectedElementLayer: (direction) => set((state) => {
    if (!state.selectedElementId) return {}
    const draft = produce(state.draft, (next) => {
      const elements = next.boxes.find((item) => item.boxNo === state.activeBox)?.panels[state.activePanel]?.elements
      if (!elements) return
      const index = elements.findIndex((element) => element.id === state.selectedElementId)
      const nextIndex = direction === 'forward' ? index + 1 : index - 1
      if (index < 0 || nextIndex < 0 || nextIndex >= elements.length) return
      ;[elements[index], elements[nextIndex]] = [elements[nextIndex], elements[index]]
    })
    return withHistory(state, draft)
  }),
  setActiveBox: (activeBox) => set({ activeBox, selectedElementId: null, selectedTextKey: null, selectedCharacter: false }),
  setActivePanel: (activePanel) => set({ activePanel, selectedElementId: null, selectedTextKey: null, selectedCharacter: false }),
  setSelectedElementId: (selectedElementId) => set({ selectedElementId, selectedTextKey: null, selectedCharacter: false }),
  setSelectedTextKey: (selectedTextKey) => set({ selectedTextKey, selectedElementId: null, selectedCharacter: false }),
  setSelectedCharacter: (selectedCharacter) => set({ selectedCharacter, selectedElementId: null, selectedTextKey: null }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  setCollectionConfirmed: (collectionConfirmed) => set({ collectionConfirmed }),
  hydrate: (draft) => set({
    draft: structuredClone(draft),
    activeBox: 1,
    activePanel: 'front',
    selectedElementId: null,
    selectedTextKey: null,
    selectedCharacter: false,
    previewMode: 'net',
    collectionConfirmed: false,
    past: [],
    future: [],
    pendingTransform: null,
  }),
  undo: () => set((state) => {
    const previous = state.past.at(-1)
    if (!previous) return {}
    return { draft: structuredClone(previous), past: state.past.slice(0, -1), future: [snapshot(state.draft), ...state.future] }
  }),
  redo: () => set((state) => {
    const next = state.future[0]
    if (!next) return {}
    return { draft: structuredClone(next), past: [...state.past, snapshot(state.draft)].slice(-40), future: state.future.slice(1) }
  }),
}))
