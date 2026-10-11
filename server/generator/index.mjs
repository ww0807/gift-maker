import sharp from 'sharp'
import { taskArguments } from './taskArguments.mjs'
import {
  config, generatedKey, loadTask, now, readBuffer, saveStatus, signedGet,
  tos, writePng,
} from '../shared.mjs'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { finishDispatch } from './queue.mjs'

const boardPrompt = '基于四张参考照片，生成一张严格等大 2×2 网格角色板。左上、右上、左下、右下分别对应参考图 1、2、3、4。每格只有一位完整、居中的 Q版 3D 人物，四人风格、光照、镜头距离一致。格间保留均匀纯白留白。无文字、编号、边框、水印、额外人物、背景物体和阴影。整体为 2:3 竖幅。'
const taskStartedAt = new Map()

function trace(taskId, stage, details = {}) {
  const startedAt = taskStartedAt.get(taskId)
  console.info(JSON.stringify({
    event: 'task_stage',
    taskId,
    stage,
    at: now(),
    elapsedMs: startedAt ? Date.now() - startedAt : undefined,
    ...details,
  }))
}

function arkEndpoint() {
  return process.env.ARK_IMAGE_ENDPOINT ?? 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
}

async function callSeedream(taskId, sourceUrls) {
  trace(taskId, 'seedream_request_started', {
    modelConfigured: Boolean(process.env.ARK_IMAGE_MODEL),
    sourceImageCount: sourceUrls.length,
    size: '1664x2496',
  })
  const response = await fetch(arkEndpoint(), {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.ARK_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.ARK_IMAGE_MODEL,
      prompt: boardPrompt,
      image: sourceUrls,
      size: '1664x2496',
      response_format: 'url',
      watermark: false,
    }),
  })
  const payload = await response.json()
  trace(taskId, 'seedream_response_received', {
    status: response.status,
    success: response.ok,
    returnedImageCount: Array.isArray(payload.data) ? payload.data.length : 0,
  })
  if (!response.ok) throw new Error(`Seedream failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`)
  const url = payload.data?.[0]?.url
  if (!url) throw new Error('Seedream did not return a character-board URL')
  trace(taskId, 'seedream_board_url_ready')
  return url
}

async function removeBoardBackground(taskId, boardUrl) {
  trace(taskId, 'background_removal_request_started')
  const response = await fetch(process.env.IMAGE_SEGMENTATION_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.IMAGE_SEGMENTATION_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      image_url: boardUrl,
      scene: 'human',
      need_contour: false,
      need_crop_background: false,
      output_format: 'png',
    }),
  })
  const payload = await response.json()
  trace(taskId, 'background_removal_response_received', {
    status: response.status,
    success: response.ok,
  })
  if (!response.ok) throw new Error(`Image segmentation failed (${response.status})`)
  const url = payload.result?.image_url ?? payload.data?.image_url
  if (!url) throw new Error('Image segmentation did not return a transparent PNG URL')
  trace(taskId, 'transparent_board_download_started')
  const image = await fetch(url)
  if (!image.ok) throw new Error(`Unable to download transparent board (${image.status})`)
  const buffer = Buffer.from(await image.arrayBuffer())
  trace(taskId, 'transparent_board_downloaded', { bytes: buffer.length })
  return buffer
}

async function splitTransparentBoard(taskId, transparentBoard) {
  const metadata = await sharp(transparentBoard).metadata()
  trace(taskId, 'transparent_board_inspected', {
    width: metadata.width,
    height: metadata.height,
    hasAlpha: Boolean(metadata.hasAlpha),
  })
  if (!metadata.width || !metadata.height || !metadata.hasAlpha) throw new Error('Transparent board is missing alpha or dimensions')
  if (metadata.width < 200 || metadata.height < 300) {
    throw new Error(`Transparent board is too small to split (${metadata.width}x${metadata.height})`)
  }
  const columnWidths = [Math.floor(metadata.width / 2), Math.ceil(metadata.width / 2)]
  const rowHeights = [Math.floor(metadata.height / 2), Math.ceil(metadata.height / 2)]
  const outputs = []
  for (let index = 0; index < 4; index += 1) {
    const column = index % 2
    const row = Math.floor(index / 2)
    const cellWidth = columnWidths[column]
    const cellHeight = rowHeights[row]
    const inset = Math.min(Math.max(2, Math.round(Math.min(cellWidth, cellHeight) * .02)), Math.floor((Math.min(cellWidth, cellHeight) - 1) / 2))
    const left = (column === 0 ? 0 : columnWidths[0]) + inset
    const top = (row === 0 ? 0 : rowHeights[0]) + inset
    const width = cellWidth - inset * 2
    const height = cellHeight - inset * 2
    const cropped = await sharp(transparentBoard)
      .extract({ left, top, width, height })
      .png()
      .toBuffer()
    const cropStats = await sharp(cropped).stats()
    const alpha = cropStats.channels[3]
    if (!alpha || alpha.max === 0) {
      throw new Error(`Box ${index + 1} has no visible foreground after background removal`)
    }
    const png = await sharp(cropped)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    const result = await sharp(png).metadata()
    if (!result.hasAlpha || !result.width || !result.height || result.width < 400 || result.height < 600) {
      throw new Error(`Box ${index + 1} failed transparent image validation (${result.width ?? 0}x${result.height ?? 0}, alpha=${Boolean(result.hasAlpha)})`)
    }
    trace(taskId, 'box_image_extracted', {
      boxNo: index + 1,
      width: result.width,
      height: result.height,
      bytes: png.length,
    })
    outputs.push(png)
  }
  for (const [index, png] of outputs.entries()) {
    const boxNo = index + 1
    const imageKey = generatedKey(taskId, boxNo)
    trace(taskId, 'box_image_upload_started', { boxNo, imageKey })
    await writePng(imageKey, png)
    trace(taskId, 'box_image_uploaded', { boxNo, imageKey })
  }
  return outputs.length
}

async function updateBoxStates(taskId) {
  trace(taskId, 'review_status_update_started')
  const current = await loadTask(taskId)
  if (!current) throw new Error('Task not found')
  const { status } = current
  const nextBoxes = status.boxes.map((box) => ({ ...box, state: 'done', imageKey: generatedKey(taskId, box.boxNo), error: undefined }))
  await saveStatus(taskId, { state: 'READY_FOR_REVIEW', message: '四款形象已准备好', boxes: nextBoxes })
  trace(taskId, 'review_status_updated', { boxCount: nextBoxes.length })
}

async function loadGeneratedBoard(taskId) {
  const boardKey = `generated/${taskId}/board.png`
  trace(taskId, 'existing_board_download_started', { boardKey })
  const boardBuffer = await readBuffer(boardKey)
  const metadata = await sharp(boardBuffer).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Existing generated board is not a valid image')
  }
  trace(taskId, 'existing_board_downloaded', {
    boardKey,
    bytes: boardBuffer.length,
    width: metadata.width,
    height: metadata.height,
  })
  return { boardKey, boardBuffer }
}

export async function processTask(taskId) {
  taskStartedAt.set(taskId, Date.now())
  trace(taskId, 'task_processing_started')
  let task
  try {
    task = await loadTask(taskId)
    if (!task) throw new Error('Task not found')
    trace(taskId, 'task_metadata_loaded', {
      sourceImageCount: task.meta.sourceKeys.length,
      currentState: task.status.state,
    })
    await saveStatus(taskId, { ...task.status, state: 'GENERATING', message: '正在绘制四款形象', boxes: task.status.boxes.map((box, index) => ({ ...box, state: index === 0 ? 'generating' : 'pending' })) })
    trace(taskId, 'generation_status_updated')
  } catch (error) {
    trace(taskId, 'task_preflight_failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    taskStartedAt.delete(taskId)
    throw error
  }
  try {
    const boardKey = `generated/${taskId}/board.png`
    if (task.meta.reuseGeneratedBoard) {
      await loadGeneratedBoard(taskId)
      trace(taskId, 'existing_board_reused', { boardKey })
    } else {
      trace(taskId, 'source_url_signing_started', { sourceImageCount: task.meta.sourceKeys.length })
      const sourceUrls = await Promise.all(task.meta.sourceKeys.map((key) => signedGet(key, 900)))
      trace(taskId, 'source_urls_signed', { sourceImageCount: sourceUrls.length })
      const boardUrl = await callSeedream(taskId, sourceUrls)
      trace(taskId, 'generated_board_download_started')
      const board = await fetch(boardUrl)
      if (!board.ok) throw new Error(`Unable to download generated board (${board.status})`)
      const boardBuffer = Buffer.from(await board.arrayBuffer())
      trace(taskId, 'generated_board_downloaded', { bytes: boardBuffer.length })
      trace(taskId, 'generated_board_upload_started', { boardKey })
      await tos.send(new PutObjectCommand({ Bucket: config.bucket, Key: boardKey, Body: boardBuffer, ContentType: 'image/png' }))
      trace(taskId, 'generated_board_uploaded', { boardKey })
    }
    const boardReadUrl = await signedGet(boardKey, 900)
    trace(taskId, 'generated_board_url_signed')
    const transparentBoard = await removeBoardBackground(taskId, boardReadUrl)
    const transparentBoardKey = `generated/${taskId}/transparent-board.png`
    trace(taskId, 'transparent_board_upload_started', { transparentBoardKey, bytes: transparentBoard.length })
    await tos.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: transparentBoardKey,
      Body: transparentBoard,
      ContentType: 'image/png',
    }))
    trace(taskId, 'transparent_board_uploaded', { transparentBoardKey })
    const boxCount = await splitTransparentBoard(taskId, transparentBoard)
    await updateBoxStates(taskId)
    trace(taskId, 'task_processing_succeeded', { boxCount })
    taskStartedAt.delete(taskId)
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成失败'
    trace(taskId, 'task_processing_failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: message,
    })
    const latest = await loadTask(taskId)
    await saveStatus(taskId, {
      state: 'FAILED',
      message: '形象生成失败，请整组重做',
      boxes: latest.status.boxes.map((box) => ({ ...box, state: 'failed', error: message })),
      failedAt: now(),
    })
    taskStartedAt.delete(taskId)
    throw error
  }
}

const { taskId: commandTaskId, token } = taskArguments(process.argv)
const taskId = commandTaskId ?? process.env.GIFT_MAKER_TASK_ID
if (!taskId) {
  throw new Error('Missing --task-id task argument')
}
trace(taskId, 'task_arguments_received', {
  invocationMode: commandTaskId ? 'custom-command' : 'queued-default-command',
  hasToken: Boolean(token),
  tokenMatches: !commandTaskId || !process.env.GENERATOR_INVOKE_TOKEN || token === process.env.GENERATOR_INVOKE_TOKEN,
})
if (commandTaskId && process.env.GENERATOR_INVOKE_TOKEN && token !== process.env.GENERATOR_INVOKE_TOKEN) {
  throw new Error('Unauthorized task invocation')
}
try {
  process.env.GIFT_MAKER_TASK_PROCESSING = '1'
  await processTask(taskId)
  await finishDispatch(taskId, 'done')
  trace(taskId, 'task_dispatch_completed')
} catch (error) {
  await finishDispatch(taskId, 'failed', error instanceof Error ? error.message : String(error))
  throw error
}
