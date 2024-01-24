import { resolve } from 'node:path'
import { statSync } from 'node:fs'

import { Request, Response } from 'express'
import { z } from 'zod'
import { ActionDescriptor, ServerRouter } from '../index.js'
import { arrangeFormInput } from './input-arrangers.js'
import { ExpressActionContext } from './express-action-context.js'
import { fileSchema } from '../lib/shared/schemas.js'
import { createElement } from 'react'

const testSchema = z.object({
  name: z.string(),
  age: z.number(),
  file: fileSchema,
})

type TestType = z.infer<typeof testSchema>

const dummyFile = resolve(__dirname, '../../__tests__/fixtures/testfile')

test('request with file', async () => {
  const req: Request = {
    body: { name: 'name', age: 20 },
    files: {
      file: {
        name: 'filename',
        size: 123,
        mimetype: 'plain/text',
        tempFilePath: dummyFile,
      },
    },
  } as unknown as Request
  const res: Response = {
    render: () => {},
    redirect: () => {},
  } as unknown as Response
  const ad: ActionDescriptor = { action: 'test', path: '/', method: 'post' }
  const router = {} as ServerRouter

  const ctx = new ExpressActionContext({
    router,
    req,
    res,
    descriptor: ad,
    httpPath: '/test',
    constructView: () => createElement('div', null),
  })

  const [testObj] = await arrangeFormInput(ctx, ['body', 'files'], testSchema)
  const { name, age, file } = testObj as TestType
  expect(name).toBe('name')
  expect(age).toBe(20)

  expect(file).toBeInstanceOf(File)
  expect(file.name).toBe('filename')
  expect(file.type).toBe('plain/text')

  const stat = statSync(dummyFile)
  expect(file.size).toBe(18) // size is temporary file size
  expect(file.lastModified).toBe(stat.mtimeMs)
})
