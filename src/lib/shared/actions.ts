import { ActionDescriptor, blankSchema, ConstructConfig, idNumberSchema, RouterError } from '../../client.js'
import { type AnyZodObject } from 'zod'

export type ActionName = 'build' | 'edit' | 'show' | 'index' | 'load' | 'list' | 'create' | 'update' | 'destroy'

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

const load = {
  action: 'load',
  path: '/$id',
  method: 'get',
  type: 'json',
} as const satisfies ActionDescriptor

const list = {
  action: 'list',
  path: '/',
  method: 'get',
  type: 'json',
} as const satisfies ActionDescriptor

export function defaultConstructConfig(idSchema: AnyZodObject = idNumberSchema): ConstructConfig {
  return {
    build: { schema: blankSchema, sources: ['params'] },
    edit: { schema: idSchema, sources: ['params'] },
    show: { schema: idSchema, sources: ['params'] },
    index: { schema: blankSchema, sources: ['params'] },
    load: { schema: idSchema, sources: ['params'] },
    list: { schema: blankSchema, sources: ['params'] },
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

  const actions = clone(pageActions)
  return applyOption(actions, option)
}

const apiActions = [load, list, create, update, destroy]

/**
 * create api action descriptors from options
 *
 * @example
 * # filter only specify actions
 * ```ts
 * api(['list', 'load']) // short hand for { only ... }
 *   // => [
 *   //  { action: 'load', path: '/$id', method: 'get' }
 *   //  { action: 'list', path: '/', method: 'get' },
 *   // ]
 * ```
 * ```ts
 * api({ only: ['list', 'load'] })
 *   // => [
 *   //  { action: 'load', path: '/$id', method: 'get' }
 *   //  { action: 'list', path: '/', method: 'get' },
 *   // ]
 * ```
 *
 * # filter except specify actions
 * ```ts
 * api({ except: ['create', 'update', 'delete'] })
 *   // => [
 *   //  { action: 'load', path: '/$id', method: 'get' }
 *   //  { action: 'list', path: '/', method: 'get' },
 *   // ]
 * ```
 * @param option Option
 * @returns ActionDescriptor[]
 */
export function api(option?: Option | ActionName, ...args: ActionName[]): readonly ActionDescriptor[] {
  if (typeof option == 'string') {
    option = [option, ...args]
  }

  const actions = clone(apiActions)
  return applyOption(actions, option)
}

const crudActions = [load, list, create, update, destroy, build, edit, show, index]

/**
 * create api action descriptors from options
 *
 * @example
 * # filter only specify actions
 * ```ts
 * crud(['list', 'load']) // short hand for { only ... }
 *   // => [
 *   //  { action: 'load', path: '/$id', method: 'get' }
 *   //  { action: 'list', path: '/', method: 'get' },
 *   // ]
 * ```
 * ```ts
 * crud({ only: ['list', 'load'] })
 *   // => [
 *   //  { action: 'load', path: '/$id', method: 'get' }
 *   //  { action: 'list', path: '/', method: 'get' },
 *   // ]
 * ```
 *
 * # filter except specify actions
 * ```ts
 * crud({ except: ['create', 'update', 'delete', 'build', 'edit', 'show'] })
 *   // => [
 *   //  { action: 'load', path: '/$id', method: 'get' }
 *   //  { action: 'list', path: '/', method: 'get' },
 *   //  { action: 'index', path: '/', method: 'get', page: true },
 *   // ]
 * ```
 * @param option Option
 * @returns ActionDescriptor[]
 */
export function crud(option?: Option | ActionName, ...args: ActionName[]): readonly ActionDescriptor[] {
  if (typeof option == 'string') {
    option = [option, ...args]
  }

  const actions = clone(crudActions)
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

const clone = (ads: readonly ActionDescriptor[]) => ads.map((ad) => ({ ...ad }))
