import { createTask, hasRemoteApi, startTask, uploadSource } from './taskApi'

export interface UploadImage {
  boxNo: 1 | 2 | 3 | 4
  file: File
}

export async function uploadAndGenerate(images: UploadImage[]) {
  if (!hasRemoteApi) {
    const taskId = `demo-${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(`gift-maker:mock-start:${taskId}`, String(Date.now()))
    return { taskId, mode: 'mock' as const }
  }

  const plan = await createTask(images.map((image) => image.file.type))
  await Promise.all(images.map((image) => uploadSource(plan, image.boxNo, image.file)))
  await startTask(plan.taskId)
  return { taskId: plan.taskId, mode: 'remote' as const }
}
