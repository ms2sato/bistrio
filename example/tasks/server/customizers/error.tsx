import { HttpError } from 'http-errors'
import 'react'
import { Layout } from './Layout'
import filemap from '@bistrio/filemap.json'

export default function ({ err }: { err: HttpError }) {
  const props = { hydrate: false, script: 'error', filemap }
  return (
    <Layout {...props}>
      <h1>{err.message}</h1>
      {err.status && <h2>err.status</h2>}
    </Layout>
  )
}
