import { ActionContext } from './action-context'
import { ActionContextCreator } from './server-router'
import { RenderSupport } from './shared'

export type ConstructViewFunc = (props: {
  routes: JSX.Element
  hydrate: boolean
  options: unknown
  rs: RenderSupport<any>
  ctx: ActionContext
}) => Promise<JSX.Element> | JSX.Element

export type BuildActionContextCreator = (
  viewRoot: string,
  arrange: ConstructViewFunc,
  failText: string,
) => ActionContextCreator
