/* eslint-disable @typescript-eslint/no-unsafe-return */
import fs from 'fs'

type ErrorWithCode = Error & {
  code: string
}

// TODO: should in lib?
const isErrorWithCode = (err: unknown): err is ErrorWithCode => {
  const error = err as ErrorWithCode
  return 'code' in error && typeof error.code === 'string'
}

// TODO: think performance of production
export const safeImport = async (filePath: string): Promise<unknown> => {
  try {
    return await import(filePath)
  } catch (err) {
    // code: 'ERR_MODULE_NOT_FOUND' caused in JS
    if (isErrorWithCode(err) && err.code === 'ERR_MODULE_NOT_FOUND') {
      const jsPath = `${filePath}.js`
      if (fs.existsSync(jsPath)) {
        return await import(jsPath)
      }
    }

    throw err
  }
}
