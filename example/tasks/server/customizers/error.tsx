import { HttpError } from 'http-errors'
import 'react'
import { Layout } from './Layout'
import versions from '@bistrio/versions.json'

export default function ({ err }: { err: HttpError }) {
  const props = { hydrate: false, script: 'error', versions }
  return (
    <Layout props={props}>
      <h1>{err.message}</h1>
      {err.status && <h2>err.status</h2>}
    </Layout>
  )
}
