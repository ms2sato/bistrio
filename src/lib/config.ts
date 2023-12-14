import path from 'node:path'
import { ClientConfig, ClientConfigCustom, EntriesConfig, fillClientConfig } from './shared/index.js'
import { PartialWithRequired } from './shared/type-util.js'

export type StructureConfig = {
  baseDir: string
  generatedDir: string
  publicDir: string
  distDir: string
  universalDir: string
  serverDir: string
  serverResourcesPath: string
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
  const universalDir = path.resolve(baseDir, 'universal')
  const serverDir = path.resolve(baseDir, 'server')
  const serverResourcesPath = 'resources'
  const cacheDir = path.resolve(baseDir, '.cache')

  return {
    generatedDir,
    publicDir,
    distDir,
    universalDir,
    serverDir,
    serverResourcesPath,
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
