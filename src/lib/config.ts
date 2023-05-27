import path from 'path'
import { ClientConfig, ClientConfigCustom, EntriesConfig, fillClientClonfig } from './shared'
import { PartialWithRequired } from './type-util'

// for webpack
// baseDir,
// buildDir = path.resolve(baseDir, '.bistrio'),
// publicDir = path.resolve(baseDir, 'dist', 'public'),
// publicJsDir = path.join(publicDir, 'js'),

// for generator
// const entriesPath = '../../../isomorphic/config'
// const localesPath = '../../../isomorphic/locales'
// const viewPath = 'isomorphic/views'
// const serverPath
// const distPath

export type StructureConfig = {
  baseDir: string
  buildDir: string
  publicDir: string
  distDir: string
  publicJsDir: string
  isomorphicDir: string
  serverDir: string
  configDir: string
}

export type StructureConfigCustom = PartialWithRequired<StructureConfig, 'baseDir' | 'configDir'>

export type Config = {
  client: ClientConfig
  entries: EntriesConfig
  structure: StructureConfig
}

export type ConfigCustom = {
  client?: ClientConfigCustom
  entries: EntriesConfig
  structure: StructureConfigCustom
}

export function fillStrucrureConfig(strucrureConfig: StructureConfigCustom): StructureConfig {
  const baseDir = strucrureConfig.baseDir
  const buildDir = path.resolve(baseDir, '.bistrio')
  const publicDir = path.resolve(baseDir, 'dist', 'public')
  const publicJsDir = path.resolve(publicDir, 'js')
  const distDir = path.resolve(baseDir, 'dist')
  const isomorphicDir = path.resolve(baseDir, 'isomorphic')
  const serverDir = path.resolve(baseDir, 'server')

  return {
    buildDir,
    publicDir,
    publicJsDir,
    distDir,
    isomorphicDir,
    serverDir,
    ...strucrureConfig,
  }
}

let filledConfig: Config | undefined = undefined
export const fillConfig = (config: ConfigCustom): Config => {
  filledConfig = {
    client: fillClientClonfig(config.client || {}),
    structure: fillStrucrureConfig(config.structure),
    entries: config.entries,
  }
  return filledConfig
}

export const config = () => {
  if (!filledConfig) {
    throw new Error('Config is not initialized, please use fillConfig')
  }
  return filledConfig
}
