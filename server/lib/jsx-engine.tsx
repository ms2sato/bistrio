import { renderToString } from 'react-dom/server'

type EngineFuncCallback = (e: any, rendered?: string | undefined) => void
type EngineFunc = (path: string, options: object, callback: EngineFuncCallback) => void
type Node = JSX.Element
export type NodeArrangeFunc = (node: any, options: any) => Node

export const engine: (arrange: NodeArrangeFunc) => EngineFunc = (arrange: NodeArrangeFunc) => {
  return (filePath, options, callback) => {
    import(filePath)
      .then((ret) => {
        const Page = ret.Page
        render(arrange(Page, options), callback)
      })
      .catch((err) => {
        callback(err)
      })
  }
}

function render(node: Node, callback: EngineFuncCallback) {
  // FIXME: Not renderToString, change to renderToPipeableStream
  callback(null, renderToString(node))
}
