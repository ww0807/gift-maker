import assert from 'node:assert/strict'
import test from 'node:test'
import { taskArguments } from './taskArguments.mjs'

test('reads custom task command arguments', () => {
  assert.deepEqual(
    taskArguments(['node', 'generator/index.mjs', '--task-id=tsk_123', '--token=secret']),
    { taskId: 'tsk_123', token: 'secret' },
  )
})

test('returns undefined for omitted optional arguments', () => {
  assert.deepEqual(
    taskArguments(['node', 'generator/index.mjs']),
    { taskId: undefined, token: undefined },
  )
})
