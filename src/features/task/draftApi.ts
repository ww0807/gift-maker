import { z } from 'zod'
import type { WorkspaceDraft } from '../../types'
import { EDITABLE_PANEL_IDS, PANELS } from '../template/structure-v1'
import { getDeviceId, captureInviteToken, hasRemoteApi } from './taskApi'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
const editablePanelSchema = z.enum(EDITABLE_PANEL_IDS)

const elementSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().max(120),
  kind: z.enum(['asset', 'text']).optional(),
  text: z.string().max(30).optional(),
  language: z.enum(['zh-CN', 'en']).optional(),
  font: z.enum(['noto-serif', 'noto-sans', 'florida-vibes', 'georgia', 'lato', 'roboto', 'trebuchet', 'verdana']).optional(),
  width: z.number().finite().min(1).max(75).optional(),
  height: z.number().finite().min(1).max(110).optional(),
  x: z.number().finite().min(0).max(75),
  y: z.number().finite().min(0).max(110),
  scale: z.number().finite().min(.35).max(3),
  rotation: z.number().finite().min(-360).max(360),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

const panelSchema = z.object({
  elements: z.array(elementSchema),
})

const textLayoutSchema = z.object({
  x: z.number().finite().min(0).max(75),
  y: z.number().finite().min(0).max(110),
  scale: z.number().finite().min(.35).max(3),
  rotation: z.number().finite().min(-360).max(360),
  font: z.enum(['noto-serif', 'noto-sans', 'florida-vibes', 'georgia', 'lato', 'roboto', 'trebuchet', 'verdana']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const draftSchema = z.object({
  theme: z.enum(['birthday', 'anniversary']),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  seriesName: z.string().max(40),
  locale: z.enum(['zh-CN', 'en']),
  highlightStyle: z.enum(['hand_drawn', 'solid', 'square', 'star']),
  boxes: z.array(z.object({
    boxNo: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    photoName: z.string(),
    message: z.string().max(30),
    dateOverride: z.string().date(),
    titleArt: z.string().max(16),
    titleFont: z.enum(['noto-serif', 'noto-sans', 'florida-vibes', 'georgia', 'lato', 'roboto', 'trebuchet', 'verdana']),
    caption: z.string().max(14),
    textLayouts: z.object({
      titleArt: textLayoutSchema.optional(),
      caption: textLayoutSchema.optional(),
      message: textLayoutSchema.optional(),
    }).optional(),
    isSecret: z.boolean(),
    generationState: z.enum(['ready', 'generating', 'warning']),
    panels: z.record(editablePanelSchema, panelSchema),
  })).length(4),
}).superRefine((draft, context) => {
  draft.boxes.forEach((box) => {
    Object.entries(box.panels).forEach(([panelId, panel]) => {
      const bounds = PANELS[panelId as keyof typeof PANELS]
      panel.elements.forEach((element, index) => {
        if (element.x > bounds.width || element.y > bounds.height) {
          context.addIssue({ code: 'custom', path: ['boxes', box.boxNo - 1, 'panels', panelId, 'elements', index], message: '素材坐标超出面板范围' })
        }
      })
    })
  })
})

function idempotencyKey(taskId: string) {
  return `${taskId}:${crypto.randomUUID()}`
}

function taskHeaders(extra: HeadersInit = {}) {
  return { ...extra, 'X-Device-Id': getDeviceId(), 'X-Invite-Token': captureInviteToken() }
}

export async function saveDraft(taskId: string, draft: WorkspaceDraft) {
  const payload = draftSchema.parse(draft)
  if (!hasRemoteApi) {
    localStorage.setItem(`gift-maker:draft:${taskId}`, JSON.stringify(payload))
    return
  }

  const response = await fetch(`${apiBaseUrl}/v1/tasks/${taskId}/draft`, {
    method: 'PATCH',
    credentials: 'include',
    headers: taskHeaders({ 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey(taskId) }),
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`草稿保存失败（${response.status}）`)
}

export async function loadDraft(taskId: string): Promise<WorkspaceDraft | null> {
  if (!hasRemoteApi) {
    const saved = localStorage.getItem(`gift-maker:draft:${taskId}`)
    return saved ? draftSchema.parse(JSON.parse(saved)) as WorkspaceDraft : null
  }
  const response = await fetch(`${apiBaseUrl}/v1/tasks/${taskId}`, { headers: taskHeaders() })
  if (!response.ok) throw new Error(`草稿读取失败（${response.status}）`)
  const payload = await response.json() as { draft?: WorkspaceDraft }
  return payload.draft ? draftSchema.parse(payload.draft) as WorkspaceDraft : null
}

export async function reportExport(taskId: string) {
  if (!hasRemoteApi) {
    localStorage.setItem(`gift-maker:export:${taskId}`, new Date().toISOString())
    return
  }
  const response = await fetch(`${apiBaseUrl}/v1/tasks/${taskId}/export`, {
    method: 'POST',
    credentials: 'include',
    headers: taskHeaders({ 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey(taskId) }),
    body: JSON.stringify({ event: 'export_done' }),
  })
  if (!response.ok) throw new Error(`导出埋点失败（${response.status}）`)
}
