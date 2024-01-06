import { join } from 'node:path'
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { Router } from '../../client.js'
import { Config, ConfigCustom, initConfig, Middlewares, nullRouterSupport, RouterSupport, ServerRouterConfig } from '../../index.js'
import { GenerateRouter } from './generate-router.js'

export async function generate<M extends Middlewares>({
  config: configCustom,
  serverRouterConfig,
  allRoutes,
}: {
  config: ConfigCustom
  serverRouterConfig: ServerRouterConfig,
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

  router.createNameToPath({ out: join(genRoot, '_name_to_path.ts') })
  router.createResources({ out: join(genRoot, '_resources.ts'), config })
  router.createTypes({ out: join(genRoot, 'index.ts') })
  router.createNamedEndpoints({ out: join(genRoot, 'named_endpoints.ts') })
  router.createEndpoints({ out: join(genRoot, 'endpoints.ts') })
  router.createEntry({ out: join(genRoot, '_entry.ts'), name, config })
}

function generateForAll<M extends Middlewares>(
  generatedRoutesDir: string,
  routes: (router: Router, support: RouterSupport<M>) => void,
  config: Config,
  serverRouterConfig: ServerRouterConfig
) {
  const name = 'all'

  const router = new GenerateRouter()
  routes(router, nullRouterSupport as RouterSupport<M>)

  const genRoot = join(generatedRoutesDir, name)
  if (!existsSync(genRoot)) {
    mkdirSync(genRoot)
  }

  router.createNameToPath({ out: join(genRoot, '_name_to_path.ts') })
  router.createResources({ out: join(genRoot, '_resources.ts'), config })
  router.createTypes({ out: join(genRoot, 'index.ts') })
  router.createNamedEndpoints({ out: join(genRoot, 'named_endpoints.ts') })
  router.createEndpoints({ out: join(genRoot, 'endpoints.ts') })
  
  router.createInterfaces({ out: join(config.structure.generatedDir, 'interfaces.ts'), serverRouterConfig })
}
