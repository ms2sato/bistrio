import { ActionDescriptor, blankSchema, ConstructConfig, idNumberSchema, RouterError } from '../../client.js'
import { type AnyZodObject } from 'zod'

export type ActionName = 'build' | 'edit' | 'show' | 'index' | 'create' | 'update' | 'destroy'

const build = {
  action: 'build',
  path: '/build',
  method: 'get',
  page: true,
} as const satisfies ActionDescriptor

const edit = {
  action: 'edit',
  path: '/$id/edit',
  method: 'get',
  page: true,
} as const satisfies ActionDescriptor

const show = {
  action: 'show',
  path: '/$id',
  method: 'get',
  page: true,
} as const satisfies ActionDescriptor

const index = {
  action: 'index',
  path: '/',
  method: 'get',
  page: true,
} as const satisfies ActionDescriptor

const create = {
  action: 'create',
  path: '/',
  method: 'post',
} as const satisfies ActionDescriptor

const update = {
  action: 'update',
  path: '/$id',
  method: ['put', 'patch'],
} as const satisfies ActionDescriptor

const destroy = {
  action: 'destroy',
  path: '/$id',
  method: 'delete',
} as const satisfies ActionDescriptor

const apiShow = {
  action: 'show',
  path: '/$id',
  method: 'get',
} as const satisfies ActionDescriptor

const apiIndex = {
  action: 'index',
  path: '/',
  method: 'get',
} as const satisfies ActionDescriptor

export function defaultConstructConfig(idSchema: AnyZodObject = idNumberSchema): ConstructConfig {
  return {
    build: { schema: blankSchema, sources: ['params'] },
    edit: { schema: idSchema, sources: ['params'] },
    show: { schema: idSchema, sources: ['params'] },
    index: { schema: blankSchema, sources: ['params'] },
    create: { sources: ['body', 'files', 'params'] },
    update: { sources: ['body', 'files', 'params'] },
    destroy: { schema: idSchema, sources: ['params'] },
  }
}

export type Option =
  | readonly ActionName[]
  | {
      only: readonly ActionName[]
      except?: undefined
    }
  | {
      except: readonly ActionName[]
      only?: undefined
    }

const pageActions = [build, edit, show, index]
/**
 * create page action descriptors from options
 *
 * @example
 * # filter only specify actions
 *
 * ```ts
 * api(['index', 'show'])
 *   // => [
 *   //  { action: 'show', path: '/$id', method: 'get', page: true }
 *   //  { action: 'index', path: '/', method: 'get', page: true },
 *   // ]
 * ```
 * ```ts
 * api({ only: ['index', 'show'] })
 *   // => [
 *   //  { action: 'show', path: '/$id', method: 'get', page: true }
 *   //  { action: 'index', path: '/', method: 'get', page: true },
 *   // ]
 * ```
 *
 * # filter except specify actions
 * ```ts
 * api({ except: ['biild', 'edit'] })
 *   // => [
 *   //  { action: 'show', path: '/$id', method: 'get', page: true }
 *   //  { action: 'index', path: '/', method: 'get', page: true },
 *   // ]
 * ```
 * @param option Option
 * @returns ActionDescriptor[]
 */
export function page(option?: Option | ActionName, ...args: ActionName[]): readonly ActionDescriptor[] {
  if (typeof option == 'string') {
    option = [option, ...args]
  }

  const actions = pageActions.map((action) => ({ ...action }))
  return applyOption(actions, option)
}

const apiActions = [apiShow, apiIndex, create, update, destroy]

/**
 * create api action descriptors from options
 *
 * @example
 * # filter only specify actions
 * ```ts
 * api(['index', 'show']) // short hand for { only ... }
 *   // => [
 *   //  { action: 'show', path: '/$id', method: 'get' }
 *   //  { action: 'index', path: '/', method: 'get' },
 *   // ]
 * ```
 * ```ts
 * api({ only: ['index', 'show'] })
 *   // => [
 *   //  { action: 'show', path: '/$id', method: 'get' }
 *   //  { action: 'index', path: '/', method: 'get' },
 *   // ]
 * ```
 *
 * # filter except specify actions
 * ```ts
 * api({ except: ['create', 'update', 'delete'] })
 *   // => [
 *   //  { action: 'show', path: '/$id', method: 'get' }
 *   //  { action: 'index', path: '/', method: 'get' },
 *   // ]
 * ```
 * @param option Option
 * @returns ActionDescriptor[]
 */
export function api(option?: Option | ActionName, ...args: ActionName[]): readonly ActionDescriptor[] {
  if (typeof option == 'string') {
    option = [option, ...args]
  }

  const actions = apiActions.map((action) => ({ ...action }))
  return applyOption(actions, option)
}

function applyOption(actions: readonly ActionDescriptor[], option?: Option) {
  if (!option) {
    return actions
  }

  if (option instanceof Array) {
    return only(option, actions)
  }

  if (option.only) {
    return only(option.only, actions)
  }

  if (option.except) {
    return except(option.except, actions)
  }

  throw new RouterError('Unreachable!')
}

export function only(actions: readonly ActionName[], sources: readonly ActionDescriptor[]) {
  return sources.filter((ad) => actions.includes(ad.action as ActionName))
}

export function except(actions: readonly ActionName[], sources: readonly ActionDescriptor[]) {
  return sources.filter((ad) => !actions.includes(ad.action as ActionName))
}
