import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename, extname, join, normalize } from 'node:path'
import {
  config, createTaskId, loadTask, logTosError, now, objectMetadata, readJson,
  objectExists, saveStatus, signedGet, signedPut, sourceKey, taskKey, validateAccess, writeJson,
} from '../shared.mjs'

const port = Number(process.env.FAAS_RUNTIME_PORT ?? process.env.PORT ?? 8000)
const dist = process.env.STATIC_DIR ?? join(process.cwd(), 'dist')
const generatorUrl = process.env.GENERATOR_INVOKE_URL
const mime = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }
const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function send(response, status, payload) {
  response.writeHead(status, { ...jsonHeaders(), 'cache-control': 'no-store' })
  response.end(JSON.stringify(payload))
}

function jsonHeaders() {
  return { 'content-type': 'application/json; charset=utf-8' }
}

async function body(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
}

async function invokeGenerator(taskId) {
  if (!generatorUrl) throw new Error('GENERATOR_INVOKE_URL is not configured')
  const token = process.env.GENERATOR_INVOKE_TOKEN ?? ''
  const response = await fetch(generatorUrl, {
    method: 'POST',
    headers: token ? { 'x-generator-token': token } : undefined,
  })
  if (!response.ok) throw new Error(`Generator invocation failed (${response.status})`)
  const requestId = response.headers.get('x-faas-request-id')
  if (!requestId) throw new Error('Generator gateway did not acknowledge an asynchronous task')
  console.info(JSON.stringify({ event: 'generator_task_submitted', taskId, requestId, status: response.status }))
  return requestId
}

async function publicTask(request, taskId) {
  const task = await loadTask(taskId)
  if (!task) return { error: '任务不存在', status: 404 }
  const denied = validateAccess(request, task.meta)
  if (denied) return { error: denied, status: 403 }
  const boxes = await Promise.all(task.status.boxes.map(async (box) => ({
    ...box,
    imageUrl: box.imageKey ? await signedGet(box.imageKey) : undefined,
  })))
  return { payload: { id: taskId, state: task.status.state, message: task.status.message, boxes, draft: task.draft } }
}

async function handleApi(request, response, pathname) {
  const deviceId = request.headers['x-device-id']
  const token = request.headers['x-invite-token']
  if (token !== config.inviteToken) return send(response, 403, { message: '邀请码无效' })
  if (!deviceId || typeof deviceId !== 'string') return send(response, 400, { message: '缺少设备标识' })

  if (request.method === 'POST' && pathname === '/v1/tasks') {
    const requestBody = await body(request)
    const sourceContentTypes = Array.isArray(requestBody.sourceContentTypes) ? requestBody.sourceContentTypes : []
    const sources = [1, 2, 3, 4].map((boxNo, index) => {
      const contentType = sourceContentTypes[index]
      const extension = imageTypes[contentType] ?? 'jpg'
      return { boxNo, contentType: imageTypes[contentType] ? contentType : 'image/jpeg', extension }
    })
    const taskId = createTaskId()
    const sourceKeys = sources.map((source) => sourceKey(taskId, source.boxNo, source.extension))
    const boxes = [1, 2, 3, 4].map((boxNo) => ({ boxNo, state: 'pending' }))
    await Promise.all([
      writeJson(taskKey(taskId, 'meta.json'), {
        id: taskId,
        deviceId,
        sourceKeys,
        sourceContentTypes: sources.map((source) => source.contentType),
        createdAt: now(),
      }),
      saveStatus(taskId, { state: 'UPLOADING', message: '正在上传照片', boxes }),
    ])
    console.info(JSON.stringify({
      event: 'task_created',
      taskId,
      sourceKeys,
      sourceContentTypes: sources.map((source) => source.contentType),
      uploadCount: sources.length,
    }))
    const uploads = await Promise.all(sources.map(async ({ boxNo, contentType }) => ({
      boxNo,
      headers: { 'content-type': contentType },
      url: await signedPut(sourceKeys[boxNo - 1], contentType),
    })))
    return send(response, 201, { taskId, uploads })
  }

  const match = pathname.match(/^\/v1\/tasks\/(tsk_[a-f0-9]+)(?:\/(start|draft|export|regenerate|resume))?$/)
  if (!match) return send(response, 404, { message: '接口不存在' })
  const [, taskId, action] = match
  const task = await loadTask(taskId)
  if (!task) return send(response, 404, { message: '任务不存在' })
  const denied = validateAccess(request, task.meta)
  if (denied) return send(response, 403, { message: denied })

  if (request.method === 'GET' && !action) {
    const result = await publicTask(request, taskId)
    return 'error' in result ? send(response, result.status, { message: result.error }) : send(response, 200, result.payload)
  }
  if (request.method === 'PATCH' && action === 'draft') {
    const draft = await body(request)
    await writeJson(taskKey(taskId, 'draft.json'), { draft, updatedAt: now() })
    return send(response, 204, {})
  }
  if (request.method === 'POST' && action === 'resume') {
    const boardKey = `generated/${taskId}/board.png`
    if (!await objectExists(boardKey)) {
      return send(response, 409, { message: '未找到可继续处理的已生成画板' })
    }
    const generatingStatus = {
      state: 'GENERATING',
      message: '正在处理已生成形象',
      boxes: [1, 2, 3, 4].map((boxNo) => ({ boxNo, state: boxNo === 1 ? 'generating' : 'pending' })),
    }
    await writeJson(taskKey(taskId, 'meta.json'), { ...task.meta, reuseGeneratedBoard: true, resumedAt: now() })
    await saveStatus(taskId, generatingStatus)
    try {
      await writeJson(`dispatch/${taskId}.json`, { taskId, state: 'queued', createdAt: now(), mode: 'reuse-board' })
      const requestId = await invokeGenerator(taskId)
      await saveStatus(taskId, { ...generatingStatus, generatorRequestId: requestId })
      console.info(JSON.stringify({ event: 'task_existing_board_resume_submitted', taskId, boardKey, requestId }))
    } catch (error) {
      const message = error instanceof Error ? error.message : '恢复任务投递失败'
      await saveStatus(taskId, {
        state: 'FAILED',
        message: '恢复任务投递失败，请稍后重试',
        boxes: [1, 2, 3, 4].map((boxNo) => ({ boxNo, state: 'failed', error: message })),
      })
      return send(response, 503, { message: '恢复任务投递失败，请稍后重试' })
    }
    const result = await publicTask(request, taskId)
    return 'error' in result ? send(response, result.status, { message: result.error }) : send(response, 202, result.payload)
  }
  if (request.method === 'POST' && (action === 'start' || action === 'regenerate')) {
    console.info(JSON.stringify({ event: 'task_start_requested', taskId, action }))
    if (task.meta.reuseGeneratedBoard) {
      const { reuseGeneratedBoard: _reuseGeneratedBoard, resumedAt: _resumedAt, ...meta } = task.meta
      await writeJson(taskKey(taskId, 'meta.json'), meta)
    }
    const sourceObjects = await Promise.all(task.meta.sourceKeys.map(objectMetadata))
    const sourceChecks = sourceObjects.map((object, index) => ({
      boxNo: index + 1,
      exists: object.exists,
      contentLength: object.contentLength ?? 0,
      contentType: object.contentType ?? null,
      matchesExpectedType: object.exists && object.contentType === (task.meta.sourceContentTypes?.[index] ?? object.contentType),
    }))
    const allUploaded = sourceChecks.every((source) => source.exists && source.contentLength > 0 && source.matchesExpectedType)
    console.info(JSON.stringify({ event: 'task_source_validation', taskId, action, sourceChecks, allUploaded }))
    if (!allUploaded) return send(response, 409, { message: '四张照片尚未全部以正确格式上传完成' })
    const day = now().slice(0, 10)
    const quotaKey = `quota/${day}/${deviceId}.json`
    const quota = await readJson(quotaKey, { taskIds: [] })
    const taskAlreadyCounted = quota.taskIds.includes(taskId)
    console.info(JSON.stringify({
      event: 'task_quota_checked',
      taskId,
      taskAlreadyCounted,
      quotaUsed: quota.taskIds.length,
      quotaLimit: 3,
    }))
    if (!taskAlreadyCounted && quota.taskIds.length >= 3) return send(response, 429, { message: '今日制作次数已达上限，明天再来' })
    const generatingStatus = {
      state: 'GENERATING',
      message: '正在绘制四款形象',
      boxes: [1, 2, 3, 4].map((boxNo) => ({ boxNo, state: boxNo === 1 ? 'generating' : 'pending' })),
    }
    await saveStatus(taskId, generatingStatus)
    console.info(JSON.stringify({ event: 'task_generation_status_written', taskId }))
    try {
      await writeJson(`dispatch/${taskId}.json`, { taskId, state: 'queued', createdAt: now() })
      console.info(JSON.stringify({ event: 'task_dispatch_queued', taskId }))
      console.info(JSON.stringify({ event: 'generator_submit_attempt', taskId, generatorUrl }))
      const requestId = await invokeGenerator(taskId)
      await saveStatus(taskId, { ...generatingStatus, generatorRequestId: requestId })
      console.info(JSON.stringify({ event: 'generator_submit_confirmed', taskId, requestId }))
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成任务投递失败'
      console.error('generator invoke failed', message)
      await saveStatus(taskId, {
        state: 'FAILED',
        message: '生成任务投递失败，请稍后重试',
        boxes: [1, 2, 3, 4].map((boxNo) => ({ boxNo, state: 'failed', error: message })),
      })
      return send(response, 503, { message: '生成任务投递失败，请稍后重试' })
    }
    if (!taskAlreadyCounted) {
      await writeJson(quotaKey, { taskIds: [...quota.taskIds, taskId], updatedAt: now() })
      console.info(JSON.stringify({ event: 'task_quota_recorded', taskId, quotaUsed: quota.taskIds.length + 1 }))
    }
    const result = await publicTask(request, taskId)
    return 'error' in result ? send(response, result.status, { message: result.error }) : send(response, 202, result.payload)
  }
  if (request.method === 'POST' && action === 'export') return send(response, 204, {})
  return send(response, 405, { message: '不支持的请求方法' })
}

async function serveStatic(_request, response, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname
  const candidate = normalize(join(dist, requested))
  const safe = candidate.startsWith(normalize(dist)) && existsSync(candidate)
  const file = safe ? candidate : join(dist, 'index.html')
  try {
    const info = await stat(file)
    if (!info.isFile()) throw new Error('not file')
    response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
  } catch {
    send(response, 404, { message: `静态文件不存在：${basename(file)}` })
  }
}

createServer(async (request, response) => {
  const startedAt = Date.now()
  let pathname = 'unknown'
  try {
    pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    if (pathname.startsWith('/v1/')) return await handleApi(request, response, pathname)
    return await serveStatic(request, response, pathname)
  } catch (error) {
    logTosError('web_request', error)
    console.error(JSON.stringify({
      event: 'web_request_failed',
      method: request.method,
      pathname,
      elapsedMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
    }))
    return send(response, 500, { message: '服务暂时不可用' })
  }
}).listen(port, '0.0.0.0', () => console.log(`gift-maker web listening on ${port}`))
