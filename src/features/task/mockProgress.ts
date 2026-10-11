import type { TaskProgress } from './taskApi'

const mockImages = ['/images/placeholders/box-01.png', '/images/placeholders/box-02.png', '/images/placeholders/box-01.png', '/images/placeholders/box-02.png']

export function mockTaskProgress(taskId: string): TaskProgress {
  const startedAt = Number(sessionStorage.getItem(`gift-maker:mock-start:${taskId}`) ?? Date.now())
  sessionStorage.setItem(`gift-maker:mock-start:${taskId}`, String(startedAt))
  const elapsed = Date.now() - startedAt
  const completed = Math.min(4, Math.floor(elapsed / 2400))
  return {
    id: taskId,
    state: completed === 4 ? 'READY_FOR_REVIEW' : 'GENERATING',
    message: completed === 4 ? '四款形象已准备好' : '正在为你变出四款形象',
    boxes: [1, 2, 3, 4].map((boxNo) => ({
      boxNo: boxNo as 1 | 2 | 3 | 4,
      state: boxNo <= completed ? 'done' : boxNo === completed + 1 ? 'generating' : 'pending',
      imageUrl: boxNo <= completed ? mockImages[boxNo - 1] : undefined,
    })),
  }
}
