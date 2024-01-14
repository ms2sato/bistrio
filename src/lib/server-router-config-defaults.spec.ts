import { Request, Response } from 'express'
import { z } from 'zod'
import { ActionDescriptor, ServerRouter } from '../index.js'
import { arrangeFormInput } from './input-arrangers.js'
import { ActionContextImpl } from './server-router-impl.js'
import { fileSchema } from '../lib/shared/schemas.js'

const testSchema = z.object({
  name: z.string(),
  age: z.number(),
  file: fileSchema,
})

test('', () => {
  const req: Request = {
    body: { name: 'name', age: 20 },
    files: {
      file: {
        name: 'filename',
        mv: () => {},
        size: 123,
        mimetype: 'application/jsonl',
      },
    },
  } as unknown as Request
  const res: Response = {
    render: () => {},
    redirect: () => {},
  } as unknown as Response
  const ad: ActionDescriptor = { action: 'test', path: '/', method: 'post' }
  const router = {} as ServerRouter

  const ctx = new ActionContextImpl(router, req, res, ad, '/test')

  const ret = arrangeFormInput(ctx, ['body', 'files'], testSchema)
  expect(ret.name).toBe('name')
  expect(ret.age).toBe(20)
  expect(ret.file).toBeInstanceOf(File)
})
