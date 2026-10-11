import { ArrowLeft, Download, Eye, FileOutput, LayoutTemplate, Redo2, Save, Undo2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { BoxAccordion } from '../components/BoxAccordion'
import { CanvasViewport } from '../components/CanvasViewport'
import { GlobalControls } from '../components/GlobalControls'
import { InsertedTextPanel } from '../components/InsertedTextPanel'
import { TypographyPanel } from '../components/TypographyPanel'
import { AssetPanel } from '../features/editor/AssetPanel'
import { NetEditor } from '../features/editor/NetEditor'
import { loadDraft, reportExport, saveDraft } from '../features/task/draftApi'
import { getTask, hasRemoteApi } from '../features/task/taskApi'
import { mockTaskApi } from '../features/task/mockTaskApi'
import { useTaskStore } from '../features/task/taskStore'
import { ParallelPreview } from '../features/template/ParallelPreview'
import { themePacks } from '../features/template/themePacks'

export function WorkspacePage() {
  const navigate = useNavigate()
  const { taskId = 'demo-task' } = useParams()
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [panelWidth, setPanelWidth] = useState(336)
  const resizeStart = useRef<{ pointerId: number; x: number; width: number } | null>(null)
  const {
    draft,
    activeBox,
    activePanel,
    selectedElementId,
    selectedTextKey,
    selectedCharacter,
    previewMode,
    collectionConfirmed,
    past,
    future,
    updateDraft,
    updateBox,
    addAsset,
    addText,
    updateElement,
    updateTextLayout,
    updateCharacterLayout,
    resetTextLayout,
    removeSelectedElement,
    moveSelectedElementLayer,
    setActiveBox,
    setActivePanel,
    setSelectedElementId,
    setSelectedTextKey,
    setSelectedCharacter,
    setPreviewMode,
    setCollectionConfirmed,
    beginElementTransform,
    commitElementTransform,
    undo,
    redo,
    hydrate,
  } = useTaskStore()

  const selectedBox = draft.boxes.find((box) => box.boxNo === activeBox) ?? draft.boxes[0]
  const panelCounts = {
    front: selectedBox.panels.front?.elements.length ?? 0,
    right: selectedBox.panels.right?.elements.length ?? 0,
    back: selectedBox.panels.back?.elements.length ?? 0,
    left: selectedBox.panels.left?.elements.length ?? 0,
  }
  const selectedElement = selectedBox.panels[activePanel]?.elements.find(
    (element) => element.id === selectedElementId,
  ) ?? null

  useEffect(() => {
    let active = true
    void loadDraft(taskId)
      .then((saved) => {
        if (active && saved) hydrate(saved)
      })
      .catch(() => {
        if (active) setExportError('草稿读取失败，已使用当前版本。')
      })
      .finally(() => {
        if (active) setDraftLoaded(true)
      })
    return () => {
      active = false
    }
  }, [hydrate, taskId])

  useEffect(() => {
    if (!hasRemoteApi) return
    let active = true
    void getTask(taskId).then((task) => {
      if (!active) return
      task.boxes.forEach((box) => {
        if (box.imageUrl) updateBox(box.boxNo, { generatedImageUrl: box.imageUrl })
      })
    }).catch(() => undefined)
    return () => {
      active = false
    }
  }, [taskId, updateBox])

  useEffect(() => {
    if (!draftLoaded) return
    const timeout = window.setTimeout(() => {
      void saveDraft(taskId, draft).catch(() => setExportError('草稿保存失败，已保留在当前浏览器。'))
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [draft, draftLoaded, taskId])

  const regenerate = async (boxNo: 1 | 2 | 3 | 4) => {
    updateBox(boxNo, { generationState: 'generating' })
    await mockTaskApi.regenerateBox(boxNo)
    updateBox(boxNo, { generationState: 'ready' })
  }

  const exportTask = async () => {
    setIsExporting(true)
    setExportError('')
    try {
      const { exportA3Pdf } = await import('../features/template/export/exportPDF')
      await exportA3Pdf(draft)
      await reportExport(taskId)
      navigate(`/result/${taskId}`)
    } catch {
      setExportError('导出失败，请重试。')
      setIsExporting(false)
    }
  }

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeStart.current = { pointerId: event.pointerId, x: event.clientX, width: panelWidth }
  }

  const resizePanel = (event: PointerEvent<HTMLDivElement>) => {
    const start = resizeStart.current
    if (!start || start.pointerId !== event.pointerId) return
    setPanelWidth(Math.min(520, Math.max(280, start.width + event.clientX - start.x)))
  }

  const stopResize = (event: PointerEvent<HTMLDivElement>) => {
    if (resizeStart.current?.pointerId === event.pointerId) resizeStart.current = null
  }

  return (
    <main className="workspace-shell">
      <header className="app-header">
        <div className="brand-block">
          <span className="brand-mark">M</span>
          <div><strong>礼物制作工作台</strong><small>纸艺礼物 · MVP</small></div>
        </div>
        <div aria-label="制作流程" className="header-progress" role="tablist">
          <button onClick={() => navigate('/upload')} role="tab" type="button">1 上传</button>
          <button onClick={() => navigate(`/confirm/${taskId}`)} role="tab" type="button">2 Q版形象</button>
          <button aria-selected="true" className="current" onClick={() => navigate(`/workspace/${taskId}`)} role="tab" type="button">3 排版预览</button>
        </div>
        <div className="header-actions">
          <button className="ghost-button" onClick={() => navigate(`/confirm/${taskId}`)} type="button"><ArrowLeft size={15} /> 返回Q版形象</button>
          <button className="ghost-button" disabled={!past.length} onClick={undo} type="button"><Undo2 size={15} /> 撤销</button>
          <button className="ghost-button" disabled={!future.length} onClick={redo} type="button"><Redo2 size={15} /> 重做</button>
          <button className="ghost-button" type="button"><Save size={15} /> 自动保存</button>
          <button className="primary-button" disabled={!collectionConfirmed || isExporting} onClick={exportTask} type="button">
            <Download size={16} /> {isExporting ? '正在生成文件…' : '导出 4 张 A3'}
          </button>
        </div>
      </header>

      <section className="workspace-body">
        <aside className="editor-panel" style={{ width: panelWidth }}>
          <GlobalControls
            activePanel={activePanel}
            draft={draft}
            onPanelSelect={setActivePanel}
            panelCounts={panelCounts}
            updateDraft={updateDraft}
          />
          <AssetPanel
            activePanel={activePanel}
            afterAddText={
              <InsertedTextPanel
                element={selectedElement}
                onRemove={removeSelectedElement}
                onUpdate={(patch) => {
                  if (selectedElementId) {
                    updateElement(selectedBox.boxNo, activePanel, selectedElementId, patch)
                  }
                }}
              />
            }
            onAdd={addAsset}
            onAddText={addText}
            onMoveLayer={moveSelectedElementLayer}
            onRemove={removeSelectedElement}
            onUpdate={(patch) => {
              if (selectedElementId) {
                updateElement(selectedBox.boxNo, activePanel, selectedElementId, patch)
              }
            }}
            panelCounts={panelCounts}
            selectedElement={selectedElement}
            selectedElementId={selectedElementId}
          />
          <TypographyPanel
            box={selectedBox}
            titleColor={themePacks[draft.theme].accent}
            onUpdateColor={(textKey, color) => updateTextLayout(selectedBox.boxNo, textKey, { color })}
            onUpdateFont={(textKey, font) => updateTextLayout(selectedBox.boxNo, textKey, { font })}
            onResetLayout={(textKey) => resetTextLayout(selectedBox.boxNo, textKey)}
            selectedTextKey={selectedTextKey}
          />
          <section className="control-section box-section">
            <div className="section-kicker"><LayoutTemplate size={14} /> L3 · 单盒变量</div>
            {draft.boxes.map((box) => (
              <BoxAccordion
                box={box}
                key={box.boxNo}
                onRegenerate={() => regenerate(box.boxNo)}
                onToggle={() => setActiveBox(box.boxNo)}
                onUpdate={(patch) => updateBox(box.boxNo, patch)}
                open={activeBox === box.boxNo}
                titleColor={themePacks[draft.theme].accent}
              />
            ))}
          </section>
        </aside>
        <div aria-label="拖拽调整左侧面板宽度" className="panel-resize-handle" onPointerCancel={stopResize} onPointerDown={startResize} onPointerMove={resizePanel} onPointerUp={stopResize} role="separator" />

        <section className="preview-area">
          <div className="preview-toolbar">
            <div className="preview-caption"><span className="pulse-dot" /> 排版引擎就绪 · 本地实时预览</div>
            <div className="view-tabs">
              <button className={previewMode === 'net' ? 'active' : ''} onClick={() => setPreviewMode('net')} type="button"><LayoutTemplate size={15} /> 2D 展开图</button>
              <button className={previewMode === 'collection' ? 'active' : ''} onClick={() => setPreviewMode('collection')} type="button"><Eye size={15} /> 专属小卡</button>
            </div>
          </div>
          <div className="preview-stage">
            <CanvasViewport onBlankClick={() => setSelectedElementId(null)}>
              {previewMode === 'net'
              ? (
                <NetEditor
                  activePanel={activePanel}
                  box={selectedBox}
                  draft={draft}
                  onBeginTransform={beginElementTransform}
                  onCommitTransform={commitElementTransform}
                  onElementSelect={(panelId, elementId) => {
                    setActivePanel(panelId)
                    setSelectedElementId(elementId)
                  }}
                  onClearElementSelection={() => setSelectedElementId(null)}
                  onCharacterSelect={() => setSelectedCharacter(true)}
                  onTextSelect={(panelId, textKey) => {
                    setActivePanel(panelId)
                    setSelectedTextKey(textKey)
                  }}
                  onPanelSelect={setActivePanel}
                  onUpdateElement={(panelId, elementId, patch, commit) => updateElement(selectedBox.boxNo, panelId, elementId, patch, commit)}
                  onUpdateTextLayout={(textKey, patch, commit) => updateTextLayout(selectedBox.boxNo, textKey, patch, commit)}
                  onUpdateCharacterLayout={(patch, commit) => updateCharacterLayout(selectedBox.boxNo, patch, commit)}
                  selectedElementId={selectedElementId}
                  selectedCharacter={selectedCharacter}
                  selectedTextKey={selectedTextKey}
                />
              )
              : <ParallelPreview draft={draft} />}
            </CanvasViewport>
          </div>
          <div className="export-gate">
            <div>
              <span className="eyebrow">导出门禁</span>
              <strong>确认专属小卡效果后，再生成印刷文件</strong>
            </div>
            <button className={collectionConfirmed ? 'confirmed-button' : 'outline-button'} onClick={() => setCollectionConfirmed(!collectionConfirmed)} type="button">
              <FileOutput size={16} /> {collectionConfirmed ? '已确认，可导出' : '确认小卡效果'}
            </button>
          </div>
          {exportError && <p className="export-error" role="alert">{exportError}</p>}
        </section>
      </section>
    </main>
  )
}
