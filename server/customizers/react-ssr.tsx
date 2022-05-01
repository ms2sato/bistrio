import { Application } from 'express'
import { ActionContextCreator } from 'restrant2'
import { actionContextCreatorFactory, NodeArrangeFunc, engine } from '../lib/restrant2-react-render'
import { Layout } from '../../views/_layout'
import { createContext, ReactNode, useState } from 'react'

type Reader<T> = () => T
type ReaderMap = Map<string, Reader<unknown>>

// @see https://blog.logrocket.com/react-suspense-data-fetching/#data-fetching-approaches
function suspendable<T>(promise: Promise<T>): Reader<T> {
  let result: T
  let err: Error
  const suspender = promise.then(
    (ret) => (result = ret),
    (e: Error) => (err = e)
  )
  return () => {
    if (result) return result
    if (err) throw err
    throw suspender
  }
}

type RenderSupport = {
  fetchJson: <T>(url: string, key?: string) => T
}

class RenderSupportImpl implements RenderSupport {
  constructor(private readerMap: ReaderMap = new Map()) {}

  fetchJson<T>(url: string, key: string = url): T {
    console.log('### call request')

    let reader: Reader<unknown> | undefined = this.readerMap.get(key)
    if (!reader) {
      console.log('undefined reader, start fetch')
      reader = suspendable(
        fetch(url).then((ret) => {
          return ret.json()
        })
      )
      this.readerMap.set(key, reader)
    }
    return (reader as Reader<T>)()
  }
}

export const RenderSupportContext = createContext<RenderSupport>(new RenderSupportImpl())

const arrange: NodeArrangeFunc = (Page, options) => {
  return (
    <Wrapper>
      <Page {...options}></Page>
    </Wrapper>
  )
}

const Wrapper = ({ children }: { children: ReactNode }) => {
  const [ctx] = useState(new RenderSupportImpl())

  return (
    <Layout>
      <RenderSupportContext.Provider value={ctx}>{children}</RenderSupportContext.Provider>
    </Layout>
  )
}

let ctxCreator: ActionContextCreator

export const useTsxView = (app: Application, viewRoot: string) => {
  app.engine('tsx', engine(arrange))
  app.set('views', viewRoot)
  app.set('view engine', 'tsx')

  ctxCreator = actionContextCreatorFactory(viewRoot, arrange, '')
}

export const createActionContext: ActionContextCreator = (props) => {
  return ctxCreator(props)
}
