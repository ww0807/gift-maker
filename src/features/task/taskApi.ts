import type { WorkspaceDraft } from '../../types'

export type BoxProgressState = 'pending' | 'generating' | 'done' | 'failed'
export type TaskProgressState = 'DRAFT' | 'UPLOADING' | 'VALIDATING' | 'GENERATING' | 'NORMALIZING' | 'READY_FOR_REVIEW' | 'FAILED'

export interface TaskProgress {
  id: string
  state: TaskProgressState
  message?: string
  boxes: Array<{
    boxNo: 1 | 2 | 3 | 4
    state: BoxProgressState
    imageUrl?: string
    error?: string
  }>
  draft?: WorkspaceDraft
}

export interface UploadPlan {
  taskId: string
  uploads: Array<{ boxNo: 1 | 2 | 3 | 4; url: string; headers?: Record<string, string> }>
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const deviceKey = 'gift-maker:device-id'
const tokenKey = 'gift-maker:invite-token'

export function getDeviceId() {
  const existing = localStorage.getItem(deviceKey)
  if (existing) return existing
  const next = crypto.randomUUID()
  localStorage.setItem(deviceKey, next)
  return next
}

export function captureInviteToken(search = window.location.search) {
  const token = new URLSearchParams(search).get('token')
  if (token) {
    sessionStorage.setItem(tokenKey, token)
    localStorage.setItem(tokenKey, token)
    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }
  return token ?? sessionStorage.getItem(tokenKey) ?? localStorage.getItem(tokenKey) ?? ''
}

function headers(extra: HeadersInit = {}) {
  return {
    ...extra,
    'X-Device-Id': getDeviceId(),
    'X-Invite-Token': captureInviteToken(),
  }
}

async function json<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(payload.message ?? `请求失败（${response.status}）`)
  return payload as T
}

export async function createTask(sourceContentTypes: string[] = []): Promise<UploadPlan> {
  const response = await fetch(`${apiBaseUrl}/v1/tasks`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ source: 'web', sourceContentTypes }),
  })
  return json<UploadPlan>(response)
}

export async function uploadSource(plan: UploadPlan, boxNo: 1 | 2 | 3 | 4, file: File) {
  const target = plan.uploads.find((item) => item.boxNo === boxNo)
  if (!target) throw new Error(`未找到盒子 ${boxNo} 的上传地址`)
  const response = await fetch(target.url, {
    method: 'PUT',
    headers: target.headers,
    body: file,
  })
  if (!response.ok) throw new Error(`图片 ${boxNo} 上传失败（${response.status}）`)
}

export async function startTask(taskId: string) {
  const response = await fetch(`${apiBaseUrl}/v1/tasks/${taskId}/start`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
  })
  return json<TaskProgress>(response)
}

export async function getTask(taskId: string) {
  const response = await fetch(`${apiBaseUrl}/v1/tasks/${taskId}`, { headers: headers() })
  return json<TaskProgress>(response)
}

export async function regenerateTask(taskId: string) {
  const response = await fetch(`${apiBaseUrl}/v1/tasks/${taskId}/regenerate`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
  })
  return json<TaskProgress>(response)
}

export const hasRemoteApi = import.meta.env.PROD || Boolean(apiBaseUrl)
