import { z } from 'zod'
import { blankSchema } from './schemas.js'
import { ComponentType, ReactNode } from 'react'

const optType = Symbol('opt<>')

export class opt<T> {
  readonly [optType]: symbol = optType
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
export type ActionType = 'json' | 'html'

export interface ActionDescriptor {
  action: string
  path: string
  method: HttpMethod | readonly HttpMethod[]
  type?: ActionType
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

export type ResourceRouteConfig = {
  name: string
  construct?: ConstructConfig
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
  return new z.ZodError(issues)
}

export function isValidationError(err: unknown): err is ValidationError {
  if (err instanceof z.ZodError) {
    return true
  }

  const ze = err as Error
  return 'name' in ze && ze.name === 'ZodError'
}

export class FileNotFoundError extends Error {}

export const choiceSchema = (
  defaultConstructConfig: ConstructConfig,
  constructDescriptor: ConstructDescriptor | undefined,
  actionName: string,
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

export const pageActionDescriptor = (path: string, hydrate = true): ActionDescriptor => ({
  page: true,
  action: path,
  path,
  method: 'get',
  hydrate,
})

export const choiseSources = (
  defaultConstructConfig: ConstructConfig,
  constructDescriptor: ConstructDescriptor | undefined,
  actionName: string,
) => {
  const defaultConstructDescriptor: ConstructDescriptor | undefined = defaultConstructConfig[actionName]
  return constructDescriptor?.sources || defaultConstructDescriptor?.sources || ['params']
}

export type Scope = (router: Router) => void

export function scope(router: Router, subPath: string, scopeFun: Scope): Router {
  const subRouter = router.sub(subPath)
  scopeFun(subRouter)
  return subRouter
}

export const routerPlaceholderRegex = /\$([a-z_][0-9a-zA-Z_]+)/g
