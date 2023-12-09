import { join, resolve, relative, dirname } from 'node:path'
import { writeFileSync, existsSync } from 'node:fs'
import { ResourceRouteConfig, Router, RouterOptions } from '../../client.js'
import { Config, RouterLayoutType } from '../../index.js'

export type LinkFunctionInfo = {
  link: string
  optionNames: string[]
}

export class GenerateRouter implements Router {
  constructor(
    private httpPath: string = '/',
    readonly nameToPath: { [path: string]: string } = {},
    readonly links: { [name: string]: LinkFunctionInfo } = {},
  ) {}

  sub(rpath: string, ..._args: unknown[]): Router {
    return new GenerateRouter(join(this.httpPath, rpath), this.nameToPath, this.links)
  }

  layout(_props: RouterLayoutType): Router {
    return new GenerateRouter(this.httpPath, this.nameToPath, this.links)
  }

  options(_value: RouterOptions) {
    return this
  }

  resources(rpath: string, config: ResourceRouteConfig): void {
    const routePath = join(this.httpPath, rpath)
    this.nameToPath[config.name] = routePath

    if (!config.actions) {
      return
    }

    for (const ad of config.actions) {
      if (!ad.page) {
        continue
      }

      const linkPath = join(routePath, ad.path)
      this.registerLink(`${config.name}_${ad.action}`, linkPath)
    }
  }

  pages(rpath: string, children: string[]): void {
    const routePath = join(this.httpPath, rpath)
    for (const child of children) {
      const linkPath = join(routePath, child)
      const name = linkPath.replace(/^\//, '').replace(/\//g, '_')
      this.registerLink(name, linkPath)
    }
  }

  createNameToPath({ out }: { out: string }) {
    const text = `export type NameToPath = {
  ${Object.keys(this.nameToPath)
    .map((name) => `${name}: '${this.nameToPath[name]}'`)
    .join('\n  ')}
}
`

    writeFileSync(out, text)
  }

  createResources({ out, config }: { out: string; config: Config }) {
    const resourcePath = (name: string) =>
      join(config.structure.serverDir, config.structure.serverResourcesPath, this.nameToPath[name], 'resource.ts')
    const existsResource = (name: string): boolean => existsSync(resourcePath(name))
    const changeExt = (filePath: string) => filePath.replace(/\.ts$/, '')
    const getResourceFile = (name: string): string => relative(dirname(out), changeExt(resourcePath(name)))

    const resourceNames = Object.keys(this.nameToPath).filter((name) => existsResource(name))

    const ret = `${resourceNames
      .map((name, index) => `import type __Resource${index} from '${getResourceFile(name)}'`)
      .join('\n')}

export type Resources = {
  ${resourceNames
    .map((name, index) => `'${this.nameToPath[name]}': ReturnType<typeof __Resource${index}>`)
    .join('\n  ')}
}
`
    writeFileSync(out, ret)
  }

  createTypes({ out }: { out: string }) {
    const ret = `import { useRenderSupport as useRenderSupportT, RenderSupport as RenderSupportT, NameToResource } from 'bistrio/client'
import { type NameToPath } from './_name_to_path'
import { type Resources } from './_resources'

export type N2R = NameToResource<Resources, NameToPath>
export type RenderSupport = RenderSupportT<N2R>
export const useRenderSupport = useRenderSupportT<N2R>
`
    writeFileSync(out, ret)
  }

  createEntry({ out, name, config }: { out: string; name: string; config: Config }) {
    const outDir = dirname(out)
    const configPath = relative(outDir, resolve(config.structure.universalDir, 'config'))
    const localesPath = relative(outDir, resolve(config.structure.universalDir, 'locales'))
    const ret = `import { entry } from 'bistrio/client'

import { entriesConfig, clientConfig } from '${configPath}'
import { N2R } from './index'
import { localeMap } from '${localesPath}'

entry<N2R>({
  entriesConfig,
  name: "${name}",
  localeMap,
  clientConfig
}).catch((err) => {
  console.error(err)
})
`
    writeFileSync(out, ret)
  }

  private registerLink(name: string, linkPath: string) {
    const optionTokens = linkPath.match(/\$\w+/g)
    const optionNames: string[] = optionTokens ? optionTokens.map((part) => part.replace('$', '')) : []
    this.links[name] = { link: linkPath, optionNames }
  }
}
