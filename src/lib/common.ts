import { ActionContext } from './action-context'
import { ActionContextCreator } from './server-router'
import { PageNode, RenderSupport } from './shared'

export type ConstructViewFunc = (props: {
  node: PageNode
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
