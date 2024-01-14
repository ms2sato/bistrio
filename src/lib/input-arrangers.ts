import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createWriteStream, statSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'

import { ZodType } from 'zod'
import { SchemaUtil } from '../index.js'
import { InputArranger, MutableActionContext } from './action-context.js'
import { createZodTraverseArrangerCreator } from './shared/create-zod-traverse-arranger-creator.js'
import { parseFormBody } from './shared/parse-form-body.js'
import { LocalFile } from './local-file.js'
import { UploadedFile, fileSchema } from './shared/schemas.js'

export function arrangeFormInput(ctx: MutableActionContext, sources: readonly string[], schema: ZodType) {
  const pred = (input: Record<string, unknown>, source: string) => {
    if (source !== 'files') {
      return input
    }

    const files: Record<string, LocalFile> = {}
    for (const [name, file] of Object.entries(input)) {
      const uploadedFile = file as UploadedFile
      files[name] = new LocalFile(
        uploadedFile.tempFilePath,
        uploadedFile.size,
        uploadedFile.mimetype,
        uploadedFile.name,
      )
    }
    return files
  }

  return parseFormBody(ctx.mergeInputs(sources, pred), createZodTraverseArrangerCreator(schema))
}

export function arrangeJsonInput(ctx: MutableActionContext, sources: readonly string[], schema: ZodType) {
  const pred = (input: Record<string, unknown>, source: string) => {
    return source === 'body' ? input : (SchemaUtil.deepCast(schema, input) as Record<string, unknown>)
  }
  return ctx.mergeInputs(sources, pred)
}

export const arrangeOctetStreamInput: InputArranger = async (ctx, _sources, schema): Promise<File> => {
  if (schema !== fileSchema) {
    throw new Error('OctetStream input is only available for fileSchema')
  }

  const dir = await mkdtemp(join(tmpdir(), 'uploaded-'))
  const type = ctx.req.headers['content-type'] || 'application/octet-stream'
  const filename = 'tmpfile'

  const tmpFilePath = join(dir, filename)
  ctx.req.pipe(createWriteStream(tmpFilePath)) // TODO: remove tmp file on error and request end

  const promise = new Promise<File>((resolve, reject) => {
    ctx.req.on('end', () => {
      // const stats = statSync(tmpFilePath)
      resolve(new LocalFile(tmpFilePath, 1, type, filename))
    })
    ctx.req.on('error', (err) => reject(err))
  })
  return await promise
}
