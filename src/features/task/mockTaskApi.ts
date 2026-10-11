import type { BoxDraft } from '../../types'

export type TaskStage =
  | 'DRAFT'
  | 'VALIDATING'
  | 'GENERATING'
  | 'NORMALIZING'
  | 'READY_FOR_REVIEW'
  | 'EXPORT_READY'

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export interface TaskApi {
  createTask(): Promise<{ taskId: string }>
  regenerateBox(boxNo: BoxDraft['boxNo']): Promise<void>
}

export const mockTaskApi: TaskApi = {
  async createTask() {
    await wait(500)
    return { taskId: `demo-${Math.random().toString(36).slice(2, 8)}` }
  },
  async regenerateBox() {
    await wait(1700)
  },
}
