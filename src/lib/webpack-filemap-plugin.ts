import { writeFile, chmod } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { Compiler } from 'webpack'
import { Filemap } from './filemap.js'

export const pluginName = 'WebpackFilemapPlugin'

export class WebpackFilemapPlugin {
  constructor(private filemapPath: string) {}

  apply(compiler: Compiler) {
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      try {
        const jsMap: Record<string, string> = {}

        compilation.chunks.forEach((chunk) => {
          chunk.files.forEach((file) => {
            if (file.endsWith('.js')) {
              if (chunk.name) {
                jsMap[chunk.name] = file
              }
            }
          })
        })

        const data: Filemap = { js: jsMap }
        const filename = this.filemapPath
        const dir = dirname(filename)
        if (!existsSync(dir)) {
          mkdirSync(dir, 0o755)
        }
        writeFile(filename, JSON.stringify(data, null, 2), { flag: 'w' })
          .then(() => chmod(filename, 0o666))
          .then(() => callback())
          .catch((err: false | Error | null | undefined) => callback(err))
      } catch (err) {
        callback(err as Error)
      }
    })
  }
}
