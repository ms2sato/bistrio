import { ZodError, ZodIssue, ZodType } from 'zod'
import { blankSchema } from './schemas.js'
import { ComponentType, ReactNode } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResourceMethod = (...args: any[]) => any

export type Resource = Record<string, ResourceMethod>
export type NamedResources = {
  [name: string]: Resource
}

export type ValidationError = ZodError
export type ValidationIssue = ZodIssue

export type InputSource = 'body' | 'query' | 'params' | 'files'
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'option'
export type ActionType = 'json' | 'html'

export interface ActionDescriptor {
  action: string
  path: string
  method: HttpMethod | readonly HttpMethod[]
  type?: ActionType
  page?: boolean
  hydrate?: boolean
}

export type StrictInputDescriptor = {
  schema?: ZodType | null
  sources?: readonly InputSource[]
}

export type InputDescriptor = StrictInputDescriptor | ZodType

export type StrictInputsConfig = {
  [action: string]: StrictInputDescriptor
}

export type InputsConfig = {
  [action: string]: InputDescriptor
}

export type ResourceRouteConfig = {
  name: string
  inputs?: InputsConfig
  actions?: readonly ActionDescriptor[]
}

export type RouterOptions = {
  hydrate?: boolean
  layout?: React.ComponentType
}

export type RouterLayoutType = { element: ReactNode } | { Component: ComponentType }

export interface Router {
  sub(...args: unknown[]): Router
  layout(props: RouterLayoutType): Router
  resources(path: string, config: ResourceRouteConfig): void
  pages(rpath: string, children: string[]): void
  options(value: RouterOptions): Router
}

export class RouterError extends Error {}

export type HandlerBuildRunner = () => Promise<void> | void

export function createValidationError(issues: ValidationIssue[]) {
  return new ZodError(issues)
}

export function isValidationError(err: unknown): err is ValidationError {
  if (err instanceof ZodError) {
    return true
  }

  const ze = err as Error
  return 'name' in ze && ze.name === 'ZodError'
}

export class FileNotFoundError extends Error {}

const actionOptionsInternalSymbol = Symbol('__bistrio_action_option__')

export interface ActionOptions {
  readonly [actionOptionsInternalSymbol]: typeof actionOptionsInternalSymbol
}

export const buildActionOptions = <O extends object = Record<string, unknown>>(o: O): O & ActionOptions => ({
  [actionOptionsInternalSymbol]: actionOptionsInternalSymbol,
  ...o,
})

export const isActionOptions = (o: unknown): o is ActionOptions => {
  if (typeof o !== 'object' || o === null) {
    return false
  }
  return actionOptionsInternalSymbol in o
}

export const choiceSchema = (
  defaultInputsConfig: StrictInputsConfig,
  inputDescriptor: InputDescriptor | undefined,
  actionName: string,
) => {
  if (inputDescriptor instanceof ZodType) {
    return inputDescriptor
  }

  const defaultInputDescriptor: InputDescriptor | undefined = defaultInputsConfig[actionName]

  if (inputDescriptor?.schema === undefined) {
    if (!defaultInputDescriptor?.schema) {
      throw new Error(`inputs.${actionName}.schema not found in routes for #${actionName}`)
    }
    return defaultInputDescriptor.schema
  } else if (inputDescriptor.schema === null) {
    return blankSchema
  } else {
    return inputDescriptor.schema
  }
}

export const createPageActionDescriptor = (path: string, hydrate = true): ActionDescriptor => ({
  page: true,
  action: path,
  path,
  method: 'get',
  hydrate,
})

export const choiseSources = (
  defaultInputsConfig: StrictInputsConfig,
  inputDescriptor: InputDescriptor | undefined,
  actionName: string,
) => {
  const defaultInputDescriptor: StrictInputDescriptor | undefined = defaultInputsConfig[actionName]
  if (inputDescriptor instanceof ZodType) {
    return defaultInputDescriptor?.sources || ['params']
  }

  return inputDescriptor?.sources || defaultInputDescriptor?.sources || ['params']
}

export type Scope = (router: Router) => void

function scope(router: Router, scopeFun: Scope): Router
function scope(router: Router, subPath: string, scopeFun: Scope): Router
function scope(router: Router, subPath: string | Scope, scopeFun?: Scope): Router {
  if (typeof subPath === 'function') {
    scopeFun = subPath
    subPath = '/'
  }
  if (!scopeFun) {
    throw new Error('scopeFun is required')
  }
  const subRouter = router.sub(subPath)
  scopeFun(subRouter)
  return subRouter
}

export { scope }

export const routerPlaceholderRegex = /\$([a-z_][0-9a-zA-Z_]+)/g

export const checkRpath = (rpath: string): string => {
  rpath = rpath.trim()
  if (rpath === '') {
    throw new Error('Router.resources() first argument cannnot be blank string')
  }
  if (rpath === '/') {
    throw new Error('Router.resources() first argument cannnot be "/"')
  }

  const regex = /^[a-zA-Z0-9$/.\-_]+$/
  if (!regex.test(rpath)) {
    throw new Error(`Router.resources() first argument is not match format ${regex}`)
  }

  return rpath
}
