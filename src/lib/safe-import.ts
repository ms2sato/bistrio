/* eslint-disable @typescript-eslint/no-unsafe-return */
import fs from 'fs'
import { isErrorWithCode } from './is-error'

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
