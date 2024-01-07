import { join } from 'node:path'
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { Router } from '../../client.js'
import {
  Config,
  ConfigCustom,
  initConfig,
  Middlewares,
  nullRouterSupport,
  RouterSupport,
  ServerRouterConfig,
} from '../../index.js'
import { GenerateRouter } from './generate-router.js'

// TODO: share to generate-router
const nameToPathFileName = '_name_to_path.ts'
const pathToResourceFileName = '_path_to_resource.ts'
const typesFileName = 'index.ts'
const namedEndpointsFileName = 'named_endpoints.ts'
const endpointsFileName = 'endpoints.ts'
const entryFileName = '_entry.ts'
const resourcesFileName = 'resources.ts'

export async function generate<M extends Middlewares>({
  config: configCustom,
  serverRouterConfig,
  allRoutes,
}: {
  config: ConfigCustom
  serverRouterConfig: ServerRouterConfig
  allRoutes: (router: Router, support: RouterSupport<M>) => void
}) {
  console.log('Generating...')

  const config = initConfig(configCustom)
  const entriesConfig = config.entries

  const generatedDir = config.structure.generatedDir
  if (!existsSync(generatedDir)) {
    mkdirSync(generatedDir)
  }

  const generatedRoutesDir = join(generatedDir, 'routes')
  if (!existsSync(generatedRoutesDir)) {
    mkdirSync(generatedRoutesDir)
  }

  await Promise.all(
    Object.entries(entriesConfig).map(([name, { routes }]) => {
      return generateForEntry(generatedRoutesDir, name, routes, config)
    }),
  )

  generateForAll(generatedRoutesDir, allRoutes, config, serverRouterConfig)

  const ret = {
    generatedAt: new Date(),
  }
  writeFileSync(join(generatedRoutesDir, '.generated.json'), JSON.stringify(ret))

  console.log('Generated!')
}

function generateForEntry<M extends Middlewares>(
  generatedRoutesDir: string,
  name: string,
  routes: (router: Router, support: RouterSupport<M>) => void,
  config: Config,
) {
  const router = new GenerateRouter()
  routes(router, nullRouterSupport as RouterSupport<M>)

  const genRoot = join(generatedRoutesDir, name)
  if (!existsSync(genRoot)) {
    mkdirSync(genRoot)
  }

  router.createNameToPath({ out: join(genRoot, nameToPathFileName) })
  router.createPathToResource({ out: join(genRoot, pathToResourceFileName), config })
  router.createTypes({ out: join(genRoot, typesFileName) })
  router.createNamedEndpoints({ out: join(genRoot, namedEndpointsFileName) })
  router.createEndpoints({ out: join(genRoot, endpointsFileName) })
  router.createEntry({ out: join(genRoot, entryFileName), name, config })
}

function generateForAll<M extends Middlewares>(
  generatedRoutesDir: string,
  routes: (router: Router, support: RouterSupport<M>) => void,
  config: Config,
  serverRouterConfig: ServerRouterConfig,
) {
  const name = 'all'

  const router = new GenerateRouter()
  routes(router, nullRouterSupport as RouterSupport<M>)

  const genRoot = join(generatedRoutesDir, name)
  if (!existsSync(genRoot)) {
    mkdirSync(genRoot)
  }

  router.createNameToPath({ out: join(genRoot, nameToPathFileName) })
  router.createPathToResource({ out: join(genRoot, pathToResourceFileName), config })
  router.createTypes({ out: join(genRoot, typesFileName) })
  router.createNamedEndpoints({ out: join(genRoot, namedEndpointsFileName) })
  router.createEndpoints({ out: join(genRoot, endpointsFileName) })

  router.createResources({ out: join(config.structure.generatedDir, resourcesFileName), serverRouterConfig })
}
