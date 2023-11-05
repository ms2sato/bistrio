import { ActionDescriptor, blankSchema, ConstructConfig, idNumberSchema, RouterError } from '../../client'
import { z } from 'zod'

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

export function defaultConstructConfig(idSchema: z.AnyZodObject = idNumberSchema): ConstructConfig {
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
  | {
      only: readonly ActionName[]
      except?: undefined
    }
  | {
      except: readonly ActionName[]
      only?: undefined
    }

const pageActions = [build, edit, show, index]
export function page(option?: Option): readonly ActionDescriptor[] {
  const actions = pageActions.map((action) => ({ ...action }))
  return applyOption(actions, option)
}

const apiActions = [apiShow, apiIndex, create, update, destroy]
export function api(option?: Option): readonly ActionDescriptor[] {
  const actions = apiActions.map((action) => ({ ...action }))
  return applyOption(actions, option)
}

function applyOption(actions: readonly ActionDescriptor[], option?: Option) {
  if (!option) {
    return actions
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
