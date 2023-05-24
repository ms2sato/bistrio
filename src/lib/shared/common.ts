import { z } from 'zod'
import { blankSchema } from './schemas'

export class opt<T> {
  constructor(public body: T) {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResourceMethod = (...args: any[]) => any | Promise<any>

export type Resource = Record<string, ResourceMethod>
export type NamedResources = {
  [name: string]: Resource
}

export type ValidationError = z.ZodError
export type ValidationIssue = z.ZodIssue

export type ConstructSource = 'body' | 'query' | 'params' | 'files'
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'option'

export type ActionDescriptor = {
  action: string
  path: string
  method: HttpMethod | readonly HttpMethod[]
  page?: boolean
  hydrate?: boolean
}

export type ConstructDescriptor = {
  schema?: z.AnyZodObject | null
  sources?: readonly ConstructSource[]
}

export type ConstructConfig = {
  [action: string]: ConstructDescriptor
}

export type RouteConfig = {
  name: string
  construct?: ConstructConfig
  actions?: readonly ActionDescriptor[]
}

export type RouterOptions = {
  hydrate: boolean
}

export interface Router {
  sub(...args: unknown[]): Router
  resources(path: string, config: RouteConfig): void
  options(value: RouterOptions): Router
}

export class RouterError extends Error {}

export type HandlerBuildRunner = () => Promise<void> | void

export function createValidationError(issues: ValidationIssue[]) {
  return new z.ZodError(issues)
}

export const choiceSchema = (
  defaultConstructConfig: ConstructConfig,
  constructDescriptor: ConstructDescriptor | undefined,
  actionName: string
) => {
  const defaultConstructDescriptor: ConstructDescriptor | undefined = defaultConstructConfig[actionName]

  if (constructDescriptor?.schema === undefined) {
    if (!defaultConstructDescriptor?.schema) {
      throw new Error(`construct.${actionName}.schema not found in routes for #${actionName}`)
    }
    return defaultConstructDescriptor.schema
  } else if (constructDescriptor.schema === null) {
    return blankSchema
  } else {
    return constructDescriptor.schema
  }
}

export const choiseSources = (
  defaultConstructConfig: ConstructConfig,
  constructDescriptor: ConstructDescriptor | undefined,
  actionName: string
) => {
  const defaultConstructDescriptor: ConstructDescriptor | undefined = defaultConstructConfig[actionName]
  return constructDescriptor?.sources || defaultConstructDescriptor?.sources || ['params']
}
