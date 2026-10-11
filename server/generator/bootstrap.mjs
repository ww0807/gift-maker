console.info(JSON.stringify({
  event: 'generator_boot',
  hasTaskId: process.argv.some((value) => value.startsWith('--task-id=')),
  hasToken: process.argv.some((value) => value.startsWith('--token=')),
}))

let taskId = process.argv.find((value) => value.startsWith('--task-id='))?.slice('--task-id='.length)

async function claimQueuedTask() {
  if (taskId) return
  const { claimNextQueuedTask } = await import('./queue.mjs')
  const dispatch = await claimNextQueuedTask()
  if (!dispatch) throw new Error('No queued generation task')
  taskId = dispatch.taskId
  process.env.GIFT_MAKER_TASK_ID = taskId
  console.info(JSON.stringify({ event: 'generator_dispatch_claimed', taskId }))
}

async function verifySharpRuntime() {
  const report = process.report?.getReport?.()
  console.info(JSON.stringify({
    event: 'sharp_runtime_probe_started',
    taskId,
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    glibcVersion: report?.header?.glibcVersionRuntime,
  }))
  try {
    await import('sharp')
    console.info(JSON.stringify({ event: 'sharp_runtime_probe_succeeded', taskId }))
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    console.error(JSON.stringify({
      event: 'sharp_runtime_probe_failed',
      taskId,
      errorMessage: message,
    }))
    throw new Error(`sharp runtime probe failed: ${message}`, { cause })
  }
}

async function saveStartupFailure(error) {
  if (!taskId) return
  try {
    console.info(JSON.stringify({ event: 'generator_startup_failure_status_write_started', taskId }))
    const { PutObjectCommand, S3Client } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: process.env.TOS_REGION,
      endpoint: `https://${process.env.TOS_ENDPOINT}`,
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.TOS_ACCESS_KEY_ID,
        secretAccessKey: process.env.TOS_SECRET_ACCESS_KEY,
      },
    })
    await client.send(new PutObjectCommand({
      Bucket: process.env.TOS_BUCKET,
      Key: `tasks/${taskId}/status.json`,
      ContentType: 'application/json',
      Body: JSON.stringify({
        taskId,
        state: 'FAILED',
        message: `生成器启动失败: ${error instanceof Error ? error.message : String(error)}`,
        boxes: [1, 2, 3, 4].map((boxNo) => ({ boxNo, state: 'failed' })),
        updatedAt: new Date().toISOString(),
      }),
    }))
    console.info(JSON.stringify({ event: 'generator_startup_failure_status_written', taskId }))
  } catch (writeError) {
    console.error(JSON.stringify({
      event: 'generator_startup_failure_write_failed',
      errorMessage: writeError instanceof Error ? writeError.message : String(writeError),
    }))
  }
}

try {
  await claimQueuedTask()
  console.info(JSON.stringify({ event: 'generator_module_load_started', taskId }))
  await verifySharpRuntime()
  await import('./index.mjs')
  console.info(JSON.stringify({ event: 'generator_module_load_finished', taskId }))
} catch (error) {
  console.error(JSON.stringify({
    event: 'generator_boot_failed',
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  }))
  if (process.env.GIFT_MAKER_TASK_PROCESSING !== '1') {
    await saveStartupFailure(error)
  }
  process.exitCode = 1
}
