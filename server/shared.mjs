import crypto from 'node:crypto'
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const normaliseEndpoint = (value) => {
  const withoutScheme = value.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (!withoutScheme || withoutScheme.includes('/')) {
    throw new Error('TOS_ENDPOINT must be a TOS host name, for example tos-cn-beijing.volces.com')
  }
  return `https://${withoutScheme}`
}

export const config = {
  bucket: required('TOS_BUCKET'),
  endpoint: normaliseEndpoint(required('TOS_ENDPOINT')),
  inviteToken: required('INVITE_TOKEN'),
  region: process.env.TOS_REGION ?? 'cn-beijing',
}

export const tos = new S3Client({
  region: config.region,
  endpoint: config.endpoint,
  forcePathStyle: false,
  credentials: {
    accessKeyId: required('TOS_ACCESS_KEY_ID'),
    secretAccessKey: required('TOS_SECRET_ACCESS_KEY'),
  },
})

export const now = () => new Date().toISOString()
export const taskKey = (taskId, name) => `tasks/${taskId}/${name}`
export const sourceKey = (taskId, boxNo, extension = 'jpg') => `original/${taskId}/box-${boxNo}.${extension}`
export const generatedKey = (taskId, boxNo) => `generated/${taskId}/box-${boxNo}.png`
export const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }

export async function readJson(key, fallback = null) {
  try {
    const result = await tos.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
    return JSON.parse(await result.Body.transformToString())
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NoSuchKey') return fallback
    throw error
  }
}

export async function writeJson(key, value) {
  await tos.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: JSON.stringify(value),
    ContentType: 'application/json',
  }))
}

export async function listObjectKeys(prefix) {
  const keys = []
  let continuationToken
  do {
    const result = await tos.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }))
    keys.push(...(result.Contents ?? []).map((object) => object.Key).filter(Boolean))
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined
  } while (continuationToken)
  return keys
}

export async function readBuffer(key) {
  const result = await tos.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
  return Buffer.from(await result.Body.transformToByteArray())
}

export async function writePng(key, buffer) {
  await tos.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: buffer, ContentType: 'image/png' }))
}

export async function objectExists(key) {
  try {
    await tos.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }))
    return true
  } catch {
    return false
  }
}

export async function objectMetadata(key) {
  try {
    const result = await tos.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }))
    return {
      exists: true,
      contentLength: Number(result.ContentLength ?? 0),
      contentType: result.ContentType ?? null,
      eTag: result.ETag ?? null,
    }
  } catch (error) {
    return {
      exists: false,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      statusCode: error?.$metadata?.httpStatusCode,
    }
  }
}

export function signedGet(key, expiresIn = 3600) {
  return getSignedUrl(tos, new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn })
}

export function signedPut(key, contentType) {
  return getSignedUrl(tos, new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType }), { expiresIn: 3600 })
}

export function createTaskId() {
  return `tsk_${crypto.randomBytes(12).toString('hex')}`
}

export async function loadTask(taskId) {
  const [meta, status, draft] = await Promise.all([
    readJson(taskKey(taskId, 'meta.json')),
    readJson(taskKey(taskId, 'status.json')),
    readJson(taskKey(taskId, 'draft.json')),
  ])
  if (!meta || !status) return null
  return { meta, status, draft: draft?.draft }
}

export async function saveStatus(taskId, status) {
  await writeJson(taskKey(taskId, 'status.json'), { ...status, updatedAt: now() })
}

export function validateAccess(request, meta) {
  const deviceId = request.headers['x-device-id']
  const token = request.headers['x-invite-token']
  const tokenMatches = token === config.inviteToken
  const deviceMatches = !meta || deviceId === meta.deviceId
  if (!tokenMatches || !deviceMatches) {
    console.warn(JSON.stringify({
      event: 'task_access_denied',
      hasDeviceId: Boolean(deviceId),
      providedTokenLength: typeof token === 'string' ? token.length : 0,
      tokenMatches,
      deviceMatches,
    }))
  }
  if (!tokenMatches) return '邀请码无效'
  if (!deviceMatches) return '无权访问该任务'
  return null
}

export function logTosError(operation, error) {
  console.error(JSON.stringify({
    event: 'tos_error',
    operation,
    bucket: config.bucket,
    endpoint: config.endpoint,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: error instanceof Error ? error.message : String(error),
    statusCode: error?.$metadata?.httpStatusCode,
  }))
}
