import path from 'path'
import { ClientConfig, ClientConfigCustom, EntriesConfig, fillClientConfig } from './shared'
import { PartialWithRequired } from './type-util'

export type StructureConfig = {
  baseDir: string
  generatedDir: string
  publicDir: string
  distDir: string
  isomorphicDir: string
  serverDir: string
  configDir: string
  cacheDir: string
}

export type StructureConfigCustom = PartialWithRequired<StructureConfig, 'configDir'>

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
  const baseDir = strucrureConfig.baseDir || path.join(strucrureConfig.configDir, '../')
  const generatedDir = path.resolve(baseDir, '.bistrio')
  const publicDir = path.resolve(baseDir, 'dist', 'public')
  const distDir = path.resolve(baseDir, 'dist')
  const isomorphicDir = path.resolve(baseDir, 'isomorphic')
  const serverDir = path.resolve(baseDir, 'server')
  const cacheDir = path.resolve(baseDir, '.cache')

  return {
    generatedDir,
    publicDir,
    distDir,
    isomorphicDir,
    serverDir,
    cacheDir,
    ...strucrureConfig,
    baseDir,
  }
}

let filledConfig: Config | undefined = undefined
export const initConfig = (config: ConfigCustom): Config => {
  filledConfig = {
    client: fillClientConfig(config.client || {}),
    structure: fillStrucrureConfig(config.structure),
    entries: config.entries,
  }
  return filledConfig
}

export const config = () => {
  if (!filledConfig) {
    throw new Error('Config is not initialized, please use initConfig')
  }
  return filledConfig
}
