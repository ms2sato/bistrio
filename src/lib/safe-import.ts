/* eslint-disable @typescript-eslint/no-unsafe-return */
import fs from 'fs'
import { isErrorWithCode } from './shared/is-error'
import createDebug from 'debug'

const debug = createDebug('bistrio:debug:view')

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV == 'development'

const forceImportAsJs = async (filePath: string) => {
  const jsPath = `${filePath}.js`
  if (fs.existsSync(jsPath)) {
    debug(`require: %s`, jsPath)
    return await require(jsPath)
  }
}

export const safeImport = async (filePath: string): Promise<unknown> => {
  debug(`safeImport: %s`, filePath)
  if (isDev) {
    return forceImportAsJs(filePath)
  }

  try {
    debug(`require: %s`, filePath)
    return await require(filePath)
  } catch (err) {
    if (isErrorWithCode(err) && err.code === 'ERR_MODULE_NOT_FOUND') {
      debug(`error hooked, import force as js`)
      return forceImportAsJs(filePath)
    }

    throw err
  }
}
