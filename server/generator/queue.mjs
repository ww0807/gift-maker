import { listObjectKeys, now, readJson, writeJson } from '../shared.mjs'

const dispatchKey = (taskId) => `dispatch/${taskId}.json`

export async function enqueueTask(taskId) {
  const dispatch = { taskId, state: 'queued', createdAt: now() }
  await writeJson(dispatchKey(taskId), dispatch)
  return dispatch
}

export async function claimNextQueuedTask() {
  const keys = await listObjectKeys('dispatch/')
  const dispatches = await Promise.all(keys.map(async (key) => ({ key, value: await readJson(key) })))
  const next = dispatches
    .filter(({ value }) => value?.state === 'queued' && typeof value.taskId === 'string')
    .sort((left, right) => left.value.createdAt.localeCompare(right.value.createdAt))[0]
  if (!next) return null
  const claimed = { ...next.value, state: 'processing', claimedAt: now() }
  await writeJson(next.key, claimed)
  return claimed
}

export async function finishDispatch(taskId, state, error) {
  const key = dispatchKey(taskId)
  const current = await readJson(key, { taskId })
  await writeJson(key, {
    ...current,
    state,
    error,
    finishedAt: now(),
  })
}
