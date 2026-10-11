import Moveable from 'react-moveable'
import { type PointerEvent, useMemo, useRef, useState } from 'react'
import { defaultCharacterLayout, editableTextMeta, type BoxDraft, type CharacterLayout, type EditablePanelId, type EditableTextKey, type ElementPlacement, type TextLayout, type WorkspaceDraft } from '../../types'
import { findEditorAsset } from './assets'
import { NetSvg } from '../template/NetSvg'
import { PANELS, PAPER } from '../template/structure-v1'

interface NetEditorProps {
  draft: WorkspaceDraft
  box: BoxDraft
  activePanel: EditablePanelId
  selectedElementId: string | null
  selectedTextKey: EditableTextKey | null
  selectedCharacter: boolean
  onPanelSelect: (panelId: EditablePanelId) => void
  onElementSelect: (panelId: EditablePanelId, elementId: string) => void
  onTextSelect: (panelId: EditablePanelId, textKey: EditableTextKey) => void
  onCharacterSelect: () => void
  onClearElementSelection: () => void
  onUpdateElement: (panelId: EditablePanelId, elementId: string, patch: Partial<ElementPlacement>, commit?: boolean) => void
  onUpdateTextLayout: (textKey: EditableTextKey, patch: Partial<TextLayout>, commit?: boolean) => void
  onUpdateCharacterLayout: (patch: Partial<CharacterLayout>, commit?: boolean) => void
  onBeginTransform: () => void
  onCommitTransform: () => void
}

type TransformStart = { x: number; y: number; scale: number; rotation: number }

export function NetEditor({
  draft,
  box,
  activePanel,
  selectedElementId,
  selectedTextKey,
  selectedCharacter,
  onPanelSelect,
  onElementSelect,
  onTextSelect,
  onCharacterSelect,
  onClearElementSelection,
  onUpdateElement,
  onUpdateTextLayout,
  onUpdateCharacterLayout,
  onBeginTransform,
  onCommitTransform,
}: NetEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<TransformStart | null>(null)
  const textDragRef = useRef<{ pointerId: number; clientX: number; clientY: number; layout: TransformStart } | null>(null)
  const [target, setTarget] = useState<HTMLDivElement | null>(null)
  const selectedElement = useMemo(
    () => box.panels[activePanel]?.elements.find((element) => element.id === selectedElementId) ?? null,
    [activePanel, box.panels, selectedElementId],
  )
  const selectedText = selectedTextKey
    ? { key: selectedTextKey, meta: editableTextMeta[selectedTextKey], layout: box.textLayouts?.[selectedTextKey] ?? (selectedTextKey === 'titleArt' ? { ...editableTextMeta.titleArt.default, font: box.titleFont } : editableTextMeta[selectedTextKey].default) }
    : null

  const millimetresPerPixel = () => {
    const width = svgRef.current?.getBoundingClientRect().width ?? 1
    return 420 / width
  }

  const begin = () => {
    const item = selectedElement ?? selectedText?.layout ?? (selectedCharacter ? box.characterLayout ?? defaultCharacterLayout : null)
    if (!item) return
    startRef.current = { x: item.x, y: item.y, scale: item.scale, rotation: item.rotation }
    onBeginTransform()
  }

  const update = (patch: { x?: number; y?: number; scale?: number; rotation?: number }) => {
    if (selectedElementId) onUpdateElement(activePanel, selectedElementId, patch, false)
    if (selectedText) onUpdateTextLayout(selectedText.key, patch, false)
    if (selectedCharacter) onUpdateCharacterLayout(patch, false)
  }

  const asset = selectedElement ? findEditorAsset(selectedElement.assetId) : undefined
  const panel = PANELS[activePanel]
  const elementWidth = selectedElement?.width ?? asset?.defaultWidth
  const elementHeight = selectedElement?.height ?? asset?.defaultHeight
  const editorTargetStyle = selectedElement && elementWidth && elementHeight
    ? {
        left: `${((panel.x + selectedElement.x) / PAPER.width) * 100}%`,
        top: `${((panel.y + selectedElement.y) / PAPER.height) * 100}%`,
        width: `${(elementWidth * selectedElement.scale / PAPER.width) * 100}%`,
        height: `${(elementHeight * selectedElement.scale / PAPER.height) * 100}%`,
        transform: `rotate(${selectedElement.rotation}deg)`,
      }
    : undefined
  const textTargetStyle = selectedText
    ? {
        left: `${((PANELS[selectedText.meta.panelId].x + selectedText.layout.x - selectedText.meta.width / 2) / PAPER.width) * 100}%`,
        top: `${((PANELS[selectedText.meta.panelId].y + selectedText.layout.y - selectedText.meta.height + 2) / PAPER.height) * 100}%`,
        width: `${(selectedText.meta.width * selectedText.layout.scale / PAPER.width) * 100}%`,
        height: `${(selectedText.meta.height * selectedText.layout.scale / PAPER.height) * 100}%`,
        transform: `rotate(${selectedText.layout.rotation}deg)`,
      }
    : undefined
  const characterLayout = box.characterLayout ?? defaultCharacterLayout
  const characterTargetStyle = selectedCharacter
    ? {
        left: `${((PANELS.front.x + characterLayout.x) / PAPER.width) * 100}%`,
        top: `${((PANELS.front.y + characterLayout.y) / PAPER.height) * 100}%`,
        width: `${(54 * characterLayout.scale / PAPER.width) * 100}%`,
        height: `${(54 * 1.35 * characterLayout.scale / PAPER.height) * 100}%`,
        transform: `rotate(${characterLayout.rotation}deg)`,
      }
    : undefined
  const startTextDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!selectedText) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    textDragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      layout: {
        x: selectedText.layout.x,
        y: selectedText.layout.y,
        scale: selectedText.layout.scale,
        rotation: selectedText.layout.rotation,
      },
    }
    onBeginTransform()
  }

  const dragText = (event: PointerEvent<HTMLDivElement>) => {
    const drag = textDragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !selectedText) return
    const mmPerPixel = millimetresPerPixel()
    onUpdateTextLayout(selectedText.key, {
      x: drag.layout.x + (event.clientX - drag.clientX) * mmPerPixel,
      y: drag.layout.y + (event.clientY - drag.clientY) * mmPerPixel,
    }, false)
  }

  const finishTextDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (textDragRef.current?.pointerId !== event.pointerId) return
    textDragRef.current = null
    onCommitTransform()
  }

  return (
    <div
      className="net-editor"
      onClick={() => {
        onClearElementSelection()
      }}
      ref={editorRef}
    >
      <NetSvg
        activePanel={activePanel}
        box={box}
        draft={draft}
        onElementSelect={onElementSelect}
        onTextSelect={onTextSelect}
        onCharacterSelect={onCharacterSelect}
        onPanelSelect={onPanelSelect}
        selectedElementId={selectedElementId}
        selectedCharacter={selectedCharacter}
        selectedTextKey={selectedTextKey}
        showElementOutline={false}
        svgRef={svgRef}
      />
      {editorTargetStyle && (
        <div aria-label="已选素材编辑区域" className="editor-target" onClick={(event) => event.stopPropagation()} ref={setTarget} style={editorTargetStyle} />
      )}
      {textTargetStyle && (
        <div
          aria-label="拖拽移动已选文字"
          className="editor-target editor-text-target"
          key={`text-${selectedText?.key}`}
          onPointerCancel={finishTextDrag}
          onPointerDown={startTextDrag}
          onPointerMove={dragText}
          onPointerUp={finishTextDrag}
          onClick={(event) => event.stopPropagation()}
          ref={setTarget}
          style={textTargetStyle}
        />
      )}
      {characterTargetStyle && (
        <div
          aria-label="拖拽缩放正面人物"
          className="editor-target editor-character-target"
          onClick={(event) => event.stopPropagation()}
          ref={setTarget}
          style={characterTargetStyle}
        />
      )}
      {target && (
        <Moveable
          container={editorRef.current}
          draggable={!selectedText}
          keepRatio
          origin={false}
          renderDirections={['nw', 'ne', 'sw', 'se']}
          rotatable
          scalable
          snappable
          target={target}
          key={selectedText ? `moveable-text-${selectedText.key}` : selectedCharacter ? 'moveable-character' : `moveable-asset-${selectedElementId}`}
          throttleRotate={1}
          onDragStart={begin}
          onDrag={({ beforeTranslate }) => {
            const start = startRef.current
            if (!start) return
            const mmPerPixel = millimetresPerPixel()
            update({ x: start.x + beforeTranslate[0] * mmPerPixel, y: start.y + beforeTranslate[1] * mmPerPixel })
          }}
          onDragEnd={onCommitTransform}
          onRotateStart={(event) => {
            begin()
            event.set(startRef.current?.rotation ?? 0)
          }}
          onRotate={({ beforeRotation }) => update({ rotation: beforeRotation })}
          onRotateEnd={onCommitTransform}
          onScaleStart={(event) => {
            begin()
            event.set([1, 1])
          }}
          onScale={({ scale }) => {
            const start = startRef.current
            if (start) update({ scale: start.scale * scale[0] })
          }}
          onScaleEnd={onCommitTransform}
        />
      )}
      {selectedElement && (
        <span className="editor-selection-status">
          {selectedElement.kind === 'text' ? '添加文字' : findEditorAsset(selectedElement.assetId)?.name ?? '素材'} · {activePanel.toUpperCase()}
        </span>
      )}
      {selectedText && <span className="editor-selection-status">{selectedText.meta.label} · {selectedText.meta.panelId.toUpperCase()}</span>}
      {selectedCharacter && <span className="editor-selection-status">正面人物 · FRONT</span>}
    </div>
  )
}
