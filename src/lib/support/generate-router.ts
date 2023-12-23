import { join, resolve, relative, dirname } from 'node:path'
import { writeFileSync, existsSync } from 'node:fs'

import { HttpMethod, ResourceRouteConfig, Router, RouterLayoutType, RouterOptions } from '../../lib/shared/common.js'
import { Config } from '../config.js'
import { isArray } from '../shared/type-util.js'

export type LinkFunctionInfo = {
  name: string
  link: string
  optionNames: string[]
  methods: HttpMethod[]
}

type GetFunctionStringFunc = (name: string, link: string, optionsStr: string, method: readonly HttpMethod[]) => string

const getNamedFunctionString: GetFunctionStringFunc = (
  name: string,
  link: string,
  optionsStr: string,
  methods: readonly HttpMethod[],
) => {
  const methodStr = methods.length == 1 ? `'${methods[0]}'` : `[${methods.map((m) => `'${m}'`).join(', ')}]`

  return `export const ${name} = Object.freeze({ path: (${optionsStr}) => { return \`${link}\` }, method: ${methodStr} })`
}

const getUnnamedFunctionString: GetFunctionStringFunc = (
  name: string,
  link: string,
  optionsStr: string,
  methods: readonly HttpMethod[],
) => {
  const methodStr = methods.length == 1 ? `'${methods[0]}'` : `[${methods.map((m) => `'${m}'`).join(', ')}]`

  return `export const __${name} = Object.freeze({ path: (${optionsStr}) => { return \`${link}\` }, method: ${methodStr} })`
}

export class GenerateRouter implements Router {
  constructor(
    private httpPath: string = '/',
    readonly nameToPath: { [path: string]: string } = {},
    readonly links: { named: LinkFunctionInfo[]; unnamed: LinkFunctionInfo[] } = {
      named: [],
      unnamed: [],
    },
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
    const regex = /^[a-z][A-Za-z0-9]*$/
    if (!regex.test(config.name)) {
      throw new Error(`invalid resource name: "${config.name}": match to ${regex.toString()}`)
    }

    const routePath = join(this.httpPath, rpath)
    this.nameToPath[config.name] = routePath

    if (!config.actions) {
      return
    }

    for (const ad of config.actions) {
      const linkPath = join(routePath, ad.path)
      this.registerLink(linkPath, ad.method, `${config.name}$${ad.action}`)
    }
  }

  pages(rpath: string, children: string[]): void {
    const routePath = join(this.httpPath, rpath)
    for (const child of children) {
      const linkPath = join(routePath, child)
      this.registerLink(linkPath, 'get')
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

  createNamedEndpoints({ out }: { out: string }) {
    writeFileSync(out, this.generateNamedEndpoints())
  }

  createEndpoints({ out }: { out: string }) {
    writeFileSync(out, this.generateUnnamedEndpoints())
  }

  // public for test
  generateNamedEndpoints() {
    return this.generateEndpoints(this.links.named, getNamedFunctionString)
  }

  generateUnnamedEndpoints() {
    return this.generateEndpoints(this.links.unnamed, getUnnamedFunctionString)
  }

  private generateEndpoints(endpoints: LinkFunctionInfo[], getFunctionString: GetFunctionStringFunc) {
    return `${endpoints
      .flatMap(({ optionNames, link, methods, name }) => {
        const optionsStr =
          optionNames.length === 0
            ? ''
            : `{ ${optionNames.join(', ')} }: { ${optionNames
                .map((optName) => `${optName}: string|number`)
                .join(', ')} }`
        return getFunctionString(name, link, optionsStr, methods)
      })
      .join('\n')}
`
  }

  private registerLink(linkPath: string, method: HttpMethod | readonly HttpMethod[], name?: string) {
    const optionTokens = linkPath.match(/\$\w+/g)
    const optionNames: string[] = optionTokens ? optionTokens.map((part) => part.replace('$', '')) : []
    const link = linkPath.replace(/\$(\w+)/g, '${$1}')

    let arrangedLinkPath = linkPath.replace(/^\//, '').replace(/\/$/, '')
    if (arrangedLinkPath === '') {
      arrangedLinkPath = 'root'
    }
    const pathName = arrangedLinkPath.replace(/\$\w+/g, '$').replace(/\//g, '__')

    const methods: HttpMethod[] = isArray(method) ? [...method] : [method as HttpMethod] // TODO: fix `as HttpMethod`

    const registerdInfo = this.links.unnamed.find((info) => info.name === pathName)
    if (!registerdInfo) {
      const info = { name: pathName, link, optionNames, methods }
      this.links.unnamed.push(info)
    } else {
      if (registerdInfo.link != link) {
        throw new Error(`link path is duplicated: name: ${pathName}, link: ${linkPath}`)
      }
      registerdInfo.methods = [...registerdInfo.methods, ...methods]
    }

    if (name) {
      this.links.named.push({ name, link: link, optionNames, methods })
    }
  }
}
