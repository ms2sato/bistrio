import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createWriteStream } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'

import { SchemaUtil } from '../index.js'
import { InputArranger } from './action-context.js'
import { createZodTraverseArrangerCreator } from './shared/create-zod-traverse-arranger-creator.js'
import { parseFormBody } from './shared/parse-form-body.js'
import { LocalFile } from './local-file.js'
import { UploadedFile, fileSchema } from './shared/schemas.js'

export const arrangeFormInput: InputArranger = (ctx, sources, schema) => {
  const pred = (input: Record<string, unknown>, source: string) => {
    if (source !== 'files') {
      return input
    }

    const files: Record<string, LocalFile> = {}
    for (const [name, file] of Object.entries(input)) {
      const uploadedFile = file as UploadedFile
      files[name] = new LocalFile(uploadedFile.tempFilePath, uploadedFile.mimetype, uploadedFile.name)
    }
    return files
  }

  return parseFormBody(ctx.mergeInputs(sources, pred), createZodTraverseArrangerCreator(schema))
}

export const arrangeJsonInput: InputArranger = (ctx, sources, schema) => {
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

  const promise = new Promise<void>((resolve, reject) => {
    ctx.req.on('end', () => {
      resolve()
    })
    ctx.req.on('error', (err) => reject(err))
  })
  await promise

  return new LocalFile(tmpFilePath, type, filename)
}

type ContentType2Arranger = Record<string, InputArranger>

export const defaultContentType2Arranger: ContentType2Arranger = {
  'application/octet-stream': arrangeOctetStreamInput,
  'application/json': arrangeJsonInput,
  'application/x-www-form-urlencoded': arrangeFormInput,
  'multipart/form-data': arrangeFormInput,
  '': arrangeFormInput,
}

export const createSmartInputArranger = (
  contentType2Arranger: ContentType2Arranger = defaultContentType2Arranger,
): InputArranger => {
  return (ctx, sources, schema) => {
    const requestedContentType = ctx.req.headers['content-type']
    if (requestedContentType) {
      const contentArranger = contentType2Arranger[requestedContentType] || contentType2Arranger['']
      return contentArranger(ctx, sources, schema)
    }
    return contentType2Arranger[''](ctx, sources, schema)
  }
}
